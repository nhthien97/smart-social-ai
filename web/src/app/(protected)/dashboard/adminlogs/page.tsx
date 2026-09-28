"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Search,
    Download,
    ShieldAlert,
    Settings,
    User,
    FileText,
    Filter,
    ChevronLeft,
    ChevronRight,
    Users,
    Trash2,
    Eye,
    EyeOff,
    Flag,
    XCircle,
} from "lucide-react"
import api from "@/lib/axios"

/* ===================== TYPES ===================== */

interface LogItem {
    _id: string
    user_id: string
    action: string
    entity_type?: string
    entity_id?: string
    details?: Record<string, any>
    ip_address?: string
    created_at: string
    admin_username: string
    admin_full_name?: string
    admin_avatar?: string
}

/* ===================== ICON MAP ===================== */

const getActionIcon = (action: string) => {
    const lower = action?.toLowerCase() || ""
    if (lower.includes("delete")) return <Trash2 className="text-red-500 w-5 h-5" />
    if (lower.includes("block")) return <XCircle className="text-red-500 w-5 h-5" />
    if (lower.includes("unblock")) return <Eye className="text-green-500 w-5 h-5" />
    if (lower.includes("hide")) return <EyeOff className="text-yellow-500 w-5 h-5" />
    if (lower.includes("show")) return <Eye className="text-green-500 w-5 h-5" />
    if (lower.includes("report") || lower.includes("resolve") || lower.includes("reject")) return <Flag className="text-orange-500 w-5 h-5" />
    if (lower.includes("setting")) return <Settings className="text-blue-500 w-5 h-5" />
    if (lower.includes("group")) return <Users className="text-indigo-500 w-5 h-5" />
    return <ShieldAlert className="text-purple-500 w-5 h-5" />
}

const getEntityBadgeColor = (entityType: string) => {
    switch (entityType) {
        case "user": return "bg-purple-100 text-purple-700"
        case "post": return "bg-blue-100 text-blue-700"
        case "group": return "bg-indigo-100 text-indigo-700"
        case "report": return "bg-orange-100 text-orange-700"
        case "setting": return "bg-cyan-100 text-cyan-700"
        default: return "bg-gray-100 text-gray-700"
    }
}

const formatAction = (action: string) =>
    action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<LogItem[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [search, setSearch] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [actionFilter, setActionFilter] = useState("")
    const [entityFilter, setEntityFilter] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    const [actionTypes, setActionTypes] = useState<string[]>([])

    useEffect(() => {
        loadActionTypes()
    }, [])

    useEffect(() => {
        setPage(1)
    }, [search, actionFilter, entityFilter, dateFrom, dateTo])

    useEffect(() => {
        loadLogs()
    }, [page, search, actionFilter, entityFilter, dateFrom, dateTo])

    const loadActionTypes = async () => {
        try {
            const res = await api.get("/admin/logs/action-types")
            setActionTypes(res.data || [])
        } catch (err) {
            console.error("Failed to load action types", err)
        }
    }

    const loadLogs = useCallback(async () => {
        try {
            setLoading(true)
            const params: Record<string, any> = { page, limit: 15 }
            if (search) params.search = search
            if (actionFilter) params.action = actionFilter
            if (entityFilter) params.entity_type = entityFilter
            if (dateFrom) params.from = dateFrom
            if (dateTo) params.to = dateTo

            const res = await api.get("/admin/logs", { params })
            setLogs(res.data.logs || [])
            setTotalPages(res.data.totalPages || 1)
            setTotal(res.data.total || 0)
        } catch (err) {
            console.error("Load admin logs failed", err)
            setLogs([])
        } finally {
            setLoading(false)
        }
    }, [page, search, actionFilter, entityFilter, dateFrom, dateTo])

    const handleExport = async () => {
        try {
            const params: Record<string, any> = {}
            if (search) params.search = search
            if (actionFilter) params.action = actionFilter
            if (entityFilter) params.entity_type = entityFilter
            if (dateFrom) params.from = dateFrom
            if (dateTo) params.to = dateTo

            const res = await api.get("/admin/logs/export", { params })
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("Export failed", err)
        }
    }

    /* ===================== SUMMARY ===================== */

    const entityCounts = logs.reduce<Record<string, number>>((acc, l) => {
        const key = l.entity_type || "other"
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Admin Activity Logs
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Ghi lại hành động của Admin, Moderator, Viewer
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

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard title="Tổng cộng" count={total} icon={<ShieldAlert className="text-purple-500" />} />
                <SummaryCard title="User" count={entityCounts["user"] || 0} icon={<User className="text-purple-500" />} />
                <SummaryCard title="Post" count={entityCounts["post"] || 0} icon={<FileText className="text-blue-500" />} />
                <SummaryCard title="Report" count={entityCounts["report"] || 0} icon={<Flag className="text-orange-500" />} />
                <SummaryCard title="Setting" count={entityCounts["setting"] || 0} icon={<Settings className="text-cyan-500" />} />
            </div>

            {/* SEARCH + FILTER */}
            <div className="bg-white border rounded-xl p-4 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm theo action, entity type, entity id..."
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Action</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả</option>
                                {actionTypes.map((a) => (
                                    <option key={a} value={a}>{formatAction(a)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Entity Type</label>
                            <select
                                value={entityFilter}
                                onChange={(e) => setEntityFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả</option>
                                <option value="user">User</option>
                                <option value="post">Post</option>
                                <option value="group">Group</option>
                                <option value="report">Report</option>
                                <option value="setting">Setting</option>
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
                    <div className="p-12 text-center text-gray-400">Không có log nào</div>
                ) : (
                    logs.map((log) => (
                        <div key={log._id} className="flex justify-between p-5 hover:bg-gray-50 transition">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                    {getActionIcon(log.action)}
                                </div>

                                <div>
                                    <p className="font-semibold text-gray-900">
                                        <span className="text-blue-600">{log.admin_username}</span>
                                        <span className="text-gray-500 font-normal ml-2">
                                            {formatAction(log.action)}
                                        </span>
                                    </p>

                                    {log.entity_type && (
                                        <p className="text-sm text-gray-600 mt-0.5">
                                            {log.entity_type}: <span className="font-mono text-xs">{log.entity_id}</span>
                                        </p>
                                    )}

                                    {log.details && Object.keys(log.details).length > 0 && (
                                        <p className="text-sm text-gray-400 mt-0.5">
                                            {Object.entries(log.details).map(([k, v]) =>
                                                `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`
                                            ).join(' | ')}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 mt-2">
                                        {log.entity_type && (
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getEntityBadgeColor(log.entity_type)}`}>
                                                {log.entity_type}
                                            </span>
                                        )}
                                        {log.ip_address && (
                                            <span className="text-xs text-gray-400">
                                                IP: {log.ip_address}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right text-sm text-gray-500 whitespace-nowrap ml-4">
                                {new Date(log.created_at).toLocaleTimeString("vi-VN")}
                                <br />
                                {new Date(log.created_at).toLocaleDateString("vi-VN")}
                            </div>
                        </div>
                    ))
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

/* ===================== SUMMARY CARD ===================== */

function SummaryCard({ title, count, icon }: { title: string; count: number; icon: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-gray-500 text-sm">{title}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
            </div>
        </div>
    )
}