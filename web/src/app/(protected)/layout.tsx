
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="admin-app-shell flex h-screen overflow-hidden">
            <Sidebar />

            <div className="admin-main-column flex min-w-0 flex-1 flex-col overflow-hidden">
                <Topbar />

                <main className="admin-content-area min-h-0 flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
