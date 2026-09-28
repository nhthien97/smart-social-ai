
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Request, Query, HttpException, HttpStatus } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateGroupSettingsDto } from './dto/update-group-settings.dto';
import { CreateGroupPostDto } from './dto/create-group-post.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferAdminDto } from './dto/transfer-admin.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RejectPostDto } from './dto/reject-post.dto';
import { GroupRoles } from './decorators/group-roles.decorator';
import { GroupRolesGuard } from './guards/group-roles.guard';
import { GroupMemberRole } from './schemas/group-member.scheme';

@Controller('groups')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // UC5.3: Create group
  @Post()
  async createGroup(@Request() req, @Body() createGroupDto: CreateGroupDto) {
    try {
      return await this.groupsService.createGroup(req.user.userId, createGroupDto);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to create group', HttpStatus.BAD_REQUEST);
    }
  }

  // Get all groups (for users) - My groups and suggested
  @Get()
  async findAll(@Request() req) {
    try {
      return await this.groupsService.getGroupsForUser(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to get groups', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get group by id
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      return await this.groupsService.getGroupDetail(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message || 'Group not found', HttpStatus.NOT_FOUND);
    }
  }

  // UC5.4: Update group (admin)
  @Put(':id')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.ADMIN)
  async updateGroup(@Param('id') id: string, @Request() req, @Body() updateGroupDto: UpdateGroupDto) {
    try {
      return await this.groupsService.updateGroup(id, req.user.userId, updateGroupDto);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to update group', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.5: Delete group (admin)
  @Delete(':id')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.ADMIN)
  async deleteGroup(@Param('id') id: string, @Request() req) {
    try {
      await this.groupsService.deleteGroup(id, req.user.userId);
      return { message: 'Group deleted successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to delete group', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.8: Cập nhật cài đặt nhóm (bật/tắt duyệt bài, duyệt thành viên) – chỉ admin
  @Patch(':id/settings')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.ADMIN)
  async updateGroupSettings(@Param('id') id: string, @Request() req, @Body() settingsDto: UpdateGroupSettingsDto) {
    try {
      return await this.groupsService.updateGroupSettings(id, req.user.userId, settingsDto);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to update group settings', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.1: Join group (request to join)
  @Post(':id/join')
  async joinGroup(@Param('id') id: string, @Request() req) {
    try {
      return await this.groupsService.joinGroup(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to join group', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.2: Leave group
  @Post(':id/leave')
  async leaveGroup(@Param('id') id: string, @Request() req) {
    try {
      await this.groupsService.leaveGroup(id, req.user.userId);
      return { message: 'Left group successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to leave group', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.14: Invite member to group (mod/admin)
  @Post(':id/invite')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async inviteMember(@Param('id') id: string, @Request() req, @Body() inviteMemberDto: InviteMemberDto) {
    try {
      return await this.groupsService.inviteMember(id, req.user.userId, inviteMemberDto.user_id);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to invite member', HttpStatus.BAD_REQUEST);
    }
  }

  // Get pending join requests
  @Get(':id/pending-members')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async getPendingMembers(@Param('id') id: string, @Request() req) {
    try {
      return await this.groupsService.getPendingMembers(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to get pending members', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.9: Approve member
  @Post(':id/members/:memberId/approve')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async approveMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    try {
      return await this.groupsService.approveMember(id, req.user.userId, memberId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to approve member', HttpStatus.BAD_REQUEST);
    }
  }

  // Reject member request
  @Post(':id/members/:memberId/reject')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async rejectMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    try {
      await this.groupsService.rejectMember(id, req.user.userId, memberId);
      return { message: 'Member request rejected' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to reject member', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.10: Remove/Block member
  @Delete(':id/members/:memberId')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    try {
      await this.groupsService.removeMember(id, req.user.userId, memberId);
      return { message: 'Member removed successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to remove member', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.11: Get members
  @Get(':id/members')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MEMBER, GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async getMembers(@Param('id') id: string, @Request() req, @Query('status') status?: string) {
    try {
      return await this.groupsService.getMembers(id, req.user.userId, status);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to get members', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.12: Update member role (admin only)
  @Put(':id/members/:memberId/role')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.ADMIN)
  async updateMemberRole(
    @Param('id') id: string, 
    @Param('memberId') memberId: string, 
    @Request() req, 
    @Body() updateRoleDto: UpdateMemberRoleDto
  ) {
    try {
      return await this.groupsService.updateMemberRole(id, req.user.userId, memberId, updateRoleDto.role);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to update member role', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.13: Transfer admin
  @Post(':id/transfer-admin')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.ADMIN)
  async transferAdmin(@Param('id') id: string, @Request() req, @Body() transferAdminDto: TransferAdminDto) {
    try {
      await this.groupsService.transferAdmin(id, req.user.userId, transferAdminDto.new_admin_id);
      return { message: 'Admin transferred successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to transfer admin', HttpStatus.BAD_REQUEST);
    }
  }

  // ============ GROUP POSTS ============

  // Create group post
  @Post(':id/posts')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MEMBER, GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async createPost(@Param('id') id: string, @Request() req, @Body() createPostDto: CreateGroupPostDto) {
    try {
      return await this.groupsService.createGroupPost(id, req.user.userId, createPostDto);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to create post', HttpStatus.BAD_REQUEST);
    }
  }

  // Get group posts (approved only for members)
  @Get(':id/posts')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MEMBER, GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async getPosts(@Param('id') id: string, @Request() req, @Query('status') status?: string) {
    try {
      // If user is moderator/admin, they can see all posts
      const member = req.groupMember;
      if (member.role === GroupMemberRole.MODERATOR || member.role === GroupMemberRole.ADMIN) {
        return await this.groupsService.getAllGroupPosts(id, req.user.userId, status);
      }
      // Regular members see only approved posts
      return await this.groupsService.getGroupPosts(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to get posts', HttpStatus.BAD_REQUEST);
    }
  }

  // Get pending posts (moderator/admin only)
  @Get(':id/posts/pending/list')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async getPendingPosts(@Param('id') id: string, @Request() req) {
    try {
      return await this.groupsService.getPendingPosts(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to get pending posts', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.6: Approve post
  @Post(':id/posts/:postId/approve')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async approvePost(@Param('id') id: string, @Param('postId') postId: string, @Request() req) {
    try {
      return await this.groupsService.approvePost(id, req.user.userId, postId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to approve post', HttpStatus.BAD_REQUEST);
    }
  }

  // Reject post
  @Post(':id/posts/:postId/reject')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async rejectPost(
    @Param('id') id: string, 
    @Param('postId') postId: string, 
    @Request() req, 
    @Body() rejectPostDto: RejectPostDto
  ) {
    try {
      await this.groupsService.rejectPost(id, req.user.userId, postId, rejectPostDto.rejected_reason);
      return { message: 'Post rejected' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to reject post', HttpStatus.BAD_REQUEST);
    }
  }

  // UC5.7: Delete post
  @Delete(':id/posts/:postId')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN)
  async deletePost(@Param('id') id: string, @Param('postId') postId: string, @Request() req) {
    try {
      await this.groupsService.deletePost(id, req.user.userId, postId);
      return { message: 'Post deleted successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to delete post', HttpStatus.BAD_REQUEST);
    }
  }
}
