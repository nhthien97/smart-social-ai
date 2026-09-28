import { type NextRequest, NextResponse } from 'next/server'

// Routes không cần authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password']

export function middleware(request: NextRequest) {
    // auth-token cookie được set bởi auth.store khi login (tồn tại 12h)
    const authToken = request.cookies.get('auth-token')?.value
    const isAuthenticated = !!authToken

    const { pathname } = request.nextUrl

    // Nếu chưa authenticate và truy cập protected routes
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Nếu đã authenticate và truy cập public routes
    if (isAuthenticated && PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
