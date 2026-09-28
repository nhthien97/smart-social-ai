// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRoleAdmin } from 'modules/users/schemas/user.scheme';

// Tên của metadata key
export const ROLES_KEY = 'roles';

// Decorator @Roles() sẽ nhận vào các vai trò
// Ví dụ: @role_admin(UserRoleAdmin.SUPER_ADMIN) 
export const Roles = (...roles: UserRoleAdmin[]) =>
SetMetadata(ROLES_KEY, roles);