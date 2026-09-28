"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Search, X, Loader2 } from "lucide-react"
import {
    fetchAdminReports,
    fetchReportStats,
    resolveReport,
    rejectReport,
} from "@/services/admin.service"

/* ===================== PAGE ===================== */

export default function ReportsPage() {
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("all")
    const [page, setPage] = useState(1)
    const [selectedReport, setSelectedReport] = useState<any>(null)
    const [reports, setReports] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [stats, setStats] = useState<any>({ total: 0, pending: 0, resolved: 0, rejected: 0 })
    const [loading, setLoading] = useState(true)

    const PAGE_SIZE = 10

    const loadReports = useCallback(async () => {
        try {
            setLoading(true)
            const data = await fetchAdminReports({
                page,
                limit: PAGE_SIZE,
                status: status === "all" ? undefined : status,
            })
            setReports(data.reports || [])
            setTotal(data.total || 0)
        } catch (err) {
            console.error("Failed to load reports:", err)
        } finally {
            setLoading(false)
        }
    }, [page, status])

    const loadStats = useCallback(async () => {
        try {
            const data = await fetchReportStats()
            setStats(data)
        } catch (err) {
            console.error("Failed to load stats:", err)
        }
    }, [])

    useEffect(() => {
        loadReports()
        loadStats()
    }, [loadReports, loadStats])

    const filteredReports = useMemo(() => {
        let result = reports
        if (search) {
            const s = search.toLowerCase()
            result = result.filter((r: any) => {
                return (
                    r.reporter_info?.username?.toLowerCase().includes(s) ||
                    r.reporter_info?.full_name?.toLowerCase().includes(s) ||
                    r.reason?.toLowerCase().includes(s) ||
                    r.post_info?.content?.toLowerCase().includes(s) ||
                    r.post_info?.author_username?.toLowerCase().includes(s)
                )
            })
        }
        return result
    }, [search, reports])

    // Count duplicate reports per post
    const reportCountByPost = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const r of reports) {
            if (r.reported_post_id) {
                counts[r.reported_post_id] = (counts[r.reported_post_id] || 0) + 1
            }
        }
        return counts
    }, [reports])

    const totalPages = Math.ceil(total / PAGE_SIZE)

    const handleReviewDone = () => {
        setSelectedReport(null)
        loadReports()
        loadStats()
    }

    return (
        <>
            <div className="space-y-6">
                {/* TITLE */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900">
                            Reports & Moderation
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Review and handle content reports
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500">
                            Pending: {stats.pending}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                            Resolved: {stats.resolved}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Rejected: {stats.rejected}
                        </span>
                    </div>
                </div>

                {/* SEARCH */}
                <div className="bg-white border rounded-xl p-4 flex gap-4">
                    <div className="relative flex-1">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by reporter, content, or reason..."
                            className="w-full border rounded-lg pl-10 pr-4 py-2 text-sm text-gray-700"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value)
                            setPage(1)
                        }}
                        className="border rounded-lg px-3 py-2 text-sm text-gray-700"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="bg-white border rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-gray-400" size={32} />
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-4 text-left">Reporter</th>
                                    <th className="text-left">Post / Target</th>
                                    <th className="text-left">Reason</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-center">Created</th>
                                    <th className="text-right pr-4">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="text-gray-700">
                                {filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-400">
                                            No reports found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReports.map((r: any) => (
                                        <tr key={r._id} className="border-t hover:bg-gray-50">
                                            <td className="p-4">
                                                <p className="font-medium">{r.reporter_info?.full_name || r.reporter_info?.username || 'Unknown'}</p>
                                                <p className="text-xs text-gray-400">@{r.reporter_info?.username}</p>
                                            </td>

                                            <td>
                                                {r.post_info ? (
                                                    <>
                                                        <p className="text-gray-700 truncate max-w-xs">
                                                            {r.post_info.content?.substring(0, 60)}
                                                            {r.post_info.content?.length > 60 ? '...' : ''}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            by {r.post_info.author_name || r.post_info.author_username}
                                                            {r.reported_post_id && reportCountByPost[r.reported_post_id] > 1 && (
                                                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-semibold">
                                                                    {reportCountByPost[r.reported_post_id]} reports
                                                                </span>
                                                            )}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-gray-400 italic">
                                                        {r.type === 'user' ? 'User report' : 'Content removed'}
                                                    </p>
                                                )}
                                            </td>

                                            <td>
                                                <ReasonBadge reason={r.reason} />
                                            </td>

                                            <td className="text-center">
                                                <StatusBadge status={r.status} />
                                            </td>

                                            <td className="text-center text-gray-500">
                                                {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : ''}
                                            </td>

                                            <td className="text-right pr-4">
                                                <button
                                                    onClick={() => setSelectedReport(r)}
                                                    className="px-3 py-1 rounded-md text-xs font-medium border border-blue-500 text-blue-600 hover:bg-blue-50"
                                                >
                                                    {r.status === 'pending' ? 'Review' : 'View'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 rounded-md text-sm border disabled:opacity-50 hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 rounded-md text-sm border disabled:opacity-50 hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {selectedReport && (
                <ReviewModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                    onDone={handleReviewDone}
                />
            )}
        </>
    )
}

/* ===================== MODAL ===================== */

function ReviewModal({ report, onClose, onDone }: { report: any; onClose: () => void; onDone: () => void }) {
    const [note, setNote] = useState("")
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const handleAction = async (action: string) => {
        if (!note.trim() && report.status === 'pending') {
            alert('Please enter a note before taking action.')
            return
        }

        try {
            setActionLoading(action)
            if (action === 'reject') {
                await rejectReport(report._id, { resolved_note: note })
            } else {
                await resolveReport(report._id, {
                    resolved_note: note,
                    action_taken: action,
                })
            }
            onDone()
        } catch (err) {
            console.error(`Failed to ${action} report:`, err)
            alert(`Failed to ${action} report`)
        } finally {
            setActionLoading(null)
        }
    }

    const isPending = report.status === 'pending'

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={18} />
                </button>

                <h2 className="text-xl font-medium mb-4 text-gray-800">
                    {isPending ? 'Review Report' : 'Report Details'}
                </h2>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500 mb-1">Reporter</p>
                        <p className="text-gray-700 font-medium">
                            {report.reporter_info?.full_name || report.reporter_info?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400">@{report.reporter_info?.username}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Reason</p>
                        <ReasonBadge reason={report.reason} />
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Type</p>
                        <p className="text-gray-700 capitalize">{report.type}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Status</p>
                        <StatusBadge status={report.status} />
                    </div>
                </div>

                {/* Post content preview */}
                {report.post_info && (
                    <div className="mt-4">
                        <p className="text-gray-500 text-sm mb-1">Reported Post</p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
                            <p className="font-medium text-xs text-gray-500 mb-1">
                                By {report.post_info.author_name || report.post_info.author_username} • Status: {report.post_info.status}
                            </p>
                            <p className="text-gray-600">{report.post_info.content}</p>
                            {report.post_info.media_urls?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {report.post_info.media_urls.map((url: string, idx: number) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`attachment-${idx + 1}`}
                                                className="h-32 w-32 object-cover rounded-md border border-yellow-200 hover:opacity-90 transition-opacity"
                                            />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Description */}
                {report.description && (
                    <div className="mt-4">
                        <p className="text-gray-500 text-sm mb-1">Description</p>
                        <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-600">
                            {report.description}
                        </div>
                    </div>
                )}

                {/* Resolution info for resolved/rejected */}
                {!isPending && report.resolved_note && (
                    <div className="mt-4">
                        <p className="text-gray-500 text-sm mb-1">Resolution Note</p>
                        <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-600">
                            <p>{report.resolved_note}</p>
                            {report.action_taken && report.action_taken !== 'none' && (
                                <p className="text-xs text-gray-400 mt-1">Action: {report.action_taken}</p>
                            )}
                            {report.resolver_info && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Resolved by: {report.resolver_info.full_name || report.resolver_info.username}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Action buttons for pending reports */}
                {isPending && (
                    <>
                        <div className="mt-4">
                            <p className="text-gray-500 text-sm mb-1">Resolution Note *</p>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Enter reason for your decision..."
                                className="w-full border rounded-lg p-3 text-sm text-gray-700 resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="mt-4 flex gap-3 flex-wrap">
                            <button
                                disabled={!!actionLoading}
                                onClick={() => handleAction('remove_post')}
                                className="px-4 py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 active:scale-95 transition-all duration-200 disabled:opacity-50"
                            >
                                {actionLoading === 'remove_post' ? 'Processing...' : 'Accept & Remove Post'}
                            </button>
                            <button
                                disabled={!!actionLoading}
                                onClick={() => handleAction('hide_post')}
                                className="px-4 py-2 rounded-md bg-orange-600 text-white font-medium hover:bg-orange-700 active:scale-95 transition-all duration-200 disabled:opacity-50"
                            >
                                {actionLoading === 'hide_post' ? 'Processing...' : 'Hide Post'}
                            </button>
                            <button
                                disabled={!!actionLoading}
                                onClick={() => handleAction('ban_user')}
                                className="px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 active:scale-95 transition-all duration-200 disabled:opacity-50"
                            >
                                {actionLoading === 'ban_user' ? 'Processing...' : 'Ban User'}
                            </button>
                            <button
                                disabled={!!actionLoading}
                                onClick={() => handleAction('reject')}
                                className="px-4 py-2 rounded-md bg-gray-700 text-white font-medium hover:bg-gray-800 active:scale-95 transition-all duration-200 disabled:opacity-50"
                            >
                                {actionLoading === 'reject' ? 'Processing...' : 'Reject Report'}
                            </button>
                        </div>
                    </>
                )}

                <div className="mt-6 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md border border-gray-400 text-gray-700 font-medium hover:bg-gray-100 active:scale-95 transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ===================== BADGES ===================== */

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: "bg-yellow-50 text-yellow-600",
        resolved: "bg-green-50 text-green-600",
        rejected: "bg-gray-100 text-gray-500",
    }

    return (
        <span className={`px-3 py-1 rounded-full text-xs capitalize ${map[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

function ReasonBadge({ reason }: { reason: string }) {
    const lower = reason?.toLowerCase() || ''
    let color = "bg-gray-50 text-gray-600"

    if (lower.includes('spam')) color = "bg-yellow-50 text-yellow-600"
    else if (lower.includes('harassment') || lower.includes('quấy rối') || lower.includes('bắt nạt')) color = "bg-red-50 text-red-600"
    else if (lower.includes('inappropriate') || lower.includes('không phù hợp')) color = "bg-orange-50 text-orange-600"
    else if (lower.includes('hate') || lower.includes('bạo lực')) color = "bg-red-50 text-red-600"
    else if (lower.includes('scam') || lower.includes('quyền riêng tư')) color = "bg-purple-50 text-purple-600"

    return (
        <span className={`px-3 py-1 rounded-full text-xs ${color}`}>
            {reason}
        </span>
    )
}
