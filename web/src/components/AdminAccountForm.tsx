// src/components/AdminAccountForm.tsx
'use client'

import { UserRoleAdmin } from '@/types'
import { FormEvent, useState } from 'react'

interface AdminAccountFormProps {
  initialData?: {
    username?: string
    email?: string
    full_name?: string
    role?: UserRoleAdmin
  }
  isEditMode?: boolean
  onSubmit: (data: any) => Promise<void>
  loading?: boolean
}

export default function AdminAccountForm({ initialData, isEditMode = false, onSubmit, loading = false }: AdminAccountFormProps) {
  const [formData, setFormData] = useState({
    username: initialData?.username || '',
    email: initialData?.email || '',
    full_name: initialData?.full_name || '',
    password: '',
    role: initialData?.role || ('MODERATOR' as UserRoleAdmin),
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.email || !formData.full_name) {
      setError('Please fill in all required fields')
      return
    }

    if (!isEditMode && !formData.password) {
      setError('Password is required for new admin accounts')
      return
    }

    if (!isEditMode && formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      const submitData = isEditMode
        ? {
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
          }
        : formData

      await onSubmit(submitData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {error && <div className="p-4 bg-red-100 text-red-800 rounded">{error}</div>}

      {!isEditMode && (
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            disabled={isEditMode}
            className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
            required={!isEditMode}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Full Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {!isEditMode && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Password <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 pr-10"
              required={!isEditMode}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-600"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Role <span className="text-red-600">*</span>
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="ADMIN">Super Admin</option>
          <option value="MODERATOR">Moderator</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create Admin Account'}
        </button>
      </div>
    </form>
  )
}
