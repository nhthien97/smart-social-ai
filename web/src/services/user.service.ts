// src/services/user.service.ts
import api from '@/lib/axios'

export interface UpdateProfileData {
  full_name?: string
  username?: string
  email?: string
  phone?: string
}

export interface UpdatePreferencesData {
  email_notifications?: boolean
  two_factor_auth?: boolean
  activity_alerts?: boolean
}

export interface ChangePasswordData {
  old_password: string
  new_password: string
}

/**
 * Lấy thông tin user hiện tại
 */
export const fetchUserMe = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

/**
 * Cập nhật thông tin cá nhân
 */
export const updateUserProfile = async (data: UpdateProfileData) => {
  const response = await api.patch('/users/profile', data)
  return response.data
}

/**
 * Cập nhật preferences
 */
export const updateUserPreferences = async (data: UpdatePreferencesData) => {
  const response = await api.patch('/users/preferences', data)
  return response.data
}

/**
 * Đổi mật khẩu
 */
export const changePassword = async (data: ChangePasswordData) => {
  const response = await api.post('/users/change-password', data)
  return response.data
}

/**
 * Upload ảnh đại diện
 */
export const uploadAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
