// src/app/api/admins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('API /api/admins GET - forwarding to /admin/users')
    const response = await apiClient.get('/admin/users', {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    
    // Filter only users with admin roles
    const adminUsers = response.data
      .filter((user: any) => user.roles_admin && user.roles_admin.length > 0)
      .map((user: any) => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        roles_admin: user.roles_admin || [],
        status: user.status || 'ACTIVE',
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }))
    
    return NextResponse.json(adminUsers)
  } catch (error: any) {
    console.error('Error in /api/admins:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch admin accounts', message: error.message },
      { status: error.response?.status || 500 }
    )
  }
}
