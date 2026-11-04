import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  getCardBadgesAndSpecs,
  getComponentImage,
  getDetailedThermalMatrix,
  STITCH_IMAGES,
} from '../data/hardwareMedia';

export default function ProductDetailsModal({ item, onClose }) {
  const {
    addToRig,
    rigMetrics,
    setCheckoutPayload,
    openModal,
    startSellerChat,
    addToast,
  } = useApp();

  const navigate = useNavigate();
  const [activeThumb, setActiveThumb] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  if (!item) return null;

  const comp = item.component || item;
  const price = parseFloat(item.price ?? comp.price_avg ?? 0);
  const meta = getCardBadgesAndSpecs(item);
  const thermal = getDetailedThermalMatrix(item);
  const mainImage = item.image || item.component?.image || getComponentImage(comp);

  const thumbnails = [
    { label: 'Front Shroud', img: mainImage },
    { label: 'Backplate & PCB', img: STITCH_IMAGES.maximusZ790 },
    { label: 'Chassis Fit', img: STITCH_IMAGES.lianLiO11 },
    { label: 'Power & I/O', img: STITCH_IMAGES.seasonicPsu },
  ];

  const handleAddToRig = () => {
    addToRig(item, true);
    setAddedFeedback(true);
    addToast({
      type: 'success',
      title: 'Added to Active Rig',
      message: `${comp.brand} ${comp.name} added to RigForge Cart.`,
    });
    setTimeout(() => {
      setAddedFeedback(false);
      onClose();
    }, 650);
  };

  const handleBuyNow = () => {
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
    onClose();
    navigate('/checkout');
  };

  const handleMakeOffer = () => {
    openModal('makeOffer', {
      item,
      askingPrice: price,
    });
  };

  const handleChatWithSeller = async () => {
    const room = await startSellerChat(
      item,
      `Hi! I'm interested in your ${comp.brand} ${comp.name} listed at $${price.toFixed(2)}.`
    );
    onClose();
    if (room?.id) {
      navigate(`/messages?room=${room.id}`);
    } else {
      navigate('/messages');
    }
  };

  return (
    <div className="relative w-full max-w-[1140px] max-h-[90vh] bg-surface-container-lowest rounded-2xl shadow-[0_24px_64px_rgba(11,28,48,0.28)] border border-outline-variant/40 flex flex-col overflow-hidden z-10">
      {/* Top Modal Sticky Header Bar */}
      <div className="px-space-lg py-3.5 bg-surface-container-lowest border-b border-outline-variant/25 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-space-sm flex-wrap">
          <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">
            {meta.categoryLabel}
          </span>
          <span className="text-outline-variant">•</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            SKU: {thermal.sku}
          </span>
          <span className="hidden sm:inline text-outline-variant">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-semibold">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            RigForge Lab Benchmarked
          </span>
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={onClose}
            className="ml-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-error-container hover:text-on-error-container text-on-surface-variant transition-colors flex items-center gap-1 font-label-sm text-label-sm font-bold"
          >
            <span>ESC</span>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Modal Scrollable Body Content */}
      <div className="p-space-lg overflow-y-auto custom-scrollbar flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT COLUMN (5 Cols): Gallery + Seller Identity + Assurance */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            {/* Primary Image Container */}
            <div
              onClick={() => setZoomed((z) => !z)}
              className="relative rounded-xl bg-surface-container-low border border-outline-variant/30 p-space-lg h-[300px] flex items-center justify-center overflow-hidden group cursor-zoom-in"
            >
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  {item.condition === 'used' ? 'Certified Open Box' : 'Factory Sealed — Mint'}
                </span>
              </div>

              <div className="absolute top-3 right-3 z-10">
                <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold border border-outline-variant/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    zoom_in
                  </span>
                  {zoomed ? '1.0x Reset' : 'Click to Zoom'}
                </span>
              </div>

              <img
                alt={comp.name}
                src={thumbnails[activeThumb]?.img || mainImage}
                className={`w-full h-full object-contain transition-transform duration-500 ${
                  zoomed ? 'scale-125' : 'group-hover:scale-105'
                }`}
              />

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-container-lowest/85 backdrop-blur-md border border-outline-variant/25">
                <span className="font-label-sm text-[11px] text-on-surface-variant">
                  3D Clearance Model Available
                </span>
                <span className="font-label-sm text-[11px] text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
                  RigSync v4.2 Certified
                </span>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-4 gap-space-sm">
              {thumbnails.map((thumb, idx) => (
                <button
                  key={thumb.label}
                  type="button"
                  onClick={() => setActiveThumb(idx)}
                  className={`p-2 rounded-lg bg-surface-container-low h-16 flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                    activeThumb === idx
                      ? 'border-2 border-primary'
                      : 'border border-outline-variant/40 hover:border-primary/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    alt={thumb.label}
                    className="w-full h-8 object-contain"
                    src={thumb.img}
                  />
                  <span
                    className={`font-label-sm text-[9px] mt-0.5 ${
                      activeThumb === idx ? 'text-primary font-bold' : 'text-on-surface-variant'
                    }`}
                  >
                    {thumb.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Certified Seller Identity Card */}
            <div className="p-space-md rounded-xl bg-surface-container-low/70 border border-outline-variant/35 flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Verified Merchant
                </span>
                <span className="px-2 py-0.5 rounded bg-secondary-fixed/60 text-on-secondary-fixed font-label-sm text-[10px] font-bold">
                  Tier-1 Silicon Partner
                </span>
              </div>
              <div className="flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-primary text-on-primary font-headline-sm font-bold flex items-center justify-center shadow-sm">
                    {(item.seller_username || 'SF').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-body-md text-body-md font-bold text-on-surface flex items-center gap-1">
                      <span>{item.seller_username || 'SiliconFoundry_Official'}</span>
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        verified
                      </span>
                    </div>
                    <div className="font-label-sm text-[11px] text-on-surface-variant">
                      4.98 ★ (342 Feedbacks) • Ships &lt; 4 hrs
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openModal('aiVisualizer')}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container border border-primary/40 font-body-sm text-body-sm font-semibold text-primary flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Visualize in 3D Rig Studio"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span>3D Render</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleChatWithSeller}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/50 font-body-sm text-body-sm font-semibold text-on-surface flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">chat</span>
                    <span>Chat with Seller</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dual Buyer Assurance */}
            <div className="grid grid-cols-2 gap-space-sm">
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  shield_lock
                </span>
                <div>
                  <div className="font-label-sm text-[11px] font-bold text-on-surface">
                    RigForge 48h Escrow
                  </div>
                  <div className="font-body-sm text-[11px] text-on-surface-variant">
                    Stress-test before payout
                  </div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  workspace_premium
                </span>
                <div>
                  <div className="font-label-sm text-[11px] font-bold text-on-surface">
                    3-Yr Factory Warranty
                  </div>
                  <div className="font-body-sm text-[11px] text-on-surface-variant">
                     Full serial transfer
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (7 Cols): Specs, Thermal Telemetry, Architecture Matrix */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            {/* Title, Rating & Pricing Header */}
            <div className="pb-space-md border-b border-outline-variant/25">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-label-sm text-label-sm font-bold uppercase text-primary tracking-wider">
                  {comp.brand} Flagship Edition
                </span>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center text-tertiary-container">
                  <span
                    className="material-symbols-outlined text-[15px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span className="font-label-md text-label-md font-bold text-on-surface ml-0.5">
                    {meta.rating}
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  ({meta.reviewsCount} verified builders)
                </span>
              </div>

              <h1 className="font-headline-md sm:text-[26px] font-extrabold text-on-surface leading-tight">
                {comp.brand} {comp.name}
              </h1>

              {item.description && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5">
                  {item.description}
                </p>
              )}

              <div className="mt-space-sm flex flex-wrap items-baseline justify-between gap-space-md bg-surface-container-low/60 p-space-md rounded-xl border border-outline-variant/25">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-label-lg text-[30px] font-extrabold text-on-surface tracking-tight">
                    ${price.toFixed(2)}
                  </span>
                  {meta.oldPrice && (
                    <span className="font-label-md text-body-lg text-on-surface-variant line-through">
                      ${meta.oldPrice} MSRP
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-error text-on-error font-label-sm text-label-sm font-bold">
                    VERIFIED DEAL
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="font-label-md text-label-md font-bold text-secondary">
                    {meta.stockCount} Units Ready in Hub
                  </span>
                </div>
              </div>
            </div>

            {/* RigSync Active Build Fitment Banner */}
            <div className="p-space-md rounded-xl bg-secondary-fixed/25 border border-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div className="flex items-start sm:items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-body-sm text-body-sm font-bold text-on-surface">
                      Compatible with your Active Build
                    </span>
                    <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-container-lowest text-secondary font-bold">
                      RigSync v4.2
                    </span>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                    Fits <span className="font-semibold text-on-surface">{rigMetrics.platformLabel}</span> • Est. System Load ({rigMetrics.totalTdp}W) well within {rigMetrics.psuWattage}W PSU capacity.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Specifications & Thermal Telemetry Grid (4-Card Matrix) */}
            <div>
              <div className="flex items-center justify-between mb-space-sm">
                <h2 className="font-headline-sm text-[16px] font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[19px]">
                    developer_board
                  </span>
                  <span>Hardware &amp; Thermal Architecture</span>
                </h2>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Telemetry Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                {/* Spec Group 1: Power & Electrical */}
                <div className="p-space-md rounded-xl bg-surface-container-low/80 border border-outline-variant/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase text-primary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      Power &amp; TDP
                    </span>
                    <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant">
                      ATX 3.0 PCIe 5.0
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        TDP / TGP
                      </span>
                      <span className="font-label-lg text-body-md font-bold text-on-surface">
                        {thermal.power.tdp}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Recommended PSU
                      </span>
                      <span className="font-label-lg text-body-md font-bold text-on-surface">
                        {thermal.power.recommendedPsu}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Power Input
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {thermal.power.powerInput}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Transient Spike
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-secondary">
                        {thermal.power.transientSpike}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spec Group 2: Thermal & Acoustic Profile */}
                <div className="p-space-md rounded-xl bg-surface-container-low/80 border border-outline-variant/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase text-secondary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">thermostat</span>
                      Thermals &amp; Acoustics
                    </span>
                    <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-secondary-fixed/50 text-on-secondary-fixed">
                      Dual BIOS
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Cooling Design
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {thermal.thermals.coolingDesign}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Max Operating Temp
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {thermal.thermals.maxOperatingTemp}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Acoustics (Load)
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {thermal.thermals.acousticsLoad}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        0dB Fan Stop
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-secondary">
                        {thermal.thermals.zeroRpmStop}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spec Group 3: Physical Dimensions & Clearance */}
                <div className="p-space-md rounded-xl bg-surface-container-low/80 border border-outline-variant/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase text-primary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">straighten</span>
                      Clearance &amp; Form Factor
                    </span>
                    <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant">
                      CNC Frame
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Length / Depth
                      </span>
                      <span className="font-label-lg text-body-md font-bold text-on-surface">
                        {thermal.dimensions.lengthDepth}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Height / Width
                      </span>
                      <span className="font-label-lg text-body-md font-bold text-on-surface">
                        {thermal.dimensions.heightWidth}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Form / Slot Width
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {thermal.dimensions.slotWidth}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Active Case Fit
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-secondary">
                        {thermal.dimensions.fitmentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spec Group 4: Silicon & Clock Speeds */}
                <div className="p-space-md rounded-xl bg-surface-container-low/80 border border-outline-variant/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase text-tertiary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">memory</span>
                      Silicon Architecture
                    </span>
                    <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed">
                      Enthusiast Tier
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Process Node
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {thermal.silicon.processNode}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Core / Socket Config
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {thermal.silicon.coreConfig}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Clock Profile
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {thermal.silicon.clockProfile}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block">
                        Memory / Bus
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {thermal.silicon.memoryBus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Connectivity & Interface Row */}
            <div className="p-space-sm px-space-md rounded-lg bg-surface-container/60 border border-outline-variant/25 flex flex-wrap items-center justify-between gap-2">
              {thermal.ports.map((port, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                    settings_input_hdmi
                  </span>
                  <span className="font-body-sm text-[12px] text-on-surface font-semibold">
                    {port.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Modal Action Bar */}
      <div className="px-space-lg py-space-md bg-surface-container-lowest border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-space-md shrink-0">
        <div className="flex items-center gap-space-md w-full sm:w-auto justify-between sm:justify-start">
          <div>
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant block">
              Selected Component
            </span>
            <span className="font-body-md text-body-md font-bold text-on-surface">
              {comp.brand} {comp.name} —{' '}
              <span className="text-primary font-mono">${price.toFixed(2)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-sm w-full sm:w-auto justify-end">
          {/* Action 1: Add to Rig */}
          <button
            type="button"
            onClick={handleAddToRig}
            className="flex-1 sm:flex-initial px-space-md py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-on-surface font-body-md text-body-md font-bold flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[19px] text-primary">build</span>
            <span>{addedFeedback ? 'Added to Rig!' : 'Add to Rig'}</span>
          </button>

          {/* Action 2: Make Offer */}
          <button
            type="button"
            onClick={handleMakeOffer}
            className="flex-1 sm:flex-initial px-space-md py-2.5 rounded-xl bg-secondary-fixed/60 hover:bg-secondary-fixed border border-secondary/30 text-on-secondary-fixed font-body-md text-body-md font-bold flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[19px] text-secondary">gavel</span>
            <span>Make an Offer</span>
          </button>

          {/* Action 3: Buy Now */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="w-full sm:w-auto px-space-lg py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container hover:opacity-95 text-on-primary font-body-md text-body-md font-bold shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[19px]">shopping_cart_checkout</span>
            <span>Buy Now — ${price.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
