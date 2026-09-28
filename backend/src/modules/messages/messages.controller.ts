
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, Request, UseGuards,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { SendMessageDto, SharePostDto, EditMessageDto } from './dto/message.dto';

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ── Gửi tin nhắn ─────────────────────────────────────────────────────
  @Post('send')
  async send(@Request() req, @Body() dto: SendMessageDto) {
    try {
      dto.sender_id = req.user.userId;
      return await this.messagesService.send(dto);
    } catch (error) {
      throw new HttpException(error.message || 'Lỗi gửi tin nhắn', error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Chia sẻ bài viết qua chat ────────────────────────────────────────
  @Post('share')
  async sharePost(@Request() req, @Body() dto: SharePostDto) {
    try {
      dto.sender_id = req.user.userId;
      return await this.messagesService.sharePost(dto);
    } catch (error) {
      throw new HttpException(error.message || 'Lỗi chia sẻ bài viết', error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Danh sách tin nhắn theo cuộc trò chuyện (phân trang cursor) ──────
  @Get('conversation/:convId')
  async findByConversation(
    @Request() req,
    @Param('convId') convId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      return await this.messagesService.findByConversation(
        convId,
        req.user.userId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 30,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Chỉnh sửa tin nhắn ───────────────────────────────────────────────
  @Put(':id/edit')
  async edit(@Request() req, @Param('id') id: string, @Body() dto: EditMessageDto) {
    try {
      return await this.messagesService.edit(id, req.user.userId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Thu hồi tin nhắn ─────────────────────────────────────────────────
  @Put(':id/recall')
  async recall(@Request() req, @Param('id') id: string) {
    try {
      return await this.messagesService.recall(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Xóa tin nhắn phía mình ───────────────────────────────────────────
  @Delete(':id')
  async softDelete(@Request() req, @Param('id') id: string) {
    try {
      return await this.messagesService.softDelete(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ── Xóa toàn bộ lịch sử (phía mình) ─────────────────────────────────
  @Delete('conversation/:convId/history')
  async deleteHistory(@Request() req, @Param('convId') convId: string) {
    try {
      return await this.messagesService.deleteHistory(convId, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}
