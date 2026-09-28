"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Filter, Eye, Ban, Trash2 } from "lucide-react"
import api from "@/lib/axios"

/* ===================== TYPES ===================== */
type User = {
    id: string
    username: string
    email: string
    role: "user" | "moderator" | "admin"
    status: "active" | "banned"
    created: string
}

/* ===================== PAGE ===================== */
export default function UserManagementPage() {
    const [usersData, setUsersData] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [role, setRole] = useState("all")
    const [status, setStatus] = useState("all")
    const [showFilter, setShowFilter] = useState(false)

    const [page, setPage] = useState(1)
    const PAGE_SIZE = 8

    /* ===== FETCH USERS ===== */
    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const res = await api.get("/admin/users")

            const mapped: User[] = res.data.map((u: any) => ({
                id: u._id,
                username: u.username,
                email: u.email,
                role: u.role || "user",
                status: u.isBlocked ? "banned" : "active",
                created: u.createdAt
                    ? new Date(u.createdAt).toISOString().split("T")[0]
                    : "-",
            }))

            setUsersData(mapped)
        } catch (err) {
            alert("Không lấy được danh sách user")
        } finally {
            setLoading(false)
        }
    }

    /* ===== FILTER ===== */
    const filteredUsers = useMemo(() => {
        return usersData.filter((u) => {
            const searchOk =
                u.username.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())

            const roleOk = role === "all" || u.role === role
            const statusOk = status === "all" || u.status === status

            return searchOk && roleOk && statusOk
        })
    }, [usersData, search, role, status])

    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE)
    const users = filteredUsers.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    )

    /* ===== ACTIONS ===== */

    // ✅ SỬA CHUẨN THEO BACKEND
    const onBanToggle = async (u: User) => {
        const action = u.status === "active" ? "chặn" : "bỏ chặn"
        if (!confirm(`Bạn có chắc muốn ${action} user ${u.username}?`)) return
        try {
            if (u.status === "active") {
                await api.put(`/admin/users/${u.id}/block`)
            } else {
                await api.put(`/admin/users/${u.id}/unblock`)
            }

            setUsersData(prev =>
                prev.map(user =>
                    user.id === u.id
                        ? {
                            ...user,
                            status: user.status === "active" ? "banned" : "active",
                        }
                        : user
                )
            )
        } catch (err) {
            console.error(err)
            alert("Không cập nhật được trạng thái user")
        }
    }

    const onDelete = async (u: User) => {
        if (!confirm(`Xoá user ${u.username}? Hành động này không thể hoàn tác.`)) return
        try {
            await api.delete(`/admin/users/${u.id}`)
            setUsersData(prev => prev.filter(user => user.id !== u.id))
        } catch (err) {
            console.error(err)
            alert("Không xoá được user")
        }
    }

    const onView = (u: User) => {
        alert(
            `Username: ${u.username}\nEmail: ${u.email}\nRole: ${u.role}\nStatus: ${u.status}`
        )
    }

    /* ===================== UI ===================== */
    return (
        <div className="space-y-6">
            {/* TITLE */}
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                    User Management
                </h1>
                <p className="text-gray-600 mt-1">
                    Manage and monitor all users
                </p>
            </div>

            {/* SEARCH + FILTER */}
            <div className="bg-white border rounded-xl p-4 space-y-4">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            placeholder="Search by username or email..."
                            className="w-full border rounded-lg pl-10 pr-4 py-2 text-gray-900 placeholder-gray-400"
                        />
                    </div>

                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Filter size={16} />
                        Filters
                    </button>
                </div>

                {showFilter && (
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value)
                                    setPage(1)
                                }}
                                className="w-full border rounded-lg px-3 py-2 text-gray-900"
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="banned">Banned</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value)
                                    setPage(1)
                                }}
                                className="w-full border rounded-lg px-3 py-2 text-gray-900"
                            >
                                <option value="all">All</option>
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* TABLE */}
            <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                        <tr>
                            <th className="p-4 text-left">User</th>
                            <th>Email</th>
                            <th className="text-center">Role</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Created</th>
                            <th className="text-right pr-4">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr
                                    key={u.id}
                                    className="border-t text-gray-900 hover:bg-gray-50"
                                >
                                    <td className="p-4 font-medium">
                                        {u.username}
                                    </td>
                                    <td>{u.email}</td>

                                    <td className="text-center">
                                        <RoleBadge role={u.role} />
                                    </td>

                                    <td className="text-center">
                                        <StatusBadge status={u.status} />
                                    </td>

                                    <td className="text-center">
                                        {u.created}
                                    </td>

                                    <td className="text-right pr-4">
                                        <div className="flex justify-end gap-3">
                                            <IconButton color="blue" onClick={() => onView(u)}>
                                                <Eye size={18} />
                                            </IconButton>
                                            <IconButton
                                                color="orange"
                                                onClick={() => onBanToggle(u)}
                                            >
                                                <Ban size={18} />
                                            </IconButton>
                                            <IconButton
                                                color="red"
                                                onClick={() => onDelete(u)}
                                            >
                                                <Trash2 size={18} />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* PAGINATION */}
                <div className="flex items-center justify-between p-4 border-t text-sm text-gray-600">
                    <span>
                        Showing {users.length} of {filteredUsers.length} users
                    </span>

                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-3 py-1 border rounded disabled:opacity-40"
                        >
                            Previous
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i + 1)}
                                className={`px-3 py-1 rounded ${page === i + 1
                                    ? "bg-blue-600 text-white"
                                    : "border"
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}

                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1 border rounded disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ===================== UI COMPONENTS ===================== */

function IconButton({
    children,
    onClick,
    color,
}: {
    children: React.ReactNode
    onClick: () => void
    color: "blue" | "orange" | "red"
}) {
    const colors = {
        blue: "text-blue-600 hover:bg-blue-50",
        orange: "text-orange-500 hover:bg-orange-50",
        red: "text-red-600 hover:bg-red-50",
    }

    return (
        <button
            onClick={onClick}
            className={`p-2 rounded-md transition ${colors[color]}`}
        >
            {children}
        </button>
    )
}

function RoleBadge({ role }: { role: string }) {
    const styles: any = {
        admin: "bg-red-100 text-red-700",
        moderator: "bg-purple-100 text-purple-700",
        user: "bg-gray-100 text-gray-700",
    }

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
            {role}
        </span>
    )
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
        >
            {status === "active" ? "Active" : "Banned"}
        </span>
    )
}