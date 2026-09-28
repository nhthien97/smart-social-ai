"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Download,
    FileText,
    Heart,
    MessageCircle,
    Share2,
    AlertCircle,
    LogIn,
    Users,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    PenTool,
} from "lucide-react"
import api from "@/lib/axios"

/* ===================== TYPES ===================== */

interface ActivityLog {
    _id: string
    user_id: string
    activity_date: string
    activity_type: string
    activity_count: number
    username: string
    full_name?: string
    avatar_url?: string
}

/* ===================== ICON & COLOR MAP ===================== */

const activityConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    login:        { icon: <LogIn className="w-5 h-5" />,          color: "text-purple-500", bg: "bg-purple-100", label: "Đăng nhập" },
    post:         { icon: <FileText className="w-5 h-5" />,       color: "text-blue-500",   bg: "bg-blue-100",   label: "Bài viết" },
    create_post:  { icon: <PenTool className="w-5 h-5" />,        color: "text-blue-500",   bg: "bg-blue-100",   label: "Tạo bài viết" },
    edit_post:    { icon: <Pencil className="w-5 h-5" />,         color: "text-cyan-500",   bg: "bg-cyan-100",   label: "Sửa bài viết" },
    delete_post:  { icon: <Trash2 className="w-5 h-5" />,         color: "text-red-500",    bg: "bg-red-100",    label: "Xóa bài viết" },
    like:         { icon: <Heart className="w-5 h-5" />,          color: "text-pink-500",   bg: "bg-pink-100",   label: "Thích" },
    comment:      { icon: <MessageCircle className="w-5 h-5" />,  color: "text-green-500",  bg: "bg-green-100",  label: "Bình luận" },
    share:        { icon: <Share2 className="w-5 h-5" />,         color: "text-teal-500",   bg: "bg-teal-100",   label: "Chia sẻ" },
    message:      { icon: <MessageCircle className="w-5 h-5" />,  color: "text-indigo-500", bg: "bg-indigo-100", label: "Tin nhắn" },
    create_group: { icon: <Users className="w-5 h-5" />,          color: "text-indigo-500", bg: "bg-indigo-100", label: "Tạo nhóm" },
    edit_group:   { icon: <Pencil className="w-5 h-5" />,         color: "text-indigo-500", bg: "bg-indigo-100", label: "Sửa nhóm" },
    delete_group: { icon: <Trash2 className="w-5 h-5" />,         color: "text-red-500",    bg: "bg-red-100",    label: "Xóa nhóm" },
    report_post:  { icon: <AlertCircle className="w-5 h-5" />,    color: "text-orange-500", bg: "bg-orange-100", label: "Báo cáo" },
}

const defaultConfig = { icon: <FileText className="w-5 h-5" />, color: "text-gray-500", bg: "bg-gray-100", label: "Khác" }

const getConfig = (type: string) => activityConfig[type] || defaultConfig

const activityTypes = [
    "login", "post", "create_post", "edit_post", "delete_post",
    "like", "comment", "share", "message",
    "create_group", "edit_group", "delete_group", "report_post",
]

export default function UserActivityLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [search, setSearch] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [typeFilter, setTypeFilter] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    useEffect(() => {
        setPage(1)
    }, [search, typeFilter, dateFrom, dateTo])

    useEffect(() => {
        loadLogs()
    }, [page, search, typeFilter, dateFrom, dateTo])

    const loadLogs = useCallback(async () => {
        try {
            setLoading(true)
            const params: Record<string, any> = { page, limit: 20 }
            if (search) params.search = search
            if (typeFilter) params.activity_type = typeFilter
            if (dateFrom) params.from = dateFrom
            if (dateTo) params.to = dateTo

            const res = await api.get("/admin/user-activity", { params })
            setLogs(res.data.logs || [])
            setTotalPages(res.data.totalPages || 1)
            setTotal(res.data.total || 0)
        } catch (err) {
            console.error("Load user activity logs failed", err)
            setLogs([])
        } finally {
            setLoading(false)
        }
    }, [page, search, typeFilter, dateFrom, dateTo])

    const handleExport = async () => {
        try {
            const params: Record<string, any> = {}
            if (search) params.search = search
            if (typeFilter) params.activity_type = typeFilter
            if (dateFrom) params.from = dateFrom
            if (dateTo) params.to = dateTo

            const res = await api.get("/admin/user-activity/export", { params })
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `user-activity-${new Date().toISOString().slice(0, 10)}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("Export failed", err)
        }
    }

    /* ===================== SUMMARY STATS ===================== */

    const typeCounts = logs.reduce<Record<string, number>>((acc, l) => {
        acc[l.activity_type] = (acc[l.activity_type] || 0) + l.activity_count
        return acc
    }, {})

    const statCards = [
        { key: "login",   title: "Đăng nhập" },
        { key: "like",    title: "Lượt thích" },
        { key: "comment", title: "Bình luận" },
        { key: "post",    title: "Bài viết" },
        { key: "report_post", title: "Báo cáo" },
    ]

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        User Activity Logs
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Ghi lại hoạt động của người dùng (vai trò: User)
                    </p>
                </div>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                    <Download size={18} />
                    Export
                </button>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {statCards.map((s) => {
                    const cfg = getConfig(s.key)
                    return (
                        <div key={s.key} className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                                <span className={cfg.color}>{cfg.icon}</span>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">{s.title}</p>
                                <p className="text-xl font-bold text-gray-900">{typeCounts[s.key] || 0}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* SEARCH + FILTER */}
            <div className="bg-white border rounded-xl p-4 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm theo tên người dùng, email..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition ${
                            showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700"
                        }`}
                    >
                        <Filter size={18} />
                        Bộ lọc
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Loại hoạt động</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả</option>
                                {activityTypes.map((t) => (
                                    <option key={t} value={t}>{getConfig(t).label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Từ ngày</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Đến ngày</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* LOG LIST */}
            <div className="bg-white rounded-xl border divide-y">
                {loading && logs.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">Đang tải...</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">Không có hoạt động nào</div>
                ) : (
                    logs.map((log) => {
                        const cfg = getConfig(log.activity_type)
                        return (
                            <div key={log._id} className="flex justify-between p-5 hover:bg-gray-50 transition">
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                                        <span className={cfg.color}>{cfg.icon}</span>
                                    </div>

                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            <span className="text-blue-600">{log.username}</span>
                                            {log.full_name && (
                                                <span className="text-gray-400 font-normal ml-1 text-sm">
                                                    ({log.full_name})
                                                </span>
                                            )}
                                        </p>

                                        <p className="text-sm text-gray-600 mt-0.5">
                                            {cfg.label}
                                            <span className="ml-2 font-semibold text-gray-900">
                                                x{log.activity_count}
                                            </span>
                                        </p>

                                        <span className={`inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.color}`}>
                                            {log.activity_type.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right text-sm text-gray-500 whitespace-nowrap ml-4">
                                    {new Date(log.activity_date).toLocaleDateString("vi-VN")}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Trang {page} / {totalPages} ({total} kết quả)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}