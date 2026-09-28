'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'

export default function Topbar() {
    const { user, logout } = useAuthStore()
    const router = useRouter()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    return (
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">

            {/* Title */}
            <div />

            {/* Right actions */}
            <div className="flex items-center gap-6">

                {/* Notification */}
                <div className="relative cursor-pointer">
                    <Bell size={20} className="text-gray-700" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </div>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User size={18} className="text-white" />
                            )}
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-gray-800">
                                {user?.fullName || user?.full_name || 'Admin User'}
                            </div>
                            <div className="text-xs text-gray-600">
                                {user?.roles_admin || 'Admin'}
                            </div>
                        </div>
                        <ChevronDown
                            size={16}
                            className={`text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        />
                    </div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-1 z-50">
                            <div className="px-4 py-3 border-b">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user?.fullName || user?.full_name || 'Admin User'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(false)
                                    router.push('/profile')
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                            >
                                <User size={16} />
                                Hồ sơ cá nhân
                            </button>
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(false)
                                    router.push('/change-password')
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                            >
                                <Settings size={16} />
                                Đổi mật khẩu
                            </button>
                            <div className="border-t my-1"></div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                            >
                                <LogOut size={16} />
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
