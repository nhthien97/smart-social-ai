'use client'

import { useEffect, useState } from 'react'
import {
  fetchSystemSettings,
  updateSystemSetting,
  deleteSystemSetting,
  SystemSetting,
} from '@/services/settings.service'

interface Props {
  onSaved?: () => void
}

export default function SystemSettingsForm({ onSaved }: Props) {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<SystemSetting>>({})

  const load = async () => {
    try {
      const data = await fetchSystemSettings()
      setSettings(data || [])
    } catch (err) {
      console.error('Failed to load settings', err)
    }
  }

  useEffect(() => {
    load()
    // Auto-refresh settings every 30 seconds for real-time sync
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const startEdit = (setting: SystemSetting) => {
    setEditingKey(setting.setting_key)
    setDraft({ ...setting })
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setDraft({})
  }

  const saveEdit = async () => {
    if (!editingKey) return
    try {
      const payload: any = {}
      if (draft.setting_value !== undefined) payload.setting_value = draft.setting_value
      if (draft.description !== undefined) payload.description = draft.description
      if (draft.is_public !== undefined) payload.is_public = draft.is_public
      await updateSystemSetting(editingKey, payload)
      setEditingKey(null)
      await load()
      onSaved?.()
    } catch (err) {
      console.error('Failed to save setting', err)
    }
  }

  const removeSetting = async (key: string) => {
    if (!confirm('Bạn có chắc muốn xóa setting này?')) return
    try {
      await deleteSystemSetting(key)
      await load()
      onSaved?.()
    } catch (err) {
      console.error('Failed to delete setting', err)
    }
  }

  // Group settings by category
  const categorizedSettings = {
    'Bài viết & Upload': settings.filter(s =>
      ['max_post_length', 'max_upload_size_mb', 'max_images_per_post', 'allowed_image_types'].includes(s.setting_key)
    ),
    'Nhóm': settings.filter(s =>
      ['max_group_members', 'max_groups_per_user'].includes(s.setting_key)
    ),
    'Tài khoản & Bảo mật': settings.filter(s =>
      ['allow_registration', 'max_warnings_before_ban', 'default_avatar_url'].includes(s.setting_key)
    ),
    'Hệ thống': settings.filter(s =>
      ['maintenance_mode', 'maintenance_message'].includes(s.setting_key)
    ),
    'Khác': settings.filter(s =>
      ![
        'max_post_length', 'max_upload_size_mb', 'max_images_per_post', 'allowed_image_types',
        'max_group_members', 'max_groups_per_user',
        'allow_registration', 'max_warnings_before_ban', 'default_avatar_url',
        'maintenance_mode', 'maintenance_message',
      ].includes(s.setting_key)
    ),
  }

  const categoryIcons: Record<string, string> = {
    'Bài viết & Upload': '📝',
    'Nhóm': '👥',
    'Tài khoản & Bảo mật': '🔒',
    'Hệ thống': '⚙️',
    'Khác': '📋',
  }

  const renderSettingValue = (setting: SystemSetting) => {
    if (setting.data_type === 'boolean') {
      const enabled = setting.setting_value === 'true' || setting.setting_value === true as any
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
          enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-red-500'}`} />
          {enabled ? 'Bật' : 'Tắt'}
        </span>
      )
    }

    if (setting.data_type === 'number') {
      return (
        <span className="text-2xl font-bold text-gray-800">
          {setting.setting_value}
        </span>
      )
    }

    // String values - show as tag-like for comma-separated, otherwise plain
    const val = String(setting.setting_value || '')
    if (val.includes(',')) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {val.split(',').map((item, idx) => (
            <span key={idx} className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-sm">
              {item.trim()}
            </span>
          ))}
        </div>
      )
    }

    return (
      <span className="text-base text-gray-800">
        {val || <span className="text-gray-400 italic">Chưa thiết lập</span>}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(categorizedSettings).map(([category, categorySettings]) =>
        categorySettings.length > 0 && (
          <div key={category} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Category Header */}
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
              <span className="text-xl">{categoryIcons[category]}</span>
              <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
              <span className="text-sm text-gray-500 ml-auto">{categorySettings.length} settings</span>
            </div>

            {/* Settings List */}
            <div className="divide-y divide-gray-100">
              {categorySettings.map((s) => {
                const isEditing = editingKey === s.setting_key

                return (
                  <div key={s.setting_key} className={`px-6 py-4 ${isEditing ? 'bg-blue-50/30' : 'hover:bg-gray-50'} transition-colors`}>
                    {isEditing ? (
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {s.description || s.setting_key}
                        </h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Giá trị
                          </label>
                          {s.data_type === 'boolean' ? (
                            <select
                              value={draft.setting_value as string}
                              onChange={(e) => setDraft({ ...draft, setting_value: e.target.value })}
                              className="block w-full max-w-xs pl-3 pr-10 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                            >
                              <option value="true">Bật</option>
                              <option value="false">Tắt</option>
                            </select>
                          ) : (
                            <input
                              type={s.data_type === 'number' ? 'number' : 'text'}
                              value={draft.setting_value as string}
                              onChange={(e) => setDraft({ ...draft, setting_value: e.target.value })}
                              className="block w-full max-w-md px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`public-${s.setting_key}`}
                            checked={draft.is_public || false}
                            onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`public-${s.setting_key}`} className="text-sm text-gray-700">
                            Public (hiển thị cho Flutter)
                          </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={saveEdit}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900">
                              {s.description || s.setting_key}
                            </h3>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                              s.is_public
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {s.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                          <code className="text-xs text-gray-400">{s.setting_key}</code>
                          <div className="mt-2">
                            {renderSettingValue(s)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-4 shrink-0">
                          <button
                            onClick={() => startEdit(s)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeSetting(s.setting_key)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {settings.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <p className="text-gray-500">Chưa có cài đặt nào. Hãy chạy Seed Default Settings từ backend.</p>
        </div>
      )}
    </div>
  )
}