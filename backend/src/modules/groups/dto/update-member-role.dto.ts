import { IsEnum } from 'class-validator';
import { GroupMemberRole } from '../schemas/group-member.scheme';

export class UpdateMemberRoleDto {
  @IsEnum(GroupMemberRole)
  role: GroupMemberRole;
}
