
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
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    return (
        <header className="admin-topbar flex h-16 shrink-0 items-center justify-between px-6">
            {/* Title */}
            <div />

            {/* Right actions */}
            <div className="flex items-center gap-6">
                {/* Notification */}
                <button
                    type="button"
                    aria-label="Notifications"
                    className="admin-topbar-notification relative flex h-10 w-10 items-center justify-center rounded-xl"
                >
                    <Bell size={20} className="admin-topbar-icon" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                </button>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        aria-expanded={isDropdownOpen}
                        aria-haspopup="true"
                        className="admin-topbar-profile flex items-center gap-3 rounded-xl"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span className="admin-topbar-avatar flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                            {user?.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt="Avatar"
                                    className="h-full w-full rounded-xl object-cover"
                                />
                            ) : (
                                <User size={18} className="text-white" />
                            )}
                        </span>

                        <span className="text-left leading-tight">
                            <span className="block text-sm font-bold text-[#303846]">
                                {user?.fullName || user?.full_name || 'Admin User'}
                            </span>
                            <span className="mt-1 block text-xs text-[#858d99]">
                                {user?.roles_admin || 'Admin'}
                            </span>
                        </span>

                        <ChevronDown
                            size={16}
                            className={`text-[#626b79] transition-transform ${
                                isDropdownOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="admin-topbar-dropdown absolute right-0 z-50 mt-3 w-56 rounded-xl py-1">
                            <div className="admin-dropdown-heading border-b px-4 py-3">
                                <p className="truncate text-sm font-semibold text-[#303846]">
                                    {user?.fullName || user?.full_name || 'Admin User'}
                                </p>
                                <p className="truncate text-xs text-[#858d99]">
                                    {user?.email}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsDropdownOpen(false)
                                    router.push('/profile')
                                }}
                                className="admin-dropdown-item flex w-full items-center gap-3 px-4 py-3 text-sm"
                            >
                                <User size={16} />
                                Hồ sơ cá nhân
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsDropdownOpen(false)
                                    router.push('/change-password')
                                }}
                                className="admin-dropdown-item flex w-full items-center gap-3 px-4 py-3 text-sm"
                            >
                                <Settings size={16} />
                                Đổi mật khẩu
                            </button>

                            <div className="admin-dropdown-divider my-1 border-t" />

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="admin-dropdown-item admin-dropdown-logout flex w-full items-center gap-3 px-4 py-3 text-sm"
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
