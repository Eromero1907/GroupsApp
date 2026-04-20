import { IsEnum } from 'class-validator';
import { PresenceStatus } from '../entities/presence.entity';

export class SetPresenceDto {
  @IsEnum(PresenceStatus, {
    message: `status debe ser uno de: ${Object.values(PresenceStatus).join(', ')}`,
  })
  status: PresenceStatus;
}
