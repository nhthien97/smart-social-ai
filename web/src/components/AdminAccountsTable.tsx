// src/components/AdminAccountsTable.tsx
'use client'

import { AdminAccount, UserRoleAdmin } from '@/types'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { updateAdminStatus, deleteAdminAccount } from '@/services/admin.service'
import { formatDateWithTooltip } from '@/lib/dateFormatter'

interface AdminAccountsTableProps {
  accounts: AdminAccount[]
  onRefresh: () => void
}

export default function AdminAccountsTable({ accounts, onRefresh }: AdminAccountsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // tick state forces periodic re-render so relative times update live
  const [, setTick] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(iv)
  }, [])

  // Log accounts data for debugging
  console.log('AdminAccountsTable received accounts:', accounts)

  const getRoleBadgeColor = (role: UserRoleAdmin): string => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'MODERATOR':
        return 'bg-blue-100 text-blue-800'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string): string => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
    setLoading(id)
    setError(null)
    try {
      await updateAdminStatus(id, newStatus)
      onRefresh()
    } catch (err) {
      setError('Failed to update status')
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this admin account?')) {
      setLoading(id)
      setError(null)
      try {
        await deleteAdminAccount(id)
        onRefresh()
      } catch (err) {
        setError('Failed to delete admin account')
        console.error(err)
      } finally {
        setLoading(null)
      }
    }
  }

  return (
    <div className="overflow-x-auto font-['Times_New_Roman'] text-gray-800">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-6 py-3 font-medium">ADMIN</th>
            <th className="px-6 py-3 font-medium">EMAIL</th>
            <th className="px-6 py-3 font-medium">ROLE</th>
            <th className="px-6 py-3 font-medium">STATUS</th>
            <th className="px-6 py-3 font-medium">LAST LOGIN</th>
            <th className="px-6 py-3 font-medium">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map((account) => (
            <tr key={account._id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-medium">
                {account.username}
              </td>

              <td className="px-6 py-4 font-medium">
                {account.email}
              </td>

              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                    account.roles_admin[0]
                  )}`}
                >
                  {account.roles_admin[0]}
                </span>
              </td>

              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                    account.status
                  )}`}
                >
                  {account.status}
                </span>
              </td>

              <td className="px-6 py-4 font-medium">
                {(() => {
                  console.log(`Rendering last_login for ${account.username}:`, account.last_login);
                  const { relative, full } = formatDateWithTooltip(account.last_login);
                  console.log(`Formatted as - relative: ${relative}, full: ${full}`);
                  return (
                    <div 
                      title={full}
                      className="cursor-help text-gray-700 hover:text-gray-900"
                    >
                      {relative}
                    </div>
                  );
                })()}
              </td>

              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/accounts/${account._id}`)}
                    className="text-blue-600 hover:text-blue-800 p-2"
                    title="Edit"
                    disabled={loading === account._id}
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() =>
                      handleStatusChange(account._id, account.status)
                    }
                    className={`p-2 ${
                      account.status === 'ACTIVE'
                        ? 'text-yellow-600 hover:text-yellow-800'
                        : 'text-green-600 hover:text-green-800'
                    }`}
                    title={
                      account.status === 'ACTIVE' ? 'Block' : 'Unblock'
                    }
                    disabled={loading === account._id}
                  >
                    {account.status === 'ACTIVE' ? '⛔' : '✅'}
                  </button>

                  <button
                    onClick={() => handleDelete(account._id)}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Delete"
                    disabled={loading === account._id}
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {accounts.length === 0 && (
        <div className="p-4 text-center text-gray-600">
          No admin accounts found
        </div>
      )}
    </div>
  )
}
