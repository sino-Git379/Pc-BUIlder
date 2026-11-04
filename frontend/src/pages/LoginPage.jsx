import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const { login, user, authLoading } = useApp();
  const { t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const dest = location.state?.from || '/';
      navigate(dest, { replace: true });
    }
  }, [user, authLoading, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      const dest = location.state?.from || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication rejected. Check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
    setSubmitting(true);
    try {
      await login(u, p);
      const dest = location.state?.from || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden bg-background">
      {/* Background Engineering CAD Grid & Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-25">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="auth-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-outline-variant" />
              <circle cx="0" cy="0" r="1" className="text-primary fill-current" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
      </div>

      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 right-10 w-80 h-80 bg-tertiary-container/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-lg bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant/35 p-6 sm:p-8 z-10 flex flex-col gap-6">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-code-sm text-code-sm font-semibold uppercase tracking-wider text-primary">
              00 // AUTH // OPERATOR ACCESS
            </span>
          </div>
          <span className="font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
            SYS:AUTH-V2
          </span>
        </div>

        {/* Card Title & Icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
              Sign In to RigForge
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Access your saved PC builds, custom listings, escrow orders & peer messages.
            </p>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-error-container/20 border border-error/40 text-on-surface shadow-sm">
            <span className="material-symbols-outlined text-error text-xl shrink-0">error</span>
            <div className="text-body-sm text-error font-medium">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="flex items-center justify-between text-label-sm font-medium uppercase text-on-surface-variant mb-1.5" htmlFor="login-username">
              <span>Operator Username</span>
              <span className="font-code-sm text-code-sm text-outline">SYS.ID</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                person
              </span>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or operator"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-body-md"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-label-sm font-medium uppercase text-on-surface-variant" htmlFor="login-password">
                Passphrase
              </label>
              <span className="font-code-sm text-code-sm text-outline">KEY.SEC</span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                lock
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-body-md"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-body-md transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">login</span>
                <span>Sign In to System</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="rounded-xl bg-surface-container-low p-3.5 border border-outline-variant/25">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">bolt</span>
            <span>Quick Operator Access</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', '12341234!')}
              className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/30 transition-all flex items-center justify-between"
            >
              <span>Admin (Superuser)</span>
              <span className="font-code-sm text-primary">→</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager_alex', 'ManagerPass123!')}
              className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/30 transition-all flex items-center justify-between"
            >
              <span>Manager Alex</span>
              <span className="font-code-sm text-primary">→</span>
            </button>
          </div>
        </div>

        {/* Switch to Register Route */}
        <div className="pt-2 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm text-on-surface-variant">
          <span>Need a new operator account?</span>
          <Link
            to="/accounts/register"
            className="font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Create RigForge Account</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>

        <div className="text-center">
          <Link to="/" className="text-xs text-outline hover:text-on-surface transition-colors">
            ← Return to RigForge Hardware Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
