// src/app/(protected)/admin/accounts/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminAccountForm from '@/components/AdminAccountForm'
import RolePermissions from '@/components/RolePermissions'
import { getAdminAccountById, updateAdminAccount, updateAdminRole } from '@/services/admin.service'
import { AdminAccount, UpdateAdminAccountRequest, UserRoleAdmin } from '@/types'

export default function EditAdminAccountPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [account, setAccount] = useState<AdminAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRoleAdmin>()

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const data = await getAdminAccountById(id)
        setAccount(data)
        setSelectedRole(data.roles_admin[0])
      } catch (err) {
        setError('Failed to load admin account')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAccount()
  }, [id])

  const handleSubmit = async (data: UpdateAdminAccountRequest | any) => {
    setSubmitting(true)
    setError(null)
    try {
      // Update account info
      if (data.email || data.full_name) {
        await updateAdminAccount(id, data)
      }
      
      // Update role if changed
      if (data.role && data.role !== account?.roles_admin[0]) {
        await updateAdminRole(id, { role: data.role })
      }
      
      router.push('/admin/accounts?success=Account updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-2xl">⏳</div>
          <p className="text-gray-600 mt-2">Loading admin account...</p>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-4">
            ← Back
          </button>
          <div className="bg-red-100 text-red-800 p-4 rounded-lg">{error || 'Admin account not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Admin Account</h1>
          <p className="text-gray-600 mt-1">Update administrator details and permissions</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <AdminAccountForm
              initialData={{
                username: account.username,
                email: account.email,
                full_name: account.full_name,
                role: account.roles_admin[0],
              }}
              isEditMode={true}
              onSubmit={handleSubmit}
              loading={submitting}
            />
          </div>

          {/* Info */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Username</span>
                  <p className="font-medium">{account.username}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status</span>
                  <p className={`font-medium ${account.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                    {account.status}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Created</span>
                  <p className="font-medium">{new Date(account.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-600">Last Login</span>
                  <p className="font-medium">{account.last_login ? new Date(account.last_login).toLocaleString() : 'Never'}</p>
                </div>
              </div>
            </div>

            {/* Current Role Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Current Role</h3>
              <RolePermissions selectedRole={account.roles_admin[0]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
