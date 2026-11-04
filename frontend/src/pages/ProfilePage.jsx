import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getComponentImage } from '../data/hardwareMedia';

export default function ProfilePage() {
  const {
    user,
    orders,
    savedBuilds,
    setRigItems,
    addToast,
    logout,
    apiFetch,
    fetchCurrentUser,
    openModal,
    fetchCatalog,
  } = useApp();
  const { t } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, listings, orders, builds

  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  // Seller Listings State
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadMyListings = useCallback(async () => {
    if (!isManagerOrAdmin) return;
    setLoadingListings(true);
    try {
      const res = await apiFetch('/api/marketplace/listings/mine/');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setMyListings(list);
      }
    } catch (_) {
    } finally {
      setLoadingListings(false);
    }
  }, [isManagerOrAdmin, apiFetch]);

  useEffect(() => {
    if (isManagerOrAdmin) {
      loadMyListings();
    }
  }, [isManagerOrAdmin, loadMyListings]);

  // If user opens postListing modal and closes it, refresh myListings
  useEffect(() => {
    const handleRefresh = () => {
      if (isManagerOrAdmin) {
        loadMyListings();
      }
    };
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('rigforge:listing-changed', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('rigforge:listing-changed', handleRefresh);
    };
  }, [isManagerOrAdmin, loadMyListings]);

  if (!user) {
    return (
      <main className="w-full pt-12 pb-24 bg-background min-h-[calc(100vh-4rem)] flex items-center justify-center animate-page-enter">
        <div className="max-w-md w-full mx-auto p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-center shadow-lg">
          <span className="material-symbols-outlined text-[48px] text-primary mb-2">account_circle</span>
          <h2 className="font-headline-sm text-xl font-bold text-on-surface mb-2">{t('signIn')}</h2>
          <p className="font-body-sm text-on-surface-variant mb-6">
            {t('noConversationsDesc')}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm transition-all"
            >
              {t('browseMarketplace')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Invalid File', message: 'Please select an image file (PNG, JPG, WebP).' });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const res = await apiFetch('/api/auth/me/', {
        method: 'PATCH',
        body: formData,
      });
      if (res.ok) {
        await fetchCurrentUser();
        addToast({ type: 'success', title: 'Avatar Updated', message: 'Your profile picture has been updated.' });
      } else {
        throw new Error('Upload failed');
      }
    } catch (_) {
      addToast({ type: 'error', title: 'Upload Failed', message: 'Could not upload avatar image.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteListing = async (item) => {
    const compName = item.component?.name || 'Listing';
    const confirmMsg = `${t('deleteListingConfirm')} "${compName}"?`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(item.id);
    try {
      const res = await apiFetch(`/api/marketplace/listings/${item.id}/`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        addToast({
          type: 'success',
          title: t('listingDeleted'),
          message: `Removed "${compName}" from the marketplace.`,
        });
        await loadMyListings();
        await fetchCatalog();
      } else {
        throw new Error('Delete failed');
      }
    } catch (_) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not delete listing.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="w-full pt-6 pb-24 lg:pb-16 bg-background min-h-[calc(100vh-4rem)] animate-page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-margin flex flex-col gap-6">
        {/* Profile Header Card */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/25 p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar with Upload Badge */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full bg-surface-container-high overflow-hidden border-2 border-outline-variant/40 flex items-center justify-center text-on-surface-variant shadow-md">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[54px] text-outline">person</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title={t('changePhoto')}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:bg-on-primary-fixed-variant transition-transform hover:scale-110 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {uploading ? 'sync' : 'photo_camera'}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* User Meta */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h1 className="font-headline-md text-2xl font-bold text-on-surface">{user.username}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider ${
                    user.role === 'Admin'
                      ? 'bg-error-container text-on-error-container'
                      : user.role === 'Manager'
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {user.role || 'Buyer'}
                </span>
              </div>
              <p className="font-body-sm text-sm text-on-surface-variant">
                Account ID: #{user.id} • {t('registeredMember')}
              </p>
              <p className="font-body-sm text-xs text-outline">
                {t('changePhoto')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-center">
            {isManagerOrAdmin && (
              <button
                type="button"
                onClick={() => openModal('postListing')}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-sm text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                <span>{t('postListing')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 rounded-xl border border-error/30 hover:bg-error-container/20 text-error font-body-sm text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>{t('logout')}</span>
            </button>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-1 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-label-md text-sm font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            {t('accountOverview')}
          </button>

          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('listings')}
              className={`px-4 py-2 rounded-lg font-label-md text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'listings'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>{t('myListings')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-container-highest text-on-surface">
                {myListings.length}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-label-md text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span>{t('escrowOrders')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-container-highest text-on-surface">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('builds')}
            className={`px-4 py-2 rounded-lg font-label-md text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'builds'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span>{t('savedRigs')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-container-highest text-on-surface">
              {savedBuilds.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm flex flex-col gap-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant">
                {t('accountStatus')}
              </span>
              <div className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <span>{t('activeAndVerified')}</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {t('accountStatusDesc')}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm flex flex-col gap-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant">
                {t('completedEscrowDeals')}
              </span>
              <div className="font-headline-sm text-xl font-bold text-primary">
                {orders.length} {t('ordersCount')}
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {t('escrowProtocolDesc')}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm flex flex-col gap-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant">
                {t('savedRigsCloud')}
              </span>
              <div className="font-headline-sm text-xl font-bold text-secondary">
                {savedBuilds.length} {t('savedConfigs')}
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {t('savedRigsDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: My Listings (Only for Manager / Admin) */}
        {activeTab === 'listings' && isManagerOrAdmin && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                {t('myListings')} ({myListings.length})
              </h2>
              <button
                type="button"
                onClick={() => openModal('postListing')}
                className="btn-interactive px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-body-sm text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>{t('postListing')}</span>
              </button>
            </div>

            {loadingListings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-32 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4 animate-pulse"
                  ></div>
                ))}
              </div>
            ) : myListings.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center flex flex-col items-center gap-2.5">
                <span className="material-symbols-outlined text-[44px] text-outline">inventory_2</span>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  {t('noListingsYet')}
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant max-w-sm">
                  {t('noListingsDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => openModal('postListing')}
                  className="mt-2 btn-interactive px-4 py-2 rounded-xl bg-primary text-on-primary font-body-sm text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add_business</span>
                  <span>{t('postFirstListing')}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myListings.map((item) => {
                  const comp = item.component || {};
                  const imageSrc = item.image || comp.image || getComponentImage(comp);
                  return (
                    <article
                      key={item.id}
                      className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm flex items-center gap-4 group hover:border-primary/40 transition-all"
                    >
                      <div className="w-20 h-20 rounded-xl bg-surface-container-low shrink-0 p-2 flex items-center justify-center overflow-hidden border border-outline-variant/20">
                        <img
                          src={imageSrc}
                          alt={comp.name || 'Component'}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-label-sm text-[10px] uppercase font-bold text-primary">
                              {comp.category_name || 'Hardware'}
                            </span>
                            <span className="text-outline-variant text-xs">•</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-label-sm text-[10px] font-bold ${
                                item.condition === 'new'
                                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                                  : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              {item.condition === 'new' ? t('brandNew') : t('certifiedUsed')}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-label-sm text-[10px] font-bold ${
                                item.is_active
                                  ? 'text-secondary'
                                  : 'text-outline'
                              }`}
                            >
                              {item.is_active ? t('active') : t('inactive')}
                            </span>
                          </div>

                          <h3
                            className="font-headline-sm text-sm font-bold text-on-surface truncate"
                            title={`${comp.brand || ''} ${comp.name || ''}`}
                          >
                            {comp.brand} {comp.name}
                          </h3>

                          <div className="font-headline-sm text-base font-extrabold text-on-surface mt-0.5">
                            ${parseFloat(item.price || 0).toFixed(2)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15">
                          <button
                            type="button"
                            onClick={() => openModal('postListing', { editListing: item })}
                            className="btn-interactive px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-xs font-semibold flex items-center gap-1 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[15px] text-primary">edit</span>
                            <span>{t('edit')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleDeleteListing(item)}
                            className="btn-interactive px-2.5 py-1 rounded-lg bg-error-container/60 hover:bg-error-container text-on-error-container font-body-sm text-xs font-bold flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            <span>{deletingId === item.id ? '...' : t('delete')}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Escrow Orders */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-4">
            {orders.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[40px] text-outline">receipt_long</span>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">{t('noOrders')}</h3>
                <p className="font-body-sm text-xs text-on-surface-variant max-w-sm">
                  {t('noOrdersDesc')}
                </p>
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-base font-bold text-primary">
                        {t('orderNumber')} #{o.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold uppercase">
                        {o.status} • Card ending {o.card_last4}
                      </span>
                    </div>
                    <div className="font-body-sm text-xs text-on-surface-variant">
                      {(o.items || []).map((i) => `${i.component_name} (x${i.quantity})`).join(', ')}
                    </div>
                  </div>
                  <div className="font-headline-sm text-xl font-extrabold text-on-surface sm:text-right">
                    ${parseFloat(o.total_price || 0).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: Saved Builds */}
        {activeTab === 'builds' && (
          <div className="flex flex-col gap-4">
            {savedBuilds.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[40px] text-outline">bookmark_border</span>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">{t('noBuilds')}</h3>
                <p className="font-body-sm text-xs text-on-surface-variant max-w-sm">
                  {t('noBuildsDesc')}
                </p>
              </div>
            ) : (
              savedBuilds.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-headline-sm text-base font-bold text-on-surface">{b.title}</h3>
                    <span className="font-body-sm text-xs text-on-surface-variant">
                      {b.items?.length || 0} {t('slotsConfigured')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (b.items?.length) {
                        setRigItems(
                          b.items.map((bi) => ({
                            id: `comp-${bi.component?.id}`,
                            component_id: bi.component?.id,
                            component: bi.component,
                            price: parseFloat(bi.component?.price_avg || 199),
                            quantity: bi.quantity || 1,
                          }))
                        );
                        addToast({
                          type: 'success',
                          title: t('buildLoaded'),
                          message: `Loaded "${b.title}" into your active PC Builder.`,
                        });
                        navigate('/');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-sm text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">file_open</span>
                    <span>{t('loadBuild')}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
