// src/app/api/admin/accounts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const { id } = await params

    const response = await apiClient.get(`/admin/accounts/${id}`, {
      headers: {
        Authorization: authHeader || '',
      },
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error fetching admin account:', error.message)
    return NextResponse.json({ error: 'Failed to fetch admin account' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const { id } = await params
    const body = await request.json()

    const response = await apiClient.put(`/admin/accounts/${id}`, { role: body.role }, {
      headers: {
        Authorization: authHeader || '',
      },
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error updating admin account:', error.message)
    return NextResponse.json(
      { error: 'Failed to update admin account' },
      { status: error.response?.status || 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const { id } = await params

    const response = await apiClient.delete(`/admin/accounts/${id}`, {
      headers: {
        Authorization: authHeader || '',
      },
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error deleting admin account:', error.message)
    return NextResponse.json(
      { error: 'Failed to delete admin account' },
      { status: error.response?.status || 500 }
    )
  }
}
