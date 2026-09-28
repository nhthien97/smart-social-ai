'use client'

import { UserRoleAdmin } from '@/types'
import { Shield } from 'lucide-react'

const ROLE_PERMISSIONS = {
  ADMIN: {
    title: 'Super Admin',
    color: 'text-purple-600',
    permissions: [
      'All Permissions',
      'User Management',
      'Content Moderation',
      'System Settings',
      'Admin Management',
    ],
  },
  MODERATOR: {
    title: 'Moderator',
    color: 'text-blue-600',
    permissions: [
      'View Analytics',
      'Content Moderation',
      'User Management (Limited)',
    ],
  },
  VIEWER: {
    title: 'Viewer',
    color: 'text-gray-600',
    permissions: ['View Analytics', 'View Reports'],
  },
}

export default function RolePermissions({ selectedRole }: { selectedRole?: string } = {}) {
  const entries = selectedRole
    ? Object.entries(ROLE_PERMISSIONS).filter(([role]) => role === selectedRole)
    : Object.entries(ROLE_PERMISSIONS)

  return (
    <div className={`grid grid-cols-1 ${selectedRole ? '' : 'md:grid-cols-3'} gap-8 font-['Times_New_Roman'] text-gray-800`}>
      {entries.map(([role, data]) => (
        <div
          key={role}
          className="bg-white rounded-xl shadow-sm border p-6"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Shield className={`w-5 h-5 ${data.color}`} />
            <h3 className="text-lg font-medium">
              {data.title}
            </h3>
          </div>

          {/* Permissions */}
          <ul className="space-y-3">
            {data.permissions.map((perm, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm font-medium">
                  {perm}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}