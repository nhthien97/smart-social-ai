// src/app/api/admins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const { id } = await params

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await apiClient.get(`/admin/users`, {
      headers: { Authorization: authHeader },
    })

    const user = response.data.find((u: any) => u._id === id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error in /api/admins/[id]:', error.message)
    return NextResponse.json({ error: 'Failed to fetch admin' }, { status: error.response?.status || 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const { id } = await params
    const body = await request.json()

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await apiClient.put(`/users/${id}`, body, {
      headers: { Authorization: authHeader },
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error in PUT /api/admins/[id]:', error.message)
    return NextResponse.json({ error: 'Failed to update admin' }, { status: error.response?.status || 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const { id } = await params

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await apiClient.delete(`/admin/users/${id}`, {
      headers: { Authorization: authHeader },
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error in DELETE /api/admins/[id]:', error.message)
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: error.response?.status || 500 })
  }
}
