"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    FileText,
    AlertTriangle,
    Users2,
    BarChart3,
    Settings,
    Shield,
    ScrollText,
    Activity,
    LogOut,
    BrainCircuit,
} from "lucide-react"
import { useAuthStore } from "@/store/auth.store"

const menu = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "User Management", icon: Users, href: "/dashboard/usermanagement" },
    { label: "Posts Management", icon: FileText, href: "/dashboard/postmanagement" },
    { label: "Reports & Moderation", icon: AlertTriangle, href: "/dashboard/reports" },
    { label: "Groups & Communities", icon: Users2, href: "/dashboard/groups" },
    { label: "Analytics & Statistics", icon: BarChart3, href: "/dashboard/analytics" },
    { label: "Recommendation System", icon: BrainCircuit, href: "/dashboard/recommendation", adminOnly: true },
    { label: "System Settings", icon: Settings, href: "/admin/system-settings" },
    { label: "Admin Accounts", icon: Shield, href: "/admins" },
    { label: "Admin Activity Logs", icon: ScrollText, href: "/dashboard/adminlogs" },
    { label: "User Activity Logs", icon: Activity, href: "/dashboard/userlogs" },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { logout, user } = useAuthStore()
    const isAdmin = user?.roles_admin?.includes('ADMIN') ?? false

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold">
                    M
                </div>
                <span className="text-lg font-semibold">MiniSocial</span>
            </div>

            {/* Menu */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {menu.filter((item) => !item.adminOnly || isAdmin).map((item) => {
                    const active = pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition
                                ${active
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }
                            `}
                        >
                            <Icon size={20} />
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.adminOnly && (
                                <span className="ml-auto text-[10px] bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded">
                                    Admin
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white transition"
                >
                    <LogOut size={20} />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </aside>
    )
}
