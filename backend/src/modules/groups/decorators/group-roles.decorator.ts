import { SetMetadata } from '@nestjs/common';
import { GroupMemberRole } from '../schemas/group-member.scheme';

export const GROUP_ROLES_KEY = 'groupRoles';
export const GroupRoles = (...roles: GroupMemberRole[]) => SetMetadata(GROUP_ROLES_KEY, roles);
