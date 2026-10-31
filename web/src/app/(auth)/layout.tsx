
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <header className="auth-brand">
          <div className="auth-logo" aria-label="Smart Social AI">
            S
          </div>
          <div className="auth-brand-name">SMART SOCIAL AI</div>
          <div className="auth-brand-caption">Kết nối cộng đồng</div>
        </header>

        {children}
      </section>

      <style jsx global>{`
        @property --gradient-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

        .auth-shell {
          --bg: #e0e5ec;
          --light: #ffffff;
          --dark: #a3b1c6;
          --text: #303846;
          --muted: #858d99;
          --purple: #833ab4;
          --pink: #c13584;
          --red: #e1306c;
          --orange: #f77737;
          --yellow: #fcaf45;

          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px 16px;
          background: var(--bg);
          color: var(--text);
          font-family: Arial, Helvetica, sans-serif;
        }

        
.auth-password-toggle {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #858d99;
  cursor: pointer;
  z-index: 2;
}

.auth-password-toggle:hover {
  color: #c13584;
}

.auth-password-toggle:focus-visible {
  outline: 2px solid #c13584;
  outline-offset: 2px;
}


        .auth-shell :global(*) {
  box-sizing: border-box;
  font-family: Arial, Helvetica, sans-serif;
}

.auth-shell :global(input),
.auth-shell :global(button) {
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 400;
  letter-spacing: normal;
}

.auth-shell :global(input) {
  font-size: 13px;
}

.auth-shell :global(button) {
  font-size: 14px;
}

        .auth-card {
          position: relative;
          isolation: isolate;
          width: 100%;
          max-width: 430px;
          padding: 35px;
          border-radius: 28px;
          background: var(--bg);
          box-shadow:
            12px 12px 24px var(--dark),
            -12px -12px 24px var(--light);
        }

        .auth-card::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1.3px;
          border-radius: inherit;
          background: conic-gradient(
            from var(--gradient-angle),
            var(--purple),
            var(--pink),
            var(--red),
            var(--orange),
            var(--yellow),
            var(--purple)
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 5;
          opacity: 0.85;
          animation: rotate-border 10s linear infinite;
        }

        .auth-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
          text-align: center;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          margin-bottom: 15px;
          border-radius: 20px;
          color: #fff;
          font-size: 37px;
          font-weight: 800;
          font-style: italic;
          line-height: 1;
          background: linear-gradient(
            135deg,
            var(--purple),
            var(--pink),
            var(--red),
            var(--orange)
          );
          box-shadow:
            5px 5px 10px var(--dark),
            -5px -5px 10px var(--light);
        }

        .auth-brand-name {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .auth-brand-caption {
          margin-top: 8px;
          color: var(--muted);
          font-size: 11px;
          letter-spacing: 0.3px;
        }

        /* Login heading */
        .auth-login-heading {
          margin-bottom: 27px;
        }

        .auth-login-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: var(--pink);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .auth-login-heading h2 {
  margin: 0;
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 25px;
  font-weight: 700;
  font-synthesis: none;
  letter-spacing: 0;
  line-height: 1.35;
}

        .auth-login-heading p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
        }

        /* Form spacing */
        .auth-login-form {
          display: flex;
          flex-direction: column;
          gap: 23px;
          margin: 0;
        }

        .auth-login-fields {
          display: flex;
          flex-direction: column;
          gap: 19px;
        }

        .auth-login-field {
          min-width: 0;
        }

        .auth-login-field label {
          display: block;
          margin-bottom: 9px;
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
        }

        /* Animated gradient input border */
        .auth-field-shell {
          position: relative;
          isolation: isolate;
          padding: 1.5px;
          border-radius: 14px;
          background: var(--bg);
        }

        .auth-field-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          padding: 1.5px;
          background: conic-gradient(
            from var(--gradient-angle),
            var(--purple),
            var(--pink),
            var(--red),
            var(--orange),
            var(--yellow),
            var(--purple)
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .auth-field-shell:hover::before,
        .auth-field-shell:focus-within::before {
          opacity: 1;
          animation: rotate-border 2.8s linear infinite;
        }

        .auth-field-shell input {
          display: block;
          width: 100%;
          height: 49px;
          padding: 0 15px;
          border: none;
          outline: none;
          border-radius: 12px;
          background: var(--bg);
          color: var(--text);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          box-shadow:
            inset 5px 5px 9px var(--dark),
            inset -5px -5px 9px var(--light);
          transition:
            box-shadow 0.25s ease,
            background 0.25s ease;
        }

        .auth-field-shell input::placeholder {
          color: var(--muted);
          opacity: 1;
        }

        .auth-field-shell input:focus {
          box-shadow:
            inset 3px 3px 6px var(--dark),
            inset -3px -3px 6px var(--light);
        }

        /* Gradient submit button */
        .auth-login-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: 49px;
          padding: 12px 18px;
          border: none;
          border-radius: 14px;
          background: var(--bg);
          color: var(--text);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            6px 6px 12px var(--dark),
            -6px -6px 12px var(--light);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            color 0.2s ease,
            background 0.2s ease;
        }

        .auth-login-submit:hover:not(:disabled),
        .auth-login-submit:focus-visible:not(:disabled) {
          color: #fff;
          background: linear-gradient(
            110deg,
            var(--purple),
            var(--pink),
            var(--red),
            var(--orange)
          );
          box-shadow:
            4px 4px 10px #a3b1c6,
            -3px -3px 9px #fff;
          transform: translateY(-2px);
          outline: none;
        }

        .auth-login-submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow:
            inset 3px 3px 6px rgb(0 0 0 / 12%),
            inset -3px -3px 6px rgb(255 255 255 / 15%);
        }

        .auth-login-submit:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .auth-login-arrow {
          font-size: 18px;
          line-height: 1;
        }

        .auth-login-loading {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }

        .auth-login-spinner {
          width: 17px;
          height: 17px;
          animation: spinner-rotate 0.8s linear infinite;
        }

        .auth-spinner-track {
          opacity: 0.3;
        }

        .auth-spinner-head {
          opacity: 0.85;
        }

        /* Register link */
        .auth-login-footer {
          margin-top: 25px;
          padding-top: 18px;
          border-top: 1px solid rgb(163 177 198 / 35%);
          text-align: center;
        }

        .auth-login-footer p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .auth-login-footer a {
          color: var(--pink);
          font-weight: 800;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .auth-login-footer a:hover {
          color: var(--purple);
          text-decoration: underline;
        }

        @keyframes rotate-border {
          to {
            --gradient-angle: 360deg;
          }
        }

        @keyframes spinner-rotate {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 480px) {
          .auth-shell {
            padding: 22px 15px;
          }

          .auth-card {
            padding: 28px 22px;
            border-radius: 23px;
          }

          .auth-brand {
            margin-bottom: 25px;
          }

          .auth-brand-name {
            font-size: 14px;
          }

          .auth-login-heading h2 {
            font-size: 23px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-card::before,
          .auth-field-shell:hover::before,
          .auth-field-shell:focus-within::before,
          .auth-login-spinner {
            animation: none;
          }

          .auth-login-submit,
          .auth-field-shell input {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
