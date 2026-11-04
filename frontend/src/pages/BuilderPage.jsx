import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import Rig3DCanvas, { LIGHTING_MODES, CAMERA_PRESETS } from '../components/3d/Rig3DCanvas';
import { resolveComponentCategoryKind, getComponentImage } from '../data/hardwareMedia';

const HARDWARE_SLOTS = [
  { key: 'case', name: 'Chassis / Case', icon: 'desktop_windows', required: true },
  { key: 'motherboard', name: 'Motherboard', icon: 'developer_board', required: true },
  { key: 'cpu', name: 'Processor (CPU)', icon: 'memory', required: true },
  { key: 'cooling', name: 'CPU Cooler', icon: 'mode_fan', required: true },
  { key: 'gpu', name: 'Graphics Card (GPU)', icon: 'videogame_asset', required: true },
  { key: 'memory', name: 'RAM Memory', icon: 'reorder', required: true },
  { key: 'storage', name: 'Storage (M.2 NVMe)', icon: 'storage', required: true },
  { key: 'psu', name: 'Power Supply (PSU)', icon: 'bolt', required: true },
];

export default function BuilderPage() {
  const {
    components,
    listings,
    rigItems,
    addToRig,
    apiFetch,
    addToast,
    user,
    openModal,
  } = useApp();
  const { t } = useTheme();
  const navigate = useNavigate();

  // 3D Viewport Controls State
  const [modelPreset, setModelPreset] = useState('custom');
  const [explosion, setExplosion] = useState(0);
  const [isPlayingExplosion, setIsPlayingExplosion] = useState(false);
  const [lightingMode, setLightingMode] = useState('cyan');
  const [showGlass, setShowGlass] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('iso');
  const [selectedSlotForPicker, setSelectedSlotForPicker] = useState(null);
  const [inspectSlot, setInspectSlot] = useState(null);

  // Build Meta
  const [buildTitle, setBuildTitle] = useState('Custom High-Performance Rig');
  const [savingBuild, setSavingBuild] = useState(false);

  // Map rigItems into a slot-keyed dictionary: { case, cpu, gpu, memory, ... }
  const selectedPartsBySlot = useMemo(() => {
    const map = {};
    for (const item of rigItems) {
      const comp = item.component || item;
      const kind = resolveComponentCategoryKind(comp);
      if (kind) {
        map[kind] = comp;
      }
    }
    return map;
  }, [rigItems]);

  // Telemetry Calculations
  const metrics = useMemo(() => {
    let tdp = 0;
    let price = 0;
    let installedCount = 0;

    HARDWARE_SLOTS.forEach(({ key }) => {
      const comp = selectedPartsBySlot[key];
      if (comp) {
        installedCount += 1;
        tdp += Number(comp.tdp || 0);
        price += parseFloat(comp.price_avg || 0);
      }
    });

    // Check socket compatibility between CPU & Motherboard
    let socketWarning = null;
    const cpu = selectedPartsBySlot.cpu;
    const mb = selectedPartsBySlot.motherboard;
    if (cpu && mb && cpu.socket && mb.socket && cpu.socket !== mb.socket) {
      socketWarning = `Socket mismatch: CPU is ${cpu.socket}, but motherboard is ${mb.socket}!`;
    }

    return {
      installedCount,
      totalSlots: HARDWARE_SLOTS.length,
      tdp: Math.max(50, tdp),
      recommendedPsu: Math.max(550, Math.ceil((tdp + 150) / 100) * 100),
      totalPrice: price,
      socketWarning,
    };
  }, [selectedPartsBySlot]);

  // Auto-play disassembly animation
  useEffect(() => {
    if (!isPlayingExplosion) return;
    const interval = setInterval(() => {
      setExplosion((prev) => {
        if (prev >= 1.0) {
          setIsPlayingExplosion(false);
          return 1.0;
        }
        return Math.min(1.0, prev + 0.015);
      });
    }, 25);
    return () => clearInterval(interval);
  }, [isPlayingExplosion]);

  const togglePlayExplosion = () => {
    if (isPlayingExplosion) {
      setIsPlayingExplosion(false);
    } else {
      if (explosion >= 1.0) setExplosion(0);
      setIsPlayingExplosion(true);
    }
  };

  // Component Selection from Picker Drawer
  const handleSelectComponent = (comp) => {
    addToRig(comp, false);
    setSelectedSlotForPicker(null);
    setInspectSlot(resolveComponentCategoryKind(comp));
  };

  // Available components for the active picker drawer
  const drawerComponents = useMemo(() => {
    if (!selectedSlotForPicker) return [];
    return components.filter((c) => resolveComponentCategoryKind(c) === selectedSlotForPicker);
  }, [selectedSlotForPicker, components]);

  // Save current build to backend
  const handleSaveBuild = async () => {
    if (!user) {
      navigate('/accounts/login');
      return;
    }
    if (rigItems.length === 0) {
      addToast({ type: 'warning', title: 'Empty Build', message: 'Add parts to your build before saving.' });
      return;
    }
    setSavingBuild(true);
    try {
      const itemsPayload = rigItems.map((item) => ({
        component_id: item.component_id || item.component?.id,
        quantity: 1,
      }));
      const res = await apiFetch('/api/builder/builds/', {
        method: 'POST',
        body: JSON.stringify({
          title: buildTitle.trim() || 'My 3D PC Build',
          items: itemsPayload,
        }),
      });
      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Build Saved',
          message: `Build "${buildTitle}" saved successfully!`,
        });
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save build');
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setSavingBuild(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background text-on-surface overflow-hidden min-h-[calc(100vh-4rem)]">
      
      {/* 1. Top Workbench Header */}
      <header className="shrink-0 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">view_in_ar</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={buildTitle}
                onChange={(e) => setBuildTitle(e.target.value)}
                className="font-headline-sm text-base sm:text-lg font-bold bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none transition-colors text-on-surface max-w-[280px] sm:max-w-sm"
              />
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-bold">
                3D CAD LIVE
              </span>
            </div>
            <p className="text-xs text-on-surface-variant flex items-center gap-2 mt-0.5 font-code-sm">
              <span>{metrics.installedCount}/{metrics.totalSlots} Parts</span>
              <span>•</span>
              <span>Est. {metrics.tdp}W TDP</span>
              <span>•</span>
              <span className="text-primary font-bold">${metrics.totalPrice.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Model Selector (Inspired by maga76/drf_exam3) */}
          <div className="flex items-center rounded-xl bg-surface-container-low p-1 border border-outline-variant/30 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setModelPreset('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modelPreset === 'custom'
                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Custom Assembly
            </button>
            <button
              type="button"
              onClick={() => setModelPreset('gaming')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modelPreset === 'gaming'
                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Custom Gaming PC
            </button>
            <button
              type="button"
              onClick={() => setModelPreset('office')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modelPreset === 'office'
                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Workstation PC
            </button>
          </div>

          {/* AI Ray-Trace Modal Trigger */}
          <button
            type="button"
            onClick={() => openModal('aiVisualizer')}
            className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors"
            title="Photorealistic Ray-Trace Diffusion Preview"
          >
            <span className="material-symbols-outlined text-sm text-primary">auto_awesome</span>
            <span className="hidden md:inline">Neural Render</span>
          </button>

          {/* Save Build */}
          <button
            type="button"
            onClick={handleSaveBuild}
            disabled={savingBuild}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            <span>{savingBuild ? 'Saving...' : 'Save Build'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Split Area: Left Slots Checklist + Center 3D Viewport + Right Telemetry */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT COLUMN: 8 Hardware Slots Checklist */}
        <aside className="w-full lg:w-80 xl:w-96 shrink-0 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col overflow-y-auto custom-scrollbar z-10 max-h-72 lg:max-h-full">
          <div className="p-3.5 border-b border-outline-variant/20 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Hardware Component Slots
            </span>
            <span className="font-code-sm text-xs text-primary font-bold">
              {metrics.installedCount} / {metrics.totalSlots}
            </span>
          </div>

          <div className="p-3 flex flex-col gap-2">
            {HARDWARE_SLOTS.map((slot) => {
              const installed = selectedPartsBySlot[slot.key];
              const isInspected = inspectSlot === slot.key;

              return (
                <div
                  key={slot.key}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isInspected
                      ? 'bg-primary/10 border-primary/50 shadow-xs'
                      : installed
                      ? 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant/60'
                      : 'bg-surface-container-lowest border-dashed border-outline-variant/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      installed ? 'bg-primary/15 text-primary' : 'bg-surface-container text-outline'
                    }`}>
                      <span className="material-symbols-outlined text-lg">{slot.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-on-surface truncate">
                        {installed ? (installed.name || installed.brand) : slot.name}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-code-sm flex items-center gap-1">
                        {installed ? (
                          <>
                            <span className="text-primary font-semibold">${installed.price_avg || '—'}</span>
                            {installed.socket && <span>• {installed.socket}</span>}
                            {installed.tdp > 0 && <span>• {installed.tdp}W</span>}
                          </>
                        ) : (
                          <span className="text-outline">Empty Slot</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlotForPicker(slot.key);
                      setInspectSlot(slot.key);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                      installed
                        ? 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30'
                        : 'bg-primary text-on-primary hover:bg-primary/90 shadow-xs'
                    }`}
                  >
                    {installed ? 'Replace' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER VIEWPORT: Interactive 3D Canvas */}
        <main className="flex-1 flex flex-col relative bg-[#0e1014] overflow-hidden">
          
          {/* Top Floating Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Camera Presets */}
            <div className="flex items-center rounded-xl bg-surface-container-lowest/85 backdrop-blur-md p-1 border border-outline-variant/30 shadow-lg pointer-events-auto">
              {CAMERA_PRESETS.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    cameraPreset === cam.id
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {cam.name}
                </button>
              ))}
            </div>

            {/* Glass Panel & Lighting Profile */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => setShowGlass(!showGlass)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all ${
                  showGlass
                    ? 'bg-surface-container-lowest/85 border-outline-variant/40 text-on-surface'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                }`}
                title="Toggle tempered glass side panel"
              >
                <span className="material-symbols-outlined text-sm">
                  {showGlass ? 'visibility' : 'visibility_off'}
                </span>
                <span>{showGlass ? 'Glass On' : 'Open Chassis'}</span>
              </button>

              {/* Lighting Preset Pill */}
              <div className="flex items-center rounded-xl bg-surface-container-lowest/85 backdrop-blur-md p-1 border border-outline-variant/30 shadow-lg">
                {LIGHTING_MODES.map((light) => (
                  <button
                    key={light.id}
                    type="button"
                    onClick={() => setLightingMode(light.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      lightingMode === light.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: `#${light.primaryColor.toString(16).padStart(6, '0')}` }}
                    title={light.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 3D Canvas Scene */}
          <div className="flex-1 w-full h-full relative">
            <Rig3DCanvas
              selectedParts={selectedPartsBySlot}
              modelPreset={modelPreset}
              explosion={explosion}
              lightingMode={lightingMode}
              showGlass={showGlass}
              cameraPreset={cameraPreset}
              onSelectComponent={(slot) => {
                setInspectSlot(slot);
                setSelectedSlotForPicker(slot);
              }}
              className="w-full h-full"
            />
          </div>

          {/* Bottom Floating Bar: Disassembly Slider & Reset */}
          <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
            {/* Exploded Disassembly Slider (Inspired by maga76/drf_exam3) */}
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/35 shadow-xl pointer-events-auto">
              <button
                type="button"
                onClick={togglePlayExplosion}
                className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold hover:bg-primary/90 transition-all shrink-0"
                title={isPlayingExplosion ? 'Pause Disassembly' : 'Play Disassembly'}
              >
                <span className="material-symbols-outlined text-base">
                  {isPlayingExplosion ? 'pause' : 'play_arrow'}
                </span>
              </button>
              
              <div className="flex flex-col gap-1 w-36 sm:w-52">
                <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-bold">
                  <span>DISASSEMBLY</span>
                  <span className="text-primary">{Math.round(explosion * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={explosion}
                  onChange={(e) => {
                    setIsPlayingExplosion(false);
                    setExplosion(parseFloat(e.target.value));
                  }}
                  className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {explosion > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPlayingExplosion(false);
                    setExplosion(0);
                  }}
                  className="text-xs text-on-surface-variant hover:text-on-surface font-mono"
                  title="Assemble Rig"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Return to Marketplace Link */}
            <div className="pointer-events-auto flex items-center gap-2">
              <Link
                to="/"
                className="px-3.5 py-2 rounded-xl bg-surface-container-lowest/85 backdrop-blur-md border border-outline-variant/30 text-xs font-bold text-on-surface hover:border-primary transition-all shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">storefront</span>
                <span>Marketplace Catalog</span>
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* 3. Component Picker Sliding Drawer (when user clicks Replace/Select on a slot) */}
      {selectedSlotForPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-item-in">
          <div className="w-full max-w-lg bg-surface-container-lowest h-full border-l border-outline-variant/30 flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-xl">category</span>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface uppercase">
                    Select {selectedSlotForPicker}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {drawerComponents.length} verified components available in database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlotForPicker(null)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* List of Compatible Parts */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {drawerComponents.map((comp) => {
                const imgUrl = getComponentImage(comp);
                const isCurrent = selectedPartsBySlot[selectedSlotForPicker]?.id === comp.id;

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleSelectComponent(comp)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isCurrent
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-surface-container-low border-outline-variant/25 hover:border-primary hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0 flex items-center justify-center">
                        {imgUrl ? (
                          <img src={imgUrl} alt={comp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-primary">memory</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase text-primary tracking-wider">
                          {comp.brand}
                        </div>
                        <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {comp.name}
                        </h4>
                        <div className="text-xs text-on-surface-variant font-code-sm flex items-center gap-2 mt-0.5">
                          {comp.socket && <span>Socket {comp.socket}</span>}
                          {comp.tdp > 0 && <span>{comp.tdp}W TDP</span>}
                          {comp.ram_type && <span>{comp.ram_type}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-on-surface">${comp.price_avg}</div>
                      <span className={`text-[11px] font-bold ${isCurrent ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>
                        {isCurrent ? '● Active' : 'Install →'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {drawerComponents.length === 0 && (
                <div className="p-8 text-center text-on-surface-variant text-sm">
                  No components found for this category in catalog.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
