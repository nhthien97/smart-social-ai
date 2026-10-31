
"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Filter, Eye, Ban, Trash2, Users, ShieldCheck, UserCheck } from "lucide-react"
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
                role: Array.isArray(u.roles_admin) && u.roles_admin.includes("ADMIN")
                    ? "admin"
                    : Array.isArray(u.roles_admin) && u.roles_admin.includes("MODERATOR")
                        ? "moderator"
                        : "user",
                status: u.status === "BLOCKED" ? "banned" : "active",
                created: u.created_at
                    ? new Date(u.created_at).toISOString().split("T")[0]
                    : "-",
            }))

            setUsersData(mapped)
        } catch (err) {
            console.error(err)
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
        <div className="admin-dashboard-page admin-users-page space-y-6">
            {/* PAGE HEADER */}
            <div className="admin-users-heading flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="admin-eyebrow">ADMINISTRATION / USERS</p>
                    <h1 className="admin-page-title mt-1 text-3xl font-bold">
                        User Management
                    </h1>
                    <p className="admin-page-subtitle mt-2">
                        Manage and monitor all users
                    </p>
                </div>

                <div className="admin-users-summary flex flex-wrap gap-3">
                    <SummaryCard
                        icon={<Users size={19} />}
                        label="Total users"
                        value={usersData.length}
                    />
                    <SummaryCard
                        icon={<UserCheck size={19} />}
                        label="Active"
                        value={usersData.filter(user => user.status === "active").length}
                    />
                    <SummaryCard
                        icon={<ShieldCheck size={19} />}
                        label="Restricted"
                        value={usersData.filter(user => user.status === "banned").length}
                    />
                </div>
            </div>

            {/* SEARCH + FILTER */}
            <section className="admin-surface admin-users-toolbar space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                    <div className="admin-search-field relative min-w-0 flex-1">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2"
                            size={19}
                        />
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            placeholder="Search by username or email..."
                            aria-label="Search users by username or email"
                            className="admin-control-input w-full rounded-xl py-3 pl-11 pr-4"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowFilter(!showFilter)}
                        aria-expanded={showFilter}
                        className={`admin-gradient-outline-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold ${
                            showFilter ? "is-active" : ""
                        }`}
                    >
                        <Filter size={17} />
                        Filters
                        <span className="admin-filter-count">
                            {[role !== "all", status !== "all"].filter(Boolean).length || ""}
                        </span>
                    </button>
                </div>

                {showFilter && (
                    <div className="admin-users-filter-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="admin-control-label mb-2 block">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value)
                                    setPage(1)
                                }}
                                className="admin-control-input w-full rounded-xl px-4 py-3"
                            >
                                <option value="all">All statuses</option>
                                <option value="active">Active</option>
                                <option value="banned">Banned</option>
                            </select>
                        </div>

                        <div>
                            <label className="admin-control-label mb-2 block">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value)
                                    setPage(1)
                                }}
                                className="admin-control-input w-full rounded-xl px-4 py-3"
                            >
                                <option value="all">All roles</option>
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="admin-users-toolbar-footer flex flex-wrap items-center justify-between gap-2">
                    <span>
                        Showing <strong>{users.length}</strong> of{" "}
                        <strong>{filteredUsers.length}</strong> users
                    </span>
                    <span>
                        {search ? `Search: "${search}"` : "All registered users"}
                    </span>
                </div>
            </section>

            {/* USERS TABLE */}
            <section className="admin-surface admin-users-table-card">
                <div className="admin-table-heading flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                        <h2 className="text-base font-bold">User directory</h2>
                        <p className="mt-1 text-sm">
                            Account details, roles and status
                        </p>
                    </div>
                    <span className="admin-table-total">
                        {filteredUsers.length} records
                    </span>
                </div>

                <div className="admin-table-scroll overflow-x-auto">
                    <table className="admin-users-table w-full text-sm">
                        <thead>
                            <tr>
                                <th className="text-left">User</th>
                                <th className="text-left">Email</th>
                                <th className="text-center">Role</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Created</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="admin-users-empty">
                                        <span className="admin-loading-spinner" />
                                        <span>Loading users...</span>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="admin-users-empty">
                                        <Search size={22} />
                                        <span>No users match your search or filters.</span>
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="admin-user-identity">
                                                <div className="admin-user-avatar">
                                                    {u.username?.charAt(0).toUpperCase() || "U"}
                                                </div>
                                                <span className="admin-user-name">
                                                    {u.username}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="admin-user-email">
                                            {u.email}
                                        </td>

                                        <td className="text-center">
                                            <RoleBadge role={u.role} />
                                        </td>

                                        <td className="text-center">
                                            <StatusBadge status={u.status} />
                                        </td>

                                        <td className="admin-user-created text-center">
                                            {u.created}
                                        </td>

                                        <td>
                                            <div className="admin-user-actions flex justify-end gap-2">
                                                <IconButton
                                                    color="blue"
                                                    label={`View ${u.username}`}
                                                    onClick={() => onView(u)}
                                                >
                                                    <Eye size={17} />
                                                </IconButton>
                                                <IconButton
                                                    color="orange"
                                                    label={u.status === "active" ? `Block ${u.username}` : `Unblock ${u.username}`}
                                                    onClick={() => onBanToggle(u)}
                                                >
                                                    <Ban size={17} />
                                                </IconButton>
                                                <IconButton
                                                    color="red"
                                                    label={`Delete ${u.username}`}
                                                    onClick={() => onDelete(u)}
                                                >
                                                    <Trash2 size={17} />
                                                </IconButton>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="admin-users-pagination flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Page <strong>{totalPages === 0 ? 0 : page}</strong> of{" "}
                        <strong>{totalPages}</strong>
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            disabled={page === 1 || totalPages === 0}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="admin-page-button rounded-lg px-3 py-2"
                        >
                            Previous
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                type="button"
                                key={i}
                                onClick={() => setPage(i + 1)}
                                aria-current={page === i + 1 ? "page" : undefined}
                                className={`admin-page-button rounded-lg px-3 py-2 ${
                                    page === i + 1 ? "is-current" : ""
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}

                        <button
                            type="button"
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="admin-page-button rounded-lg px-3 py-2"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}

/* ===================== UI COMPONENTS ===================== */

function SummaryCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: number
}) {
    return (
        <div className="admin-user-summary-card flex items-center gap-3 rounded-xl px-4 py-3">
            <div className="admin-user-summary-icon flex h-10 w-10 items-center justify-center rounded-xl">
                {icon}
            </div>
            <div>
                <p>{label}</p>
                <strong>{value}</strong>
            </div>
        </div>
    )
}

function IconButton({
    children,
    onClick,
    color,
    label,
}: {
    children: React.ReactNode
    onClick: () => void
    color: "blue" | "orange" | "red"
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`admin-user-icon-button ${color}`}
        >
            {children}
        </button>
    )
}

function RoleBadge({ role }: { role: string }) {
    const labels: Record<string, string> = {
        admin: "Admin",
        moderator: "Moderator",
        user: "User",
    }

    return (
        <span className={`admin-user-badge role-${role}`}>
            {labels[role] || role}
        </span>
    )
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`admin-user-badge status-${status}`}>
            <span className="admin-status-dot" />
            {status === "active" ? "Active" : "Banned"}
        </span>
    )
}
