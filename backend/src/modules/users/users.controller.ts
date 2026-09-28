import { Controller, Get, Patch, Post, Request, UseGuards, Body, HttpCode, HttpStatus, Param, HttpException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Lấy thông tin profile của user hiện tại
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.user_id);
  }

  // Cập nhật profile
  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  updateProfile(
    @Request() req,
    @Body() body: {
      full_name?: string;
      bio?: string;
      phone?: string;
      gender?: string;
      birthdate?: Date;
      job?: string;
      location?: string;
      avatar_url?: string;
      cover_url?: string;
    },
  ) {
    return this.usersService.updateProfile(req.user.user_id, body);
  }

  // Đổi password
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Request() req, @Body() body: { old_password: string; new_password: string }) {
    return this.usersService.changePassword(req.user.user_id, body.old_password, body.new_password);
  }

  // Cập nhật avatar
  @UseGuards(AuthGuard('jwt'))
  @Post('avatar')
  updateAvatar(@Request() req, @Body() body: { avatar_url: string }) {
    return this.usersService.updateAvatar(req.user.user_id, body.avatar_url);
  }

  // UC1.7: Xem profile của người dùng khác (xem bằng cách ấn vào avatar)
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    try {
      return this.usersService.getPublicProfile(id);
    } catch (error) {
      throw new HttpException(error.message || 'User not found', error.status || 404);
    }
  }

  // 🔧 TEMPORARY: Set current user as admin (remove after first use)
  @UseGuards(AuthGuard('jwt'))
  @Post('make-me-admin')
  @HttpCode(HttpStatus.OK)
  async makeMeAdmin(@Request() req) {
    return this.usersService.setUserAdminRole(req.user.user_id);
  }
}
