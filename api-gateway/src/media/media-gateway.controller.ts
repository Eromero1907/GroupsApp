import {
  Controller, Post, Get, Delete, Param, Body,
  HttpCode, HttpStatus, UseGuards, Request,
  UseInterceptors, UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpClientService } from '../http/http.service';
import { JwtAuthGuard } from '../guards/jwt.guard';
import * as FormData from 'form-data';

const MEDIA_URL = () => process.env.MEDIA_SERVICE_URL || 'http://localhost:3004';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaGatewayController {
  constructor(private readonly http: HttpClientService) {}

  /** Upload multipart real → forwardea el buffer al media-service */
  @Post('upload-file')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req: any,
  ) {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('userId', req.user.sub);
    if (body.groupId) form.append('groupId', body.groupId);
    if (body.messageId) form.append('messageId', body.messageId);

    return this.http.postForm(`${MEDIA_URL()}/media/upload-file`, form);
  }

  /** Upload JSON (desarrollo / compatibilidad) */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async upload(@Body() body: any, @Request() req: any) {
    return this.http.post(`${MEDIA_URL()}/media/upload`, { ...body, userId: req.user.sub });
  }

  @Get(':id')
  async getFile(@Param('id') id: string) { return this.http.get(`${MEDIA_URL()}/media/${id}`); }

  /** URL pre-firmada de descarga */
  @Get(':id/presigned')
  async getPresignedUrl(@Param('id') id: string, @Query('expiresIn') expiresIn = 3600) {
    return this.http.get(`${MEDIA_URL()}/media/${id}/presigned?expiresIn=${expiresIn}`);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Request() req: any) {
    return this.http.delete(`${MEDIA_URL()}/media/${id}`, { data: { userId: req.user.sub } });
  }
}
