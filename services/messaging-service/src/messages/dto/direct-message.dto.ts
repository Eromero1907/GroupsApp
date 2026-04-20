import { IsString, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateDirectMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsUUID()
  receiverId: string;

  @IsOptional()
  @IsUUID()
  senderId?: string; // inyectado por gateway

  @IsOptional()
  @IsUUID()
  mediaId?: string;
}

export class UpdateDirectMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsUUID()
  senderId?: string;
}
