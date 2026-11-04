import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsRigOpen } = useApp();

  // Hide footer on full-height messenger view
  if (location.pathname.startsWith('/messages') || location.pathname.startsWith('/chat')) {
    return null;
  }

  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/20 py-space-xl pb-24 lg:pb-space-xl">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-margin flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
            RigForge
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            © 2026 RigForge Inc. Precision PC Building &amp; RigSync v4.2 Telemetry.
          </span>
        </div>
        <div className="flex items-center gap-space-lg font-body-sm text-body-sm text-on-surface-variant">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-on-surface transition-colors"
          >
            Marketplace
          </button>
          <button
            type="button"
            onClick={() => {
              navigate('/');
              setIsRigOpen(true);
            }}
            className="hover:text-on-surface transition-colors"
          >
            PC Builder
          </button>
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="hover:text-on-surface transition-colors"
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="hover:text-on-surface transition-colors"
          >
            Escrow Checkout
          </button>
        </div>
      </div>
    </footer>
  );
}
