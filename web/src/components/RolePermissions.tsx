
'use client'

import { Shield, Check } from 'lucide-react'

const ROLE_PERMISSIONS = {
  ADMIN: {
    title: 'Super Admin',
    color: 'admin',
    description: 'Full access to platform administration',
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
    color: 'moderator',
    description: 'Manage users and moderate content',
    permissions: [
      'View Analytics',
      'Content Moderation',
      'User Management (Limited)',
    ],
  },
  VIEWER: {
    title: 'Viewer',
    color: 'viewer',
    description: 'Read-only access to analytics and reports',
    permissions: ['View Analytics', 'View Reports'],
  },
}

export default function RolePermissions({
  selectedRole,
}: { selectedRole?: string } = {}) {
  const entries = selectedRole
    ? Object.entries(ROLE_PERMISSIONS).filter(([role]) => role === selectedRole)
    : Object.entries(ROLE_PERMISSIONS)

  return (
    <div
      className={`accounts-permissions-grid ${
        selectedRole ? 'is-single' : ''
      }`}
    >
      {entries.map(([role, data]) => (
        <section
          key={role}
          className={`accounts-permission-card role-${data.color}`}
        >
          <div className="accounts-permission-header">
            <div className="accounts-permission-icon">
              <Shield size={22} strokeWidth={2} />
            </div>

            <div className="accounts-permission-heading">
              <h3>{data.title}</h3>
              <p>{data.description}</p>
            </div>
          </div>

          <div className="accounts-permission-divider" />

          <p className="accounts-permission-label">PERMISSIONS</p>

          <ul className="accounts-permission-list">
            {data.permissions.map((permission) => (
              <li
                key={permission}
                className="accounts-permission-item"
              >
                <span className="accounts-permission-check">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                <span>{permission}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
