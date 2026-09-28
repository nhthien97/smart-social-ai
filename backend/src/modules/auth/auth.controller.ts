// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { FirebaseService } from '../../common/services/firebase.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
  ) {}

  // R1.4.1: Đăng ký tài khoản
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // R1.4.2: Đăng nhập
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req) {  
    // req.user được gán từ hàm validate() của JwtStrategy
    return req.user;
  }

  // Lấy Firebase Custom Token để Flutter sign in Firebase Auth
  // Dùng cho Firestore security rules xác thực user
  @UseGuards(AuthGuard('jwt'))
  @Get('firebase-token')
  async getFirebaseToken(@Request() req) {
    const userId = req.user.userId || req.user.user_id;
    const firebaseToken = await this.firebaseService.createCustomToken(String(userId));
    return { firebaseToken };
  }
}