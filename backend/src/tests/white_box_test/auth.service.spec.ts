import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

import { AuthService } from '../../modules/auth/auth.service';
import { UsersService } from '../../modules/users/users.service';
import { AdminService } from '../../modules/admin/admin.service';

describe('AuthService White Box Test', () => {
  let service: AuthService;

  const mockUsersService = {
    findOneByEmail: jest.fn(),
    findOneByUsername: jest.fn(),
    createUser: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockAdminService = {
    writeUserActivity: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login()', () => {
    it('WB3 - Wrong password', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        password: 'hashed-password',
        status: 'ACTIVE',
      });

      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        service.login({
          identifier: 'abc@gmail.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('WB4 - Blocked account', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        password: 'hashed-password',
        status: 'BLOCKED',
      });

      (bcrypt.compare as any).mockResolvedValue(true);

      await expect(
        service.login({
          identifier: 'abc@gmail.com',
          password: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
