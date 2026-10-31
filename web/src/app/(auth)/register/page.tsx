
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      const { toast } = await import('react-hot-toast');
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    const success = await register(email, username, fullName, password);

    if (success) {
      router.push('/login');
    }
  };

  return (
    <div className="auth-login auth-register">
      <header className="auth-login-heading">
        <span className="auth-login-eyebrow">JOIN OUR COMMUNITY</span>

        <h2>Tạo tài khoản Admin</h2>

        <p>Đăng ký tài khoản quản trị</p>
      </header>

      <form className="auth-login-form" onSubmit={handleSubmit}>
        <div className="auth-login-fields">
          <div className="auth-login-field">
            <label htmlFor="fullName">Họ và tên</label>

            <div className="auth-field-shell">
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-login-field">
            <label htmlFor="username">Username</label>

            <div className="auth-field-shell">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="admin123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-login-field">
            <label htmlFor="email-address">Email</label>

            <div className="auth-field-shell">
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-login-field">
            <label htmlFor="register-password">Mật khẩu</label>

            <div className="auth-field-shell">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '52px' }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                className="auth-password-toggle"
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

          <div className="auth-login-field">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>

            <div className="auth-field-shell">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingRight: '52px' }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Ẩn mật khẩu xác nhận'
                    : 'Hiện mật khẩu xác nhận'
                }
                aria-pressed={showConfirmPassword}
                className="auth-password-toggle"
              >
                {showConfirmPassword ? (
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>

              Đang xử lý...
            </span>
          ) : (
            <>
              <span>Tạo tài khoản</span>
              <span className="auth-login-arrow" aria-hidden="true">
                →
              </span>
            </>
          )}
        </button>
      </form>

      <footer className="auth-login-footer">
        <p>
          Đã có tài khoản?{' '}
          <Link href="/login">Đăng nhập</Link>
        </p>
      </footer>
    </div>
  );
}
