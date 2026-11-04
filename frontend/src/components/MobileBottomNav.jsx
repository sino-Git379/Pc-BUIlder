import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isRigOpen, setIsRigOpen, rigMetrics, unreadCount, user, openModal } = useApp();
  const { t } = useTheme();

  const isMarketplace = location.pathname === '/' || location.pathname === '/builder';
  const isMessages =
    location.pathname.startsWith('/messages') || location.pathname.startsWith('/chat');
  const isCheckout = location.pathname.startsWith('/checkout');

  const handleRigToggle = () => {
    if (!isMarketplace) {
      navigate('/');
      setIsRigOpen(true);
    } else {
      setIsRigOpen((prev) => !prev);
    }
  };

  const handleProfileClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/accounts/login');
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/30 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 items-center justify-around">
        {/* Tab 1: Marketplace / Catalog */}
        <button
          type="button"
          onClick={() => {
            navigate('/');
            setIsRigOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 ${
            isMarketplace && !isRigOpen
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px] mb-0.5"
            style={{
              fontVariationSettings: isMarketplace && !isRigOpen ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            storefront
          </span>
          <span className="font-label-sm text-[11px] leading-tight">{t('catalog')}</span>
        </button>

        {/* Tab 2: PC Builder / Active Rig Drawer */}
        <button
          type="button"
          onClick={handleRigToggle}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 ${
            isRigOpen
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="relative">
            <span
              className="material-symbols-outlined text-[24px] mb-0.5"
              style={{
                fontVariationSettings: isRigOpen ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              build_circle
            </span>
            {rigMetrics.totalParts > 0 && (
              <span className="absolute -top-1 -right-2.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-on-primary font-label-sm text-[10px] font-bold ring-2 ring-surface-container-lowest">
                {rigMetrics.totalParts}
              </span>
            )}
          </div>
          <span className="font-label-sm text-[11px] leading-tight">{t('builder')}</span>
        </button>

        {/* Tab 3: Messages */}
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 ${
            isMessages
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="relative">
            <span
              className="material-symbols-outlined text-[24px] mb-0.5"
              style={{
                fontVariationSettings: isMessages ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              chat
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold animate-pulse ring-2 ring-surface-container-lowest">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="font-label-sm text-[11px] leading-tight">{t('messages')}</span>
        </button>

        {/* Tab 4: Profile / Account */}
        <button
          type="button"
          onClick={handleProfileClick}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 ${
            location.pathname.startsWith('/profile')
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {user?.avatar ? (
            <div className="w-6 h-6 rounded-full overflow-hidden mb-0.5 border border-primary/40">
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            </div>
          ) : user ? (
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] mb-0.5">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <span className="material-symbols-outlined text-[24px] mb-0.5">person</span>
          )}
          <span className="font-label-sm text-[11px] leading-tight truncate max-w-[64px]">
            {user ? user.username : t('signIn')}
          </span>
        </button>
      </div>
    </nav>
  );
}
