import axios from '@/lib/axios'

export interface SystemSetting {
  _id: string
  setting_key: string
  setting_value: string
  data_type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  is_public: boolean
  updated_by?: string
  createdAt: string
  updatedAt: string
}

export const fetchSystemSettings = async (params?: any) => {
  // backend endpoint uses /admin/settings
  const res = await axios.get('/admin/settings', { params })
  return res.data
}

export const createSystemSetting = async (data: any) => {
  const res = await axios.post('/admin/settings', data)
  return res.data
}

export const updateSystemSetting = async (key: string, data: any) => {
  const res = await axios.put(`/admin/settings/${key}`, data)
  return res.data
}

export const deleteSystemSetting = async (key: string) => {
  const res = await axios.delete(`/admin/settings/${key}`)
  return res.data
}

export const fetchSystemLogs = async (params?: any) => {
  const res = await axios.get('/admin/system-logs', { params })
  return res.data
}