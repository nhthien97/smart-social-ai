'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize auth from localStorage/cookies on component mount
    useAuthStore.getState().initializeAuth()
  }, [])

  return <>{children}</>
}
