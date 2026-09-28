// src/lib/axios.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

// Tạo một instance axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header to each request. Prefer zustand token but
// fall back to persisted localStorage entry so requests from refreshed pages
// still include the JWT.
api.interceptors.request.use(
  (config) => {
    try {
      // Try zustand first
      let token = useAuthStore.getState?.().token

      // If not found, try localStorage (persisted zustand key)
      if (!token && typeof window !== 'undefined') {
        const raw = localStorage.getItem('auth-storage')
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            token = parsed?.token || parsed?.accessToken || parsed?.access_token
          } catch (e) {
            // ignore
          }
        }
      }

      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      // do not block requests on token errors
      // console.warn('Failed to attach auth token', e)
    }

    return config
  },
  (error) => Promise.reject(error)
)

export default api;