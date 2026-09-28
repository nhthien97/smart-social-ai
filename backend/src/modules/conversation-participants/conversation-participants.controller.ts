
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Request, UseGuards,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConversationParticipantsService } from './conversation-participants.service';
import { UpdateRoleDto, UpdateNicknameDto } from './dto/participant.dto';

@Controller('conversation-participants')
@UseGuards(AuthGuard('jwt'))
export class ConversationParticipantsController {
  constructor(
    private readonly participantsService: ConversationParticipantsService,
  ) {}

  // ── Danh sách thành viên ──────────────────────────────────────────────
  @Get(':convId')
  async getMembers(@Param('convId') convId: string) {
    try {
      return await this.participantsService.getMembers(convId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Thêm thành viên ──────────────────────────────────────────────────
  @Post(':convId/add/:userId')
  async addMember(
    @Request() req,
    @Param('convId') convId: string,
    @Param('userId') userId: string,
  ) {
    try {
      return await this.participantsService.addMember(convId, req.user.userId, userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Xóa thành viên ───────────────────────────────────────────────────
  @Delete(':convId/remove/:userId')
  async removeMember(
    @Request() req,
    @Param('convId') convId: string,
    @Param('userId') userId: string,
  ) {
    try {
      return await this.participantsService.removeMember(convId, req.user.userId, userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Rời nhóm ─────────────────────────────────────────────────────────
  @Post(':convId/leave')
  async leaveGroup(@Request() req, @Param('convId') convId: string) {
    try {
      return await this.participantsService.leaveGroup(convId, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Đổi vai trò thành viên ───────────────────────────────────────────
  @Put(':convId/:userId/role')
  async updateRole(
    @Request() req,
    @Param('convId') convId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    try {
      return await this.participantsService.updateRole(convId, req.user.userId, userId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Chuyển quyền nhóm trưởng ─────────────────────────────────────────
  @Post(':convId/transfer-leadership/:userId')
  async transferLeadership(
    @Request() req,
    @Param('convId') convId: string,
    @Param('userId') userId: string,
  ) {
    try {
      return await this.participantsService.transferLeadership(convId, req.user.userId, userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Đổi biệt danh ────────────────────────────────────────────────────
  @Put(':convId/:userId/nickname')
  async updateNickname(
    @Request() req,
    @Param('convId') convId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateNicknameDto,
  ) {
    try {
      return await this.participantsService.updateNickname(convId, userId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Chặn người dùng (chat riêng) – UC4.12 ──────────────────────────
  @Post(':convId/block')
  async blockUser(@Request() req, @Param('convId') convId: string) {
    try {
      return await this.participantsService.blockUser(convId, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Bỏ chặn người dùng (chat riêng) – UC4.13 ───────────────────────
  @Post(':convId/unblock')
  async unblockUser(@Request() req, @Param('convId') convId: string) {
    try {
      return await this.participantsService.unblockUser(convId, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Xóa lịch sử chat phía mình ───────────────────────────────────────
  @Post(':convId/clear-history')
  async clearHistory(@Request() req, @Param('convId') convId: string) {
    try {
      return await this.participantsService.clearHistory(convId, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}
