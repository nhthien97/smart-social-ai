'use client'

import { Group } from '@/types'
import { Eye, XCircle, Crown, Users, Globe, Lock } from 'lucide-react'

interface Props {
    group: Group
}

export default function GroupCard({ group }: Props) {
    return (
        <div className="rounded-xl bg-white border shadow-sm hover:shadow-md transition">
            {/* Gradient header */}
            <div className="h-28 rounded-t-xl bg-gradient-to-r from-blue-500 to-purple-500" />

            <div className="p-5">
                {/* Title + status */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">
                        {group.name}
                    </h3>

                    <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full
              ${group.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-600'
                            }`}
                    >
                        {group.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                    </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700 mb-4">
                    {group.description}
                </p>

                {/* Info */}
                <div className="space-y-2 text-sm text-gray-800">
                    <div className="flex items-center gap-2">
                        <Crown size={16} className="text-yellow-500" />
                        <span className="font-medium">Owner:</span> {group.owner}
                    </div>

                    <div className="flex items-center gap-2">
                        <Users size={16} />
                        {group.members} members
                    </div>

                    <div className="flex items-center gap-2">
                        {group.privacy === 'PUBLIC'
                            ? <Globe size={16} />
                            : <Lock size={16} />
                        }
                        {group.privacy}
                    </div>

                    <div className="text-xs text-gray-500">
                        Created: {group.createdAt}
                    </div>
                </div>

                <hr className="my-4" />

                {/* Actions */}
                <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium">
                        <Eye size={16} />
                        View
                    </button>

                    {group.status === 'ACTIVE' && (
                        <button className="flex-1 flex items-center justify-center gap-2 border border-red-500 text-red-600 hover:bg-red-50 py-2 rounded-lg font-medium">
                            <XCircle size={16} />
                            Disable
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
