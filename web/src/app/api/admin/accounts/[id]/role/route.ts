// src/app/api/admin/accounts/[id]/role/route.ts
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

    // Update user's role - backend endpoint: PUT /admin/accounts/:id
    const response = await apiClient.put(`/admin/accounts/${id}`, { role: body.role }, {
      headers: {
        Authorization: authHeader || '',
      },
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error updating admin role:', error.message)
    return NextResponse.json(
      { error: 'Failed to update admin role' },
      { status: error.response?.status || 500 }
    )
  }
}
