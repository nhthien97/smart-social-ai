
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, Request, UseGuards,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConversationsService } from './conversations.service';
import { CreatePrivateConversationDto, CreateGroupConversationDto, UpdateConversationDto } from './dto/conversation.dto';

@Controller('conversations')
@UseGuards(AuthGuard('jwt'))
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // ── Tạo cuộc trò chuyện riêng (1-1, chỉ bạn bè) ─────────────────────
  @Post('private')
  async createPrivate(@Request() req, @Body() dto: CreatePrivateConversationDto) {
    try {
      dto.creator_id = req.user.userId;
      return await this.conversationsService.createPrivate(dto);
    } catch (error) {
      throw new HttpException(error.message || 'Lỗi tạo hội thoại', error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Tạo nhóm chat ────────────────────────────────────────────────────
  @Post('group')
  async createGroup(@Request() req, @Body() dto: CreateGroupConversationDto) {
    try {
      dto.creator_id = req.user.userId;
      return await this.conversationsService.createGroup(dto);
    } catch (error) {
      throw new HttpException(error.message || 'Lỗi tạo nhóm', error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Danh sách hội thoại của tôi ───────────────────────────────────────
  @Get()
  async findMyConversations(@Request() req) {
    try {
      return await this.conversationsService.findByUser(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Chi tiết hội thoại ────────────────────────────────────────────────
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    try {
      return await this.conversationsService.findById(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.NOT_FOUND);
    }
  }

  // ── Cập nhật nhóm (tên, avatar) ──────────────────────────────────────
  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateConversationDto) {
    try {
      return await this.conversationsService.updateGroup(id, req.user.userId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Xoá / giải tán nhóm ──────────────────────────────────────────────
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    try {
      return await this.conversationsService.deleteConversation(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.FORBIDDEN);
    }
  }

  // ── Đánh dấu đã đọc ─────────────────────────────────────────────────
  @Post(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    try {
      return await this.conversationsService.markAsRead(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}
