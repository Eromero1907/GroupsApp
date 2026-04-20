import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UploadMediaDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsUUID()
  userId?: string; // inyectado por el gateway desde el JWT

  @IsOptional()
  @IsUUID()
  groupId?: string;
}
