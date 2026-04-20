// media.controller.ts
// Soporta dos modos de upload:
//   1. Multipart (POST /media/upload-file)  → buffer real → S3
//   2. JSON      (POST /media/upload)       → filename    → simulado/local (compatibilidad)

import {
  Controller, Post, Get, Delete,
  Param, Body, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/media.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /** Upload multipart/form-data → S3 real */
  @Post('upload-file')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() body: { userId?: string; groupId?: string; messageId?: string },
  ) {
    return this.mediaService.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      body.userId,
      body.groupId,
      body.messageId,
    );
  }

  /** Upload JSON (compatibilidad / desarrollo sin archivo real) */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async upload(@Body() dto: UploadMediaDto) {
    return this.mediaService.uploadFile(dto.filename, dto.userId, dto.groupId);
  }

  @Get(':id')
  async getFile(@Param('id') id: string) {
    return this.mediaService.getFile(id);
  }

  /** URL pre-firmada de descarga (válida X segundos) */
  @Get(':id/presigned')
  async getPresignedUrl(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn = 3600,
  ) {
    return this.mediaService.getPresignedUrl(id, Number(expiresIn));
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.mediaService.deleteFile(id, body.userId);
  }
}
