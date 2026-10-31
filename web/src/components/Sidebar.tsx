
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
    const isAdmin = user?.roles_admin?.includes("ADMIN") ?? false

    const handleLogout = () => {
        logout()
        router.push("/login")
    }

    return (
        <aside className="admin-sidebar flex h-full w-64 shrink-0 flex-col">
            <div className="admin-sidebar-brand flex h-16 shrink-0 items-center gap-3 px-6">
                <div className="admin-gradient-logo flex h-10 w-10 items-center justify-center rounded-xl font-extrabold text-white">
                    S
                </div>
                <span className="text-base font-extrabold tracking-tight">
                    Smart Social AI
                </span>
            </div>

            <nav className="admin-sidebar-nav flex-1 space-y-2 overflow-y-auto px-3 py-4">
                {menu.filter((item) => !item.adminOnly || isAdmin).map((item) => {
                    const active = pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`admin-nav-item flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                                active ? "active" : ""
                            }`}
                        >
                            <Icon size={19} className="shrink-0" />
                            <span className="text-xs font-semibold">{item.label}</span>
                            {item.adminOnly && (
                                <span className="admin-role-badge ml-auto rounded-md px-1.5 py-1 text-[9px] font-bold">
                                    Admin
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            <div className="admin-sidebar-footer shrink-0 px-3 py-4">
                <button
                    onClick={handleLogout}
                    className="admin-nav-item admin-logout flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200"
                >
                    <LogOut size={19} />
                    <span className="text-xs font-semibold">Logout</span>
                </button>
            </div>
        </aside>
    )
}
