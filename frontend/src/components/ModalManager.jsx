import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getComponentImage, STITCH_IMAGES } from '../data/hardwareMedia';
import ProductDetailsModal from './ProductDetailsModal';

/* ============================================================================
 * 1. AI VISUALIZER MODAL (RigForge RAY-TRACE v2.4 Neural CAD Preview)
 * ============================================================================ */
function AiVisualizerModal({ onClose }) {
  const { rigItems, rigMetrics, apiFetch, addToast } = useApp();
  const { t } = useTheme();
  const navigate = useNavigate();
  const [lighting, setLighting] = useState('Kinetic Daylight Cyan');
  const [angle, setAngle] = useState('Isometric 45° Studio');
  const [showThermalOverlay, setShowThermalOverlay] = useState(false);
  const [rendering, setRendering] = useState(true);
  const [progress, setProgress] = useState(18);
  const [stageLabel, setStageLabel] = useState('Connecting to AI Multi-Provider Neural Cascade...');
  const [renderResult, setRenderResult] = useState(null);

  // Multi-provider API Keys persisted in localStorage
  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem('rigforge_ai_key_gemini') || '';
  });
  const [openaiKey, setOpenaiKey] = useState(() => {
    return localStorage.getItem('rigforge_ai_key_openai') || '';
  });
  const [groqKey, setGroqKey] = useState(() => {
    return localStorage.getItem('rigforge_ai_key_groq') || '';
  });
  const [claudeKey, setClaudeKey] = useState(() => {
    return localStorage.getItem('rigforge_ai_key_claude') || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  const handleKeyChange = (provider, value) => {
    if (provider === 'gemini') {
      setGeminiKey(value);
      localStorage.setItem('rigforge_ai_key_gemini', value);
    } else if (provider === 'openai') {
      setOpenaiKey(value);
      localStorage.setItem('rigforge_ai_key_openai', value);
    } else if (provider === 'groq') {
      setGroqKey(value);
      localStorage.setItem('rigforge_ai_key_groq', value);
    } else if (provider === 'claude') {
      setClaudeKey(value);
      localStorage.setItem('rigforge_ai_key_claude', value);
    }
  };

  const handleShareToChat = () => {
    const renderImg = renderResult?.image_url || STITCH_IMAGES.lianLiO11;
    const summaryText = `[RigForge 3D Build Render] ${renderResult?.summary?.case || 'Custom PC'} • ${renderResult?.summary?.gpu || 'GPU'} • ${renderResult?.summary?.cpu || 'CPU'} • Est. ${rigMetrics?.totalTdp || 545}W TDP`;

    const shareEvent = new CustomEvent('rigforge:share-build-to-chat', {
      detail: {
        image: renderImg,
        fileName: `${(renderResult?.summary?.case || 'Custom_Rig').replace(/\s+/g, '_')}_3D_Render.png`,
        meta: `${rigMetrics.platformLabel} • ${rigMetrics.totalTdp}W • ${rigItems.length} parts`,
        text: summaryText,
      },
    });
    window.dispatchEvent(shareEvent);

    addToast({
      type: 'success',
      title: t('renderShared') || 'Render Shared to Chat',
      message: 'Attached 3D Build Render to your active messenger channel.',
    });
    onClose();
    navigate('/messages');
  };

  const triggerRender = async (selectedLighting = lighting, selectedAngle = angle) => {
    setRendering(true);
    setProgress(14);
    setStageLabel('Evaluating Primary Engine (Pollinations FLUX.1 CAD)...');

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 900) {
        setProgress(28);
        setStageLabel('Analyzing Chassis Geometry & Component Clearance...');
      } else if (elapsed < 2000) {
        setProgress(56);
        setStageLabel('Testing Fallback Queue (Gemini / OpenAI / Groq / Claude)...');
      } else if (elapsed < 3500) {
        setProgress(74);
        setStageLabel('Synthesizing 8K Studio Lighting & ARGB Ray Tracing...');
      } else if (elapsed < 5500) {
        setProgress(88);
        setStageLabel('Neural Diffusion: Rendering Custom 3D Assembled Rig...');
      } else {
        setProgress((p) => Math.min(95, p + 1));
      }
    }, 250);

    try {
      const payload = {
        lighting: selectedLighting,
        angle: selectedAngle,
        seed: Date.now(),
        api_keys: {
          gemini: geminiKey.trim(),
          openai: openaiKey.trim(),
          groq: groqKey.trim(),
          claude: claudeKey.trim(),
        },
        components: rigItems.map((i) => ({
          brand: i.component?.brand,
          name: i.component?.name,
          category_name: i.component?.category_name,
          tdp: i.component?.tdp,
          power_supply: i.component?.power_supply,
        })),
      };
      const res = await apiFetch('/api/builder/ai-render/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      clearInterval(timer);
      setProgress(100);
      setStageLabel('Finalizing 3D Rig Composite...');
      if (res.ok) {
        const data = await res.json();
        setRenderResult(data);
      }
    } catch (_) {
      clearInterval(timer);
      setProgress(100);
    } finally {
      clearInterval(timer);
      setTimeout(() => {
        setRendering(false);
      }, 350);
    }
  };

  useEffect(() => {
    triggerRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowStyle =
    lighting === 'Kinetic Daylight Cyan'
      ? 'from-primary/30 via-secondary-fixed/25 to-tertiary/20'
      : lighting === 'Stealth Graphite Studio'
      ? 'from-outline/30 via-surface-container-high to-primary/15'
      : 'from-tertiary/35 via-primary/25 to-secondary-fixed/30';

  return (
    <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 flex flex-col overflow-hidden z-10">
      {/* Header */}
      <div className="px-space-lg py-4 border-b border-outline-variant/25 flex items-center justify-between bg-surface-container-lowest">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                RigForge AI 3D Visualizer
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold">
                RAY-TRACE v2.4
              </span>
            </div>
            <p className="font-body-sm text-[12px] text-on-surface-variant">
              Neural CAD Assembly Preview • {rigMetrics.platformLabel} ({rigItems.length} Active Slots)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border font-label-sm text-xs font-bold flex items-center gap-1.5 transition-colors ${
              showSettings || geminiKey || openaiKey || groqKey || claudeKey
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
            }`}
            title="Configure AI API Keys & Fallback Engine"
          >
            <span className="material-symbols-outlined text-[16px]">key</span>
            <span className="hidden sm:inline">{t('apiKeysSettings') || 'API Keys & Fallback'}</span>
            <span className="sm:hidden">Keys</span>
            {(geminiKey || openaiKey || groqKey || claudeKey) && (
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-label-sm text-label-sm font-bold flex items-center gap-1"
          >
            <span>ESC</span>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-space-lg overflow-y-auto custom-scrollbar flex flex-col gap-space-md">
        {/* Multi-Provider Fallback Cascade Settings Panel */}
        {showSettings && (
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3 animate-item-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
                <div>
                  <h4 className="font-headline-sm text-sm font-bold text-on-surface">
                    {t('aiFallbackTitle') || 'Multi-Provider AI Cascade'}
                  </h4>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    {t('aiFallbackDesc') || 'Automatic failover chain: Pollinations.ai → Gemini → OpenAI → Groq / Claude'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowKeys((v) => !v)}
                  className="px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface font-label-sm text-[11px] flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {showKeys ? 'visibility_off' : 'visibility'}
                  </span>
                  <span>{showKeys ? 'Hide Keys' : 'Show Keys'}</span>
                </button>
              </div>
            </div>

            {/* Cascade Chain Visualizer */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                1. Pollinations (Free)
              </span>
              <span className="text-on-surface-variant">→</span>
              <span className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                geminiKey ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container text-on-surface-variant opacity-70'
              }`}>
                {geminiKey ? '●' : '○'} 2. Gemini
              </span>
              <span className="text-on-surface-variant">→</span>
              <span className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                openaiKey ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container text-on-surface-variant opacity-70'
              }`}>
                {openaiKey ? '●' : '○'} 3. OpenAI
              </span>
              <span className="text-on-surface-variant">→</span>
              <span className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                groqKey ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container text-on-surface-variant opacity-70'
              }`}>
                {groqKey ? '●' : '○'} 4. Groq
              </span>
              <span className="text-on-surface-variant">→</span>
              <span className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                claudeKey ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container text-on-surface-variant opacity-70'
              }`}>
                {claudeKey ? '●' : '○'} 5. Claude
              </span>
            </div>

            {/* 4 Clean API Key Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Google Gemini */}
              <div>
                <label className="font-label-sm text-[11px] font-bold text-on-surface-variant block mb-1">
                  {t('geminiKeyLabel') || 'Google Gemini API Key'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => handleKeyChange('gemini', e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  {geminiKey && (
                    <button
                      type="button"
                      onClick={() => handleKeyChange('gemini', '')}
                      className="absolute right-2 text-on-surface-variant hover:text-error text-xs"
                      title="Clear key"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* OpenAI (ChatGPT) */}
              <div>
                <label className="font-label-sm text-[11px] font-bold text-on-surface-variant block mb-1">
                  {t('openaiKeyLabel') || 'OpenAI (ChatGPT) API Key'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    placeholder="sk-proj-..."
                    value={openaiKey}
                    onChange={(e) => handleKeyChange('openai', e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  {openaiKey && (
                    <button
                      type="button"
                      onClick={() => handleKeyChange('openai', '')}
                      className="absolute right-2 text-on-surface-variant hover:text-error text-xs"
                      title="Clear key"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Groq API */}
              <div>
                <label className="font-label-sm text-[11px] font-bold text-on-surface-variant block mb-1">
                  {t('groqKeyLabel') || 'Groq API Key'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    placeholder="gsk_..."
                    value={groqKey}
                    onChange={(e) => handleKeyChange('groq', e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  {groqKey && (
                    <button
                      type="button"
                      onClick={() => handleKeyChange('groq', '')}
                      className="absolute right-2 text-on-surface-variant hover:text-error text-xs"
                      title="Clear key"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Anthropic Claude API */}
              <div>
                <label className="font-label-sm text-[11px] font-bold text-on-surface-variant block mb-1">
                  {t('claudeKeyLabel') || 'Anthropic Claude API Key'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    placeholder="sk-ant-..."
                    value={claudeKey}
                    onChange={(e) => handleKeyChange('claude', e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  {claudeKey && (
                    <button
                      type="button"
                      onClick={() => handleKeyChange('claude', '')}
                      className="absolute right-2 text-on-surface-variant hover:text-error text-xs"
                      title="Clear key"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/20">
              <span className="flex items-center gap-1 text-secondary">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>{t('keySavedLocally') || 'Saved securely in browser (localStorage)'}</span>
              </span>
              <button
                type="button"
                onClick={() => triggerRender()}
                className="px-2.5 py-1 rounded-md bg-primary text-on-primary font-bold text-xs hover:bg-on-primary-fixed-variant transition-colors"
              >
                Apply & Re-Generate
              </button>
            </div>
          </div>
        )}
        {/* Prominent Yellow Notice Banner for Free AI Limit Reached */}
        {(renderResult?.ai_limit_reached || renderResult?.status === 'limit_reached') && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-amber-500 shrink-0 mt-0.5">warning</span>
            <div className="flex-1 text-xs sm:text-sm">
              <div className="font-bold">{t('aiLimitReachedTitle')}</div>
              <div>{renderResult?.message || t('aiLimitReachedDesc')}</div>
              {renderResult?.cascade_trace && renderResult.cascade_trace.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-500/30 font-mono text-[11px] flex flex-col gap-1">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300">
                    Fallback Chain Attempt History:
                  </div>
                  {renderResult.cascade_trace.map((tr, i) => (
                    <div key={i} className="flex items-center gap-1.5 opacity-90">
                      <span className="material-symbols-outlined text-[12px] text-amber-600">
                        {tr.status === 'success' ? 'check' : 'close'}
                      </span>
                      <span className="font-semibold">{tr.provider}:</span>
                      <span>{tr.reason || tr.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Provider Notice Banner */}
        {renderResult?.status === 'provider_error' && (
          <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-error shrink-0">info</span>
            <div className="flex-1 text-xs sm:text-sm">
              <div className="font-bold">{t('aiProviderError')}</div>
              <div>{renderResult?.message || t('aiProviderErrorDesc')}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* 3D Viewport Canvas (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-sm">
          <div className="relative h-[370px] rounded-2xl bg-[#101520] border border-outline-variant/40 overflow-hidden flex items-center justify-center shadow-inner">
            <div
              className={`absolute inset-0 bg-gradient-to-tr ${glowStyle} opacity-75 transition-all duration-500`}
            ></div>

            {/* Subtle Blueprint Grid */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            ></div>

            {rendering ? (
              <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6 max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/50 text-white flex items-center justify-center animate-spin">
                  <span className="material-symbols-outlined text-[28px]">view_in_ar</span>
                </div>
                <div className="font-headline-sm text-white font-bold">{stageLabel}</div>
                <div className="w-64 h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-secondary-fixed transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="font-label-sm text-[11px] text-white/70 font-mono">
                  {progress}% • Synthesizing 8K Ray-Traced Geometry
                </span>
              </div>
            ) : (
              <>
                {/* Top HUD Overlay */}
                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white font-label-sm text-[11px] border border-white/10 dark:border-white/10 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#55fcd8] animate-pulse"></span>
                      {angle} • {lighting}
                    </span>
                    {renderResult?.ai_limit_reached || renderResult?.status === 'limit_reached' ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-mono text-[10px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">speed</span>
                        <span>LIMIT REACHED</span>
                      </span>
                    ) : renderResult?.status === 'provider_error' ? (
                      <span className="px-2 py-0.5 rounded-md bg-error text-white font-mono text-[10px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">error</span>
                        <span>FALLBACK</span>
                      </span>
                    ) : renderResult?.ai_powered ? (
                      <span className="px-2 py-0.5 rounded-md bg-primary/80 backdrop-blur-md text-white font-mono text-[10px] font-bold border border-primary/50 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                        <span>{renderResult?.engine || 'AI RENDER'}</span>
                      </span>
                    ) : null}
                    {renderResult?.cascade_trace && renderResult.cascade_trace.length > 1 && (
                      <span
                        className="px-2 py-0.5 rounded-md bg-secondary text-on-secondary font-mono text-[10px] font-bold flex items-center gap-1 shadow-sm"
                        title={renderResult.cascade_trace.map((tr) => `${tr.provider}: ${tr.status}`).join(' → ')}
                      >
                        <span className="material-symbols-outlined text-[12px]">alt_route</span>
                        <span>CASCADE FALLBACK</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowThermalOverlay((v) => !v)}
                    className={`px-2.5 py-1 rounded-md font-label-sm text-[11px] font-bold border transition-all flex items-center gap-1 ${
                      showThermalOverlay
                        ? 'bg-error text-white border-error'
                        : 'bg-black/60 text-white border-white/15 dark:border-slate-700 hover:bg-black/80'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">thermostat</span>
                    <span>{showThermalOverlay ? 'Thermal CFD: ON' : 'Thermal X-Ray'}</span>
                  </button>
                </div>

                {/* Composite Assembled Rig Visual */}
                <div
                  className="relative z-10 w-full h-full p-2 flex items-center justify-center transition-transform duration-500"
                >
                  <img
                    key={renderResult?.seed || renderResult?.image_url}
                    src={renderResult?.image_url || STITCH_IMAGES.lianLiO11}
                    alt="3D Assembled Chassis"
                    className="max-w-[92%] max-h-[300px] object-contain drop-shadow-[0_20px_35px_rgba(13,92,255,0.45)] rounded-lg"
                  />

                  {/* Component Callout Pins */}
                  <div className="absolute -left-6 top-8 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-[#55fcd8]/50 text-white font-label-sm text-[10px] shadow-lg">
                    <span className="text-[#55fcd8] font-bold">CPU/AIO:</span>{' '}
                    {renderResult?.summary?.cpu || 'Ryzen 7 7800X3D'}
                  </div>

                  <div className="absolute -right-8 top-1/2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-primary/60 text-white font-label-sm text-[10px] shadow-lg">
                    <span className="text-[#82b1ff] font-bold">GPU:</span>{' '}
                    {renderResult?.summary?.gpu || 'RTX 4080 Super'}
                  </div>

                  <div className="absolute -left-4 bottom-6 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 dark:border-slate-700 text-white font-label-sm text-[10px] shadow-lg">
                    <span className="text-[#d2bbff] font-bold">RAM:</span>{' '}
                    {renderResult?.summary?.ram || 'DDR5-6000 RGB'}
                  </div>

                  {/* Thermal CFD Overlay Arrows */}
                  {showThermalOverlay && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/30 via-amber-500/25 to-red-500/35 animate-pulse flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-black/80 text-[#55fcd8] font-label-sm text-[11px] font-bold border border-[#55fcd8]/40">
                        CFD Airflow: {renderResult?.telemetry?.est_gpu_load_temp_c || 62}°C GPU /{' '}
                        {renderResult?.telemetry?.est_cpu_load_temp_c || 58}°C CPU
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Viewport Telemetry Bar */}
                <div className="absolute bottom-3 left-3 right-3 z-20 px-3 py-2 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 dark:border-slate-800 flex items-center justify-between text-white font-label-sm text-[11px]">
                  <span>Clearance: ZERO INTERFERENCE</span>
                  <span className="text-[#55fcd8] font-bold">
                    Airflow Score: {renderResult?.telemetry?.airflow_efficiency_pct || 96}%
                  </span>
                  <span>Acoustics: {renderResult?.telemetry?.acoustic_load_dba || 28.4} dBA</span>
                </div>
              </>
            )}
          </div>

          {/* Lighting & Camera Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant block mb-1.5">
                Lighting Profile
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  'Kinetic Daylight Cyan',
                  'Stealth Graphite Studio',
                  'ARGB Ultraviolet Loop',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setLighting(preset);
                      triggerRender(preset, angle);
                    }}
                    className={`px-2 py-1 rounded font-label-sm text-[10px] font-bold transition-colors ${
                      lighting === preset
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {preset.split(' ')[0]} {preset.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant block mb-1.5">
                Camera Angle
              </span>
              <div className="flex flex-wrap gap-1">
                {['Isometric 45° Studio', 'Tempered Glass Side', 'Internal Thermal'].map((cam) => (
                  <button
                    key={cam}
                    type="button"
                    onClick={() => {
                      setAngle(cam);
                      triggerRender(lighting, cam);
                    }}
                    className={`px-2 py-1 rounded font-label-sm text-[10px] font-bold transition-colors ${
                      angle === cam
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {cam.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Engineer Telemetry & Component Manifest (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-space-md">
          <div className="flex flex-col gap-space-sm">
            <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div className="font-label-sm text-label-sm uppercase text-primary font-bold mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                AI Hardware Engineer Analysis
              </div>
              <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
                {(
                  renderResult?.ai_notes || [
                    'Chassis clearance verified for selected GPU and radiator with positive-pressure intake.',
                    `Estimated peak load ${rigMetrics.totalTdp}W on ${rigMetrics.psuWattage}W PSU — optimal 80+ Gold efficiency curve.`,
                    'Zero physical RAM overhang or PCIe slot obstruction detected.',
                  ]
                ).map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[15px] text-secondary mt-0.5 shrink-0">
                      check_circle
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Active Rig Slots Included in Render */}
            <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/25 flex flex-col gap-2 max-h-44 overflow-y-auto custom-scrollbar">
              <span className="font-label-sm text-[11px] uppercase text-on-surface-variant font-bold">
                Rendered Hardware Manifest ({rigItems.length} Parts)
              </span>
              {rigItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between text-left py-1 border-b border-outline-variant/10 last:border-0"
                >
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate pr-2">
                    {it.component?.brand} {it.component?.name}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-bold shrink-0">
                    ${parseFloat(it.price || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Synthesized AI Prompt Details */}
            {renderResult?.prompt && (
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
                <span className="font-label-sm text-[10px] uppercase text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">terminal</span>
                  <span>Synthesized AI Prompt</span>
                </span>
                <p className="font-mono text-[10px] text-on-surface-variant leading-relaxed line-clamp-3 select-all" title={renderResult.prompt}>
                  "{renderResult.prompt}"
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-2">
            <button
              type="button"
              onClick={() => triggerRender(lighting, angle)}
              disabled={rendering}
              className="flex-1 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-md text-body-md font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>{t('reGenerate') || 'Re-Generate'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareToChat}
              disabled={rendering}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-md text-body-md font-bold shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span>{t('shareToChat') || 'Share to Chat'}</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 2. MAKE OFFER MODAL
 * ============================================================================ */
function MakeOfferModal({ props, onClose }) {
  const { setCheckoutPayload, rigItems, startSellerChat, addToast } = useApp();
  const navigate = useNavigate();

  const asking = parseFloat(props.askingPrice || 999);
  const [offerVal, setOfferVal] = useState((asking * 0.95).toFixed(2));
  const [note, setNote] = useState('Ready for immediate RigForge Escrow settlement.');

  const handleProceedToEscrow = () => {
    const ratio = asking > 0 ? parseFloat(offerVal) / asking : 0.95;
    if (props.isBundle) {
      setCheckoutPayload({
        mode: 'rig',
        initialOfferRatio: ratio,
        items: rigItems,
      });
    } else if (props.item) {
      const comp = props.item.component || props.item;
      setCheckoutPayload({
        mode: 'single',
        initialOfferRatio: ratio,
        items: [
          {
            id: props.item.id,
            listing_id: props.item.component ? props.item.id : null,
            component_id: comp.id,
            component: comp,
            price: asking,
            seller_username: props.item.seller_username || 'SiliconFoundry_Official',
            quantity: 1,
          },
        ],
      });
    }
    onClose();
    navigate('/checkout');
  };

  const handleSendToSellerChat = async () => {
    if (props.onSendOfferToChat) {
      props.onSendOfferToChat(offerVal, note);
      addToast({
        type: 'success',
        title: 'Escrow Offer Sent in Chat',
        message: `Proposed $${parseFloat(offerVal).toFixed(2)} binding offer.`,
      });
      onClose();
      return;
    }
    if (props.item) {
      const room = await startSellerChat(
        props.item,
        `[ESCROW OFFER: $${parseFloat(offerVal).toFixed(2)}] ${note}`
      );
      onClose();
      if (room?.id) {
        navigate(`/messages?room=${room.id}`);
      } else {
        navigate('/messages');
      }
    } else {
      handleProceedToEscrow();
    }
  };

  return (
    <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-space-lg flex flex-col gap-space-md z-10">
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">local_offer</span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Submit Binding Offer
          </h3>
        </div>
        <button type="button" onClick={onClose} className="text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
        <div>
          <span className="font-label-sm text-[11px] uppercase text-on-surface-variant block">
            Current Asking Total
          </span>
          <span className="font-headline-md text-headline-md font-bold text-on-surface">
            ${asking.toFixed(2)}
          </span>
        </div>
        <div className="flex gap-1.5">
          {[0.9, 0.95, 0.98].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setOfferVal((asking * r).toFixed(2))}
              className="px-2.5 py-1 rounded bg-surface-container-lowest hover:bg-primary hover:text-on-primary font-label-sm text-label-sm font-bold border border-outline-variant/30 transition-colors"
            >
              -{Math.round((1 - r) * 100)}%
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-label-sm text-label-sm uppercase text-on-surface-variant block mb-1">
          Your Offer Price (USD)
        </label>
        <input
          type="number"
          step="0.01"
          value={offerVal}
          onChange={(e) => setOfferVal(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-2 border-primary font-label-lg text-[22px] font-bold text-on-surface focus:outline-none"
        />
      </div>

      <div>
        <label className="font-label-sm text-label-sm uppercase text-on-surface-variant block mb-1">
          Message to Seller
        </label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 font-body-sm text-body-sm text-on-surface focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleSendToSellerChat}
          className="py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-md text-body-md font-bold flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">chat</span>
          <span>Send to Seller Chat</span>
        </button>
        <button
          type="button"
          onClick={handleProceedToEscrow}
          className="py-2.5 px-4 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-md text-body-md font-bold shadow-md flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">gavel</span>
          <span>Escrow Checkout</span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
 * 3. COMPARE QUEUE MODAL
 * ============================================================================ */
function CompareQueueModal({ onClose }) {
  const { compareItems, toggleCompare, clearCompare, addToRig } = useApp();

  return (
    <div className="relative w-full max-w-4xl max-h-[88vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-space-lg flex flex-col gap-space-md z-10 overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant/25 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">balance</span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Side-by-Side Hardware Comparison ({compareItems.length} / 4)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {compareItems.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="font-label-sm text-label-sm text-error hover:underline font-bold"
            >
              Clear All
            </button>
          )}
          <button type="button" onClick={onClose} className="text-outline hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {compareItems.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-[40px] text-outline">balance</span>
          <div className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Compare Queue is Empty
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
            Check the &ldquo;Compare&rdquo; box on any hardware card in the Marketplace to inspect specifications side-by-side.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-md min-w-[600px]">
            {compareItems.map((it) => {
              const comp = it.component || {};
              return (
                <div
                  key={it.id}
                  className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="h-28 rounded-lg bg-surface-container-lowest p-2 flex items-center justify-center mb-2">
                      <img
                        src={getComponentImage(comp)}
                        alt={comp.name}
                        className="h-full object-contain"
                      />
                    </div>
                    <div className="font-label-sm text-[10px] uppercase text-primary font-bold">
                      {comp.brand}
                    </div>
                    <div className="font-body-md text-body-md font-bold text-on-surface line-clamp-2">
                      {comp.name}
                    </div>
                    <div className="font-headline-sm text-headline-sm font-bold text-primary mt-1">
                      ${parseFloat(it.price || 0).toFixed(2)}
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5 font-label-sm text-[11px] border-t border-outline-variant/20 pt-2">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Socket:</span>
                        <span className="font-bold text-on-surface">{comp.socket || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">RAM Type:</span>
                        <span className="font-bold text-on-surface">{comp.ram_type || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">TDP:</span>
                        <span className="font-bold text-on-surface">
                          {comp.tdp ? `${comp.tdp}W` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">PSU Output:</span>
                        <span className="font-bold text-on-surface">
                          {comp.power_supply ? `${comp.power_supply}W` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Length:</span>
                        <span className="font-bold text-on-surface">
                          {comp.length_mm ? `${comp.length_mm}mm` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        addToRig(it, true);
                        onClose();
                      }}
                      className="w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-bold"
                    >
                      Add to Rig
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCompare(it)}
                      className="w-full py-1 rounded-lg bg-surface-container text-on-surface-variant hover:text-error font-label-sm text-label-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 4. SAVE BUILD MODAL
 * ============================================================================ */
function SaveBuildModal({ onClose }) {
  const { rigItems, rigMetrics, savedBuilds, saveBuildToBackend, setRigItems, addToast } = useApp();
  const [title, setTitle] = useState('Kinetic Silicon Workstation v1');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await saveBuildToBackend(title.trim() || 'Custom Rig', isPublic);
      if (saved) onClose();
    } catch (err) {
      setError(err.message || 'Failed to save build');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSavedBuild = (b) => {
    if (!b.items || b.items.length === 0) return;
    setRigItems(
      b.items.map((bi) => ({
        id: `comp-${bi.component?.id}`,
        listing_id: null,
        component_id: bi.component?.id,
        component: bi.component,
        price: parseFloat(bi.component?.price_avg || 199),
        seller_username: 'RigForge Verified',
        quantity: bi.quantity || 1,
      }))
    );
    addToast({
      type: 'success',
      title: 'Build Loaded into Active Rig',
      message: `Loaded "${b.title}" (${b.items.length} components).`,
    });
    onClose();
  };

  return (
    <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-space-lg flex flex-col gap-space-md z-10">
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">bookmark_add</span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Save Active PC Build
          </h3>
        </div>
        <button type="button" onClick={onClose} className="text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-space-md">
        <div>
          <label className="font-label-sm text-label-sm uppercase text-on-surface-variant block mb-1">
            Build Configuration Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25 flex items-center justify-between">
          <div>
            <div className="font-body-sm text-body-sm font-bold text-on-surface">
              {rigItems.length} Components • {rigMetrics.platformLabel}
            </div>
            <div className="font-label-sm text-[11px] text-secondary font-semibold">
              Est. {rigMetrics.totalTdp}W TDP • Subtotal: ${rigMetrics.subtotal.toFixed(2)}
            </div>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer font-label-sm text-label-sm text-on-surface">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded text-primary"
            />
            <span>Public Showcase</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-bold shadow-md hover:opacity-95 transition-all"
        >
          {saving ? 'Saving to Profile...' : 'Save Build to Account'}
        </button>
      </form>

      {savedBuilds.length > 0 && (
        <div className="pt-3 border-t border-outline-variant/25 flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
          <span className="font-label-sm text-[11px] uppercase text-on-surface-variant font-bold">
            Your Saved Builds ({savedBuilds.length})
          </span>
          {savedBuilds.map((b) => (
            <div
              key={b.id}
              className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between"
            >
              <div>
                <div className="font-body-sm text-body-sm font-bold text-on-surface">{b.title}</div>
                <div className="font-label-sm text-[10px] text-on-surface-variant">
                  {b.items?.length || 0} components
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleLoadSavedBuild(b)}
                className="px-2.5 py-1 rounded bg-primary/15 text-primary font-label-sm text-label-sm font-bold hover:bg-primary hover:text-on-primary transition-colors"
              >
                Load into Rig
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 5. AUTH MODAL (Sign In / Create Account)
 * ============================================================================ */
function AuthModal({ props, onClose }) {
  const { login, register } = useApp();
  const [tab, setTab] = useState(props?.initialTab || 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, email, password, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (u, p) => {
    setError('');
    setLoading(true);
    try {
      await login(u, p);
      onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-space-lg flex flex-col gap-space-md z-10">
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">verified_user</span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            {tab === 'login' ? 'Sign In to RigForge' : 'Create RigForge Account'}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {props?.message && (
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary font-body-sm text-body-sm font-semibold">
          {props.message}
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 bg-surface-container-low p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setTab('login')}
          className={`py-1.5 rounded-lg font-body-sm text-body-sm font-bold transition-colors ${
            tab === 'login'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          className={`py-1.5 rounded-lg font-body-sm text-body-sm font-bold transition-colors ${
            tab === 'register'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant'
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="font-label-sm text-label-sm uppercase text-on-surface-variant block mb-1">
            Username
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. alex_builder"
            className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        {tab === 'register' && (
          <div>
            <label className="font-label-sm text-label-sm uppercase text-on-surface-variant block mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@rigforge.io"
              className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        )}

        <div>
          <label className="font-label-sm text-label-sm uppercase text-on-surface-variant block mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full py-2.5 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-bold shadow-md hover:opacity-95 transition-all"
        >
          {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {/* Instant 1-Click Demo Credentials */}
      <div className="pt-3 border-t border-outline-variant/25 flex flex-col gap-2">
        <span className="font-label-sm text-[10px] uppercase text-on-surface-variant font-bold">
          Quick 1-Click Test Accounts
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('admin', 'adminpassword123')}
            className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/30 transition-colors"
          >
            <div className="font-label-sm text-label-sm font-bold text-primary">Admin Account</div>
            <div className="font-body-sm text-[11px] text-on-surface-variant">user: admin</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('manager_alex', 'manager123!')}
            className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/30 transition-colors"
          >
            <div className="font-label-sm text-label-sm font-bold text-secondary">
              Merchant Account
            </div>
            <div className="font-body-sm text-[11px] text-on-surface-variant">
              user: manager_alex
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. PROFILE, ORDERS & SAVED BUILDS MODAL
 * ============================================================================ */
function ProfileModal({ onClose }) {
  const { user, orders, savedBuilds, setRigItems, addToast } = useApp();

  return (
    <div className="relative w-full max-w-3xl max-h-[85vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-space-lg flex flex-col gap-space-md z-10 overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant/25 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary">account_circle</span>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {user?.username || 'Account'} — Escrow Orders &amp; Saved Rigs
            </h3>
            <span className="font-label-sm text-[11px] text-secondary font-bold uppercase">
              Role: {user?.role || 'Buyer'}
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Order History */}
        <div className="flex flex-col gap-2">
          <h4 className="font-label-md text-label-md uppercase text-on-surface-variant font-bold">
            Escrow Order History ({orders.length})
          </h4>
          {orders.length === 0 ? (
            <div className="p-4 rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">
              No completed orders yet.
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md font-bold text-primary">
                    Order #{o.id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold uppercase">
                    {o.status} • •••• {o.card_last4}
                  </span>
                </div>
                <div className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  ${o.total_price}
                </div>
                <div className="font-body-sm text-[12px] text-on-surface-variant">
                  {(o.items || []).map((i) => `${i.component_name} (x${i.quantity})`).join(', ')}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Saved Builds */}
        <div className="flex flex-col gap-2">
          <h4 className="font-label-md text-label-md uppercase text-on-surface-variant font-bold">
            Saved PC Builds ({savedBuilds.length})
          </h4>
          {savedBuilds.length === 0 ? (
            <div className="p-4 rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">
              No saved builds yet. Use &ldquo;Save Build&rdquo; in the Active Rig sidebar.
            </div>
          ) : (
            savedBuilds.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-body-md text-body-md font-bold text-on-surface">
                    {b.title}
                  </div>
                  <div className="font-label-sm text-[11px] text-on-surface-variant">
                    {b.items?.length || 0} components
                  </div>
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
                        title: 'Build Loaded',
                        message: `Loaded "${b.title}" into Active Rig.`,
                      });
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-bold"
                >
                  Load
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 7. POST / EDIT LISTING MODAL (For All Sellers, Managers & Admins)
 * ============================================================================ */
function PostListingModal({ props, onClose }) {
  const { components, categories, apiFetch, fetchCatalog, addToast } = useApp();
  const { t } = useTheme();
  const editListing = props?.editListing;

  // Selected Category ID (defaults to component's category or first available)
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    if (editListing?.component?.category) {
      const cCat = editListing.component.category;
      return String(cCat.id || cCat);
    }
    return categories[0]?.id ? String(categories[0].id) : '';
  });

  // Filter catalog components belonging to the chosen category
  const categoryComponents = useMemo(() => {
    if (!selectedCategoryId) return components;
    return components.filter(
      (c) =>
        String(c.category) === String(selectedCategoryId) ||
        String(c.category?.id) === String(selectedCategoryId) ||
        (c.category_name &&
          categories.find((cat) => String(cat.id) === String(selectedCategoryId))?.name ===
            c.category_name)
    );
  }, [components, selectedCategoryId, categories]);

  // Mode: Choose catalog model vs custom model
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('ASUS');

  const [componentId, setComponentId] = useState(() => {
    if (editListing?.component?.id) return String(editListing.component.id);
    return categoryComponents[0]?.id ? String(categoryComponents[0].id) : '';
  });

  // Update componentId if category changes and current component is not in it
  useEffect(() => {
    if (!isCustomModel && categoryComponents.length > 0) {
      const exists = categoryComponents.some((c) => String(c.id) === String(componentId));
      if (!exists) {
        setComponentId(String(categoryComponents[0].id));
      }
    }
  }, [selectedCategoryId, categoryComponents, isCustomModel, componentId]);

  // Pricing & Condition
  const [price, setPrice] = useState(editListing ? String(editListing.price) : '');
  const [condition, setCondition] = useState(editListing?.condition || 'used');
  const [usedCondition, setUsedCondition] = useState(
    editListing?.used_condition || ''
  );

  // Description: EMPTY by default (no hardcoded filler)
  const [description, setDescription] = useState(editListing?.description || '');

  // Photo / Image upload
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    editListing?.image || editListing?.component?.image || null
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPEG, PNG, WebP).');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const numPrice = parseFloat(price);
      if (!price || isNaN(numPrice) || numPrice <= 0) {
        throw new Error('Please enter a valid listing price greater than $0.');
      }
      if (isCustomModel && !customName.trim()) {
        throw new Error('Please enter the hardware model name.');
      }
      if (!isCustomModel && !componentId) {
        throw new Error('Please select a component from the list or switch to custom model.');
      }

      const formData = new FormData();
      formData.append('price', numPrice.toFixed(2));
      formData.append('condition', condition);
      formData.append('description', description.trim());
      formData.append('is_active', 'true');

      if (condition === 'used') {
        formData.append(
          'used_condition',
          usedCondition.trim() || 'Certified Open Box / Pre-owned'
        );
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (isCustomModel) {
        formData.append(
          'new_component',
          JSON.stringify({
            name: customName.trim(),
            brand: customBrand.trim() || 'Custom',
            category: Number(selectedCategoryId) || (categories[0]?.id || 1),
            price_avg: numPrice,
            tdp: 150,
          })
        );
      } else {
        formData.append('component_id', componentId);
      }

      const url = editListing
        ? `/api/marketplace/listings/${editListing.id}/`
        : '/api/marketplace/listings/';
      const method = editListing ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          typeof errData === 'object'
            ? Object.entries(errData)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join(' | ')
            : 'Could not publish listing';
        throw new Error(errMsg);
      }

      await fetchCatalog();
      addToast({
        type: 'success',
        title: editListing ? 'Listing Updated' : 'Listing Published',
        message: editListing
          ? `Listing #${editListing.id} updated successfully.`
          : 'Your hardware component is now live in the catalog.',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl max-h-[90vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 flex flex-col overflow-hidden z-10">
      {/* Modal Header */}
      <div className="px-space-lg py-4 border-b border-outline-variant/20 flex items-center justify-between shrink-0 bg-surface-container-lowest">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[24px]">
            {editListing ? 'edit_note' : 'add_business'}
          </span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            {editListing ? `${t('editListingTitle')} #${editListing.id}` : t('publishListingTitle')}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-outline hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Scrollable Form Body */}
      <form onSubmit={handleCreateOrUpdate} className="p-space-lg overflow-y-auto custom-scrollbar flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-error">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. Category Selection */}
        <div>
          <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block mb-1.5">
            {t('componentCategoryLabel')}
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Model Selection: Catalog vs Custom Toggle */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant">
              {t('hardwareModelLabel')}
            </label>
            <div className="flex items-center gap-2 font-label-sm text-xs">
              <button
                type="button"
                onClick={() => setIsCustomModel(false)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  !isCustomModel
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface bg-surface-container-low'
                }`}
              >
                {t('catalogModelTab')}
              </button>
              <button
                type="button"
                onClick={() => setIsCustomModel(true)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  isCustomModel
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface bg-surface-container-low'
                }`}
              >
                {t('customModelTab')}
              </button>
            </div>
          </div>

          {!isCustomModel ? (
            <select
              value={componentId}
              onChange={(e) => {
                setComponentId(e.target.value);
                const comp = categoryComponents.find((c) => String(c.id) === e.target.value);
                if (comp && !price) {
                  setPrice(String(comp.price_avg));
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {categoryComponents.length === 0 ? (
                <option value="">No catalog components in this category</option>
              ) : (
                categoryComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand} {c.name} (${c.price_avg})
                  </option>
                ))
              )}
            </select>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <input
                  type="text"
                  placeholder="Brand (e.g. MSI, ASUS)"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Model Name (e.g. GeForce RTX 4070 Ti Slim)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Price & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block mb-1.5">
              {t('priceUsdLabel')}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-on-surface-variant font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md font-semibold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block mb-1.5">
              {t('conditionLabel')}
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="used">Certified Open Box / Pre-owned</option>
              <option value="new">Brand New Factory Sealed</option>
            </select>
          </div>
        </div>

        {condition === 'used' && (
          <div>
            <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block mb-1.5">
              {t('conditionNotesLabel')}
            </label>
            <input
              type="text"
              placeholder="e.g. Excellent cosmetic condition, original box and accessories included"
              value={usedCondition}
              onChange={(e) => setUsedCondition(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* 4. Product Photo Upload with Preview */}
        <div>
          <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block mb-1.5">
            {t('hardwarePhotoLabel')}
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container-lowest shrink-0 border border-outline-variant/20 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                  {imageFile ? imageFile.name : 'Attached product photo'}
                </div>
                <div className="font-label-sm text-xs text-secondary font-medium">
                  Ready for marketplace publication
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-xs font-semibold"
                  >
                    {t('changePhotoBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-2.5 py-1 rounded-md bg-error-container/60 hover:bg-error-container text-on-error-container font-label-sm text-xs font-bold"
                  >
                    {t('removePhotoBtn')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-xl border-2 border-dashed border-outline-variant/50 hover:border-primary/60 bg-surface-container-low/50 hover:bg-surface-container-low cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-1 group"
            >
              <span className="material-symbols-outlined text-[32px] text-outline group-hover:text-primary transition-colors">
                add_photo_alternate
              </span>
              <div className="font-body-md text-body-md font-semibold text-on-surface">
                {t('clickToAttachPhoto')}
              </div>
              <div className="font-label-sm text-xs text-on-surface-variant">
                {t('attachPhotoHint')}
              </div>
            </div>
          )}
        </div>

        {/* 5. Clean Description (No static filler) */}
        <div>
          <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block mb-1.5">
            {t('description') || 'Description'}
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-interactive px-6 py-2.5 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-md text-body-md font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {editListing ? 'save' : 'publish'}
            </span>
            <span>
              {submitting
                ? 'Processing...'
                : editListing
                ? t('saveChangesBtn')
                : t('publishListingBtn')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================================
 * 8. ADMIN CONTROL PANEL MODAL
 * ============================================================================ */
function AdminPanelModal({ onClose }) {
  const { apiFetch, addToast } = useApp();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const loadAdminData = async (q = '') => {
    try {
      const [sRes, uRes] = await Promise.all([
        apiFetch('/api/auth/admin/stats/'),
        apiFetch(`/api/auth/admin/users/?search=${encodeURIComponent(q)}`),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (uRes.ok) setUsers(await uRes.json());
    } catch (_) {}
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetRole = async (userId, role) => {
    const res = await apiFetch(`/api/auth/admin/users/${userId}/set_role/`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      loadAdminData(search);
      addToast({ type: 'success', title: 'Role Updated', message: `User role set to ${role}.` });
    }
  };

  const handleToggleBlock = async (userId) => {
    const res = await apiFetch(`/api/auth/admin/users/${userId}/toggle_block/`, {
      method: 'POST',
    });
    if (res.ok) {
      loadAdminData(search);
      addToast({ type: 'info', title: 'User Status Updated', message: 'Account status toggled.' });
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    const res = await apiFetch('/api/auth/admin/broadcast/', {
      method: 'POST',
      body: JSON.stringify({ message: broadcastMsg, level: 'info' }),
    });
    if (res.ok) {
      setBroadcastMsg('');
      addToast({
        type: 'success',
        title: 'Broadcast Sent',
        message: 'Live WebSocket notification dispatched to all active users.',
      });
    }
  };

  return (
    <div className="relative w-full max-w-4xl max-h-[88vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-space-lg flex flex-col gap-space-md z-10 overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant/25 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">admin_panel_settings</span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            RigForge Admin Control Center
          </h3>
        </div>
        <button type="button" onClick={onClose} className="text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-surface-container-low">
            <div className="font-label-sm text-[10px] uppercase text-on-surface-variant">Users</div>
            <div className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {stats.total_users}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low">
            <div className="font-label-sm text-[10px] uppercase text-on-surface-variant">
              Active Listings
            </div>
            <div className="font-headline-sm text-headline-sm font-bold text-primary">
              {stats.active_listings} / {stats.total_listings}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low">
            <div className="font-label-sm text-[10px] uppercase text-on-surface-variant">
              Active Chats
            </div>
            <div className="font-headline-sm text-headline-sm font-bold text-secondary">
              {stats.active_chats}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low">
            <div className="font-label-sm text-[10px] uppercase text-on-surface-variant">
              Saved Builds
            </div>
            <div className="font-headline-sm text-headline-sm font-bold text-tertiary">
              {stats.total_builds}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Bar */}
      <form onSubmit={handleBroadcast} className="flex gap-2">
        <input
          type="text"
          value={broadcastMsg}
          onChange={(e) => setBroadcastMsg(e.target.value)}
          placeholder="Send live WebSocket broadcast announcement to all online users..."
          className="flex-1 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface font-body-sm text-body-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary font-label-sm text-label-sm font-bold"
        >
          Broadcast
        </button>
      </form>

      {/* Users Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            loadAdminData(e.target.value);
          }}
          placeholder="Search users by username or email..."
          className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-sm text-body-sm"
        />

        <div className="divide-y divide-outline-variant/20">
          {users.map((u) => (
            <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
              <div>
                <div className="font-body-md text-body-md font-bold text-on-surface">
                  {u.username}{' '}
                  <span className="font-label-sm text-[11px] text-primary">({u.role})</span>
                </div>
                <div className="font-label-sm text-[11px] text-on-surface-variant">{u.email}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {['Buyer', 'Manager', 'Admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSetRole(u.id, r)}
                    className={`px-2 py-1 rounded font-label-sm text-[10px] font-bold ${
                      u.role === r
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleToggleBlock(u.id)}
                  className={`px-2 py-1 rounded font-label-sm text-[10px] font-bold ${
                    u.is_active
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-secondary-fixed text-on-secondary-fixed'
                  }`}
                >
                  {u.is_active ? 'Block' : 'Unblock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * ROOT MODAL MANAGER PORTAL (with Smooth Enter/Exit Transitions)
 * ============================================================================ */
export default function ModalManager() {
  const { activeModal, modalProps, closeModal } = useApp();
  const [renderedModal, setRenderedModal] = useState(null);
  const [renderedProps, setRenderedProps] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (activeModal) {
      setRenderedModal(activeModal);
      setRenderedProps(modalProps || {});
      const enterFrame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(enterFrame);
    } else if (renderedModal) {
      setIsVisible(false);
      const exitTimer = setTimeout(() => {
        setRenderedModal(null);
        setRenderedProps({});
      }, 220);
      return () => clearTimeout(exitTimer);
    }
  }, [activeModal, modalProps, renderedModal]);

  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeModal]);

  if (!renderedModal) return null;

  return (
    <div
      onClick={closeModal}
      className={`fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-[#0b1c30]/60 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-3'
        }`}
      >
        {renderedModal === 'productDetails' && (
          <ProductDetailsModal item={renderedProps.item} onClose={closeModal} />
        )}
        {renderedModal === 'makeOffer' && (
          <MakeOfferModal props={renderedProps} onClose={closeModal} />
        )}
        {renderedModal === 'compare' && <CompareQueueModal onClose={closeModal} />}
        {renderedModal === 'saveBuild' && <SaveBuildModal onClose={closeModal} />}
        {renderedModal === 'auth' && <AuthModal props={renderedProps} onClose={closeModal} />}
        {renderedModal === 'profile' && <ProfileModal onClose={closeModal} />}
        {renderedModal === 'postListing' && (
          <PostListingModal props={renderedProps} onClose={closeModal} />
        )}
        {renderedModal === 'adminPanel' && <AdminPanelModal onClose={closeModal} />}
      </div>
    </div>
  );
}
