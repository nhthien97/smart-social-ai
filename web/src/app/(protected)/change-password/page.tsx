'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Check, X, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import api from '@/lib/axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface PasswordRequirements {
    minLength: boolean
    hasUpperCase: boolean
    hasLowerCase: boolean
    hasNumber: boolean
    hasSpecialChar: boolean
}

const PASSWORD_REQUIREMENTS = {
    minLength: { label: 'Ít nhất 8 ký tự', regex: /.{8,}/ },
    hasUpperCase: { label: 'Chứa chữ hoa (A-Z)', regex: /[A-Z]/ },
    hasLowerCase: { label: 'Chứa chữ thường (a-z)', regex: /[a-z]/ },
    hasNumber: { label: 'Chứa số (0-9)', regex: /\d/ },
    hasSpecialChar: { label: 'Chứa ký tự đặc biệt (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
}

export default function ChangePasswordPage() {
    const { user, logout } = useAuthStore()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    })

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    })

    const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
    })

    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    useEffect(() => {
        if (!user) {
            router.push('/login')
            return
        }
    }, [user, router])

    // Kiểm tra yêu cầu mật khẩu real-time
    const checkPasswordRequirements = (password: string) => {
        const requirements: PasswordRequirements = {
            minLength: PASSWORD_REQUIREMENTS.minLength.regex.test(password),
            hasUpperCase: PASSWORD_REQUIREMENTS.hasUpperCase.regex.test(password),
            hasLowerCase: PASSWORD_REQUIREMENTS.hasLowerCase.regex.test(password),
            hasNumber: PASSWORD_REQUIREMENTS.hasNumber.regex.test(password),
            hasSpecialChar: PASSWORD_REQUIREMENTS.hasSpecialChar.regex.test(password),
        }
        setPasswordRequirements(requirements)
        return requirements
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setPasswords(prev => ({
            ...prev,
            [name]: value,
        }))

        // Clear errors for this field
        setErrors(prev => ({
            ...prev,
            [name]: '',
        }))

        // Check requirements if changing new password
        if (name === 'new') {
            checkPasswordRequirements(value)
        }

        // Check if passwords match
        if (name === 'confirm' && passwords.new && value !== passwords.new) {
            setErrors(prev => ({
                ...prev,
                confirmMatch: 'Mật khẩu không khớp',
            }))
        } else if (name === 'confirm' && passwords.new && value === passwords.new) {
            setErrors(prev => ({
                ...prev,
                confirmMatch: '',
            }))
        }
    }

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {}

        if (!passwords.current.trim()) {
            newErrors.current = 'Vui lòng nhập mật khẩu hiện tại'
        }

        if (!passwords.new.trim()) {
            newErrors.new = 'Vui lòng nhập mật khẩu mới'
        }

        if (!passwords.confirm.trim()) {
            newErrors.confirm = 'Vui lòng xác nhận mật khẩu mới'
        }

        if (passwords.new === passwords.current) {
            newErrors.new = 'Mật khẩu mới phải khác mật khẩu cũ'
        }

        if (passwords.new !== passwords.confirm) {
            newErrors.confirmMatch = 'Mật khẩu xác nhận không khớp'
        }

        // Check all requirements are met
        if (passwords.new && !Object.values(passwordRequirements).every(req => req)) {
            newErrors.requirements = 'Mật khẩu không đáp ứng tất cả yêu cầu'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChangePassword = async () => {
        if (!validateForm()) return

        setIsLoading(true)
        try {
            await api.post('/users/change-password', {
                old_password: passwords.current,
                new_password: passwords.new,
            })

            toast.success('Đổi mật khẩu thành công!')
            setPasswords({
                current: '',
                new: '',
                confirm: '',
            })
            setPasswordRequirements({
                minLength: false,
                hasUpperCase: false,
                hasLowerCase: false,
                hasNumber: false,
                hasSpecialChar: false,
            })

            // Đăng xuất sau 2 giây
            setTimeout(() => {
                logout()
                router.push('/login')
            }, 2000)
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Đổi mật khẩu thất bại!'
            toast.error(errorMessage)
            if (error.response?.status === 401) {
                setErrors(prev => ({
                    ...prev,
                    current: 'Mật khẩu hiện tại không chính xác',
                }))
            }
        } finally {
            setIsLoading(false)
        }
    }

    const allRequirementsMet = Object.values(passwordRequirements).every(req => req)
    const passwordsMatch = passwords.new === passwords.confirm && passwords.new !== ''

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/profile">
                        <button className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition">
                            <ArrowLeft size={20} className="text-gray-700" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Đổi mật khẩu</h1>
                        <p className="text-sm text-gray-600 mt-1">Cập nhật mật khẩu để bảo vệ tài khoản của bạn</p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-6">
                    {/* Security Tips */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex gap-3">
                            <AlertCircle size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-2">Mẹo bảo mật</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Sử dụng mật khẩu độc nhất, không tái sử dụng mật khẩu cũ</li>
                                    <li>• Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</li>
                                    <li>• Không chia sẻ mật khẩu với người khác</li>
                                    <li>• Đổi mật khẩu định kỳ (ít nhất 3 tháng một lần)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Form */}
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <div className="space-y-6">
                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Lock size={16} />
                                    Mật khẩu hiện tại
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        name="current"
                                        value={passwords.current}
                                        onChange={handlePasswordChange}
                                        placeholder="Nhập mật khẩu hiện tại"
                                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                                            errors.current ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.current && (
                                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                                        <X size={14} /> {errors.current}
                                    </p>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="border-t pt-6"></div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Lock size={16} />
                                    Mật khẩu mới
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        name="new"
                                        value={passwords.new}
                                        onChange={handlePasswordChange}
                                        placeholder="Nhập mật khẩu mới"
                                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                                            errors.new ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.new && (
                                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                                        <X size={14} /> {errors.new}
                                    </p>
                                )}

                                {/* Password Requirements */}
                                {passwords.new && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            Yêu cầu mật khẩu:
                                            {allRequirementsMet && <Check size={14} className="text-green-600" />}
                                        </p>
                                        <div className="space-y-2">
                                            {Object.entries(PASSWORD_REQUIREMENTS).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="flex items-center gap-2 text-xs"
                                                >
                                                    <div
                                                        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                            passwordRequirements[key as keyof PasswordRequirements]
                                                                ? 'bg-green-600'
                                                                : 'bg-gray-300'
                                                        }`}
                                                    >
                                                        {passwordRequirements[key as keyof PasswordRequirements] && (
                                                            <Check size={12} className="text-white" />
                                                        )}
                                                    </div>
                                                    <span
                                                        className={
                                                            passwordRequirements[key as keyof PasswordRequirements]
                                                                ? 'text-green-700 font-medium'
                                                                : 'text-gray-600'
                                                        }
                                                    >
                                                        {value.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Lock size={16} />
                                    Xác nhận mật khẩu mới
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        name="confirm"
                                        value={passwords.confirm}
                                        onChange={handlePasswordChange}
                                        placeholder="Xác nhận mật khẩu mới"
                                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                                            errors.confirm || errors.confirmMatch
                                                ? 'border-red-500 bg-red-50'
                                                : passwordsMatch
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-300'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.confirm && (
                                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                                        <X size={14} /> {errors.confirm}
                                    </p>
                                )}
                                {errors.confirmMatch && (
                                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                                        <X size={14} /> {errors.confirmMatch}
                                    </p>
                                )}
                                {passwordsMatch && !errors.confirm && !errors.confirmMatch && (
                                    <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                        <Check size={14} /> Mật khẩu khớp
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-6 border-t">
                                <button
                                    onClick={handleChangePassword}
                                    disabled={!allRequirementsMet || !passwordsMatch || isLoading}
                                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                                        !allRequirementsMet || !passwordsMatch || isLoading
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    <Lock size={18} />
                                    {isLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                                </button>
                                <Link href="/profile" className="flex-1">
                                    <button className="w-full py-3 px-4 rounded-lg font-semibold transition bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center justify-center gap-2">
                                        <X size={18} />
                                        Hủy
                                    </button>
                                </Link>
                            </div>

                            {/* Info Message */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm text-amber-900">
                                    <strong>Lưu ý:</strong> Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất và cần đăng nhập lại bằng mật khẩu mới.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
