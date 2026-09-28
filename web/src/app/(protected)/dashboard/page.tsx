"use client"

import { useEffect, useState, useCallback } from "react"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts"
import api from "@/lib/axios"

/* ===================== TYPES ===================== */

interface OverviewData {
    total_users: number
    active_users: number
    total_posts: number
    total_reports: number
    pending_reports: number
    total_groups: number
    growth_rate: { users: number; posts: number }
    engagement_rate: number
}

interface GrowthPoint {
    date: string
    new_users: number
    new_posts: number
    new_messages: number
}

interface EngagementData {
    total_likes: number
    total_comments: number
    total_messages: number
    daily_likes: { _id: string; count: number }[]
    daily_comments: { _id: string; count: number }[]
}

interface LogEntry {
    _id: string
    action: string
    entity_type: string
    entity_id: string
    admin_username: string
    created_at: string
}

/* ===================== PAGE ===================== */

export default function DashboardPage() {
    const [overview, setOverview] = useState<OverviewData | null>(null)
    const [growthData, setGrowthData] = useState<GrowthPoint[]>([])
    const [engagement, setEngagement] = useState<EngagementData | null>(null)
    const [violationData, setViolationData] = useState<{ name: string; value: number }[]>([])
    const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)

    const fetchDashboard = useCallback(async () => {
        setLoading(true)
        try {
            const [ovRes, grRes, engRes, repRes, logRes] = await Promise.all([
                api.get("/admin/analytics/overview"),
                api.get("/admin/analytics/growth", { params: { period: "month" } }),
                api.get("/admin/analytics/engagement"),
                api.get("/admin/reports", { params: { limit: 200 } }),
                api.get("/admin/logs", { params: { limit: 5 } }),
            ])

            setOverview(ovRes.data)
            setGrowthData(grRes.data)
            setEngagement(engRes.data)

            // Aggregate report reasons for pie chart
            const reports: any[] = repRes.data?.reports || []
            const reasonMap: Record<string, number> = {}
            for (const r of reports) {
                const reason = r.reason || "other"
                reasonMap[reason] = (reasonMap[reason] || 0) + 1
            }
            const sorted = Object.entries(reasonMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
            setViolationData(sorted)

            setRecentLogs(logRes.data?.logs || [])
        } catch (err) {
            console.error("Dashboard fetch error:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboard()
    }, [fetchDashboard])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        )
    }

    /* ---- prepare chart data ---- */

    // User growth chart (monthly)
    const userGrowthChart = growthData.map((g) => ({
        month: formatMonth(g.date), 
        users: g.new_users,
    }))

    // Posts & Reports weekly from engagement daily_likes/comments (last 7 days)
    const dailyChart = buildDailyChart(engagement)

    return (
        <div className="space-y-6">
            {/* TITLE */}
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <Stat
                    title="Total Users"
                    value={fmt(overview?.total_users)}
                    percent={fmtGrowth(overview?.growth_rate?.users)}
                    danger={false}
                    icon="users"
                />
                <Stat
                    title="Active Users (30d)"
                    value={fmt(overview?.active_users)}
                    percent={`${overview?.engagement_rate ?? 0}%`}
                    danger={false}
                    icon="active"
                />
                <Stat
                    title="Total Posts"
                    value={fmt(overview?.total_posts)}
                    percent={fmtGrowth(overview?.growth_rate?.posts)}
                    danger={false}
                    icon="posts"
                />
                <Stat
                    title="Pending Reports"
                    value={fmt(overview?.pending_reports)}
                    percent={`${fmt(overview?.total_reports)} total`}
                    danger={(overview?.pending_reports ?? 0) > 0}
                    icon="warning"
                />
                <Stat
                    title="Groups"
                    value={fmt(overview?.total_groups)}
                    percent=""
                    danger={false}
                    icon="groups"
                />
                <Stat
                    title="Engagement"
                    value={`${overview?.engagement_rate ?? 0}%`}
                    percent={`${fmt(engagement?.total_likes)} likes · ${fmt(engagement?.total_comments)} comments`}
                    danger={false}
                    icon="status"
                />
            </div>

            {/* CHARTS ROW 1 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* USER GROWTH */}
                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-semibold text-gray-900 mb-4">User Growth (Monthly)</h3>
                    <div className="h-72">
                        {userGrowthChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={userGrowthChart}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart />
                        )}
                    </div>
                </div>

                {/* ENGAGEMENT DAILY */}
                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-semibold text-gray-900 mb-4">Likes & Comments (Last 7 days)</h3>
                    <div className="h-72">
                        {dailyChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyChart}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="likes" fill="#2563eb" />
                                    <Bar dataKey="comments" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart />
                        )}
                    </div>
                </div>
            </div>

            {/* CHARTS ROW 2 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* REPORT REASONS PIE */}
                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-semibold text-gray-900 mb-4">Report Reasons</h3>
                    <div className="h-72 flex justify-center">
                        {violationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={violationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {violationData.map((_, index) => (
                                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" align="center" iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart label="No reports yet" />
                        )}
                    </div>
                </div>

                {/* RECENT ADMIN ACTIVITY */}
                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-semibold text-gray-900 mb-4">Recent Admin Activity</h3>
                    {recentLogs.length > 0 ? (
                        <ul className="space-y-4 text-sm">
                            {recentLogs.map((log) => (
                                <li key={log._id} className="flex items-start gap-3">
                                    <span className={`w-2.5 h-2.5 rounded-full mt-1 ${actionColor(log.action)}`} />
                                    <div>
                                        <p className="text-gray-900">
                                            <span className="font-medium">{log.admin_username}</span>{" "}
                                            {log.action} {log.entity_type}
                                            {log.entity_id ? ` #${log.entity_id.slice(-6)}` : ""}
                                        </p>
                                        <p className="text-gray-500 text-xs">{timeAgo(log.created_at)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-400 text-sm">No recent activity</p>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ===================== COMPONENTS ===================== */

function Stat({ title, value, percent, danger, icon }: { title: string; value: string; percent: string; danger: boolean; icon: string }) {
    const iconMap: Record<string, string> = {
        users: "👥",
        active: "📈",
        posts: "📝",
        warning: "⚠️",
        groups: "👪",
        status: "🚀",
    }

    return (
        <div className="bg-white p-6 rounded-xl border flex justify-between items-start">
            <div>
                <p className="text-sm text-gray-600">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
                {percent && (
                    <p className={`mt-1 text-sm ${danger ? "text-red-500" : "text-green-500"}`}>{percent}</p>
                )}
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-gray-100">
                {iconMap[icon] || "📊"}
            </div>
        </div>
    )
}

function EmptyChart({ label = "No data available" }: { label?: string }) {
    return (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {label}
        </div>
    )
}

/* ===================== HELPERS ===================== */

const PIE_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

function fmt(n: number | undefined | null): string {
    if (n == null) return "0"
    return n.toLocaleString("en-US")
}

function fmtGrowth(rate: number | undefined | null): string {
    if (rate == null) return ""
    return rate >= 0 ? `+${rate}%` : `${rate}%`
}

function formatMonth(dateStr: string): string {
    // dateStr might be "2026-01" or "2026-01-15"
    try {
        const parts = dateStr.split("-")
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthIdx = parseInt(parts[1], 10) - 1
        return monthNames[monthIdx] || dateStr
    } catch {
        return dateStr
    }
}

function buildDailyChart(eng: EngagementData | null): { day: string; likes: number; comments: number }[] {
    if (!eng) return []
    const allDates = new Set<string>()
    eng.daily_likes?.forEach((d) => allDates.add(d._id))
    eng.daily_comments?.forEach((d) => allDates.add(d._id))

    const likeMap = new Map(eng.daily_likes?.map((d) => [d._id, d.count]) || [])
    const commentMap = new Map(eng.daily_comments?.map((d) => [d._id, d.count]) || [])

    return Array.from(allDates)
        .sort()
        .map((date) => {
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            const d = new Date(date)
            return {
                day: dayNames[d.getUTCDay()] || date.slice(5),
                likes: likeMap.get(date) || 0,
                comments: commentMap.get(date) || 0,
            }
        })
}

function actionColor(action: string): string {
    if (action.includes("delete") || action.includes("ban") || action.includes("block")) return "bg-red-500"
    if (action.includes("create") || action.includes("register")) return "bg-green-500"
    if (action.includes("update") || action.includes("edit") || action.includes("resolve")) return "bg-blue-500"
    return "bg-gray-400"
}

function timeAgo(dateStr: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = Math.max(0, now - then)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
}