// create-group.dto.ts
import {
  IsString, IsOptional, MinLength, MaxLength,
  IsEnum, IsInt, Min, Max, IsPositive,
} from 'class-validator';
import { GroupVisibility, GroupJoinPolicy } from '../entities/group.entity';

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  createdBy?: string; // inyectado por el gateway desde el JWT

  // ── Opciones de suscripción ────────────────────────────────────
  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;

  @IsOptional()
  @IsEnum(GroupJoinPolicy)
  joinPolicy?: GroupJoinPolicy;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10000)
  maxMembers?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rules?: string;
}

// update-group.dto.ts
export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;

  // ── Opciones de suscripción actualizables ──────────────────────
  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;

  @IsOptional()
  @IsEnum(GroupJoinPolicy)
  joinPolicy?: GroupJoinPolicy;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10000)
  maxMembers?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rules?: string;
}

// join-request.dto.ts
export class CreateJoinRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsString()
  userId?: string; // inyectado por gateway
}

export class ReviewJoinRequestDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  reviewedBy?: string; // inyectado por gateway
}
