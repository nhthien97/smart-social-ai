// src/app/api/admin/accounts/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const { id } = await params
    const body = await request.json()

    // Update user status via block/unblock endpoints
    const endpoint = body.status === 'BLOCKED' 
      ? `/admin/users/${id}/block` 
      : `/admin/users/${id}/unblock`

    const response = await apiClient.put(endpoint, {}, {
      headers: {
        Authorization: authHeader || '',
      },
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error updating admin status:', error.message)
    return NextResponse.json(
      { error: 'Failed to update admin status' },
      { status: error.response?.status || 500 }
    )
  }
}
