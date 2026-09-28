// src/components/providers/AuthProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

// Các routes công khai không cần đăng nhập
const publicRoutes = ['/login', '/register'];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, fetchMe, checkSessionExpiry, initializeAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra session có còn hạn không trước tiên (12h)
    checkSessionExpiry();

    // Kiểm tra trạng thái auth khi component mount
    const checkAuth = async () => {
        // First, restore auth from localStorage/cookies
        initializeAuth();
      
      if (isAuthenticated) {
        await fetchMe();
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (!isAuthenticated && !isPublicRoute) {
      // Chưa đăng nhập và đang ở route cần bảo vệ -> chuyển đến login
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      // Đã đăng nhập và đang ở route công khai -> chuyển đến dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, pathname, isLoading, router]);

  // Hiển thị loading khi đang kiểm tra auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
