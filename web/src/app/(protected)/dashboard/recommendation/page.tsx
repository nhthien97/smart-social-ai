"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth.store"
import { mlService, MLHealth, MLStats, MLEvalResult, MLTrainResult, MLRecommendResponse, MLSimilarResponse } from "@/services/ml.service"
import api from "@/lib/axios"
import {
    BrainCircuit,
    RefreshCw,
    PlayCircle,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Users,
    FileText,
    MousePointerClick,
    Gauge,
    BarChart2,
    TrendingUp,
    Clock,
    ShieldAlert,
    Search,
    Layers,
    Tag,
    ArrowUpDown,
} from "lucide-react"

// ─── helpers ────────────────────────────────────────────────────────────────

function scoreColor(v: number) {
    if (v >= 0.4) return "text-emerald-600"
    if (v >= 0.2) return "text-amber-500"
    return "text-rose-500"
}

function scoreBg(v: number) {
    if (v >= 0.4) return "bg-emerald-50 border-emerald-200"
    if (v >= 0.2) return "bg-amber-50 border-amber-200"
    return "bg-rose-50 border-rose-200"
}

function reliabilityBadge(r: string) {
    if (r.startsWith("high")) return "bg-emerald-100 text-emerald-700"
    if (r.startsWith("medium")) return "bg-blue-100 text-blue-700"
    if (r.startsWith("low")) return "bg-amber-100 text-amber-700"
    return "bg-rose-100 text-rose-700"
}

function pct(v: number) {
    return `${(v * 100).toFixed(1)}%`
}

// Bar gauge 0–100%
function GaugeBar({ value, color }: { value: number; color: string }) {
    const w = Math.min(100, Math.round(value * 100))
    return (
        <div className="w-full bg-gray-100 rounded-full h-3 mt-2">
            <div
                className={`h-3 rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${w}%` }}
            />
        </div>
    )
}

// ─── card components ─────────────────────────────────────────────────────────

function MetricCard({
    label,
    value,
    sub,
    icon: Icon,
    color,
}: {
    label: string
    value: string | number
    sub?: string
    icon: React.ElementType
    color: string
}) {
    return (
        <div className="bg-white rounded-xl border p-5 flex items-start gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={20} className="text-white" />
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function RecommendationPage() {
    const router = useRouter()
    const { user, isAuthenticated } = useAuthStore()

    const [health, setHealth] = useState<MLHealth | null>(null)
    const [stats, setStats] = useState<MLStats | null>(null)
    const [evalResult, setEvalResult] = useState<MLEvalResult | null>(null)
    const [k, setK] = useState(10)

    const [loading, setLoading] = useState(true)
    const [evalLoading, setEvalLoading] = useState(false)
    const [trainLoading, setTrainLoading] = useState(false)
    const [trainResult, setTrainResult] = useState<MLTrainResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

    // ── Lookup: recommend for user ───────────────────────────────────────────
    const [userIdQuery, setUserIdQuery] = useState("")
    const [recResult, setRecResult] = useState<MLRecommendResponse | null>(null)
    const [recLoading, setRecLoading] = useState(false)
    const [recError, setRecError] = useState<string | null>(null)
    const [recUserInfo, setRecUserInfo] = useState<any | null>(null)
    const [recPostMap, setRecPostMap] = useState<Record<string, any>>({})

    // ── Lookup: similar posts ────────────────────────────────────────────────
    const [postIdQuery, setPostIdQuery] = useState("")
    const [simResult, setSimResult] = useState<MLSimilarResponse | null>(null)
    const [simLoading, setSimLoading] = useState(false)
    const [simError, setSimError] = useState<string | null>(null)
    const [simPostMap, setSimPostMap] = useState<Record<string, any>>({})
    const [queryPostInfo, setQueryPostInfo] = useState<any | null>(null)

    // ── Call all ML endpoints ───────────────────────────────────────────────
    const [allLoading, setAllLoading] = useState(false)
    const [allError, setAllError] = useState<string | null>(null)
    const [allOutput, setAllOutput] = useState<Record<string, unknown> | null>(null)

    // ── Admin guard ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login")
            return
        }
        if (!user?.roles_admin) {
            router.push("/dashboard")
        }
    }, [isAuthenticated, user, router])

    // ── Data fetch ───────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [h, s] = await Promise.all([
                mlService.health(),
                mlService.stats(),
            ])
            setHealth(h)
            setStats(s)
            setLastRefresh(new Date())
        } catch (e: any) {
            setError(e.message ?? "Không thể kết nối ML server")
        } finally {
            setLoading(false)
        }
    }, [])

    const runEval = useCallback(async () => {
        setEvalLoading(true)
        try {
            const r = await mlService.evaluate(k)
            setEvalResult(r)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setEvalLoading(false)
        }
    }, [k])

    const runTrain = useCallback(async () => {
        setTrainLoading(true)
        setTrainResult(null)
        try {
            const r = await mlService.train()
            setTrainResult(r)
            // Refresh stats after train
            const s = await mlService.stats()
            setStats(s)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setTrainLoading(false)
        }
    }, [])

    const lookupRecommend = useCallback(async () => {
        if (!userIdQuery.trim()) return
        setRecLoading(true)
        setRecResult(null)
        setRecError(null)
        setRecUserInfo(null)
        setRecPostMap({})
        try {
            const uid = userIdQuery.trim()
            // Fetch recommendation + user info + post tags in parallel
            const [r, usersRes] = await Promise.all([
                mlService.recommend(uid),
                api.get('/admin/users').catch(() => ({ data: [] })),
            ])
            setRecResult(r)

            // Find matching user
            const found = usersRes.data.find((u: any) => u._id === uid) ?? null
            setRecUserInfo(found)

            // Fetch post details (tags) for each recommended post in parallel
            // Guard: only call API for valid 24-char hex ObjectIds
            const isValidObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id)
            if (r.recommendations.length > 0) {
                const settled = await Promise.allSettled(
                    r.recommendations.map((rec) =>
                        isValidObjectId(rec.post_id)
                            ? api.get(`/admin/posts/${rec.post_id}`)
                            : Promise.reject('invalid id')
                    )
                )
                const map: Record<string, any> = {}
                settled.forEach((res, idx) => {
                    if (res.status === 'fulfilled') {
                        map[r.recommendations[idx].post_id] = res.value.data
                    }
                })
                setRecPostMap(map)
            }
        } catch (e: any) {
            setRecError(e.message ?? "Không thể lấy gợi ý")
        } finally {
            setRecLoading(false)
        }
    }, [userIdQuery])

    const lookupSimilar = useCallback(async () => {
        if (!postIdQuery.trim()) return
        setSimLoading(true)
        setSimResult(null)
        setSimError(null)
        setSimPostMap({})
        setQueryPostInfo(null)
        try {
            const pid = postIdQuery.trim()
            // Fetch similar posts + query post info in parallel
            const [r, qRes] = await Promise.all([
                mlService.similar(pid),
                api.get(`/admin/posts/${pid}`).catch(() => ({ data: null })),
            ])
            setSimResult(r)
            setQueryPostInfo(qRes.data)

            // Fetch post details (tags) for each similar post in parallel
            // Guard: only call API for valid 24-char hex ObjectIds
            const isValidObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id)
            if (r.similar_posts.length > 0) {
                const settled = await Promise.allSettled(
                    r.similar_posts.map((item) =>
                        isValidObjectId(item.post_id_b)
                            ? api.get(`/admin/posts/${item.post_id_b}`)
                            : Promise.reject('invalid id')
                    )
                )
                const map: Record<string, any> = {}
                settled.forEach((res, idx) => {
                    if (res.status === 'fulfilled') {
                        map[r.similar_posts[idx].post_id_b] = res.value.data
                    }
                })
                setSimPostMap(map)
            }
        } catch (e: any) {
            setSimError(e.message ?? "Không thể lấy bài tương tự")
        } finally {
            setSimLoading(false)
        }
    }, [postIdQuery])

    const callAllEndpoints = useCallback(async () => {
        const uid = userIdQuery.trim()
        const pid = postIdQuery.trim()
        if (!uid || !pid) {
            setAllError("Vui lòng nhập cả user_id và post_id để gọi đầy đủ tất cả endpoint")
            return
        }

        setAllLoading(true)
        setAllError(null)
        setAllOutput(null)
        try {
            const healthRes = await mlService.health()
            const statsRes = await mlService.stats()
            const trainRes = await mlService.train()
            const evalRes = await mlService.evaluate(k)
            const recRes = await mlService.recommend(uid)
            const simRes = await mlService.similar(pid)

            setAllOutput({
                health: healthRes,
                stats: statsRes,
                train: trainRes,
                evaluate: evalRes,
                recommend: recRes,
                similar: simRes,
            })

            // Sync main panels with latest values
            setHealth(healthRes)
            setStats(statsRes)
            setTrainResult(trainRes)
            setEvalResult(evalRes)
            setRecResult(recRes)
            setSimResult(simRes)
            setLastRefresh(new Date())
        } catch (e: any) {
            setAllError(e.message ?? "Không thể gọi tất cả endpoint")
        } finally {
            setAllLoading(false)
        }
    }, [userIdQuery, postIdQuery, k])

    useEffect(() => {
        if (isAuthenticated && user?.roles_admin) {
            fetchAll()
        }
    }, [isAuthenticated, user, fetchAll])

    // ── Guard: không render nếu không phải admin ─────────────────────────────
    if (!isAuthenticated || !user?.roles_admin) return null

    const serverUp = health?.status === "ok"

    return (
        <div className="p-6 space-y-8 max-w-5xl mx-auto">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <BrainCircuit size={28} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Recommendation System
                        </h1>
                        <p className="text-sm text-gray-500">
                            Hybrid Recommendation · CF + Content-Based · ML Server
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {lastRefresh && (
                        <span className="text-xs text-gray-400">
                            Cập nhật {lastRefresh.toLocaleTimeString("vi-VN")}
                        </span>
                    )}
                    <button
                        onClick={fetchAll}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto underline">
                        Đóng
                    </button>
                </div>
            )}

            {/* ── Server status ── */}
            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Trạng thái server
                </h2>
                <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${serverUp ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                    {loading ? (
                        <RefreshCw size={18} className="animate-spin text-gray-400" />
                    ) : serverUp ? (
                        <CheckCircle2 size={20} className="text-emerald-600" />
                    ) : (
                        <XCircle size={20} className="text-rose-500" />
                    )}
                    <span className={`font-medium ${serverUp ? "text-emerald-700" : "text-rose-600"}`}>
                        {loading ? "Đang kiểm tra..." : serverUp ? "ML Server đang chạy" : "ML Server không phản hồi"}
                    </span>
                    {health?.timestamp && (
                        <span className="ml-auto text-xs text-gray-400">
                            Ping: {new Date(health.timestamp).toLocaleTimeString("vi-VN")}
                        </span>
                    )}
                </div>
            </section>

            {/* ── Call all endpoints ── */}
            <section className="bg-white border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h2 className="font-semibold text-gray-900">Tab ML: Gọi tất cả endpoint</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Gọi tuần tự: <code className="font-mono text-xs bg-gray-100 px-1 rounded">/health</code>, <code className="font-mono text-xs bg-gray-100 px-1 rounded">/interactions/stats</code>, <code className="font-mono text-xs bg-gray-100 px-1 rounded">/train</code>, <code className="font-mono text-xs bg-gray-100 px-1 rounded">/evaluate</code>, <code className="font-mono text-xs bg-gray-100 px-1 rounded">/recommend</code>, <code className="font-mono text-xs bg-gray-100 px-1 rounded">/similar</code>
                        </p>
                    </div>
                    <button
                        onClick={callAllEndpoints}
                        disabled={allLoading || !serverUp}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black disabled:opacity-50 transition"
                    >
                        <RefreshCw size={14} className={allLoading ? "animate-spin" : ""} />
                        {allLoading ? "Đang gọi..." : "Gọi tất cả endpoint"}
                    </button>
                </div>

                {allError && (
                    <p className="text-sm text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={13} /> {allError}
                    </p>
                )}

                {allOutput && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {Object.entries(allOutput).map(([key, value]) => (
                            <div key={key} className="border rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {key}
                                </div>
                                <pre className="text-xs p-3 overflow-auto max-h-72 bg-white text-gray-800">
                                    {JSON.stringify(value, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Stats ── */}
            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Dữ liệu tương tác
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                        label="Tổng lượt tương tác"
                        value={stats?.total_interactions ?? "—"}
                        sub="like · view · comment · share"
                        icon={MousePointerClick}
                        color="bg-indigo-500"
                    />
                    <MetricCard
                        label="Users đã tương tác"
                        value={stats?.unique_users ?? "—"}
                        sub="unique user_id"
                        icon={Users}
                        color="bg-blue-500"
                    />
                    <MetricCard
                        label="Bài viết được tương tác"
                        value={stats?.unique_posts ?? "—"}
                        sub="unique post_id"
                        icon={FileText}
                        color="bg-violet-500"
                    />
                </div>
            </section>

            {/* ── Train ── */}
            <section className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="font-semibold text-gray-900">Train model ngay</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Model tự train lại mỗi 6 giờ. Nhấn để train thủ công.
                        </p>
                    </div>
                    <button
                        onClick={runTrain}
                        disabled={trainLoading || !serverUp}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        <PlayCircle size={16} className={trainLoading ? "animate-spin" : ""} />
                        {trainLoading ? "Đang train..." : "Train ngay"}
                    </button>
                </div>

                {trainResult && (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${trainResult.status === "ok" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex items-center gap-2 font-medium mb-2">
                            {trainResult.status === "ok"
                                ? <CheckCircle2 size={15} className="text-emerald-600" />
                                : <AlertTriangle size={15} className="text-amber-600" />
                            }
                            {trainResult.message}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-gray-600">
                            <div><span className="text-gray-400">Interactions: </span>{trainResult.interactions_used}</div>
                            <div><span className="text-gray-400">Posts: </span>{trainResult.posts_covered}</div>
                            <div><span className="text-gray-400">Users: </span>{trainResult.users_covered}</div>
                            <div><span className="text-gray-400">Thời gian: </span>{trainResult.duration_seconds}s</div>
                        </div>
                    </div>
                )}
            </section>

            {/* ── Evaluation ── */}
            <section className="bg-white border rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Gauge size={18} className="text-indigo-500" />
                            Đánh giá độ chính xác
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Leave-One-Out Cross-Validation — ẩn 1 interaction mỗi user rồi kiểm tra model
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Top-K =</span>
                            <select
                                value={k}
                                onChange={(e) => setK(Number(e.target.value))}
                                className="border rounded-lg px-2 py-1 text-sm"
                            >
                                {[5, 10, 15, 20].map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={runEval}
                            disabled={evalLoading || !serverUp}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            <BarChart2 size={15} className={evalLoading ? "animate-spin" : ""} />
                            {evalLoading ? "Đang đánh giá..." : "Chạy đánh giá"}
                        </button>
                    </div>
                </div>

                {!evalResult && !evalLoading && (
                    <div className="text-sm text-gray-400 text-center py-6 border border-dashed rounded-xl">
                        Nhấn <strong>Chạy đánh giá</strong> để tính metrics
                    </div>
                )}

                {evalLoading && (
                    <div className="text-sm text-gray-400 text-center py-6 border border-dashed rounded-xl animate-pulse">
                        Đang tính toán...
                    </div>
                )}

                {evalResult && !evalLoading && (
                    <div className="space-y-5">

                        {/* Status / reliability */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${reliabilityBadge(evalResult.reliability)}`}>
                                Độ tin cậy: {evalResult.reliability.split("—")[0].trim()}
                            </span>
                            <span className="text-xs text-gray-400">
                                {evalResult.users_evaluated} users được đánh giá
                                · {evalResult.total_interactions} interactions
                                · {evalResult.duration_seconds}s
                            </span>
                            {evalResult.status !== "ok" && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    {evalResult.message}
                                </span>
                            )}
                        </div>

                        {/* Verdict banner */}
                        {evalResult.status === "ok" && (
                            <div className={`rounded-xl border px-5 py-3 flex items-center gap-3 ${scoreBg(evalResult.metrics.hit_rate_at_k)}`}>
                                <TrendingUp size={18} className={scoreColor(evalResult.metrics.hit_rate_at_k)} />
                                <div>
                                    <p className={`font-semibold ${scoreColor(evalResult.metrics.hit_rate_at_k)}`}>
                                        Nhận xét: {evalResult.interpretation.verdict}
                                    </p>
                                    <p className="text-sm text-gray-600">{evalResult.interpretation.hit_rate}</p>
                                </div>
                            </div>
                        )}

                        {/* Metric cards */}
                        {evalResult.status === "ok" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                {/* Hit Rate */}
                                <div className="border rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Hit Rate@{k}</span>
                                        <span className={`text-xl font-bold ${scoreColor(evalResult.metrics.hit_rate_at_k)}`}>
                                            {pct(evalResult.metrics.hit_rate_at_k)}
                                        </span>
                                    </div>
                                    <GaugeBar
                                        value={evalResult.metrics.hit_rate_at_k}
                                        color={evalResult.metrics.hit_rate_at_k >= 0.4 ? "bg-emerald-500" : evalResult.metrics.hit_rate_at_k >= 0.2 ? "bg-amber-400" : "bg-rose-400"}
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        % users nhận gợi ý đúng trong top-{k}
                                    </p>
                                    <p className="text-xs text-gray-400">Tốt: ≥ 40%</p>
                                </div>

                                {/* Precision */}
                                <div className="border rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Precision@{k}</span>
                                        <span className={`text-xl font-bold ${scoreColor(evalResult.metrics.precision_at_k * 8)}`}>
                                            {pct(evalResult.metrics.precision_at_k)}
                                        </span>
                                    </div>
                                    <GaugeBar
                                        value={evalResult.metrics.precision_at_k * 10}
                                        color="bg-blue-400"
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Trung bình số bài đúng / K
                                    </p>
                                    <p className="text-xs text-gray-400">Tốt: ≥ 5%</p>
                                </div>

                                {/* NDCG */}
                                <div className="border rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">NDCG@{k}</span>
                                        <span className={`text-xl font-bold ${scoreColor(evalResult.metrics.ndcg_at_k)}`}>
                                            {evalResult.metrics.ndcg_at_k.toFixed(4)}
                                        </span>
                                    </div>
                                    <GaugeBar
                                        value={evalResult.metrics.ndcg_at_k}
                                        color={evalResult.metrics.ndcg_at_k >= 0.4 ? "bg-emerald-500" : "bg-violet-400"}
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Có tính vị trí xếp hạng
                                    </p>
                                    <p className="text-xs text-gray-400">1.0 = hoàn hảo, 0 = tệ</p>
                                </div>

                            </div>
                        )}

                        {/* Guide note */}
                        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3 flex items-start gap-2">
                            <Clock size={13} className="mt-0.5 shrink-0" />
                            <span>
                                Kết quả có ý nghĩa thống kê khi có ≥ 20 users đủ điều kiện (mỗi user ≥ 2 interactions).
                                Hiện tại độ tin cậy: <strong>{evalResult.reliability}</strong>.
                                Khi app có nhiều người dùng hơn, chạy lại để có kết quả chính xác hơn.
                            </span>
                        </div>

                    </div>
                )}
            </section>

            {/* ── Lookup: recommend for user ── */}
            <section className="bg-white border rounded-xl p-5 space-y-4">
                <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Search size={17} className="text-indigo-500" />
                        Tra cứu gợi ý cho user
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Gọi <code className="font-mono text-xs bg-gray-100 px-1 rounded">GET /recommend/&#123;user_id&#125;</code> — trả về danh sách bài viết được gợi ý
                    </p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={userIdQuery}
                        onChange={(e) => setUserIdQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && lookupRecommend()}
                        placeholder="Nhập user_id..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                        onClick={lookupRecommend}
                        disabled={recLoading || !userIdQuery.trim() || !serverUp}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        <Search size={14} className={recLoading ? "animate-spin" : ""} />
                        {recLoading ? "Đang tìm..." : "Tra cứu"}
                    </button>
                </div>

                {recError && (
                    <p className="text-sm text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={13} /> {recError}
                    </p>
                )}

                {/* User info card */}
                {recResult && recUserInfo && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                        {recUserInfo.avatar_url ? (
                            <img src={recUserInfo.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                {(recUserInfo.full_name || recUserInfo.username || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{recUserInfo.full_name || recUserInfo.username}</p>
                            <p className="text-xs text-gray-500">@{recUserInfo.username} · {recUserInfo.email}</p>
                        </div>
                        <span className={`ml-auto shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                            recUserInfo.roles_admin === 'ADMIN' ? 'bg-rose-100 text-rose-700'
                            : recUserInfo.roles_admin === 'MODERATOR' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                            {recUserInfo.roles_admin || 'user'}
                        </span>
                    </div>
                )}

                {recResult && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-gray-500">
                                User: <code className="font-mono bg-gray-100 px-1 rounded">{recResult.user_id}</code>
                            </span>
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                                recResult.source === "hybrid"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-amber-100 text-amber-700"
                            }`}>
                                {recResult.source === "hybrid" ? "Hybrid (CF + Content-Based)" : "Popular (Cold Start)"}
                            </span>
                            <span className="text-xs text-gray-400">
                                {recResult.recommendations.length} bài được gợi ý
                            </span>
                        </div>

                        {recResult.recommendations.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-xl">
                                Không có gợi ý nào
                            </p>
                        ) : (
                            <div className="rounded-xl border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left w-8">#</th>
                                            <th className="px-4 py-2.5 text-left">Post ID</th>
                                            <th className="px-4 py-2.5 text-left">Tags</th>
                                            <th className="px-4 py-2.5 text-left">Score</th>
                                            <th className="px-4 py-2.5 text-left">
                                                    <span title="Tag chung giữa bài được gợi ý và lịch sử hoạt động của user. 'Liên quan đến' = tag của bài trùng với chủ đề user đã xem — không có nghĩa user đã tương tác tag đó trước đây.">Lý do ⓘ</span>
                                                </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recResult.recommendations.map((rec) => {
                                            const postInfo = recPostMap[rec.post_id]
                                            const tags: string[] = postInfo?.tags ?? []
                                            return (
                                                <tr key={rec.post_id} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{rec.rank}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div>
                                                            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded break-all">
                                                                {rec.post_id}
                                                            </code>
                                                            {postInfo?.content && (
                                                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                                                                    {postInfo.content.slice(0, 60)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {tags.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {tags.map((t) => (
                                                                    <span key={t} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                                                                        #{t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`font-semibold ${
                                                            rec.score > 0 ? "text-indigo-600" : "text-gray-400"
                                                        }`}>
                                                            {rec.score.toFixed(4)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {rec.reason_tag ? (
                                                            <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                                                                <Tag size={10} />
                                                                {rec.reason_tag}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">{rec.reason_text ?? "—"}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── Lookup: similar posts ── */}
            <section className="bg-white border rounded-xl p-5 space-y-4">
                <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Layers size={17} className="text-violet-500" />
                        Tra cứu bài viết tương tự
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Gọi <code className="font-mono text-xs bg-gray-100 px-1 rounded">GET /similar/&#123;post_id&#125;</code> — trả về top bài viết có cosine similarity cao nhất
                    </p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={postIdQuery}
                        onChange={(e) => setPostIdQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && lookupSimilar()}
                        placeholder="Nhập post_id..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <button
                        onClick={lookupSimilar}
                        disabled={simLoading || !postIdQuery.trim() || !serverUp}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
                    >
                        <Layers size={14} className={simLoading ? "animate-spin" : ""} />
                        {simLoading ? "Đang tìm..." : "Tra cứu"}
                    </button>
                </div>

                {simError && (
                    <p className="text-sm text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={13} /> {simError}
                    </p>
                )}

                {/* Query post info card */}
                {simResult && queryPostInfo && (
                    <div className="px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                <div className="w-8 h-8 rounded-lg bg-violet-200 flex items-center justify-center">
                                    <Layers size={14} className="text-violet-700" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <code className="font-mono text-xs bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded">
                                        {queryPostInfo._id?.slice(0, 20)}…
                                    </code>
                                    {queryPostInfo.user_name && (
                                        <span className="text-xs text-gray-500">bởi {queryPostInfo.user_name}</span>
                                    )}
                                </div>
                                {queryPostInfo.content && (
                                    <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{queryPostInfo.content}</p>
                                )}
                                {queryPostInfo.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {queryPostInfo.tags.map((t: string) => (
                                            <span key={t} className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">#{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {simResult && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-gray-500">
                                Post: <code className="font-mono bg-gray-100 px-1 rounded">{simResult.post_id.slice(0, 20)}…</code>
                            </span>
                            <span className="text-xs text-gray-400">
                                {simResult.similar_posts.length} bài tương tự tìm thấy
                            </span>
                        </div>

                        {simResult.similar_posts.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-xl">
                                Không có bài tương tự — model chưa được train hoặc bài viết này chưa có interactions
                            </p>
                        ) : (
                            <div className="rounded-xl border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left w-8">#</th>
                                            <th className="px-4 py-2.5 text-left">Post ID tương tự</th>
                                            <th className="px-4 py-2.5 text-left">Tags</th>
                                            <th className="px-4 py-2.5 text-left">
                                                <span className="flex items-center gap-1">
                                                    <ArrowUpDown size={11} /> Score
                                                </span>
                                            </th>
                                            <th className="px-4 py-2.5 text-left">Tác giả</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {simResult.similar_posts.map((item, idx) => {
                                            const postInfo = simPostMap[item.post_id_b]
                                            const tags: string[] = postInfo?.tags ?? []
                                            return (
                                                <tr key={item.post_id_b} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div>
                                                            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                                {item.post_id_b.slice(0, 16)}…
                                                            </code>
                                                            {postInfo?.content && (
                                                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">
                                                                    {postInfo.content.slice(0, 50)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {tags.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {tags.map((t) => (
                                                                    <span key={t} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded-full">
                                                                        #{t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-violet-600">
                                                                {item.score.toFixed(4)}
                                                            </span>
                                                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                                                <div
                                                                    className="h-1.5 rounded-full bg-violet-400"
                                                                    style={{ width: `${Math.min(100, item.score * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {postInfo?.user_name ? (
                                                            <div className="flex items-center gap-1.5">
                                                                {postInfo.user_avatar ? (
                                                                    <img src={postInfo.user_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-bold">
                                                                        {postInfo.user_name[0]}
                                                                    </div>
                                                                )}
                                                                <span className="text-xs text-gray-600">{postInfo.user_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── Admin-only notice ── */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
                <ShieldAlert size={13} />
                Trang này chỉ dành cho Admin. Dữ liệu lấy trực tiếp từ ML Server (
                <code className="font-mono">{process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000"}</code>
                ).
            </div>

        </div>
    )
}
