// media.service.ts — integración real con S3 + fallback local

import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { KafkaService } from '../kafka/kafka.service';
import { S3Service } from './s3.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
    private readonly kafkaService: KafkaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Upload desde buffer (multipart/form-data).
   * El controlador pasa el buffer parseado por Multer.
   */
  async uploadBuffer(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    userId: string,
    groupId?: string,
    messageId?: string,
  ) {
    const folder = groupId ? `groups/${groupId}` : `users/${userId}`;
    const { key, url } = await this.s3Service.uploadBuffer(buffer, originalFilename, mimeType, folder);

    const media = this.mediaRepository.create({
      filename: originalFilename,
      url,
      s3Key: key,
      mimeType,
      size: buffer.length,
      uploadedBy: userId,
      groupId: groupId || null,
      messageId: messageId || null,
    });

    const saved = await this.mediaRepository.save(media);

    await this.kafkaService.emitFileUploaded({
      fileId: saved.id,
      userId,
      url: saved.url,
      filename: saved.filename,
      groupId,
      messageId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Archivo subido: ${saved.id} (${this.s3Service.isS3Enabled ? 'S3' : 'local'})`);
    return saved;
  }

  /**
   * Upload por filename solamente (compatibilidad con el endpoint JSON anterior).
   * Cuando no hay buffer real (desarrollo/tests), simula el objeto en local.
   */
  async uploadFile(filename: string, userId: string, groupId?: string) {
    const mimeType = this.inferMimeType(filename);
    const fakeBuffer = Buffer.from(`simulated:${filename}`);
    return this.uploadBuffer(fakeBuffer, filename, mimeType, userId, groupId);
  }

  async getFile(id: string) {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) throw new NotFoundException(`Archivo ${id} no encontrado`);
    return media;
  }

  /** Genera URL pre-firmada temporal si el archivo está en S3 */
  async getPresignedUrl(id: string, expiresIn = 3600) {
    const media = await this.getFile(id);
    if (!media.s3Key || !this.s3Service.isS3Enabled) {
      return { url: media.url, presigned: false };
    }
    const url = await this.s3Service.getPresignedUrl(media.s3Key, expiresIn);
    return { url, presigned: true, expiresIn };
  }

  async deleteFile(id: string, userId: string) {
    const media = await this.getFile(id);
    if (media.uploadedBy !== userId) {
      throw new ForbiddenException('Solo puedes eliminar tus propios archivos');
    }

    // Eliminar de S3 si aplica
    if (media.s3Key) {
      await this.s3Service.deleteObject(media.s3Key);
    }

    await this.mediaRepository.remove(media);

    await this.kafkaService.emitFileDeleted({
      fileId: id, userId, timestamp: new Date().toISOString(),
    });

    return { message: `Archivo ${id} eliminado correctamente` };
  }

  private inferMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mp4: 'video/mp4', mp3: 'audio/mpeg', svg: 'image/svg+xml',
      zip: 'application/zip', txt: 'text/plain',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }
}
