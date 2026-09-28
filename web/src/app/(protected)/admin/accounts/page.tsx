// src/app/(protected)/admin/accounts/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AdminAccountsTable from '@/components/AdminAccountsTable'
import RolePermissions from '@/components/RolePermissions'
import { getAllAdminAccounts } from '@/services/admin.service'
import { AdminAccount } from '@/types'

const AUTO_REFRESH_INTERVAL = 30000 // 30 seconds

export default function AdminAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAccounts = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setIsRefreshing(true)
    setError(null)
    try {
      const data = await getAllAdminAccounts()
      console.log('Fetched accounts data:', data)
      setAccounts(data)
      setLastRefresh(new Date())
    } catch (err: any) {
      const errorMsg = err?.message || err?.response?.data?.message || 'Failed to load admin accounts'
      console.error('Error details:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAccounts(true)
  }, [])

  // Auto-refresh interval
  useEffect(() => {
    if (!showPermissions && accounts.length > 0) {
      // Set up auto-refresh after initial load
      intervalRef.current = setInterval(() => {
        console.log('Auto-refreshing admin accounts...')
        fetchAccounts(false)
      }, AUTO_REFRESH_INTERVAL)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [showPermissions, accounts.length])

  const handleRefresh = () => {
    fetchAccounts(false)
  }

  const formatLastRefresh = () => {
    if (!lastRefresh) return ''
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return lastRefresh.toLocaleTimeString()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Accounts</h1>
            <p className="text-gray-600 mt-1">Manage administrator and moderator accounts</p>
          </div>
          <button
            onClick={() => router.push('/admin/accounts/create')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Admin
          </button>
        </div>

        {/* Toggle Button with Refresh Status */}
        <div className="mb-6 flex gap-3 items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              className={`px-4 py-2 rounded-lg font-medium ${!showPermissions ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              👥 Accounts
            </button>
            <button
              onClick={() => setShowPermissions(true)}
              className={`px-4 py-2 rounded-lg font-medium ${showPermissions ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              🔐 Permissions
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleRefresh()}
              disabled={isRefreshing}
              className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span className={isRefreshing ? 'inline-block animate-spin' : ''}>🔄</span>
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </button>
            <span className="text-xs text-gray-500">
              {!showPermissions && lastRefresh && `Updated: ${formatLastRefresh()}`}
            </span>
          </div>
        </div>

        {error && <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="text-gray-600 mt-2">Loading admin accounts...</p>
          </div>
        ) : showPermissions ? (
          <RolePermissions />
        ) : (
          <div className="bg-white rounded-lg shadow">
            <AdminAccountsTable accounts={accounts} onRefresh={handleRefresh} />
          </div>
        )}
      </div>
    </div>
  )
}
