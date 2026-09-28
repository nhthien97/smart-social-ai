import "./globals.css"
import ToastProvider from "@/components/providers/ToastProvider"
import AuthProvider from "@/components/providers/AuthProvider"

export const metadata = {
  title: 'MiniSocial Admin',
  description: 'Admin Dashboard for MiniSocial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
