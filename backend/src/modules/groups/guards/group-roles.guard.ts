import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupMember, GroupMemberRole } from '../schemas/group-member.scheme';

export const GROUP_ROLES_KEY = 'groupRoles';

@Injectable()
export class GroupRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(GroupMember.name) private groupMemberModel: Model<GroupMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<GroupMemberRole[]>(GROUP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId = request.params.id || request.params.groupId;

    if (!user || !groupId) {
      throw new ForbiddenException('User or Group not found');
    }

    const member = await this.groupMemberModel.findOne({
      group_id: groupId,
      user_id: user.userId,
      status: 'ACTIVE',
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const hasRole = requiredRoles.some((role) => member.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
    }

    // Attach member info to request for later use
    request.groupMember = member;
    return true;
  }
}
