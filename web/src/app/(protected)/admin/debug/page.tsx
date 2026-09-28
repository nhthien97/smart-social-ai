// src/app/(protected)/admin/debug/page.tsx
'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/axios'

export default function AdminDebugPage() {
  const [state, setState] = useState({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    token: 'checking...',
    adminUsersTest: null as any,
    error: null as any,
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get token from storage
        const authData = localStorage.getItem('auth-storage')
        const parsed = authData ? JSON.parse(authData) : null
        
        setState(prev => ({
          ...prev,
          token: parsed?.token ? `Present (${parsed.token.substring(0, 20)}...)` : 'Missing',
        }))

        // Try fetching admin users
        console.log('Attempting to fetch /admin/users')
        const response = await api.get('/admin/users')
        
        setState(prev => ({
          ...prev,
          adminUsersTest: {
            status: 'success',
            count: response.data.length,
            sample: response.data[0],
          },
        }))
      } catch (error: any) {
        console.error('Debug error:', error)
        setState(prev => ({
          ...prev,
          error: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method,
          },
        }))
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Admin Debug</h1>

      <div className="space-y-6">
        {/* API URL */}
        <div className="border rounded p-4 bg-white">
          <h2 className="font-bold mb-2">API URL</h2>
          <code className="bg-gray-100 p-2 block">{state.apiUrl}</code>
        </div>

        {/* Token */}
        <div className="border rounded p-4 bg-white">
          <h2 className="font-bold mb-2">Auth Token</h2>
          <code className="bg-gray-100 p-2 block">{state.token}</code>
        </div>

        {/* Test Result */}
        {state.adminUsersTest && (
          <div className="border rounded p-4 bg-green-50">
            <h2 className="font-bold mb-2 text-green-900">✅ /admin/users Test Success</h2>
            <pre className="bg-white p-2 rounded text-sm overflow-auto">
              {JSON.stringify(state.adminUsersTest, null, 2)}
            </pre>
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="border rounded p-4 bg-red-50">
            <h2 className="font-bold mb-2 text-red-900">❌ Error</h2>
            <pre className="bg-white p-2 rounded text-sm overflow-auto">
              {JSON.stringify(state.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
