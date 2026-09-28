"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Search,
    Eye,
    EyeOff,
    Trash2,
    Heart,
    MessageCircle,
    Loader2,
    AlertTriangle,
} from "lucide-react"
import {
    fetchAdminPosts,
    hidePost,
    showPost,
    deletePost,
} from "@/services/admin.service"

export default function PostsManagementPage() {
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("all")
    const [page, setPage] = useState(1)
    const [posts, setPosts] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const PAGE_SIZE = 10

    const loadPosts = useCallback(async () => {
        try {
            setLoading(true)
            const data = await fetchAdminPosts({
                page,
                limit: PAGE_SIZE,
                status: status === "all" ? undefined : status,
                search: search || undefined,
            })
            setPosts(data.posts || [])
            setTotal(data.total || 0)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [page, status, search])

    useEffect(() => {
        const debounce = setTimeout(() => {
            loadPosts()
        }, search ? 400 : 0)

        return () => clearTimeout(debounce)
    }, [loadPosts])

    const totalPages = Math.ceil(total / PAGE_SIZE)

    /* ================= ACTIONS ================= */

    const onToggleHide = async (p: any) => {
        try {
            setActionLoading(p._id)
            if (p.status === "hidden") {
                await showPost(p._id)
            } else {
                await hidePost(p._id)
            }
            loadPosts()
        } finally {
            setActionLoading(null)
        }
    }

    const onDelete = async (p: any) => {
        if (!confirm("Delete this post permanently?")) return
        try {
            setActionLoading(p._id)
            await deletePost(p._id)
            loadPosts()
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="space-y-6">

            {/* ================= HEADER ================= */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">
                        Posts Management
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Monitor and moderate all posts
                    </p>
                </div>

                <div className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm">
                    Total: {total}
                </div>
            </div>

            {/* ================= SEARCH + FILTER ================= */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm flex gap-4 items-center">

                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                        placeholder="Search by content, user..."
                        className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                </div>

                <select
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value)
                        setPage(1)
                    }}
                    className="border rounded-xl px-4 py-2.5 text-gray-800 hover:bg-gray-50 transition"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="deleted">Deleted</option>
                </select>
            </div>

            {/* ================= POSTS ================= */}

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white border rounded-2xl p-16 text-center text-gray-400 shadow-sm">
                    No posts found
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((p) => (
                        <div
                            key={p._id}
                            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition"
                        >
                            <div className="flex justify-between gap-6">

                                {/* LEFT */}
                                <div className="flex gap-4 flex-1 min-w-0">

                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold">
                                        {(p.user_name || p.username || "U")
                                            .slice(0, 2)
                                            .toUpperCase()}
                                    </div>

                                    <div className="space-y-3 min-w-0 flex-1">

                                        {/* USER + STATUS */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="font-semibold text-gray-900">
                                                {p.user_name || "Unknown"}
                                            </p>

                                            {p.username && (
                                                <span className="text-sm text-gray-400">
                                                    @{p.username}
                                                </span>
                                            )}

                                            <StatusBadge status={p.status} />

                                            {p.report_count > 0 && (
                                                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                                                    <AlertTriangle size={12} />
                                                    {p.report_count} reports
                                                </span>
                                            )}
                                        </div>

                                        {/* CONTENT */}
                                        <p className="text-gray-800 line-clamp-2 leading-relaxed">
                                            {p.content || "(No content)"}
                                        </p>

                                        {/* META */}
                                        <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Heart size={16} />
                                                {p.likes_count || 0}
                                            </span>

                                            <span className="flex items-center gap-1">
                                                <MessageCircle size={16} />
                                                {p.comments_count || 0}
                                            </span>

                                            <span>
                                                {p.created_at
                                                    ? new Date(
                                                        p.created_at
                                                    ).toLocaleDateString(
                                                        "vi-VN"
                                                    )
                                                    : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ACTIONS */}
                                <div className="flex gap-2">
                                    <ActionButton
                                        onClick={() => onToggleHide(p)}
                                        disabled={actionLoading === p._id}
                                        color="orange"
                                    >
                                        {p.status === "hidden" ? (
                                            <Eye size={18} />
                                        ) : (
                                            <EyeOff size={18} />
                                        )}
                                    </ActionButton>

                                    <ActionButton
                                        onClick={() => onDelete(p)}
                                        disabled={actionLoading === p._id}
                                        color="red"
                                    >
                                        <Trash2 size={18} />
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ================= PAGINATION ================= */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-4">
                    <p className="text-sm text-gray-500">
                        Showing {(page - 1) * PAGE_SIZE + 1} –
                        {Math.min(page * PAGE_SIZE, total)} of {total}
                    </p>

                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                            Previous
                        </button>

                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ================= COMPONENTS ================= */

function ActionButton({
    children,
    onClick,
    disabled,
    color,
}: any) {
    const map: any = {
        orange: "text-orange-500 hover:bg-orange-50",
        red: "text-red-500 hover:bg-red-50",
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-2 rounded-full transition hover:scale-110 active:scale-95 disabled:opacity-50 ${map[color]}`}
        >
            {children}
        </button>
    )
}

function StatusBadge({ status }: { status: string }) {
    const map: any = {
        active: "bg-green-100 text-green-700",
        pending: "bg-yellow-100 text-yellow-700",
        rejected: "bg-orange-100 text-orange-700",
        hidden: "bg-gray-200 text-gray-700",
        deleted: "bg-red-100 text-red-700",
    }

    return (
        <span
            className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}
        >
            {status}
        </span>
    )
}