"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Search,
    ChevronDown,
    Eye,
    ShieldOff,
    ShieldCheck,
    Users,
    Globe,
    Lock,
    Crown,
    X,
    Loader2,
    FileText
} from "lucide-react"
import api from "@/lib/axios"

/* ===================== TYPES ===================== */
type Group = {
    id: string
    name: string
    description: string
    status: "active" | "blocked"
    privacy: "public" | "private"
    avatar_url?: string
    memberCount: number
    owner?: string
    created: string
}

/* ===================== PAGE ===================== */
export default function GroupManagementPage() {
    const [openFilter, setOpenFilter] = useState<"privacy" | "status" | null>(null)
    const [groupsData, setGroupsData] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("all")
    const [privacy, setPrivacy] = useState("all")

    const [page, setPage] = useState(1)
    const PAGE_SIZE = 6

    const [selectedGroup, setSelectedGroup] = useState<any>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    useEffect(() => {
        fetchGroups()
    }, [])

    const fetchGroupDetails = async (g: Group) => {
        try {
            setDetailLoading(true)
            const res = await api.get(`/admin/groups/${g.id}/details`)
            setSelectedGroup({ ...g, ...res.data })
        } catch {
            alert("Không lấy được chi tiết group")
        } finally {
            setDetailLoading(false)
        }
    }

    const fetchGroups = async () => {
        try {
            setLoading(true)
            const res = await api.get("/admin/groups")

            const mapped: Group[] = res.data.map((g: any) => ({
                id: g._id,
                name: g.name,
                description: g.description || "",
                status: g.status === "blocked" ? "blocked" : "active",
                privacy: g.privacy || "public",
                avatar_url: g.avatar_url,
                memberCount: g.memberCount || 0,
                owner: g.owner?.username || "Unknown",
                created: g.createdAt
                    ? new Date(g.createdAt).toISOString().split("T")[0]
                    : "-"
            }))

            setGroupsData(mapped)
        } catch {
            alert("Không lấy được danh sách group")
        } finally {
            setLoading(false)
        }
    }

    /* ===== FILTER ===== */
    const filteredGroups = useMemo(() => {
        return groupsData.filter((g) => {
            const searchOk = g.name
                .toLowerCase()
                .includes(search.toLowerCase())
            const statusOk = status === "all" || g.status === status
            const privacyOk = privacy === "all" || g.privacy === privacy
            return searchOk && statusOk && privacyOk
        })
    }, [groupsData, search, status, privacy])

    const totalPages = Math.ceil(filteredGroups.length / PAGE_SIZE)
    const groups = filteredGroups.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    )

    const onToggleStatus = async (g: Group) => {
        const newStatus = g.status === "active" ? "blocked" : "active"
        if (!confirm("Bạn chắc chắn muốn thay đổi trạng thái group?")) return

        try {
            await api.put(`/admin/groups/${g.id}/status`, { status: newStatus })
            setGroupsData((prev) =>
                prev.map((x) =>
                    x.id === g.id ? { ...x, status: newStatus } : x
                )
            )
        } catch {
            alert("Không thể thay đổi trạng thái group")
        }
    }

    const StatusBadge = ({ s }: { s: Group["status"] }) =>
        s === "active" ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                Active
            </span>
        ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                Disabled
            </span>
        )

    return (
        <div className="groups-neu-page p-6 space-y-6 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">
                        Groups & Communities
                    </h1>
                    <p className="mt-1 text-gray-600 text-sm">
                        Manage all groups and communities
                    </p>
                </div>
                <span className="px-4 py-2 rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold">
                    Total Groups: {groupsData.length}
                </span>
            </div>

            {/* Search + Filter */}
            <div className="groups-neu-toolbar flex flex-wrap gap-3 p-4 rounded-2xl">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        className="pl-9 pr-3 py-2 rounded-lg border w-full text-sm text-gray-900"
                        placeholder="Search by group name or owner..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                    />
                </div>

                
<div className="groups-neu-dropdown-wrap">
    <button
        type="button"
        className="groups-neu-dropdown-trigger"
        onClick={() => setOpenFilter(openFilter === "privacy" ? null : "privacy")}
        aria-expanded={openFilter === "privacy"}
    >
        {privacy === "all" ? "All Privacy" : privacy === "public" ? "Public" : "Private"}
        <ChevronDown size={16} />
    </button>

    {openFilter === "privacy" && (
        <div className="groups-neu-dropdown-menu">
            {[
                { value: "all", label: "All Privacy" },
                { value: "public", label: "Public" },
                { value: "private", label: "Private" },
            ].map((option) => (
                <button
                    type="button"
                    key={option.value}
                    className={`groups-neu-dropdown-option ${privacy === option.value ? "is-selected" : ""}`}
                    onClick={() => {
                        setPrivacy(option.value)
                        setPage(1)
                        setOpenFilter(null)
                    }}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )}
</div>

<div className="groups-neu-dropdown-wrap">
    <button
        type="button"
        className="groups-neu-dropdown-trigger"
        onClick={() => setOpenFilter(openFilter === "status" ? null : "status")}
        aria-expanded={openFilter === "status"}
    >
        {status === "all" ? "All Status" : status === "active" ? "Active" : "Disabled"}
        <ChevronDown size={16} />
    </button>

    {openFilter === "status" && (
        <div className="groups-neu-dropdown-menu">
            {[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "blocked", label: "Disabled" },
            ].map((option) => (
                <button
                    type="button"
                    key={option.value}
                    className={`groups-neu-dropdown-option ${status === option.value ? "is-selected" : ""}`}
                    onClick={() => {
                        setStatus(option.value)
                        setPage(1)
                        setOpenFilter(null)
                    }}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )}
</div>

            
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-10 text-gray-500">
                    Loading...
                </div>
            ) : (
                <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((g) => (
                        <div
                            key={g.id}
                            className="groups-neu-card rounded-2xl overflow-hidden flex flex-col"
                        >
                            <div className="groups-neu-card-banner h-24" />

                            <div className="groups-neu-card-body p-4 flex flex-col flex-1">
                                
<div className="flex justify-between items-center gap-3">
    <h3 className="text-lg font-semibold text-gray-900 truncate min-w-0 flex-1">
        {g.name}
    </h3>
    <div className="shrink-0">
        <StatusBadge s={g.status} />
    </div>
</div>


                                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                    {g.description}
                                </p>

                                <div className="text-sm text-gray-700 space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Crown className="w-4 h-4 text-orange-500" />
                                        <span className="font-medium">
                                            Owner:
                                        </span>{" "}
                                        {g.owner}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        {g.memberCount} members
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {g.privacy === "public" ? (
                                            <Globe className="w-4 h-4" />
                                        ) : (
                                            <Lock className="w-4 h-4" />
                                        )}
                                        {g.privacy}
                                    </div>
                                    <div className="text-gray-500">
                                        Created: {g.created}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 mt-auto">
                                    <button
                                        onClick={() => fetchGroupDetails(g)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View
                                    </button>

                                    <button
                                        onClick={() => onToggleStatus(g)}
                                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border ${g.status === "active"
                                                ? "border-red-300 text-red-600 hover:bg-red-50"
                                                : "border-green-300 text-green-600 hover:bg-green-50"
                                            }`}
                                    >
                                        {g.status === "active" ? (
                                            <>
                                                <ShieldOff className="w-4 h-4" />
                                                Disable
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="w-4 h-4" />
                                                Enable
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="groups-neu-pagination">
                    <button
                        type="button"
                        className="groups-neu-page-btn"
                        disabled={page === 1}
                        onClick={() => setPage((current) => current - 1)}
                    >
                        Previous
                    </button>

                    <span className="groups-neu-page-info">
                        Page {page} of {totalPages}
                    </span>

                    <button
                        type="button"
                        className="groups-neu-page-btn"
                        disabled={page === totalPages}
                        onClick={() => setPage((current) => current + 1)}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">


            {/* Group Detail Modal */}
            {(selectedGroup || detailLoading) && (
                <GroupDetailModal
                    group={selectedGroup}
                    loading={detailLoading}
                    onClose={() => setSelectedGroup(null)}
                />
            )}
                <SummaryCard
                    title="Total Members"
                    value={groupsData.reduce(
                        (sum, g) => sum + g.memberCount,
                        0
                    )}
                />
                <SummaryCard
                    title="Public Groups"
                    value={groupsData.filter((g) => g.privacy === "public").length}
                />
                <SummaryCard
                    title="Private Groups"
                    value={
                        groupsData.filter((g) => g.privacy === "private").length
                    }
                />
                <SummaryCard
                    title="Disabled Groups"
                    value={
                        groupsData.filter((g) => g.status === "blocked").length
                    }
                />
            </div>
        </div>
    )
}


/* ===== SUMMARY CARD ===== */
function SummaryCard({ title, value }: { title: string; value: number }) {
    return (
        <div className="groups-neu-summary rounded-2xl p-4">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
    )
}


/* ===== GROUP DETAIL MODAL ===== */
function GroupDetailModal({ group, loading, onClose }: { group: any; loading: boolean; onClose: () => void }) {
    if (loading) {
        return (
            <div className="groups-neu-modal-overlay">
    <div className="groups-neu-modal">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            </div>
        )
    }
    if (!group) return null

    const members = group.members || []
    const posts = group.posts || []
    const groupInfo = group.group || group

    return (
    <div className="groups-neu-modal-overlay">
        <div className="groups-neu-modal">
            <button
                onClick={onClose}
                className="groups-neu-modal-close"
                type="button"
                aria-label="Close modal"
            >
                <X size={18} />
            </button>

            <h2 className="groups-neu-modal-title">
                {groupInfo.name || group.name}
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <p className="text-gray-500 mb-1">Privacy</p>
                    <div className="flex items-center gap-1 text-gray-700">
                        {(groupInfo.privacy || group.privacy) === "public"
                            ? <Globe className="w-4 h-4" />
                            : <Lock className="w-4 h-4" />}
                        <span className="capitalize">
                            {groupInfo.privacy || group.privacy}
                        </span>
                    </div>
                </div>
                    <div>
                        <p className="text-gray-500 mb-1">Status</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            (groupInfo.status || group.status) === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                        }`}>
                            {(groupInfo.status || group.status) === "active" ? "Active" : "Disabled"}
                        </span>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Owner</p>
                        <p className="text-gray-700">{group.owner || "Unknown"}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Created</p>
                        <p className="text-gray-700">{group.created || "-"}</p>
                    </div>
                </div>

                {(groupInfo.description || group.description) && (
                    <div className="mb-4">
                        <p className="text-gray-500 text-sm mb-1">Description</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                            {groupInfo.description || group.description}
                        </p>
                    </div>
                )}

                {/* Members */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">Members ({members.length})</p>
                    </div>
                    {members.length > 0 ? (
                        <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                            <div className="space-y-1">
                                {members.slice(0, 20).map((m: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700">{m.user_id}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                            m.role === "owner" ? "bg-orange-100 text-orange-600" :
                                            m.role === "admin" ? "bg-blue-100 text-blue-600" :
                                            "bg-gray-100 text-gray-500"
                                        }`}>
                                            {m.role || "member"}
                                        </span>
                                    </div>
                                ))}
                                {members.length > 20 && (
                                    <p className="text-xs text-gray-400">... and {members.length - 20} more</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No members</p>
                    )}
                </div>

                {/* Posts */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">Posts ({posts.length})</p>
                    </div>
                    {posts.length > 0 ? (
                        <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                            {posts.slice(0, 10).map((p: any, i: number) => (
                                <div key={i} className="bg-white rounded-lg p-2 border text-sm">
                                    <p className="text-gray-700 line-clamp-2">{p.content}</p>
                                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                        <span>Status: {p.status}</span>
                                        {p.createdAt && <span>{new Date(p.createdAt).toLocaleDateString("vi-VN")}</span>}
                                    </div>
                                </div>
                            ))}
                            {posts.length > 10 && (
                                <p className="text-xs text-gray-400">... and {posts.length - 10} more</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No posts</p>
                    )}
                </div>

                <div className="text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md border border-gray-400 text-gray-700 font-medium hover:bg-gray-100"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}