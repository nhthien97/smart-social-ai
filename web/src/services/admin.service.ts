// src/services/admin.service.ts
import api from '@/lib/axios'
import { populateLastLoginData } from '@/lib/mockData'

// ============ Post Management ============

export const fetchAdminPosts = async (params?: {
  page?: number
  limit?: number
  status?: string
  search?: string
}) => {
  const response = await api.get('/admin/posts', { params })
  return response.data
}

export const fetchAdminPostById = async (id: string) => {
  const response = await api.get(`/admin/posts/${id}`)
  return response.data
}

export const hidePost = async (id: string) => {
  const response = await api.put(`/admin/posts/${id}/hide`)
  return response.data
}

export const showPost = async (id: string) => {
  const response = await api.put(`/admin/posts/${id}/show`)
  return response.data
}

export const deletePost = async (id: string) => {
  const response = await api.delete(`/admin/posts/${id}`)
  return response.data
}

// ============ Report Management ============

export const fetchAdminReports = async (params?: {
  page?: number
  limit?: number
  status?: string
}) => {
  const response = await api.get('/admin/reports', { params })
  return response.data
}

export const fetchReportStats = async () => {
  const response = await api.get('/admin/reports/stats')
  return response.data
}

export const fetchAdminReportById = async (id: string) => {
  const response = await api.get(`/admin/reports/${id}`)
  return response.data
}

export const resolveReport = async (id: string, data: {
  resolved_note: string
  action_taken?: string
}) => {
  const response = await api.put(`/admin/reports/${id}/resolve`, data)
  return response.data
}

export const rejectReport = async (id: string, data: {
  resolved_note: string
}) => {
  const response = await api.put(`/admin/reports/${id}/reject`, data)
  return response.data
}

// ============ Admin Account Management ============

export const getAllAdminAccounts = async (params?: {
  page?: number
  limit?: number
  role?: string
  status?: string
  search?: string
}): Promise<any[]> => {
  try {
    const response = await api.get('/admin/accounts', { params })
    const data = response.data
    
    // Log for debugging
    console.log('getAllAdminAccounts response:', data)
    
    // Handle both array response and object with data property
    let accounts = Array.isArray(data) ? data : data?.data || data?.accounts || []
    
    // Ensure all accounts have last_login data populated
    accounts = populateLastLoginData(accounts)
    
    console.log('Accounts with last_login populated:', accounts)
    return accounts
  } catch (error) {
    console.error('Failed to fetch admin accounts:', error)
    throw error
  }
}

export const getAdminAccountById = async (id: string) => {
  const response = await api.get(`/admin/accounts/${id}`)
  return response.data
}

export const updateAdminStatus = async (id: string, status: string) => {
  // backend exposes block/unblock on users (admin controller), adjust accordingly
  if (status === 'BLOCKED') {
    const response = await api.put(`/admin/users/${id}/block`)
    return response.data
  } else {
    const response = await api.put(`/admin/users/${id}/unblock`)
    return response.data
  }
}

export const createAdminAccount = async (data: {
  username: string
  email: string
  password: string
  full_name: string
  role?: string
}) => {
  // Step 1: Register the user
  const registerResponse = await api.post('/auth/register', {
    username: data.username,
    email: data.email,
    password: data.password,
    full_name: data.full_name,
  })

  const newUser = registerResponse.data

  // Step 2: Assign admin role if specified
  if (data.role && data.role !== 'NONE') {
    const userId = newUser._id || newUser.user?._id
    if (userId) {
      await api.post(`/admin/accounts/${userId}`, {
        role: data.role,
      })
    }
  }

  return newUser
}

export const updateAdminAccount = async (id: string, data: { role?: string; email?: string; full_name?: string }) => {
  if (data.role) {
    const response = await api.put(`/admin/accounts/${id}`, { role: data.role })
    return response.data
  }
  return { message: 'No changes applied' }
}

export const updateAdminRole = async (id: string, data: { role: string }) => {
  const response = await api.put(`/admin/accounts/${id}`, { role: data.role })
  return response.data
}

export const deleteAdminAccount = async (id: string) => {
  const response = await api.delete(`/admin/accounts/${id}`)
  return response.data
}
