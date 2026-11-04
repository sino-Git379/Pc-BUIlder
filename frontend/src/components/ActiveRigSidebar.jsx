import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardBadgesAndSpecs, getComponentImage, resolveComponentCategoryKind } from '../data/hardwareMedia';
import Rig3DCanvas, { CAMERA_PRESETS, LIGHTING_MODES } from './3d/Rig3DCanvas';

const HARDWARE_SLOTS = [
  { key: 'motherboard', label: 'Материнская плата', icon: 'developer_board' },
  { key: 'cpu', label: 'Процессор (CPU)', icon: 'memory' },
  { key: 'gpu', label: 'Видеокарта (GPU)', icon: 'videogame_asset' },
  { key: 'memory', label: 'Оперативная память (RAM)', icon: 'storage' },
  { key: 'cooling', label: 'Охлаждение', icon: 'mode_fan' },
  { key: 'storage', label: 'Накопитель (SSD)', icon: 'hard_drive' },
  { key: 'psu', label: 'Блок питания (PSU)', icon: 'bolt' },
  { key: 'case', label: 'Корпус ПК', icon: 'desktop_windows' },
];

export default function ActiveRigSidebar() {
  const {
    rigItems,
    listings,
    components,
    isRigOpen,
    setIsRigOpen,
    justAddedItem,
    addToRig,
    removeFromRig,
    clearRig,
    rigMetrics,
    setCheckoutPayload,
    openModal,
  } = useApp();
  const { t } = useTheme();

  const navigate = useNavigate();

  // 3D Viewport Controls & Fullscreen Editor States
  const [isExpanded3D, setIsExpanded3D] = useState(false);
  const [explosion, setExplosion] = useState(0);
  const [isPlayingExplosion, setIsPlayingExplosion] = useState(false);
  const [lightingMode, setLightingMode] = useState('cyan');
  const [showGlass, setShowGlass] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('iso');
  const [activeSlotPicker, setActiveSlotPicker] = useState(null);

  // Map rigItems into a slot-keyed dictionary: { case, cpu, gpu, memory, motherboard, cooling, storage, psu }
  const selectedPartsBySlot = useMemo(() => {
    const map = {};
    for (const item of rigItems) {
      const comp = item.component || item;
      const kind = resolveComponentCategoryKind(comp);
      if (kind && kind !== 'other') {
        map[kind] = { ...comp, _rigItem: item };
      }
    }
    return map;
  }, [rigItems]);

  // Catalog items grouped by slot for quick replacement inside the Fullscreen 3D Editor
  const catalogBySlot = useMemo(() => {
    const map = {
      motherboard: [],
      cpu: [],
      gpu: [],
      memory: [],
      cooling: [],
      storage: [],
      psu: [],
      case: [],
    };
    const seenCompIds = new Set();
    const sourceList = [...(listings || []), ...(components || [])];
    for (const entry of sourceList) {
      const comp = entry.component || entry;
      const cid = comp?.id || entry?.id;
      if (!comp || seenCompIds.has(cid)) continue;
      const kind = resolveComponentCategoryKind(comp);
      if (map[kind]) {
        seenCompIds.add(cid);
        map[kind].push(entry);
      }
    }
    return map;
  }, [listings, components]);

  // Exploded view animation loop
  useEffect(() => {
    let animId;
    let forward = true;
    if (isPlayingExplosion) {
      const step = () => {
        setExplosion((prev) => {
          let next = prev + (forward ? 0.012 : -0.012);
          if (next >= 1) {
            next = 1;
            forward = false;
          } else if (next <= 0) {
            next = 0;
            forward = true;
          }
          return next;
        });
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlayingExplosion]);

  // Handle ESC key to exit expanded 3D view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpanded3D) {
        setIsExpanded3D(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded3D]);

  // Lock body scroll on mobile/tablet when full-screen drawer is active or 3D fullscreen is open
  useEffect(() => {
    if ((isRigOpen && window.innerWidth < 1024) || isExpanded3D) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isRigOpen, isExpanded3D]);

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

  const installedSlotsCount = Object.keys(selectedPartsBySlot).length;

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
        className={`sidebar-slide-transition shrink-0 z-40 lg:z-30 ${
          isRigOpen
            ? 'fixed inset-0 w-full max-w-full opacity-100 translate-x-0 pointer-events-auto p-0 lg:p-0 lg:sticky lg:top-20 lg:self-start lg:w-[410px] lg:max-w-[410px] lg:ml-gutter'
            : 'fixed lg:static inset-0 w-0 max-w-0 opacity-0 translate-x-full lg:translate-x-10 pointer-events-none m-0 p-0'
        }`}
      >
        <aside
          id="docked-rig-sidebar"
          className="w-full h-full lg:h-[calc(100vh-5.5rem)] lg:max-h-[calc(100vh-5.5rem)] min-h-0 bg-surface-container-lowest rounded-none lg:rounded-xl border-0 lg:border border-outline-variant/30 shadow-2xl lg:shadow-md flex flex-col overflow-hidden"
        >
          {/* =========================================================================
           * 1. FIXED TOP PANEL (Header + RigSync Telemetry + Live 3D PC Constructor)
           * ========================================================================= */}
          <div className="shrink-0 flex flex-col bg-surface-container-lowest border-b border-outline-variant/20">
            {/* Header */}
            <div className="px-3.5 py-2.5 sm:px-space-md sm:py-3 flex items-center justify-between border-b border-outline-variant/15">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[19px]">build_circle</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">
                      {t('rigCartTitle')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[10px] font-bold transition-all">
                      {partsCountLabel}
                    </span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
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
                  className="btn-interactive p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  title="Close Builder Drawer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[19px]">close</span>
                </button>
              </div>
            </div>

            {/* RigSync Compatibility Telemetry Banner (100% Compatible) */}
            <div
              className={`px-3.5 py-2 border-b flex items-start gap-2 transition-colors ${
                rigMetrics.isCompatible
                  ? 'bg-secondary-fixed/20 border-secondary/20'
                  : 'bg-error-container/30 border-error/30'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[17px] mt-0.5 shrink-0 ${
                  rigMetrics.isCompatible ? 'text-secondary' : 'text-error'
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {rigMetrics.isCompatible ? 'verified' : 'warning'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-label-md text-[11px] font-bold uppercase tracking-wider ${
                      rigMetrics.isCompatible ? 'text-on-secondary-fixed-variant' : 'text-error'
                    }`}
                  >
                    {rigMetrics.isCompatible
                      ? `100% ${t('compatibleStatus')}`
                      : t('compatibilityAlert')}
                  </span>
                  <span className="font-label-sm text-[10px] font-semibold text-secondary px-1.5 py-0.5 rounded bg-surface-container-lowest">
                    {t('estWattage')}: {rigMetrics.totalTdp}W / {rigMetrics.psuWattage}W
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-on-surface-variant mt-0.5 leading-snug truncate">
                  {rigMetrics.summaryNote}
                </p>
              </div>
            </div>

            {/* Interactive 3D PC Constructor Window (directly linked to RigForge Cart) */}
            <div className="p-2.5 sm:p-3 bg-surface-container-low/60 flex flex-col gap-2">
              <div className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-[#0b0e17] border border-primary/30 shadow-inner group">
                {!isExpanded3D ? (
                  <Rig3DCanvas
                    selectedParts={selectedPartsBySlot}
                    modelPreset="custom"
                    explosion={0}
                    lightingMode={lightingMode}
                    showGlass={showGlass}
                    cameraPreset={cameraPreset}
                    compact={true}
                    onSelectComponent={(slotKey) => {
                      setActiveSlotPicker(slotKey);
                      setIsExpanded3D(true);
                    }}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    3D-сцена открыта в полноэкранном режиме
                  </div>
                )}

                {/* Top-Left Live Status Badge */}
                <div className="absolute top-2 left-2.5 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-md border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span className="font-mono text-[10px] font-bold text-slate-200 tracking-wide">
                    3D СБОРКА ({installedSlotsCount}/8)
                  </span>
                </div>

                {/* Top-Right Controls: Camera Cycle, Glass Toggle & Fullscreen Expand Button */}
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = CAMERA_PRESETS.findIndex((p) => p.id === cameraPreset);
                      const nextPreset = CAMERA_PRESETS[(idx + 1) % CAMERA_PRESETS.length];
                      setCameraPreset(nextPreset.id);
                    }}
                    title="Сменить ракурс камеры"
                    className="w-7 h-7 rounded-lg bg-slate-950/75 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-md flex items-center justify-center transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">cameraswitch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGlass((prev) => !prev)}
                    title={showGlass ? 'Снять боковое стекло' : 'Закрыть боковое стекло'}
                    className="w-7 h-7 rounded-lg bg-slate-950/75 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-md flex items-center justify-center transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {showGlass ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded3D(true)}
                    title="Развернуть 3D-конструктор на весь экран"
                    className="w-7 h-7 rounded-lg bg-primary hover:bg-primary/90 text-on-primary border border-primary/50 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-md hover:scale-105 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_full</span>
                  </button>
                </div>

                {/* Bottom Interactive Hint Bar */}
                <div className="absolute bottom-1.5 left-2 right-2 pointer-events-none flex items-center justify-between text-[10px] text-slate-300 bg-slate-950/75 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10">
                  <span className="flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-[13px] text-cyan-400">3d_rotation</span>
                    <span>Вращайте мышью • Колесо — зум</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExpanded3D(true)}
                    className="pointer-events-auto text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-0.5 shrink-0 ml-2"
                  >
                    <span>На весь экран</span>
                    <span className="material-symbols-outlined text-[13px]">fullscreen</span>
                  </button>
                </div>
              </div>

              {/* Just Added To Rig Pill (Compact) */}
              {latestItem && (
                <div className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0"></span>
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
           * 2. SCROLLABLE MIDDLE CONTAINER: BUILD COMPONENTS LIST
           * ========================================================================= */}
          <div
            style={{ overflowY: 'auto' }}
            className="flex-1 min-h-[150px] overflow-y-auto overscroll-contain custom-scrollbar p-3 sm:p-space-md pb-6 flex flex-col gap-space-xs"
          >
            <div className="flex items-center justify-between text-on-surface-variant px-1 pb-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">
                {t('buildComponents')} ({rigItems.length})
              </span>
              <span className="font-label-sm text-[11px] text-outline font-mono">
                {rigMetrics.platformLabel}
              </span>
            </div>

            {rigItems.length === 0 ? (
              <div className="my-auto py-6 text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-[22px]">memory</span>
                </div>
                <div className="font-body-md text-body-md font-semibold text-on-surface">
                  {t('emptyRigTitle')}
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant max-w-[230px]">
                  {t('emptyRigDesc')}
                </p>
              </div>
            ) : (
              rigItems.map((item) => {
                const key = item.id || item.listing_id || item.component_id;
                const comp = item.component || {};
                const img = getComponentImage(comp);
                const meta = getCardBadgesAndSpecs(item);
                const lineTotal = (parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2);

                return (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl bg-surface-container-low/70 hover:bg-surface-container border border-outline-variant/20 transition-all flex items-center gap-2.5 group"
                  >
                    <div className="w-11 h-11 rounded-lg bg-surface-container-lowest p-1 flex items-center justify-center shrink-0 border border-outline-variant/15">
                      <img
                        src={img}
                        alt={comp.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-label-sm text-[10px] font-bold uppercase text-primary tracking-wider">
                          {meta.categoryBadge}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromRig(key)}
                          title="Удалить из сборки"
                          className="text-outline hover:text-error transition-colors p-0.5 rounded"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>

                      <h4 className="font-body-sm text-xs font-bold text-on-surface truncate">
                        {comp.name}
                      </h4>

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-label-sm text-[10px] text-on-surface-variant font-mono truncate">
                          {meta.socket} • {meta.tdp > 0 ? `${meta.tdp}W` : '0W'}
                        </span>
                        <span className="font-body-sm text-xs font-extrabold text-on-surface">
                          ${lineTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* =========================================================================
           * 3. FIXED BOTTOM ACTION BAR (Financial Summary & Primary Actions)
           * ========================================================================= */}
          <div className="shrink-0 p-3 sm:p-space-md bg-surface-container-low/90 border-t border-outline-variant/25 flex flex-col gap-2">
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>{t('escrowProtection')}:</span>
                <span className="font-semibold text-secondary">{t('includedFree')}</span>
              </div>
              <div className="flex items-center justify-between font-body-md text-sm pt-1 border-t border-outline-variant/20">
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

      {/* =========================================================================
       * FULLSCREEN 3D PC EDITOR & INSPECTOR (по нажатию на кнопку разворачивания)
       * ========================================================================= */}
      {isExpanded3D && (
        <div className="fixed inset-0 z-50 bg-[#070a12]/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="h-14 sm:h-16 px-4 sm:px-6 border-b border-white/10 bg-slate-950/90 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[22px]">view_in_ar</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-bold text-sm sm:text-base">
                    Интерактивный 3D-Конструктор ПК
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {installedSlotsCount} / 8 УЗЛОВ
                  </span>
                </div>
                <p className="text-slate-400 text-xs hidden sm:block">
                  Все изменения синхронизированы с корзиной RigForge Cart в реальном времени
                </p>
              </div>
            </div>

            {/* Compatibility & Price Pill + Close Button */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs">
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  {rigMetrics.isCompatible ? '100% Compatible' : 'Check Socket'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-mono text-slate-300">
                  {rigMetrics.totalTdp}W / {rigMetrics.psuWattage}W
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-extrabold text-cyan-400">
                  ${rigMetrics.subtotal.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded3D(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10"
                title="Свернуть обратно в панель (Esc)"
              >
                <span className="material-symbols-outlined text-[18px]">close_fullscreen</span>
                <span className="hidden sm:inline">Свернуть</span>
              </button>
            </div>
          </div>

          {/* Main Fullscreen Split Area: 3D Viewport + Hardware Slot Manager */}
          <div className="flex-1 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Left/Center: 3D Interactive Scene */}
            <div className="relative flex-1 min-h-[300px] h-[54%] lg:h-full bg-[#0b0e17] overflow-hidden">
              <Rig3DCanvas
                selectedParts={selectedPartsBySlot}
                modelPreset="custom"
                explosion={explosion}
                lightingMode={lightingMode}
                showGlass={showGlass}
                cameraPreset={cameraPreset}
                compact={false}
                onSelectComponent={(slotKey) => setActiveSlotPicker(slotKey)}
                className="w-full h-full"
              />

              {/* Top Floating Camera Angles */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1.5 rounded-2xl bg-slate-950/85 border border-white/15 backdrop-blur-xl shadow-2xl">
                {CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCameraPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      cameraPreset === preset.id
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {preset.id === 'iso'
                        ? 'view_in_ar'
                        : preset.id === 'glass'
                        ? 'visibility'
                        : preset.id === 'front'
                        ? 'crop_portrait'
                        : 'layers'}
                    </span>
                    <span className="hidden sm:inline">{preset.name}</span>
                  </button>
                ))}
              </div>

              {/* Bottom-Left Lighting & Glass Panel Controls */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 p-3 rounded-2xl bg-slate-950/85 border border-white/15 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    ARGB Подсветка
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGlass((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      showGlass
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {showGlass ? 'visibility' : 'visibility_off'}
                    </span>
                    <span>{showGlass ? 'Стекло вкл' : 'Стекло снято'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  {LIGHTING_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setLightingMode(mode.id)}
                      title={mode.name}
                      className={`w-7 h-7 rounded-lg border transition-all ${
                        lightingMode === mode.id
                          ? 'border-white scale-110 shadow-lg ring-2 ring-cyan-400/50'
                          : 'border-white/20 opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `#${mode.primaryColor.toString(16).padStart(6, '0')}`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Bottom-Right Exploded View Disassembly Slider */}
              <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/85 border border-white/15 backdrop-blur-xl shadow-2xl w-[280px] sm:w-[320px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[17px] text-cyan-400">scatter_plot</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Взрыв-схема (Разборка)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPlayingExplosion((prev) => !prev)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      isPlayingExplosion
                        ? 'bg-cyan-500 text-black'
                        : 'bg-white/10 text-cyan-300 hover:bg-white/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isPlayingExplosion ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isPlayingExplosion ? 'Стоп' : 'Авто'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={explosion}
                    onChange={(e) => {
                      setExplosion(parseFloat(e.target.value));
                      setIsPlayingExplosion(false);
                    }}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-xs font-bold text-cyan-300 w-9 text-right">
                    {Math.round(explosion * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right Panel: Interactive 3D Hardware Slots & Live Component Swapper */}
            <div className="w-full lg:w-[400px] bg-slate-950 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col h-[46%] lg:h-[calc(100vh-4rem)] max-h-[46vh] lg:max-h-[calc(100vh-4rem)] min-h-0 overflow-hidden shrink-0">
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Комплектующие в 3D-сборке
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Нажмите на слот для добавления, замены или удаления
                  </p>
                </div>
                {rigItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRig}
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                    <span>Очистить</span>
                  </button>
                )}
              </div>

              <div
                style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 8.5rem)' }}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-3 pb-10 flex flex-col gap-2.5"
              >
                {HARDWARE_SLOTS.map((slot) => {
                  const installed = selectedPartsBySlot[slot.key];
                  const rigItem = installed?._rigItem;
                  const itemKey = rigItem ? rigItem.id || rigItem.listing_id || rigItem.component_id : null;
                  const isPickerOpen = activeSlotPicker === slot.key;
                  const slotOptions = catalogBySlot[slot.key] || [];

                  return (
                    <div
                      key={slot.key}
                      className={`rounded-xl border transition-all ${
                        installed
                          ? 'bg-slate-900/90 border-cyan-500/30'
                          : 'bg-slate-900/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="p-2.5 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              installed
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                : 'bg-white/5 text-slate-500'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[19px]">{slot.icon}</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {slot.label}
                            </div>
                            {installed ? (
                              <div className="text-xs font-bold text-white truncate">
                                {installed.name}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 italic">Не выбрано</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveSlotPicker(isPickerOpen ? null : slot.key)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-cyan-500 hover:text-black text-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {installed ? 'swap_horiz' : 'add'}
                            </span>
                            <span>{installed ? 'Заменить' : 'Выбрать'}</span>
                          </button>

                          {installed && itemKey && (
                            <button
                              type="button"
                              onClick={() => removeFromRig(itemKey)}
                              title="Удалить компонент из 3D-сборки"
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors flex items-center justify-center"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Catalog Picker for this Slot */}
                      {isPickerOpen && (
                        <div className="border-t border-white/10 p-2 bg-slate-950/90 flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                          {slotOptions.length === 0 ? (
                            <div className="text-xs text-slate-500 py-2 text-center">
                              Нет доступных товаров этой категории
                            </div>
                          ) : (
                            slotOptions.map((option) => {
                              const comp = option.component || option;
                              const price = parseFloat(option.price || comp.msrp || 199).toFixed(2);
                              const isCurrent = installed && (installed.id === comp.id || installed.name === comp.name);
                              return (
                                <button
                                  key={option.id || `comp-${comp.id}`}
                                  type="button"
                                  onClick={() => {
                                    addToRig(option, false);
                                    setActiveSlotPicker(null);
                                  }}
                                  className={`w-full p-2 rounded-lg text-left flex items-center justify-between gap-2 transition-colors ${
                                    isCurrent
                                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                                      : 'hover:bg-white/10 text-slate-200'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">{comp.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {comp.brand || 'OEM'}
                                    </div>
                                  </div>
                                  <span className="text-xs font-extrabold text-cyan-400 shrink-0">
                                    ${price}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
