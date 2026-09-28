'use client'

import {
  deleteSystemSetting,
  updateSystemSetting,
} from '@/services/settings.service'
import { useState } from 'react'

export default function SystemSettingsTable({ data, onReload }: any) {
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this setting?')) return
    await deleteSystemSetting(id)
    onReload()
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Key</th>
            <th className="p-3">Value</th>
            <th className="p-3">Type</th>
            <th className="p-3">Public</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item: any) => (
            <tr key={item._id} className="border-t">
              <td className="p-3 font-medium">{item.setting_key}</td>
              <td className="p-3">{item.setting_value}</td>
              <td className="p-3 capitalize">{item.data_type}</td>
              <td className="p-3">
                {item.is_public ? 'Yes' : 'No'}
              </td>
              <td className="p-3 space-x-2">
                <button
                  onClick={() => handleDelete(item._id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}