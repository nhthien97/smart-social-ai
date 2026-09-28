"use client"

import { useEffect, useState, useCallback } from "react"
import api from "@/lib/axios"

/* ===================== TYPES ===================== */

interface DailyStat {
    _id: string
    stat_date: string
    total_users: number
    new_users: number
    active_users: number
    total_posts: number
    new_posts: number
    total_likes: number
    total_comments: number
    total_shares: number
    total_messages: number
    total_groups: number
    new_groups: number
}

interface MonthlyStat {
    _id: string
    stat_year: number
    stat_month: number
    total_users: number
    new_users: number
    active_users: number
    total_posts: number
    new_posts: number
    total_likes: number
    total_comments: number
    total_shares: number
    total_messages: number
    total_groups: number
    new_groups: number
}

/* ===================== PAGE ===================== */

export default function AnalyticsPage() {
    // Daily stats
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
    const [dailyTotal, setDailyTotal] = useState(0)
    const [dailyPage, setDailyPage] = useState(1)
    const [dailyFrom, setDailyFrom] = useState("")
    const [dailyTo, setDailyTo] = useState("")
    const dailyLimit = 15

    // Monthly stats
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([])
    const [monthlyYear, setMonthlyYear] = useState<string>("")
    const [monthlyLimit, setMonthlyLimit] = useState(12)

    // UI
    const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily")
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    /* ---- Fetch Daily ---- */
    const fetchDaily = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, unknown> = { page: dailyPage, limit: dailyLimit }
            if (dailyFrom) params.from = dailyFrom
            if (dailyTo) params.to = dailyTo
            const res = await api.get("/admin/analytics/daily", { params })
            setDailyStats(res.data.stats || [])
            setDailyTotal(res.data.total || 0)
        } catch (err) {
            console.error("Fetch daily stats error:", err)
        } finally {
            setLoading(false)
        }
    }, [dailyPage, dailyFrom, dailyTo])

    /* ---- Fetch Monthly ---- */
    const fetchMonthly = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, unknown> = { limit: monthlyLimit }
            if (monthlyYear) params.year = Number(monthlyYear)
            const res = await api.get("/admin/analytics/monthly", { params })
            setMonthlyStats(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            console.error("Fetch monthly stats error:", err)
        } finally {
            setLoading(false)
        }
    }, [monthlyYear, monthlyLimit])

    useEffect(() => {
        if (activeTab === "daily") fetchDaily()
        else fetchMonthly()
    }, [activeTab, fetchDaily, fetchMonthly])

    /* ---- Refresh (compute today) ---- */
    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await api.post("/admin/analytics/refresh")
            if (activeTab === "daily") fetchDaily()
            else fetchMonthly()
        } catch (err) {
            console.error("Refresh analytics error:", err)
        } finally {
            setRefreshing(false)
        }
    }

    /* ---- Export ---- */
    const handleExport = async () => {
        try {
            const params: Record<string, string> = {}
            if (dailyFrom) params.from = dailyFrom
            if (dailyTo) params.to = dailyTo
            const res = await api.get("/admin/analytics/export", { params })
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `analytics_export_${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("Export error:", err)
        }
    }

    const dailyTotalPages = Math.ceil(dailyTotal / dailyLimit)

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-semibold text-gray-900">Analytics & Statistics</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                        {refreshing ? "Refreshing..." : "⟳ Refresh Stats"}
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm border"
                    >
                        ↓ Export JSON
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab("daily")}
                    className={`px-5 py-2 rounded-md text-sm font-medium transition ${
                        activeTab === "daily"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                    Daily Stats
                </button>
                <button
                    onClick={() => setActiveTab("monthly")}
                    className={`px-5 py-2 rounded-md text-sm font-medium transition ${
                        activeTab === "monthly"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                    Monthly Stats
                </button>
            </div>

            {/* DAILY TAB */}
            {activeTab === "daily" && (
                <div className="space-y-4">
                    {/* FILTERS */}
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                <input
                                    type="date"
                                    value={dailyFrom}
                                    onChange={(e) => { setDailyFrom(e.target.value); setDailyPage(1) }}
                                    className="border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                <input
                                    type="date"
                                    value={dailyTo}
                                    onChange={(e) => { setDailyTo(e.target.value); setDailyPage(1) }}
                                    className="border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            {(dailyFrom || dailyTo) && (
                                <button
                                    onClick={() => { setDailyFrom(""); setDailyTo(""); setDailyPage(1) }}
                                    className="text-sm text-red-500 hover:text-red-700"
                                >
                                    Clear filters
                                </button>
                            )}
                            <span className="text-sm text-gray-500 ml-auto">{dailyTotal} records</span>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="bg-white rounded-xl border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total Users</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">New Users</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Active Users</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total Posts</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">New Posts</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Likes</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Comments</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Messages</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Groups</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">New Groups</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-12 text-gray-400">
                                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                                        </td>
                                    </tr>
                                ) : dailyStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-12 text-gray-400">
                                            No daily stats found. Click &quot;Refresh Stats&quot; to compute today&apos;s data.
                                        </td>
                                    </tr>
                                ) : (
                                    dailyStats.map((d) => (
                                        <tr key={d._id} className="border-b hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                                {formatDate(d.stat_date)}
                                            </td>
                                            <td className="text-right px-4 py-3">{fmt(d.total_users)}</td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={d.new_users} />
                                            </td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={d.active_users} color="blue" />
                                            </td>
                                            <td className="text-right px-4 py-3">{fmt(d.total_posts)}</td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={d.new_posts} />
                                            </td>
                                            <td className="text-right px-4 py-3">{fmt(d.total_likes)}</td>
                                            <td className="text-right px-4 py-3">{fmt(d.total_comments)}</td>
                                            <td className="text-right px-4 py-3">{fmt(d.total_messages)}</td>
                                            <td className="text-right px-4 py-3">{fmt(d.total_groups)}</td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={d.new_groups} color="purple" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    {dailyTotalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Page {dailyPage} of {dailyTotalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                                    disabled={dailyPage <= 1}
                                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                                >
                                    ← Prev
                                </button>
                                <button
                                    onClick={() => setDailyPage((p) => Math.min(dailyTotalPages, p + 1))}
                                    disabled={dailyPage >= dailyTotalPages}
                                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MONTHLY TAB */}
            {activeTab === "monthly" && (
                <div className="space-y-4">
                    {/* FILTERS */}
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Year</label>
                                <select
                                    value={monthlyYear}
                                    onChange={(e) => setMonthlyYear(e.target.value)}
                                    className="border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">All years</option>
                                    {getYearOptions().map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Limit</label>
                                <select
                                    value={monthlyLimit}
                                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                                    className="border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value={6}>Last 6 months</option>
                                    <option value={12}>Last 12 months</option>
                                    <option value={24}>Last 24 months</option>
                                </select>
                            </div>
                            {monthlyYear && (
                                <button
                                    onClick={() => setMonthlyYear("")}
                                    className="text-sm text-red-500 hover:text-red-700"
                                >
                                    Clear filter
                                </button>
                            )}
                            <span className="text-sm text-gray-500 ml-auto">{monthlyStats.length} records</span>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="bg-white rounded-xl border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Month</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total Users</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">New Users</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Active Users</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total Posts</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">New Posts</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Likes</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Comments</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Messages</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Groups</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">New Groups</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-12 text-gray-400">
                                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                                        </td>
                                    </tr>
                                ) : monthlyStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-12 text-gray-400">
                                            No monthly stats found. Click &quot;Refresh Stats&quot; to compute data.
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyStats.map((m) => (
                                        <tr key={m._id} className="border-b hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                                {monthLabel(m.stat_year, m.stat_month)}
                                            </td>
                                            <td className="text-right px-4 py-3">{fmt(m.total_users)}</td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={m.new_users} />
                                            </td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={m.active_users} color="blue" />
                                            </td>
                                            <td className="text-right px-4 py-3">{fmt(m.total_posts)}</td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={m.new_posts} />
                                            </td>
                                            <td className="text-right px-4 py-3">{fmt(m.total_likes)}</td>
                                            <td className="text-right px-4 py-3">{fmt(m.total_comments)}</td>
                                            <td className="text-right px-4 py-3">{fmt(m.total_messages)}</td>
                                            <td className="text-right px-4 py-3">{fmt(m.total_groups)}</td>
                                            <td className="text-right px-4 py-3">
                                                <Badge value={m.new_groups} color="purple" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ===================== COMPONENTS ===================== */

function Badge({ value, color = "green" }: { value: number; color?: "green" | "blue" | "purple" }) {
    if (!value) return <span className="text-gray-400">0</span>
    const cls =
        color === "blue"
            ? "bg-blue-50 text-blue-700"
            : color === "purple"
            ? "bg-purple-50 text-purple-700"
            : "bg-green-50 text-green-700"
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            +{value.toLocaleString("en-US")}
        </span>
    )
}

/* ===================== HELPERS ===================== */

function fmt(n: number | undefined | null): string {
    return (n ?? 0).toLocaleString("en-US")
}

function formatDate(d: string): string {
    try {
        return new Date(d).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    } catch {
        return d
    }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function monthLabel(year: number, month: number): string {
    return `${MONTHS[month - 1] || month} ${year}`
}

function getYearOptions(): number[] {
    const cur = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => cur - i)
}
