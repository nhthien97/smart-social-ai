// src/app/(protected)/admin/system-settings/page.tsx
'use client'

import SystemSettingsForm from '@/components/system-settings/SystemSettingsForm'
import { useState } from 'react'

export default function SystemSettingsPage() {
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">
            System Settings
          </h1>
          <p className="text-gray-600 mt-1">
            View and edit configuration values used by the backend and Flutter
            client
          </p>
        </div>

        <SystemSettingsForm onSaved={() => setSavedAt(new Date())} />

        {savedAt && (
          <p className="mt-3 text-sm text-gray-500">Last saved: {savedAt.toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}
