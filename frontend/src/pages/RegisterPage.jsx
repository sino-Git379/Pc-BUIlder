import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function RegisterPage() {
  const { register, user, authLoading } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register(username.trim(), email.trim(), password, passwordConfirm);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Account registration failed. Try a different username or email.');
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
            <pattern id="register-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-outline-variant" />
              <circle cx="0" cy="0" r="1" className="text-primary fill-current" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#register-grid)" />
        </svg>
      </div>

      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 left-10 w-80 h-80 bg-tertiary-container/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Registration Card */}
      <div className="relative w-full max-w-lg bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant/35 p-6 sm:p-8 z-10 flex flex-col gap-6">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-code-sm text-code-sm font-semibold uppercase tracking-wider text-primary">
              01 // ONBOARDING // NEW OPERATOR
            </span>
          </div>
          <span className="font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
            SYS:REG-V2
          </span>
        </div>

        {/* Card Title & Icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-2xl">person_add</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
              Create RigForge Account
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Build custom PCs, exchange hardware parts with escrow protection and sync rigs.
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

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="flex items-center justify-between text-label-sm font-medium uppercase text-on-surface-variant mb-1.5" htmlFor="reg-username">
              <span>Choose Username</span>
              <span className="font-code-sm text-code-sm text-outline">SYS.ID</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                badge
              </span>
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. cyber_builder"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-body-md"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between text-label-sm font-medium uppercase text-on-surface-variant mb-1.5" htmlFor="reg-email">
              <span>Email Address</span>
              <span className="font-code-sm text-code-sm text-outline">MAIL.NET</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                mail
              </span>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="builder@domain.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-body-md"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-label-sm font-medium uppercase text-on-surface-variant" htmlFor="reg-password">
                Security Passphrase
              </label>
              <span className="font-code-sm text-code-sm text-outline">MIN.8</span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                lock
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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

          <div>
            <label className="flex items-center justify-between text-label-sm font-medium uppercase text-on-surface-variant mb-1.5" htmlFor="reg-password-confirm">
              <span>Confirm Passphrase</span>
              <span className="font-code-sm text-code-sm text-outline">MATCH</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                lock_reset
              </span>
              <input
                id="reg-password-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-body-md"
              />
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">how_to_reg</span>
                <span>Create RigForge Account</span>
              </>
            )}
          </button>
        </form>

        {/* Switch to Login Route */}
        <div className="pt-2 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm text-on-surface-variant">
          <span>Already have an operator account?</span>
          <Link
            to="/accounts/login"
            className="font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Sign In to System</span>
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
