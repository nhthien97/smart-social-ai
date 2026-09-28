import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';

import { AdminService } from '../../modules/admin/admin.service';
import { UsersService } from '../../modules/users/users.service';
import { FirebaseService } from '../../common/services/firebase.service';
import { UserRoleAdmin } from '../../modules/users/schemas/user.scheme';

describe('AdminService White Box Test', () => {
  let service: AdminService;

  const userModelMock = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const settingModelMock = {
    findOneAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,

        {
          provide: getModelToken('SystemLogs'),
          useValue: {},
        },
        {
          provide: getModelToken('SystemSettings'),
          useValue: settingModelMock,
        },
        {
          provide: getModelToken('UserActivityLog'),
          useValue: {},
        },
        {
          provide: getModelToken('Group'),
          useValue: {},
        },
        {
          provide: getModelToken('GroupMember'),
          useValue: {},
        },
        {
          provide: getModelToken('Post'),
          useValue: {},
        },
        {
          provide: getModelToken('User'),
          useValue: userModelMock,
        },
        {
          provide: getModelToken('Report'),
          useValue: {},
        },

        {
          provide: UsersService,
          useValue: {},
        },

        {
          provide: FirebaseService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('WB5 - Reject NONE role', async () => {
    await expect(
      service.addAdminAccount('123', UserRoleAdmin.NONE),
    ).rejects.toThrow();
  });

  it('WB6 - Cannot modify ADMIN account', async () => {
    userModelMock.findById.mockReturnValue({
      select: () => ({
        exec: () =>
          Promise.resolve({
            roles_admin: [UserRoleAdmin.ADMIN],
          }),
      }),
    });

    await expect(
      service.updateAdminAccount('123', UserRoleAdmin.MODERATOR),
    ).rejects.toThrow();
  });

  it('WB7 - Delete setting not found', async () => {
    settingModelMock.findOneAndDelete.mockReturnValue({
      exec: () => Promise.resolve(null),
    });

    await expect(
      service.deleteSetting('maintenance_mode', 'admin-id'),
    ).rejects.toThrow(NotFoundException);
  });
});
