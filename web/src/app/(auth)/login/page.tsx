
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(identifier, password);

    if (success) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="auth-login">
      <header className="auth-login-heading">
        <span className="auth-login-eyebrow">WELCOME BACK</span>

        <h2>Đăng nhập Admin</h2>

        <p>Chào mừng trở lại!</p>
      </header>

      <form className="auth-login-form" onSubmit={handleSubmit}>
        <div className="auth-login-fields">
          <div className="auth-login-field">
            <label htmlFor="identifier">
              Email hoặc Username
            </label>

            <div className="auth-field-shell">
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                placeholder="admin@example.com hoặc admin123"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>

         
<div className="auth-login-field">
  <label htmlFor="password">Mật khẩu</label>

  <div className="auth-field-shell">
    <input
      id="password"
      name="password"
      type={showPassword ? 'text' : 'password'}
      autoComplete="current-password"
      required
      placeholder="••••••••"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      style={{ paddingRight: '52px' }}
    />

    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      aria-pressed={showPassword}
      style={{
        position: 'absolute',
        top: '50%',
        right: '12px',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        padding: 0,
        border: 'none',
        borderRadius: '8px',
        background: 'transparent',
        color: '#858d99',
        cursor: 'pointer',
        zIndex: 2,
      }}
    >
      {showPassword ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3" />
          <path d="M6.2 6.2C3.9 7.6 2.6 9.8 2.5 12c.6 1.5 2.2 3.8 5.1 5.1A10.4 10.4 0 0012 19c1.2 0 2.3-.2 3.3-.6" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  </div>
</div>
</div>


        <button
          type="submit"
          disabled={isLoading}
          className="auth-login-submit"
        >
          {isLoading ? (
            <span className="auth-login-loading">
              <svg
                className="auth-login-spinner"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="auth-spinner-track"
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="auth-spinner-head"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>

              Đang xử lý...
            </span>
          ) : (
            <>
              <span>Đăng nhập</span>
              <span className="auth-login-arrow" aria-hidden="true">
                →
              </span>
            </>
          )}
        </button>
      </form>

      <footer className="auth-login-footer">
        <p>
          Chưa có tài khoản?{' '}
          <Link href="/register">
            Đăng ký ngay
          </Link>
        </p>
      </footer>
    </div>
  );
}
