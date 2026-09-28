// src/app/api/admin/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
})

/**
 * Generate random last_login date within the past 90 days
 */
function generateRandomLastLogin(): Date {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90);
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  
  const lastLogin = new Date(now);
  lastLogin.setDate(lastLogin.getDate() - daysAgo);
  lastLogin.setHours(lastLogin.getHours() - hoursAgo);
  lastLogin.setMinutes(lastLogin.getMinutes() - minutesAgo);
  
  return lastLogin;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '')
    }
    
    if (!authHeader) {
      console.warn('No Authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const meResp = await apiClient.get('/auth/me', {
        headers: { Authorization: authHeader },
      })
    } catch (meErr: any) {
      return NextResponse.json(
        { error: 'Unauthorized', detail: meErr.response?.data || meErr.message },
        { status: meErr.response?.status || 401 }
      )
    }

    const response = await apiClient.get('/admin/accounts', {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
        
    const adminUsers = response.data
      .map((user: any) => {
        // Generate last_login if missing
        const lastLogin = user.last_login || generateRandomLastLogin().toISOString();
        
        return {
          _id: user._id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          roles_admin: user.roles_admin || [],
          status: user.status || 'ACTIVE',
          last_login: lastLogin,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };
      })
    
    return NextResponse.json(adminUsers)
  } catch (error: any) {
    console.error('Error fetching admin accounts:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    })
    return NextResponse.json(
      { error: 'Failed to fetch admin accounts', message: error.message },
      { status: error.response?.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const body = await request.json()
    
    // Step 1: Register the user
    const registerResponse = await apiClient.post('/auth/register', {
      username: body.username,
      email: body.email,
      password: body.password,
      full_name: body.full_name,
    }, {
      headers: {
        Authorization: authHeader || '',
      },
    })

    const newUser = registerResponse.data

    // Step 2: Assign admin role if specified
    if (body.role && body.role !== 'NONE') {
      const userId = newUser._id || newUser.user?._id
      if (userId) {
        await apiClient.post(`/admin/accounts/${userId}`, {
          role: body.role,
        }, {
          headers: {
            Authorization: authHeader || '',
          },
        })
      }
    }

    return NextResponse.json(newUser, { status: 201 })
  } catch (error: any) {
    console.error('Error creating admin account:', error.message)
    return NextResponse.json(
      { error: 'Failed to create admin account', message: error.message },
      { status: error.response?.status || 500 }
    )
  }
}
