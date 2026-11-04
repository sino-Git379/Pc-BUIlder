import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardBadgesAndSpecs, getComponentImage } from '../data/hardwareMedia';

export default function ActiveRigSidebar() {
  const {
    rigItems,
    isRigOpen,
    setIsRigOpen,
    justAddedItem,
    updateRigQty,
    removeFromRig,
    clearRig,
    rigMetrics,
    setCheckoutPayload,
    openModal,
  } = useApp();
  const { t } = useTheme();

  const navigate = useNavigate();

  // Lock body scroll on mobile/tablet when full-screen drawer is active
  React.useEffect(() => {
    if (isRigOpen && window.innerWidth < 1024) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isRigOpen]);

  const latestItem = justAddedItem || rigItems[0] || null;

  const handleCheckoutRig = () => {
    if (rigItems.length === 0) return;
    setCheckoutPayload({
      mode: 'rig',
      items: rigItems,
    });
    navigate('/checkout');
  };

  const handleMakeBundleOffer = () => {
    if (rigItems.length === 0) return;
    openModal('makeOffer', {
      isBundle: true,
      items: rigItems,
      askingPrice: rigMetrics.subtotal,
    });
  };

  const partsCountLabel =
    rigMetrics.totalParts === 0
      ? t('zeroPartsSelected')
      : `${rigMetrics.totalParts} ${rigMetrics.totalParts === 1 ? t('partSelected') : t('partsSelected')}`;

  return (
    <>
      {/* Mobile Backdrop for Rig Drawer */}
      {isRigOpen && (
        <div
          onClick={() => setIsRigOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-[#0b1c30]/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Responsive Builder Drawer: Full Screen on Mobile/Tablet, Fixed Docked Split-Panel on Desktop */}
      <div
        aria-hidden={!isRigOpen}
        className={`sidebar-slide-transition shrink-0 z-50 lg:z-30 ${
          isRigOpen
            ? 'fixed inset-0 w-full max-w-full opacity-100 translate-x-0 pointer-events-auto p-0 lg:p-0 lg:sticky lg:top-20 lg:self-start lg:w-[410px] lg:max-w-[410px] lg:ml-gutter'
            : 'fixed lg:static inset-0 w-0 max-w-0 opacity-0 translate-x-full lg:translate-x-10 pointer-events-none m-0 p-0'
        }`}
      >
        <aside
          id="docked-rig-sidebar"
          className="w-full h-full lg:h-[calc(100vh-5.5rem)] bg-surface-container-lowest rounded-none lg:rounded-xl border-0 lg:border border-outline-variant/30 shadow-2xl lg:shadow-md flex flex-col overflow-hidden"
        >
          {/* =========================================================================
           * 1. FIXED TOP PANEL (Header + RigSync Telemetry + AI Visualizer & Generate Build)
           * ========================================================================= */}
          <div className="shrink-0 flex flex-col bg-surface-container-lowest border-b border-outline-variant/20">
            {/* Header */}
            <div className="p-3.5 sm:p-space-md flex items-center justify-between border-b border-outline-variant/15">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">build_circle</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {t('rigCartTitle')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-bold transition-all">
                      {partsCountLabel}
                    </span>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant">
                    {t('activeBuild')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {rigItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRig}
                    title={t('clearCart')}
                    className="btn-interactive p-1.5 rounded-lg text-outline hover:text-error hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                  </button>
                )}
                <button
                  id="close-rig-drawer-btn"
                  onClick={() => setIsRigOpen(false)}
                  className="btn-interactive p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  title={t('collapseCart')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* RigSync v4.2 Live Telemetry & Compatibility Banner */}
            <div
              className={`px-3.5 py-2.5 sm:px-space-md sm:py-space-sm flex items-start gap-space-sm transition-colors duration-300 border-b border-outline-variant/15 ${
                rigMetrics.isCompatible ? 'bg-secondary-fixed/20' : 'bg-error-container/35'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300 ${
                  rigMetrics.isCompatible
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-error text-on-error'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {rigMetrics.isCompatible ? 'check' : 'priority_high'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span
                    className={`font-label-sm text-[11px] font-bold uppercase tracking-wide ${
                      rigMetrics.isCompatible ? 'text-on-secondary-fixed-variant' : 'text-error'
                    }`}
                  >
                    {rigMetrics.isCompatible
                      ? t('fullyCompatible')
                      : t('compatibilityAlert')}
                  </span>
                  <span className="font-label-sm text-[10px] font-semibold text-secondary px-1.5 py-0.5 rounded bg-surface-container-lowest">
                    {t('estWattage')}: {rigMetrics.totalTdp}W / {rigMetrics.psuWattage}W
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                  {rigMetrics.summaryNote}
                </p>
              </div>
            </div>

            {/* RigForge AI 3D Visualizer Card with Primary "Generate Build" Action */}
            <div className="p-3 sm:p-3.5 bg-surface-container-low/60 flex flex-col gap-2">
              <div
                onClick={() => openModal('aiVisualizer')}
                className="w-full rounded-xl relative overflow-hidden bg-surface-container-high border border-primary/30 flex items-center justify-between p-3 group transition-all duration-300 hover:border-primary shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      auto_awesome
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-body-sm text-body-sm font-bold text-on-surface truncate">
                        {t('aiVisualizer')}
                      </h4>
                      <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-secondary-fixed/40 text-on-secondary-fixed">
                        3D CAD
                      </span>
                    </div>
                    <p className="font-label-sm text-[11px] text-on-surface-variant truncate">
                      {t('aiDesc')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('aiVisualizer');
                  }}
                  className="btn-interactive px-3 py-1.5 rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-sm text-xs font-bold flex items-center gap-1 shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-[15px]">view_in_ar</span>
                  <span>{t('generateBuild')}</span>
                </button>
              </div>

              {/* Just Added To Rig Pill (Compact) */}
              {latestItem && (
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0"></span>
                    <span className="font-label-sm text-[10px] font-bold uppercase text-primary shrink-0">
                      {t('justAdded')}:
                    </span>
                    <span className="font-body-sm text-[11px] font-semibold text-on-surface truncate">
                      {latestItem.component?.name}
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] font-extrabold text-primary shrink-0">
                    ${parseFloat(latestItem.price || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
           * 2. SCROLLABLE MIDDLE CONTAINER: BUILD COMPONENTS LIST ONLY
           * ========================================================================= */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3.5 sm:p-space-md flex flex-col gap-space-xs">
            <div className="flex items-center justify-between text-on-surface-variant px-1 pb-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">
                {t('buildComponents')} ({rigItems.length})
              </span>
              <span className="font-label-sm text-[11px] text-outline font-mono">
                {rigMetrics.platformLabel}
              </span>
            </div>

            {rigItems.length === 0 ? (
              <div className="my-auto p-6 rounded-xl bg-surface-container-low border border-outline-variant/20 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-outline">memory</span>
                <div className="font-body-md text-body-md font-bold text-on-surface">
                  {t('emptyRig')}
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant max-w-[260px] leading-relaxed">
                  {t('emptyRigDesc')}
                </p>
              </div>
            ) : (
              rigItems.map((item) => {
                const comp = item.component || {};
                const meta = getCardBadgesAndSpecs(item);
                const specLine = meta.specs
                  .slice(0, 2)
                  .map((s) => `${s.value}`)
                  .join(' • ');

                return (
                  <div
                    key={item.id}
                    className="animate-item-in p-2.5 sm:p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/25 flex items-center gap-space-sm shadow-xs hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                  >
                    <div
                      onClick={() => openModal('productDetails', { item })}
                      className="w-12 h-12 rounded-lg bg-surface-container-low p-1 shrink-0 flex items-center justify-center cursor-pointer group/img"
                    >
                      <img
                        alt={comp.name}
                        className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-200"
                        src={getComponentImage(comp)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-label-sm text-[10px] font-bold text-primary uppercase truncate">
                          {meta.categoryLabel.split('•')[0]}
                        </span>
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface text-[14px]">
                          ${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                      <div
                        onClick={() => openModal('productDetails', { item })}
                        className="font-body-sm text-[12px] font-bold text-on-surface truncate cursor-pointer hover:text-primary transition-colors leading-tight my-0.5"
                      >
                        {comp.name}
                      </div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant truncate">
                        {specLine}
                      </div>
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-outline-variant/10">
                        <div className="flex items-center bg-surface-container-low rounded-md p-0.5">
                          <button
                            type="button"
                            onClick={() => updateRigQty(item.id, -1)}
                            className="btn-interactive w-5 h-5 rounded flex items-center justify-center text-on-surface hover:bg-surface-container font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-label-md text-xs font-bold">
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateRigQty(item.id, 1)}
                            className="btn-interactive w-5 h-5 rounded flex items-center justify-center text-on-surface hover:bg-surface-container font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromRig(item.id)}
                          className="btn-interactive p-1 text-outline hover:text-error flex items-center gap-1 font-label-sm text-xs"
                          title={t('removePart')}
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* =========================================================================
           * 3. FIXED BOTTOM PANEL (Totals, Shipping, Make Offer, Save Build, Checkout)
           * ========================================================================= */}
          <div className="shrink-0 p-3.5 sm:p-space-md border-t border-outline-variant/20 bg-surface-container-lowest flex flex-col gap-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-body-sm text-[11px] text-on-surface-variant">
                <span>{t('estWattage')}:</span>
                <span className="font-label-sm text-[11px] font-bold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>
                  {rigMetrics.totalTdp}W ({rigMetrics.recommendedPsu}W {t('recommended')})
                </span>
              </div>
              <div className="flex items-center justify-between font-body-sm text-[11px] text-on-surface-variant">
                <span>{t('shippingLogistics')}:</span>
                <span className="font-label-sm text-[11px] font-bold text-secondary">
                  {t('freeShipping')}
                </span>
              </div>
              <div className="flex items-center justify-between font-body-md text-sm pt-1.5 border-t border-outline-variant/20">
                <span className="font-bold text-on-surface">{t('buildSubtotal')}:</span>
                <span className="font-headline-sm text-base sm:text-lg font-extrabold text-on-surface">
                  ${rigMetrics.subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={rigItems.length === 0}
                onClick={handleMakeBundleOffer}
                className="btn-interactive px-2 py-2 rounded-lg border border-outline-variant/40 hover:bg-surface-container bg-surface-container-lowest text-on-surface font-body-sm text-xs font-bold flex items-center justify-center gap-1 shadow-xs disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">local_offer</span>
                <span>{t('makeOffer')}</span>
              </button>

              <button
                type="button"
                disabled={rigItems.length === 0}
                onClick={() => openModal('saveBuild')}
                className="btn-interactive px-2 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-sm text-xs font-bold flex items-center justify-center gap-1 shadow-xs disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">bookmark</span>
                <span>{t('saveBuild')}</span>
              </button>
            </div>

            <button
              type="button"
              disabled={rigItems.length === 0}
              onClick={handleCheckoutRig}
              className="btn-interactive w-full py-2.5 rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-md text-sm font-bold flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[17px]">verified_user</span>
              <span>{t('escrowCheckout')} (${rigMetrics.subtotal.toFixed(2)})</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
