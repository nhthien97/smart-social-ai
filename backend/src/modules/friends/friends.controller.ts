
import { Controller, Get, UseGuards, Request, Post, Body, Param, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.user_id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('requests')
  async getRequests(@Request() req) {
    return this.friendsService.getRequests(req.user.user_id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('suggestions')
  async getSuggestions(@Request() req) {
    return this.friendsService.getSuggestions(req.user.user_id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('check/:userId')
  async checkFriendship(@Request() req, @Param('userId') userId: string) {
    return this.friendsService.checkFriendship(req.user.user_id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('requests')
  async sendRequest(@Request() req, @Body() body: { to: string }) {
    return this.friendsService.sendRequest(req.user.user_id, body.to);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('requests/sent')
  async getSentRequests(@Request() req) {
    return this.friendsService.getSentRequests(req.user.user_id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('requests/:id/cancel')
  async cancelSentRequest(@Request() req, @Param('id') id: string) {
    return this.friendsService.cancelSentRequest(req.user.user_id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('requests/:id/accept')
  async accept(@Request() req, @Param('id') id: string) {
    return this.friendsService.acceptRequest(req.user.user_id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('requests/:id/reject')
  async reject(@Request() req, @Param('id') id: string) {
    return this.friendsService.rejectRequest(req.user.user_id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.friendsService.removeFriend(req.user.user_id, id);
  }
}
