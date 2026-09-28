import type { ReactNode } from "react"

export default function ProtectedLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* sidebar đặt ở đây */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {children}
            </div>
        </div>
    )
}