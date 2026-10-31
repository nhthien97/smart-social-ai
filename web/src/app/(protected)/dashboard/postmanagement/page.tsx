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
    ChevronDown,
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
    const [statusOpen, setStatusOpen] = useState(false)
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
        <div className="admin-posts-page space-y-6">
            {/* HEADER */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="admin-eyebrow">ADMINISTRATION / CONTENT</p>
                    <h1 className="admin-page-title mt-1 text-3xl font-bold">
                        Posts Management
                    </h1>
                    <p className="admin-page-subtitle mt-2">
                        Monitor and moderate all posts
                    </p>
                </div>

                <div className="admin-posts-total">
                    <span>Total posts</span>
                    <strong>{total}</strong>
                </div>
            </div>

            {/* SEARCH + FILTER */}
            <section className="admin-surface admin-posts-toolbar">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="admin-posts-search relative min-w-0 flex-1">
                        <Search
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2"
                        />
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            placeholder="Search by content, user..."
                            aria-label="Search posts by content or user"
                            className="admin-control-input w-full rounded-xl py-3 pl-11 pr-4"
                        />
                    </div>

                    
<div className="admin-posts-status-dropdown">
    <button
        type="button"
        className="admin-posts-status-trigger"
        aria-label="Filter posts by status"
        aria-expanded={statusOpen}
        onClick={() => setStatusOpen((open) => !open)}
    >
        <span>
            {{
                all: "All Status",
                active: "Active",
                hidden: "Hidden",
                pending: "Pending",
                rejected: "Rejected",
                deleted: "Deleted",
            }[status] || "All Status"}
        </span>
        <ChevronDown
            size={17}
            className={statusOpen ? "is-open" : ""}
        />
    </button>

    {statusOpen && (
        <div className="admin-posts-status-menu">
            {[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "hidden", label: "Hidden" },
                { value: "pending", label: "Pending" },
                { value: "rejected", label: "Rejected" },
                { value: "deleted", label: "Deleted" },
            ].map((option) => (
                <button
                    type="button"
                    key={option.value}
                    className={`admin-posts-status-option ${
                        status === option.value ? "is-selected" : ""
                    }`}
                    onClick={() => {
                        setStatus(option.value)
                        setPage(1)
                        setStatusOpen(false)
                    }}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )}
</div>

                </div>

                <div className="admin-posts-toolbar-footer">
                    <span>
                        Page <strong>{page}</strong>
                        {totalPages > 0 && (
                            <> of <strong>{totalPages}</strong></>
                        )}
                    </span>
                    <span>
                        {search ? `Search: "${search}"` : "All posts"}
                    </span>
                </div>
            </section>

            {/* POSTS */}
            {loading ? (
                <div className="admin-surface flex justify-center py-16">
                    <Loader2
                        className="animate-spin"
                        style={{ color: "#c13584" }}
                        size={32}
                    />
                </div>
            ) : posts.length === 0 ? (
                <div className="admin-surface admin-posts-empty">
                    <Search size={28} />
                    <h2>No posts found</h2>
                    <p>Try another search term or status filter.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((p) => (
                        <article key={p._id} className="admin-surface admin-post-card">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                {/* AUTHOR */}
                                <div className="admin-post-avatar">
                                    {(p.user_name || p.username || "U")
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </div>

                                {/* CONTENT */}
                                <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="admin-post-author">
                                            {p.user_name || "Unknown"}
                                        </h2>

                                        {p.username && (
                                            <span className="admin-post-username">
                                                @{p.username}
                                            </span>
                                        )}

                                        <StatusBadge status={p.status} />

                                        {p.report_count > 0 && (
                                            <span className="admin-post-reports">
                                                <AlertTriangle size={13} />
                                                {p.report_count} reports
                                            </span>
                                        )}
                                    </div>

                                    <p className="admin-post-content line-clamp-3">
                                        {p.content || "(No content)"}
                                    </p>

                                    <div className="admin-post-meta">
                                        <span>
                                            <Heart size={16} />
                                            {p.likes_count || 0}
                                        </span>
                                        <span>
                                            <MessageCircle size={16} />
                                            {p.comments_count || 0}
                                        </span>
                                        <span>
                                            {p.created_at
                                                ? new Date(p.created_at).toLocaleDateString("vi-VN")
                                                : ""}
                                        </span>
                                    </div>
                                </div>

                                {/* ACTIONS */}
                                <div className="admin-post-actions">
                                    <ActionButton
                                        onClick={() => onToggleHide(p)}
                                        disabled={actionLoading === p._id}
                                        color="orange"
                                    >
                                        {actionLoading === p._id ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : p.status === "hidden" ? (
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
                                        {actionLoading === p._id ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={18} />
                                        )}
                                    </ActionButton>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="admin-posts-pagination">
                    <p>
                        Showing{" "}
                        <strong>{(page - 1) * PAGE_SIZE + 1}</strong>
                        {" – "}
                        <strong>{Math.min(page * PAGE_SIZE, total)}</strong>
                        {" of "}
                        <strong>{total}</strong>
                    </p>

                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="admin-page-button rounded-lg px-4 py-2"
                        >
                            Previous
                        </button>

                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="admin-page-button rounded-lg px-4 py-2"
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