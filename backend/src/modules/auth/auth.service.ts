// src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'modules/users/users.service';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/schemas/user-activity-log.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AdminService)) private adminService: AdminService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, full_name } = registerDto;

    // (khuyên) check cả username nếu bạn cho login bằng username
    const existingEmail = await this.usersService.findOneByEmail(email);
    if (existingEmail) throw new ConflictException('Email already exists');

    // Nếu có hàm findOneByUsername thì check luôn
    const existingUsername = await this.usersService.findOneByUsername(username);
    if (existingUsername) throw new ConflictException('Username already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser({
      username,
      email,
      full_name,
      password: hashedPassword,
    });

    const { password: _pw, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    // 1) Xác định identifier là email hay username
    const normalized = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

    // 2) Tìm user theo email hoặc username
    const user = isEmail
      ? await this.usersService.findOneByEmail(normalized.toLowerCase())
      : await this.usersService.findOneByUsername(normalized);

    if (!user) {
      this.logger.warn(`Login failed: user not found for identifier="${normalized}"`);
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    // 3) So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      this.logger.warn(`Login failed: wrong password for identifier="${normalized}"`);
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    // 4) Kiểm tra tài khoản bị khóa
    if (user.status === 'BLOCKED') {
      this.logger.warn(`Login failed: user is blocked identifier="${normalized}"`);
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa do vi phạm chính sách cộng đồng.');
    }

    // 5) Tạo JWT (nên dùng key thống nhất)
    const payload = {
      sub: String(user._id),
      email: user.email,
      roles_admin: user.roles_admin,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Ghi user activity log
    this.adminService.writeUserActivity(String(user._id), ActivityType.LOGIN).catch(() => {});

    return {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.full_name,
        roles_admin: user.roles_admin,
      },
    };
  }

}