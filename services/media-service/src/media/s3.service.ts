// s3.service.ts
// Abstracción sobre AWS S3.
// Si S3_BUCKET no está configurado, cae al modo "local" (URL simulada)
// para que el proyecto funcione en desarrollo sin credenciales AWS.

import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private readonly bucket: string | null;
  private readonly region: string;
  private readonly localFallbackUrl: string;

  constructor() {
    this.bucket  = process.env.S3_BUCKET  || null;
    this.region  = process.env.AWS_REGION || 'us-east-1';
    this.localFallbackUrl = process.env.STORAGE_BASE_URL || 'https://media.groupsapp.local/files';

    if (this.bucket && process.env.AWS_ACCESS_KEY_ID) {
      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
        },
      });
      this.logger.log(`✅ S3 configurado — bucket: ${this.bucket} (${this.region})`);
    } else {
      this.logger.warn('⚠️  S3_BUCKET / AWS_ACCESS_KEY_ID no configurados — modo local (URL simulada)');
    }
  }

  get isS3Enabled() { return !!this.client && !!this.bucket; }

  /**
   * Sube un buffer al bucket S3.
   * @returns URL pública del objeto.
   */
  async uploadBuffer(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<{ key: string; url: string }> {
    const ext = originalFilename.split('.').pop() || 'bin';
    const key = `${folder}/${uuidv4()}.${ext}`;

    if (!this.isS3Enabled) {
      // Modo local: simular URL determinista
      const url = `${this.localFallbackUrl}/${key}`;
      this.logger.debug(`[LOCAL] Simulated upload → ${url}`);
      return { key, url };
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        buffer,
        ContentType: mimeType,
      }),
    );

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    this.logger.log(`📤 S3 upload → ${key}`);
    return { key, url };
  }

  /**
   * Genera una URL pre-firmada de descarga válida por `expiresIn` segundos.
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.isS3Enabled) {
      return `${this.localFallbackUrl}/${key}`;
    }
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Elimina un objeto del bucket.
   */
  async deleteObject(key: string): Promise<void> {
    if (!this.isS3Enabled) {
      this.logger.debug(`[LOCAL] Simulated delete → ${key}`);
      return;
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`🗑️  S3 delete → ${key}`);
  }
}
