// src/services/admin.service.ts
import {
  AdminAccount,
  CreateAdminAccountRequest,
  UpdateAdminAccountRequest,
  UpdateAdminRoleRequest,
} from '@/types'
import { useAuthStore } from '@/store/auth.store'

function readTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    // Prefer zustand in-memory token when available (faster during SPA navigation)
    try {
      const tokenFromStore = useAuthStore.getState?.().token
      if (tokenFromStore) return tokenFromStore
    } catch (e) {
      // ignore if zustand not initialized
    }

    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.token || parsed?.accessToken || parsed?.access_token || null
  } catch (e) {
    return null
  }
}

function authHeaders() {
  const token = readTokenFromStorage()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export const getAllAdminAccounts = async (): Promise<AdminAccount[]> => {
  const token = readTokenFromStorage()
  if (!token) {
    throw new Error('Unauthorized: please login')
  }

  try {
    const res = await fetch('/api/admin/accounts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 401) {
      throw new Error('Unauthorized')
    }

    const data = await res.json()
    const adminUsers = (data || [])
      .filter((u: any) => u.roles_admin && u.roles_admin.length > 0)
      .map((user: any) => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        roles_admin: user.roles_admin || [],
        status: user.status || 'ACTIVE',
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }))

    return adminUsers
  } catch (err: any) {
    console.error('getAllAdminAccounts error', err.message || err)
    throw new Error(err.message || 'Failed to fetch admin accounts')
  }
}

export const getAdminAccountById = async (id: string): Promise<AdminAccount> => {
  const token = readTokenFromStorage()
  if (!token) throw new Error('Unauthorized: please login')

  try {
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 404) throw new Error('Admin account not found')
    if (res.status === 401) throw new Error('Unauthorized')

    const user = await res.json()
    return user
  } catch (err: any) {
    console.error('getAdminAccountById error', err.message || err)
    throw new Error(err.message || 'Failed to fetch admin account')
  }
}

export const createAdminAccount = async (data: CreateAdminAccountRequest): Promise<AdminAccount> => {
  try {
    const token = readTokenFromStorage()
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    })

    if (res.status >= 400) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message || 'Failed to create admin account')
    }

    return await res.json()
  } catch (err: any) {
    console.error('createAdminAccount error', err.message || err)
    throw new Error(err.message || 'Failed to create admin account')
  }
}

export const updateAdminAccount = async (id: string, data: UpdateAdminAccountRequest): Promise<AdminAccount> => {
  const token = readTokenFromStorage()
  if (!token) throw new Error('Unauthorized: please login')

  try {
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (res.status === 401) throw new Error('Unauthorized')
    if (res.status >= 400) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message || 'Failed to update admin account')
    }

    return await res.json()
  } catch (err: any) {
    console.error('updateAdminAccount error', err.message || err)
    throw new Error(err.message || 'Failed to update admin account')
  }
}

export const updateAdminRole = async (id: string, data: UpdateAdminRoleRequest): Promise<AdminAccount> => {
  const token = readTokenFromStorage()
  if (!token) throw new Error('Unauthorized: please login')

  try {
    const res = await fetch(`/api/admin/accounts/${id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: data.role }),
    })

    if (res.status === 401) throw new Error('Unauthorized')
    if (res.status >= 400) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message || 'Failed to update admin role')
    }

    return await res.json()
  } catch (err: any) {
    console.error('updateAdminRole error', err.message || err)
    throw new Error(err.message || 'Failed to update admin role')
  }
}

export const updateAdminStatus = async (id: string, status: 'ACTIVE' | 'BLOCKED'): Promise<AdminAccount> => {
  const token = readTokenFromStorage()
  if (!token) throw new Error('Unauthorized: please login')

  try {
    const res = await fetch(`/api/admin/accounts/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    })

    if (res.status === 401) throw new Error('Unauthorized')
    if (res.status >= 400) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message || 'Failed to update admin status')
    }

    return await res.json()
  } catch (err: any) {
    console.error('updateAdminStatus error', err.message || err)
    throw new Error(err.message || 'Failed to update admin status')
  }
}

export const deleteAdminAccount = async (id: string) => {
  const token = readTokenFromStorage()
  if (!token) throw new Error('Unauthorized: please login')

  try {
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 401) throw new Error('Unauthorized')
    if (res.status >= 400) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message || 'Failed to delete admin account')
    }

    return await res.json()
  } catch (err: any) {
    console.error('deleteAdminAccount error', err.message || err)
    throw new Error(err.message || 'Failed to delete admin account')
  }
}
