import { IsUUID, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { ContactStatus } from '../entities/contact.entity';

export class AddContactDto {
  @IsUUID()
  contactId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string; // inyectado por gateway
}

export class UpdateContactDto {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}
