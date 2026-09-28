// src/app/(protected)/admins/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/accounts')
  }, [router])

  return null
}
