// src/types/index.ts

// User types
export interface User {
  _id: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  fullName: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
export type GroupStatus = 'ACTIVE' | 'DISABLED'
export type GroupPrivacy = 'PUBLIC' | 'PRIVATE'

export interface Group {
  id: string
  name: string
  description: string
  owner: string
  members: number
  privacy: GroupPrivacy
  status: GroupStatus
  createdAt: string
}

// Admin types
export type UserRoleAdmin = 'ADMIN' | 'MODERATOR' | 'VIEWER'
export type UserStatus = 'ACTIVE' | 'BLOCKED'

export interface AdminAccount {
  _id: string
  username: string
  email: string
  full_name: string
  roles_admin: UserRoleAdmin[]
  status: UserStatus
  last_login?: string
  created_at: string
  updated_at: string
}

export interface CreateAdminAccountRequest {
  username: string
  email: string
  full_name: string
  password: string
  role: UserRoleAdmin
}

export interface UpdateAdminAccountRequest {
  full_name?: string
  email?: string
}

export interface UpdateAdminRoleRequest {
  role: UserRoleAdmin
}

