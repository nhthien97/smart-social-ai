import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ParticipantRole } from '../schemas/conversation-participants.scheme';

export class AddParticipantDto {
    @IsString()
    conv_id: string;

    @IsString()
    user_id: string; // user được thêm vào
}

export class UpdateRoleDto {
    @IsEnum(ParticipantRole)
    role: ParticipantRole;
}

export class UpdateNicknameDto {
    @IsOptional()
    @IsString()
    nickname?: string;
}
