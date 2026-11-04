import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardBadgesAndSpecs, getComponentImage } from '../data/hardwareMedia';
import { isUniversalComponent } from '../utils/socketFilter';

export default function ProductCard({ item, viewMode = 'grid' }) {
  const {
    user,
    addToRig,
    compareItems,
    toggleCompare,
    setCheckoutPayload,
    openModal,
    apiFetch,
    fetchCatalog,
    addToast,
  } = useApp();
  const { t } = useTheme();
  const navigate = useNavigate();
  const [justClicked, setJustClicked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const comp = item.component || item;
  const price = parseFloat(item.price ?? comp.price_avg ?? 0);
  const imageSrc = item.image || item.component?.image || getComponentImage(comp);
  const meta = getCardBadgesAndSpecs(item);
  const isUniversal = isUniversalComponent(item);

  const itemKey = item.id || `comp-${comp.id}`;
  const isCompared = compareItems.some((x) => (x.id || `comp-${x.component?.id}`) === itemKey);

  // Role permissions:
  // Admin: can Edit and Delete any listing
  // Owner (Seller): can Edit and Delete their own listings
  const isAdmin = user?.role === 'Admin';
  const isOwner =
    Boolean(user?.username) &&
    (item.seller_username === user.username || item.seller === user.id);

  const canManage = isAdmin || isOwner;

  const handleEdit = (e) => {
    e.stopPropagation();
    openModal('postListing', { editListing: item });
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete listing for "${comp.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/marketplace/listings/${item.id}/`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        addToast({
          type: 'success',
          title: 'Listing Deleted',
          message: `Removed "${comp.name}" from marketplace.`,
        });
        await fetchCatalog();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (_) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not delete listing.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddToRig = (e) => {
    e.stopPropagation();
    addToRig(item, true);
    setJustClicked(true);
    setTimeout(() => setJustClicked(false), 1400);
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    setCheckoutPayload({
      mode: 'single',
      items: [
        {
          id: item.id,
          listing_id: item.component ? item.id : null,
          component_id: comp.id,
          component: comp,
          price,
          seller_username: item.seller_username || 'SiliconFoundry_Official',
          condition: item.condition || 'new',
          quantity: 1,
        },
      ],
    });
    navigate('/checkout');
  };

  const handleOpenDetails = () => {
    openModal('productDetails', { item });
  };

  if (viewMode === 'list') {
    return (
      <article className="card-interactive animate-item-in bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-lg border border-outline-variant/20 hover:border-primary/35 flex flex-col sm:flex-row items-center p-space-md gap-space-md group">
        <div
          onClick={handleOpenDetails}
          className="w-full sm:w-44 h-36 bg-surface-container-low rounded-lg p-3 flex items-center justify-center relative shrink-0 cursor-pointer overflow-hidden"
        >
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            {t('verifiedCompatible')}
          </span>
          <img
            src={imageSrc}
            alt={comp.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between w-full gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="font-label-sm text-label-sm font-semibold uppercase text-primary">
                {meta.categoryLabel}
              </span>
              {comp.socket ? (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-primary">
                  {comp.socket}
                </span>
              ) : isUniversal ? (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-secondary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  {t('universalFit') || 'Universal Fit'}
                </span>
              ) : null}
            </div>
            <label
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 cursor-pointer font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              <input
                type="checkbox"
                checked={isCompared}
                onChange={() => toggleCompare(item)}
                className="w-3.5 h-3.5 rounded text-primary cursor-pointer"
              />
              <span>{t('compare')}</span>
            </label>
          </div>

          <h2
            onClick={handleOpenDetails}
            className="font-headline-sm text-headline-sm font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer truncate"
          >
            {comp.name}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {meta.specs.map((sp, i) => (
              <div
                key={i}
                className="bg-surface-container-low px-2 py-1 rounded font-label-sm text-label-sm text-on-surface-variant truncate"
              >
                <span className="font-semibold text-on-surface">{sp.label}:</span> {sp.value}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full sm:w-52 shrink-0 flex flex-col justify-between items-end gap-2 border-t sm:border-t-0 sm:border-l border-outline-variant/20 pt-3 sm:pt-0 sm:pl-4">
          <div className="text-right w-full flex sm:flex-col items-baseline sm:items-end justify-between">
            <div>
              <span className="font-headline-md text-headline-md font-bold text-on-surface">
                ${price.toFixed(2)}
              </span>
              {meta.oldPrice && (
                <span className="font-body-sm text-body-sm text-on-surface-variant line-through ml-1.5">
                  ${meta.oldPrice}
                </span>
              )}
            </div>
            <span className="font-label-sm text-label-sm text-secondary font-bold">
              {meta.stockCount} {t('inStock')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 w-full">
            {canManage ? (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="btn-interactive px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[17px] text-primary">edit</span>
                  <span>{t('edit')}</span>
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="btn-interactive px-2.5 py-1.5 rounded-lg bg-error-container hover:opacity-90 text-on-error-container font-body-sm text-body-sm font-bold flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[17px]">delete</span>
                  <span>{deleting ? '...' : t('delete')}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAddToRig}
                  className={`btn-interactive px-2.5 py-1.5 rounded-lg font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1 ${
                    justClicked
                      ? 'bg-secondary-fixed text-on-secondary-fixed scale-[1.02]'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {justClicked ? 'check' : 'build'}
                  </span>
                  <span>{justClicked ? t('added') : t('addToRig')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="btn-interactive px-2.5 py-1.5 rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-sm text-body-sm font-bold flex items-center justify-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[17px]">shopping_cart</span>
                  <span>{t('buyNow')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="card-interactive animate-item-in bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-xl border border-outline-variant/15 hover:border-primary/35 flex flex-col group relative overflow-hidden">
      {/* Top Studio Image Box */}
      <div
        onClick={handleOpenDetails}
        className="p-space-md bg-surface-container-low relative flex items-center justify-center h-48 overflow-hidden cursor-pointer"
      >
        <span className="absolute top-space-sm left-space-sm z-10 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          {t('verifiedCompatible')}
        </span>

        {item.condition === 'used' ? (
          <span className="absolute top-space-sm right-space-sm z-10 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold">
            {t('certifiedUsed')}
          </span>
        ) : meta.topBadgeRight ? (
          <span
            className={`absolute top-space-sm right-space-sm z-10 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
              meta.topBadgeRight.variant === 'error'
                ? 'bg-error text-on-error'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            {meta.topBadgeRight.text}
          </span>
        ) : null}

        <img
          src={imageSrc}
          alt={comp.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails();
          }}
          title="Inspect Thermal & Hardware Architecture"
          className="opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 absolute bottom-2 right-2 px-2 py-1 rounded-md bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-sm text-[10px] font-bold flex items-center gap-1 shadow-sm border border-outline-variant/30"
        >
          <span className="material-symbols-outlined text-[13px] text-primary">visibility</span>
          <span>{t('specs')}</span>
        </button>
      </div>

      {/* Card Body */}
      <div className="p-space-md flex flex-col flex-1 justify-between gap-space-md">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span className="font-label-sm text-label-sm font-semibold uppercase text-primary">
                {meta.categoryLabel}
              </span>
              {comp.socket ? (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-primary">
                  {comp.socket}
                </span>
              ) : isUniversal ? (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-secondary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  {t('universalFit') || 'Universal Fit'}
                </span>
              ) : null}
            </div>
            <label
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 cursor-pointer font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors shrink-0"
            >
              <input
                type="checkbox"
                checked={isCompared}
                onChange={() => toggleCompare(item)}
                className="w-3.5 h-3.5 rounded text-primary cursor-pointer compare-check"
              />
              <span>{t('compare')}</span>
            </label>
          </div>

          <h2
            onClick={handleOpenDetails}
            className="font-headline-sm text-headline-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
            title={comp.name}
          >
            {comp.name}
          </h2>

          <div className="flex items-center gap-space-xs mt-1 mb-space-sm">
            <div className="flex items-center text-tertiary-container">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span className="font-label-md text-label-md font-bold text-on-surface ml-1">
                {meta.rating}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              ({meta.reviewsCount} {t('reviews')})
            </span>
            <span className="mx-1 text-outline-variant">•</span>
            <span className="font-label-sm text-label-sm text-secondary font-semibold truncate">
              {meta.highlightTag}
            </span>
          </div>

          {/* 2x2 Key Specs Badges */}
          <div className="grid grid-cols-2 gap-1.5 mb-space-sm">
            {meta.specs.map((spec, idx) => (
              <div
                key={idx}
                className="bg-surface-container-low px-2 py-1 rounded font-label-sm text-label-sm text-on-surface-variant truncate"
              >
                <span className="font-semibold text-on-surface">{spec.label}:</span> {spec.value}
              </div>
            ))}
          </div>
        </div>

        {/* Pricing & Dual Actions */}
        <div className="pt-space-sm border-t border-outline-variant/15 flex flex-col gap-space-xs">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-headline-md text-headline-md font-bold text-on-surface">
                ${price.toFixed(2)}
              </span>
              {meta.oldPrice && (
                <span className="font-body-sm text-body-sm text-on-surface-variant line-through ml-1.5">
                  ${meta.oldPrice}
                </span>
              )}
            </div>
            <span className="font-label-sm text-label-sm text-secondary font-bold">
              {meta.stockCount} {t('inStock')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-space-xs mt-1">
            {canManage ? (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="btn-interactive px-space-sm py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">edit</span>
                  <span>{t('edit')}</span>
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="btn-interactive px-space-sm py-space-xs rounded-lg bg-error-container hover:opacity-90 text-on-error-container font-body-sm text-body-sm font-bold flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  <span>{deleting ? '...' : t('delete')}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAddToRig}
                  className={`btn-interactive add-to-rig-btn px-space-sm py-space-xs rounded-lg font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1 ${
                    justClicked
                      ? 'bg-secondary-fixed text-on-secondary-fixed shadow-sm scale-[1.03]'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {justClicked ? 'check' : 'build'}
                  </span>
                  <span>{justClicked ? t('added') : t('addToRig')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="btn-interactive px-space-sm py-space-xs rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-sm text-body-sm font-bold flex items-center justify-center gap-1 shadow-sm hover:shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                  <span>{t('buyNow')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
