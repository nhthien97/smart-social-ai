'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { Upload, Save, X, Camera, User as UserIcon, Mail, Phone, Calendar, Shield, Lock, LogOut } from 'lucide-react'
import api from '@/lib/axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface ProfileData {
  fullName: string
  username: string
  email: string
  phone: string
  avatar?: string
}

interface UserInfo {
  joined_date?: string
  roles_admin?: string
  roles_group?: string[]
}

export default function ProfilePage() {
    const { user, setUser, logout } = useAuthStore()
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isLoadingAvatar, setIsLoadingAvatar] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(user?.avatar || null)
    
    const [userInfo, setUserInfo] = useState<UserInfo>({})
    const [profileData, setProfileData] = useState<ProfileData>({
        fullName: user?.fullName || user?.full_name || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: '',
    })

    useEffect(() => {
        if (!user) {
            router.push('/login')
            return
        }
        // Initialize with user data from store
        setProfileData({
            fullName: user.fullName || user.full_name || '',
            username: user.username || '',
            email: user.email || '',
            phone: '',
        })
        setPreviewAvatar(user.avatar || null)
        
        // Try to fetch additional info from API
        fetchUserInfo()
    }, [user, router])

    const fetchUserInfo = async () => {
        try {
            const response = await api.get('/auth/me')
            setUserInfo({
                joined_date: response.data.created_at || response.data.joined_date,
                roles_admin: response.data.roles_admin,
                roles_group: response.data.roles_group,
            })
            setProfileData(prev => ({
                ...prev,
                fullName: response.data.fullName || response.data.full_name || prev.fullName,
                username: response.data.username || prev.username,
                email: response.data.email || prev.email,
                phone: response.data.phone || prev.phone || '',
            }))
            if (response.data.avatar) {
                setPreviewAvatar(response.data.avatar)
            }
        } catch (error: any) {
            console.warn('API not available, using stored data:', error.message)
            // Fallback: use data from store
        }
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreviewAvatar(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Upload
        setIsLoadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            
            const response = await api.post('/upload/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            // Save avatar URL to database - use relative URL only
            const avatarUrl = response.data.url
            const updateResponse = await api.patch('/users/profile', {
                avatar: avatarUrl,
                avatar_url: avatarUrl,
            })

            const updatedUser = { 
                ...user, 
                avatar: updateResponse.data.avatar || avatarUrl,
                avatar_url: updateResponse.data.avatar_url || avatarUrl,
            }
            setUser(updatedUser as any)
            toast.success('Cập nhật ảnh đại diện thành công!')
        } catch (error: any) {
            console.error('Avatar upload error:', error)
            toast.error('Cập nhật ảnh đại diện thất bại! Kiểm tra kết nối API.')
            setPreviewAvatar(user?.avatar || null)
        } finally {
            setIsLoadingAvatar(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setProfileData(prev => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSaveProfile = async () => {
        setIsSaving(true)
        try {
            const response = await api.patch('/users/profile', {
                full_name: profileData.fullName,
                username: profileData.username,
                email: profileData.email,
                phone: profileData.phone,
            })

            const updatedUser = {
                ...user,
                fullName: response.data.full_name,
                username: response.data.username,
                email: response.data.email,
            } as any
            setUser(updatedUser)
            setIsEditing(false)
            toast.success('Cập nhật thông tin thành công!')
        } catch (error: any) {
            console.error('Profile update error:', error)
            const errorMsg = error.response?.data?.message || error.message || 'Cập nhật thất bại!'
            toast.error(errorMsg)
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    const formattedDate = userInfo.joined_date 
        ? new Date(userInfo.joined_date).toLocaleDateString('vi-VN')
        : 'N/A'

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
                    <p className="text-sm text-gray-600 mt-1">Quản lý thông tin và cài đặt tài khoản của bạn</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-6">
                    {/* Avatar Section */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ảnh đại diện</h2>
                        <div className="flex items-end gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden border-4 border-gray-200">
                                    {previewAvatar ? (
                                        <img 
                                            src={previewAvatar} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <UserIcon size={48} className="text-white" />
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoadingAvatar}
                                    className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-full p-3 text-white shadow-lg"
                                >
                                    <Camera size={20} />
                                </button>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">JPG, PNG. Kích thước tối đa 5MB</p>
                                <p className="text-xs text-gray-500 mt-2">Hình ảnh sẽ được hiển thị tròn</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Thông tin cá nhân</h2>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
                                >
                                    Chỉnh sửa
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đầy đủ</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={profileData.fullName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={profileData.username}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Mail size={16} />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Phone size={16} />
                                    Số điện thoại
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    placeholder="+84 123 456 789"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                                />
                            </div>

                            {isEditing && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition"
                                    >
                                        <Save size={16} />
                                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false)
                                            setProfileData({
                                                fullName: user?.fullName || user?.full_name || '',
                                                username: user?.username || '',
                                                email: user?.email || '',
                                                phone: '',
                                            })
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition"
                                    >
                                        <X size={16} />
                                        Hủy
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin tài khoản</h2>
                        <div className="space-y-4">
                            {/* Role */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Shield size={18} className="text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Vai trò</p>
                                        <p className="text-xs text-gray-500">Quyền hạn tài khoản</p>
                                    </div>
                                </div>
                                <p className="font-semibold text-gray-900">
                                    {Array.isArray(userInfo.roles_admin) 
                                        ? userInfo.roles_admin.filter((r: string) => r !== 'NONE').join(', ') || 'User'
                                        : userInfo.roles_admin || 'User'}
                                </p>
                            </div>

                            {/* Joined Date */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Ngày tham gia</p>
                                        <p className="text-xs text-gray-500">Khi tài khoản được tạo</p>
                                    </div>
                                </div>
                                <p className="font-semibold text-gray-900">{formattedDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bảo mật</h2>
                        <div className="space-y-3">
                            <Link href="/change-password">
                                <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition group">
                                    <div className="flex items-center gap-3">
                                        <Lock size={18} className="text-purple-600" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 text-left">Đổi mật khẩu</p>
                                            <p className="text-xs text-gray-500 text-left">Cập nhật mật khẩu của bạn</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400 group-hover:text-gray-600">→</span>
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div className="bg-white rounded-lg shadow p-6 border-t-4 border-red-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Đăng xuất</h2>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition font-medium"
                        >
                            <LogOut size={18} />
                            Đăng xuất khỏi tài khoản
                        </button>
                        <p className="text-xs text-gray-500 mt-3 text-center">
                            Bạn sẽ bị đăng xuất khỏi tất cả các thiết bị
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
