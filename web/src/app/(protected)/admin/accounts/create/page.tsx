// src/app/(protected)/admin/accounts/create/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminAccountForm from '@/components/AdminAccountForm'
import RolePermissions from '@/components/RolePermissions'
import { createAdminAccount } from '@/services/admin.service'
import { UserRoleAdmin, CreateAdminAccountRequest } from '@/types'

export default function CreateAdminAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRoleAdmin>('MODERATOR')

  const handleSubmit = async (data: CreateAdminAccountRequest) => {
    setLoading(true)
    try {
      await createAdminAccount(data)
      router.push('/admin/accounts?success=Account created successfully')
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Admin Account</h1>
          <p className="text-gray-600 mt-1">Add a new administrator or moderator account</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <AdminAccountForm
              onSubmit={(data) => handleSubmit(data)}
              loading={loading}
              isEditMode={false}
            />
          </div>

          {/* Permissions Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Role Permissions</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <span className="font-semibold text-purple-900">Super Admin</span>
                <p className="text-purple-700 mt-1">Full access to all features</p>
              </div>
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <span className="font-semibold text-blue-900">Moderator</span>
                <p className="text-blue-700 mt-1">Content moderation & limited user management</p>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <span className="font-semibold text-gray-900">Viewer</span>
                <p className="text-gray-700 mt-1">View-only access to analytics & reports</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
