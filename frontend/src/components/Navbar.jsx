import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme, SUPPORTED_LANGUAGES } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { STITCH_IMAGES } from '../data/hardwareMedia';

export default function Navbar() {
  const { theme, toggleTheme, language, setLanguage, t } = useTheme();
  const {
    user,
    logout,
    globalSearch,
    setGlobalSearch,
    isRigOpen,
    setIsRigOpen,
    rigMetrics,
    unreadCount,
    openModal,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMarketplace = location.pathname === '/' || location.pathname === '/builder';
  const isMessages =
    location.pathname.startsWith('/messages') || location.pathname.startsWith('/chat');

  const handlePcBuilderClick = (e) => {
    e.preventDefault();
    if (!isMarketplace) {
      navigate('/');
      setIsRigOpen(true);
    } else {
      setIsRigOpen((prev) => !prev);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setGlobalSearch(val);
    if (!isMarketplace) {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-colors duration-250">
      <div className="h-16 max-w-[1440px] mx-auto px-4 sm:px-margin flex items-center justify-between gap-space-md lg:gap-space-lg">
        {/* Brand & Main Navigation */}
        <div className="flex items-center gap-space-lg xl:gap-space-xl">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-space-sm group focus:outline-none text-left"
          >
            <img
              alt="RigForge Logo"
              className="h-8 w-auto object-contain rounded group-hover:scale-105 transition-transform duration-200"
              src={STITCH_IMAGES.logo}
            />
          </button>

          <nav className="hidden lg:flex items-center gap-space-xs">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`btn-interactive px-space-md py-space-sm rounded-lg font-body-md text-body-md ${
                isMarketplace && !isRigOpen
                  ? 'text-primary font-semibold bg-surface-container-low'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {t('marketplace')}
            </button>

            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className={`btn-interactive px-space-md py-space-sm rounded-lg font-body-md text-body-md ${
                  unreadCount > 0 ? 'pr-9' : ''
                } ${
                  isMessages
                    ? 'text-primary font-semibold bg-surface-container-low'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {t('messages')}
              </button>
              {unreadCount > 0 && (
                <span className="absolute right-space-sm pointer-events-none flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-error text-on-error font-label-sm text-label-sm leading-none font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
          </nav>
        </div>

        {/* Global Search Input */}
        <div className="flex-1 max-w-xl hidden md:flex items-center">
          <div className="relative w-full group">
            <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary text-[20px] transition-colors pointer-events-none">
              search
            </span>
            <input
              ref={searchInputRef}
              value={globalSearch}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-12 py-space-sm bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md rounded-lg border border-transparent focus:border-outline-variant/60 focus:outline-none transition-all duration-200"
              placeholder={t('searchPlaceholder')}
              type="text"
            />
            {globalSearch ? (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-space-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            ) : (
              <kbd className="absolute right-space-md top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high pointer-events-none select-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Right Actions: Theme, Locale, Active Rig Toggle, User Profile */}
        <div className="flex items-center gap-space-sm sm:gap-space-md">
          <div className="flex items-center gap-space-xs">
            {/* Active Rig Split-Sidebar Quick Button */}
            <button
              type="button"
              onClick={handlePcBuilderClick}
              title="Toggle Active Rig Builder Split-Sidebar"
              className={`btn-interactive px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-label-md text-label-md font-bold ${
                isRigOpen
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">build_circle</span>
              <span className="hidden sm:inline">Rig</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm transition-colors ${
                  isRigOpen ? 'bg-on-primary/20 text-on-primary' : 'bg-primary/15 text-primary'
                }`}
              >
                {rigMetrics.totalParts}
              </span>
            </button>

            {/* Theme Toggle (Soft Daylight <-> Noble Graphite Dark) */}
            <button
              aria-label="Toggle color mode"
              onClick={toggleTheme}
              title={
                theme === 'dark'
                  ? 'Switch to Soft Daylight Mode'
                  : 'Switch to Graphite Dark Mode'
              }
              className="btn-interactive p-space-sm rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low flex items-center justify-center"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] transition-transform duration-300 hover:rotate-12">
                {theme === 'dark' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            {/* Language Selector: EN, RU, TJ */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="btn-interactive flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-label-md text-label-md font-bold"
                type="button"
                title="Select Interface Language"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">translate</span>
                <span className="uppercase">{language}</span>
                <span className="material-symbols-outlined text-[16px] text-outline">
                  expand_more
                </span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xl py-1 z-50 flex flex-col">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setLangMenuOpen(false);
                      }}
                      className={`px-3 py-2 text-left font-body-sm text-sm flex items-center justify-between transition-colors ${
                        language === lang.code
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span>{lang.label}</span>
                      <span className="font-mono text-xs text-outline">{lang.short}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-6 w-px bg-outline-variant/40 hidden sm:block"></div>

          {/* Profile / Auth Menu (Desktop only - mobile/tablet uses Bottom Navigation Bar) */}
          <div className="relative hidden lg:block" ref={menuRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="btn-interactive flex items-center gap-space-sm pl-space-xs focus:outline-none group"
              >
                <div className="relative">
                  {user.avatar ? (
                    <img
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-surface-container-lowest"
                      src={user.avatar}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container-high ring-2 ring-surface-container-lowest flex items-center justify-center text-on-surface-variant font-bold text-xs">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <div className="flex items-center gap-1 font-body-md text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                    <span>{user.username}</span>
                    <span
                      className={`material-symbols-outlined text-[16px] text-outline transition-transform duration-200 ${
                        menuOpen ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                  <span className="font-label-sm text-[10px] text-primary uppercase font-bold">
                    {user.role || 'Buyer'}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => openModal('auth', { initialTab: 'login' })}
                  className="btn-interactive px-space-md py-1.5 rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-sm text-body-sm font-bold shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span>{t('signIn')}</span>
                </button>
              </div>
            )}

            {/* Animated Dropdown Menu */}
            {user && (
              <div
                aria-hidden={!menuOpen}
                className={`origin-top-right absolute right-0 mt-2 w-64 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xl py-2 z-50 flex flex-col gap-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  menuOpen
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="px-4 py-2 border-b border-outline-variant/20">
                  <div className="font-body-md text-body-md font-bold text-on-surface">
                    {user.username}
                  </div>
                  <div className="font-label-sm text-label-sm text-secondary font-semibold uppercase">
                    Role: {user.role || 'Buyer'} • Verified Account
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="px-4 py-2 text-left font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    account_circle
                  </span>
                  <span>{t('profileAndOrders')}</span>
                </button>

                {(user.role === 'Manager' || user.role === 'Admin') && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      openModal('postListing');
                    }}
                    className="px-4 py-2 text-left font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      add_business
                    </span>
                    <span>{t('postListing')}</span>
                  </button>
                )}

                {user.role === 'Admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      openModal('adminPanel');
                    }}
                    className="px-4 py-2 text-left font-body-sm text-body-sm text-tertiary font-semibold hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-tertiary">
                      admin_panel_settings
                    </span>
                    <span>{t('adminPanel')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/messages');
                  }}
                  className="px-4 py-2 text-left font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">chat</span>
                    <span>{t('messages')}</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <div className="border-t border-outline-variant/20 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left font-body-sm text-body-sm text-error hover:bg-error-container/20 flex items-center gap-2.5 transition-colors font-semibold"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
