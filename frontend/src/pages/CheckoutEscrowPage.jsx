import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getCardBadgesAndSpecs, getComponentImage } from '../data/hardwareMedia';

export default function CheckoutEscrowPage() {
  const {
    user,
    access,
    apiFetch,
    checkoutPayload,
    rigItems,
    rigMetrics,
    clearRig,
    fetchUserResources,
    openModal,
    addToast,
    startSellerChat,
  } = useApp();

  const navigate = useNavigate();

  // Determine items to checkout (from Buy Now payload or Active Rig)
  const items = useMemo(() => {
    if (checkoutPayload?.items && checkoutPayload.items.length > 0) {
      return checkoutPayload.items;
    }
    return rigItems;
  }, [checkoutPayload, rigItems]);

  const askingSubtotal = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + (parseFloat(it.price || 0) || 0) * (it.quantity || 1),
      0
    );
  }, [items]);

  // Offer state
  const [offerRatio, setOfferRatio] = useState(
    checkoutPayload?.initialOfferRatio || 0.95
  );
  const [customOfferAmount, setCustomOfferAmount] = useState('');
  const [sellerNote, setSellerNote] = useState(
    'Ready for immediate escrow settlement. Can you ship via FedEx Priority tomorrow if we close today?'
  );

  // Payment state
  const [paymentTab, setPaymentTab] = useState('card');
  const [cardHolder, setCardHolder] = useState(user?.username ? `${user.username.toUpperCase()}` : 'ALEXANDER K.');
  const [cardNumber, setCardNumber] = useState('4532 8910 4421 8892');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvc, setCardCvc] = useState('842');
  const [billingZip, setBillingZip] = useState('78701');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Address state
  const [editingAddress, setEditingAddress] = useState(false);
  const [recipientName, setRecipientName] = useState('Alex K. — Workstation Lab');
  const [streetAddress, setStreetAddress] = useState('742 Evergreen Terrace, Suite 4B, Austin, TX 78701, United States');

  // Submission & Order Confirmation state
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [formError, setFormError] = useState('');

  const offerAmount = useMemo(() => {
    if (customOfferAmount !== '' && !isNaN(parseFloat(customOfferAmount))) {
      return Math.max(1, parseFloat(customOfferAmount));
    }
    return Math.round(askingSubtotal * offerRatio * 100) / 100;
  }, [askingSubtotal, offerRatio, customOfferAmount]);

  const effectiveRatio = askingSubtotal > 0 ? offerAmount / askingSubtotal : 1;

  const offerStrength = useMemo(() => {
    if (effectiveRatio >= 0.99) {
      return {
        label: 'Instant Buy (100% Guaranteed)',
        pct: 98,
        color: 'text-secondary',
        barColor: 'bg-secondary',
      };
    }
    if (effectiveRatio >= 0.93) {
      return {
        label: 'High Probability (85%)',
        pct: 84,
        color: 'text-secondary',
        barColor: 'bg-secondary',
      };
    }
    if (effectiveRatio >= 0.87) {
      return {
        label: 'Counter Zone (58%)',
        pct: 58,
        color: 'text-primary',
        barColor: 'bg-primary',
      };
    }
    return {
      label: 'Low Likelihood (25%)',
      pct: 28,
      color: 'text-error',
      barColor: 'bg-error',
    };
  }, [effectiveRatio]);

  const escrowFee = offerAmount > 0 && offerAmount < 1000 ? 0 : 0;
  const estTax = Math.round(offerAmount * 0.085 * 100) / 100;
  const totalHoldAmount = Math.round((offerAmount + escrowFee + estTax) * 100) / 100;
  const savingsAmount = Math.max(0, askingSubtotal - offerAmount);

  const handleCardNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g) || [];
    setCardNumber(groups.join(' '));
  };

  const handleExpiryChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handlePresetClick = (ratio) => {
    setCustomOfferAmount('');
    setOfferRatio(ratio);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!access) {
      openModal('auth', {
        initialTab: 'login',
        message: 'Please sign in or create an account to complete your Escrow Order.',
      });
      return;
    }

    if (items.length === 0) {
      setFormError('No hardware items selected for checkout.');
      return;
    }

    if (paymentTab === 'card') {
      const rawDigits = cardNumber.replace(/\D/g, '');
      if (rawDigits.length < 12) {
        setFormError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardHolder.trim()) {
        setFormError('Please enter the cardholder name.');
        return;
      }
      if (cardCvc.trim().length < 3) {
        setFormError('Please enter a valid 3-digit CVC code.');
        return;
      }
    }

    if (!agreedTerms) {
      setFormError('Please accept the RigForge Escrow Terms to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        card_holder: cardHolder.trim(),
        card_number: cardNumber,
        card_expiry: cardExpiry,
        card_cvv: cardCvc,
        offer_total: offerAmount.toFixed(2),
        items: items.map((it) => ({
          listing_id: it.listing_id || (typeof it.id === 'number' ? it.id : null),
          component_name: `${it.component?.brand || ''} ${it.component?.name || ''}`.trim(),
          category_name: it.component?.category_name || 'PC Hardware',
          seller_username: it.seller_username || 'SiliconFoundry_Official',
          price: (
            (parseFloat(it.price || 0) || 0) *
            (askingSubtotal > 0 ? offerAmount / askingSubtotal : 1)
          ).toFixed(2),
          quantity: it.quantity || 1,
        })),
      };

      const res = await apiFetch('/api/marketplace/orders/', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Order submission failed');
      }

      // Optionally notify seller in chat if there is a listing_id and sellerNote
      const firstListingItem = items.find((i) => i.listing_id || typeof i.id === 'number');
      if (firstListingItem && sellerNote.trim()) {
        try {
          await startSellerChat(
            { id: firstListingItem.listing_id || firstListingItem.id },
            `[ESCROW OFFER #${data.id}: $${offerAmount.toFixed(2)}] ${sellerNote.trim()}`
          );
        } catch (_) {}
      }

      if (checkoutPayload?.mode === 'rig' || !checkoutPayload) {
        clearRig();
      }
      await fetchUserResources();
      setConfirmedOrder(data);
      addToast({
        type: 'success',
        title: `Escrow Order #${data.id} Authorized`,
        message: `Hold of $${offerAmount.toFixed(2)} placed with 48-hour diagnostic protection.`,
      });
    } catch (err) {
      setFormError(err.message || 'Could not process Escrow checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <main className="w-full pt-6 sm:pt-10 pb-20 bg-background min-h-screen animate-page-enter">
        <div className="max-w-3xl mx-auto px-3 sm:px-margin">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-lg p-space-xl flex flex-col items-center text-center gap-space-md">
            <div className="w-16 h-16 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[36px]">verified</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/30 text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              Escrow Hold Authorized • Order #{confirmedOrder.id}
            </div>
            <h1 className="font-headline-lg text-headline-lg font-extrabold text-on-surface">
              Your Hardware Escrow is Active!
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              Your funds (<span className="font-bold text-on-surface">${confirmedOrder.total_price}</span> via card ending in{' '}
              <span className="font-mono font-bold text-primary">•••• {confirmedOrder.card_last4}</span>) are safely locked in RigForge Escrow. The merchant has been notified to dispatch your hardware with 48-hour stress-test verification.
            </p>

            <div className="w-full rounded-xl bg-surface-container-low p-space-md border border-outline-variant/20 text-left flex flex-col gap-2">
              <div className="font-label-sm text-label-sm uppercase text-on-surface-variant font-bold">
                Escrow Manifest ({confirmedOrder.items?.length || 1} Items)
              </div>
              {(confirmedOrder.items || []).map((oi) => (
                <div
                  key={oi.id}
                  className="flex items-center justify-between py-1.5 border-b border-outline-variant/15 last:border-0"
                >
                  <div>
                    <div className="font-body-md text-body-md font-bold text-on-surface">
                      {oi.component_name}
                    </div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">
                      Seller: {oi.seller_username || 'SiliconFoundry_Official'} • Qty: {oi.quantity}
                    </div>
                  </div>
                  <div className="font-label-lg text-label-lg font-bold text-primary">
                    ${oi.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-space-md mt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-bold shadow-md hover:opacity-95 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>Return to Marketplace</span>
              </button>
              <button
                type="button"
                onClick={() => openModal('profile', { tab: 'orders' })}
                className="px-space-lg py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md font-bold transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>View Order History</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="px-space-lg py-2.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low text-on-surface font-body-md text-body-md font-bold transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">chat</span>
                <span>Open Seller Chat</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const primaryItem = items[0] || {
    component: {
      brand: 'ASUS ROG',
      name: 'GeForce RTX 4080 Super 16GB',
      tdp: 320,
      length_mm: 357,
      socket: 'PCIe 4.0 x16',
    },
    price: 999.0,
    seller_username: 'SiliconFoundry_Official',
  };

  return (
    <main className="w-full pt-4 sm:pt-6 pb-20 lg:pb-16 bg-background min-h-screen animate-page-enter">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-margin">
        <div className="flex flex-col w-full">
          {/* Top Breadcrumb & Security Status Bar */}
          <div className="w-full py-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-outline-variant/25 mb-space-lg">
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-body-sm text-body-sm font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Listing</span>
              </button>
              <span className="text-outline-variant">/</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Escrow Checkout
              </span>
              <span className="text-outline-variant">/</span>
              <span className="font-label-sm text-label-sm text-primary font-semibold">
                Offer #RF-89412
              </span>
            </div>

            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/35 border border-secondary/20">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified_user
                </span>
                <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant uppercase tracking-wider">
                  RigForge Escrow Protection Active
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[15px] text-primary">lock</span>
                <span>256-Bit TLS Encrypted</span>
              </div>
            </div>
          </div>

          {/* Page Title */}
          <div className="mb-space-lg">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Make an Offer &amp; Escrow Hold
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Submit a binding purchase offer to{' '}
              <span className="font-semibold text-on-surface">
                {primaryItem.seller_username || 'SiliconFoundry_Official'}
              </span>
              . Funds are held safely in RigForge Escrow and only released after your 48-hour hardware verification window.
            </p>
          </div>

          {formError && (
            <div className="mb-space-md p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Main 2-Column Asymmetric Layout (7 Cols Form / 5 Cols Hardware & Escrow Summary) */}
          <form
            onSubmit={handleSubmitOrder}
            className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start pb-space-xl"
          >
            {/* LEFT COLUMN: 7 Cols */}
            <div className="lg:col-span-7 flex flex-col gap-gutter">
              {/* STEP 1: OFFER AMOUNT & NEGOTIATION ENGINE */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-6 h-6 rounded-md bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center">
                      01
                    </span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Your Binding Purchase Offer
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container text-on-surface-variant">
                    Seller Floor Est: ${(askingSubtotal * 0.91).toFixed(2)} – ${askingSubtotal.toFixed(2)}
                  </span>
                </div>

                {/* Price Input & Quick Presets */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30">
                  <div className="md:col-span-6">
                    <label
                      className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1"
                      htmlFor="offer-price-input"
                    >
                      Offer Price (USD)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 font-label-lg text-headline-md font-bold text-primary select-none">
                        $
                      </span>
                      <input
                        id="offer-price-input"
                        type="number"
                        step="0.01"
                        value={customOfferAmount !== '' ? customOfferAmount : offerAmount}
                        onChange={(e) => setCustomOfferAmount(e.target.value)}
                        className="w-full pl-9 pr-16 py-2.5 bg-surface-container-lowest rounded-lg border-2 border-primary font-label-lg text-[26px] font-bold text-on-surface focus:outline-none transition-all"
                      />
                      <span className="absolute right-3 font-label-sm text-label-sm text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded">
                        {effectiveRatio >= 0.999
                          ? 'ASK'
                          : `-${Math.round((1 - effectiveRatio) * 100)}%`}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-6 flex flex-col gap-1.5">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Quick Offer Adjustments
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { ratio: 0.9, label: '-10%' },
                        { ratio: 0.95, label: '-5%' },
                        { ratio: 1.0, label: 'Full Ask' },
                      ].map((preset) => {
                        const active =
                          customOfferAmount === '' && Math.abs(offerRatio - preset.ratio) < 0.005;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handlePresetClick(preset.ratio)}
                            className={`px-2.5 py-2 rounded-lg font-label-md text-label-md transition-all text-center ${
                              active
                                ? 'bg-primary/15 border-2 border-primary text-primary font-bold'
                                : 'bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 text-on-surface'
                            }`}
                          >
                            <span className="block text-[10px] opacity-80">{preset.label}</span>
                            <span className="font-bold">
                              ${(askingSubtotal * preset.ratio).toFixed(0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Offer Strength Meter */}
                <div className="mt-space-md p-space-md rounded-lg bg-surface-container/60 border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-secondary">
                        trending_up
                      </span>
                      <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                        Offer Strength &amp; Acceptance Likelihood
                      </span>
                    </div>
                    <span className={`font-label-md text-label-md font-bold ${offerStrength.color}`}>
                      {offerStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${offerStrength.barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${offerStrength.pct}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1.5 font-label-sm text-[11px] text-on-surface-variant">
                    <span>Strong Decline (&lt;${(askingSubtotal * 0.85).toFixed(0)})</span>
                    <span>Counter Zone (${(askingSubtotal * 0.9).toFixed(0)})</span>
                    <span className="text-secondary font-semibold">
                      Instant Accept (${(askingSubtotal * 0.95).toFixed(0)}+)
                    </span>
                  </div>
                </div>

                {/* Message to Seller */}
                <div className="mt-space-md">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className="font-body-sm text-body-sm font-semibold text-on-surface"
                      htmlFor="seller-note"
                    >
                      Add a Note to Seller{' '}
                      <span className="text-outline font-normal">(Sent to Live Chat)</span>
                    </label>
                    <span className="font-label-sm text-label-sm text-outline">
                      Sent via RigForge Secure Chat
                    </span>
                  </div>
                  <textarea
                    id="seller-note"
                    rows={2}
                    value={sellerNote}
                    onChange={(e) => setSellerNote(e.target.value)}
                    placeholder="E.g., Ready for immediate payment. Can you include original thermal pads and invoice for warranty transfer?"
                    className="w-full p-space-sm bg-surface-container-low focus:bg-surface-container-lowest rounded-lg border border-outline-variant/40 focus:border-primary focus:outline-none font-body-sm text-body-sm text-on-surface transition-all resize-none"
                  />
                </div>

                {/* Escrow How It Works Banner */}
                <div className="mt-space-md p-space-md rounded-xl bg-secondary-fixed/25 border border-secondary/25 flex items-start gap-space-md">
                  <div className="w-9 h-9 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">shield_lock</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-body-sm text-body-sm font-bold text-on-surface">
                      48-Hour Hardware Stress-Test Escrow
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                      We place a temporary authorization hold on your payment method. If accepted, the seller ships with tracked insurance. You have{' '}
                      <span className="font-semibold text-on-surface">
                        48 hours after delivery
                      </span>{' '}
                      to verify clocks, thermals, and serial numbers before funds are released.
                    </p>
                  </div>
                </div>
              </section>

              {/* STEP 2: ESCROW PAYMENT METHOD */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-6 h-6 rounded-md bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center">
                      02
                    </span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Escrow Payment Method
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      verified
                    </span>
                    <span>PCI-DSS Level 1 Vault</span>
                  </div>
                </div>

                {/* Payment Method Selector Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mb-space-md">
                  {[
                    { id: 'card', icon: 'credit_card', label: 'Credit / Debit' },
                    { id: 'paypal', icon: 'account_balance_wallet', label: 'PayPal / 4x' },
                    { id: 'crypto', icon: 'currency_bitcoin', label: 'Crypto Escrow' },
                    { id: 'financing', icon: 'payments', label: 'Financing' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPaymentTab(tab.id)}
                      className={`p-space-sm rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentTab === tab.id
                          ? 'border-2 border-primary bg-primary/5 text-primary'
                          : 'border border-outline-variant/40 hover:border-outline bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                      <span className="font-body-sm text-body-sm font-bold">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Card Input Fields */}
                {paymentTab === 'card' ? (
                  <div className="flex flex-col gap-space-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                      <div>
                        <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 bg-surface-container-low focus:bg-surface-container-lowest rounded-lg border border-outline-variant/50 focus:border-primary focus:outline-none font-body-md text-body-md text-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                          Card Number
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4532 •••• •••• 8892"
                            required
                            className="w-full pl-3.5 pr-16 py-2 bg-surface-container-low focus:bg-surface-container-lowest rounded-lg border border-outline-variant/50 focus:border-primary focus:outline-none font-label-md text-label-lg text-on-surface tracking-wider"
                          />
                          <span className="absolute right-3 font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-primary text-on-primary font-bold">
                            VISA
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-md">
                      <div>
                        <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                          Expires (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="08/28"
                          required
                          className="w-full px-3.5 py-2 bg-surface-container-low focus:bg-surface-container-lowest rounded-lg border border-outline-variant/50 focus:border-primary focus:outline-none font-label-md text-label-lg text-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                          Security Code (CVC)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                            required
                            className="w-full px-3.5 py-2 bg-surface-container-low focus:bg-surface-container-lowest rounded-lg border border-outline-variant/50 focus:border-primary focus:outline-none font-label-md text-label-lg text-on-surface"
                          />
                          <span className="material-symbols-outlined absolute right-3 text-[16px] text-outline">
                            help
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                          Billing ZIP / Postal
                        </label>
                        <input
                          type="text"
                          value={billingZip}
                          onChange={(e) => setBillingZip(e.target.value)}
                          className="w-full px-3.5 py-2 bg-surface-container-low focus:bg-surface-container-lowest rounded-lg border border-outline-variant/50 focus:border-primary focus:outline-none font-label-md text-label-lg text-on-surface"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[24px]">
                        verified_user
                      </span>
                      <div>
                        <div className="font-body-md text-body-md font-bold text-on-surface">
                          {paymentTab === 'paypal'
                            ? 'PayPal Express Escrow Vault'
                            : paymentTab === 'crypto'
                            ? 'USDC / ETH Multi-Sig Smart Contract Escrow'
                            : 'RigForge 0% APR 12-Month Hardware Financing'}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          Pre-authorized for instant settlement upon hardware stress-test approval.
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                      READY
                    </span>
                  </div>
                )}
              </section>

              {/* STEP 3: SHIPPING & LOGISTICS */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-6 h-6 rounded-md bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center">
                      03
                    </span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Insured Destination &amp; Logistics
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAddress((prev) => !prev)}
                    className="font-body-sm text-body-sm text-primary font-semibold hover:underline"
                  >
                    {editingAddress ? 'Save Address' : 'Edit Address'}
                  </button>
                </div>

                {editingAddress ? (
                  <div className="flex flex-col gap-3 p-space-md rounded-lg bg-surface-container-low border border-primary/40">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="px-3 py-2 rounded bg-surface-container-lowest border border-outline-variant/40 font-body-md text-body-md text-on-surface"
                      placeholder="Recipient / Lab Name"
                    />
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="px-3 py-2 rounded bg-surface-container-lowest border border-outline-variant/40 font-body-md text-body-md text-on-surface"
                      placeholder="Full Delivery Address"
                    />
                  </div>
                ) : (
                  <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-primary mt-0.5">
                        location_on
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-body-md text-body-md font-bold text-on-surface">
                            {recipientName}
                          </span>
                          <span className="font-label-sm text-[10px] px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed uppercase">
                            Verified Address
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          {streetAddress}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                          Carrier: FedEx Priority Overnight Insured — Signature &amp; ID Required
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-label-md text-label-md font-bold text-secondary block">
                        FREE INSURED
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Est. 1–2 Business Days
                      </span>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN: 5 Cols (Hardware Summary + RigSync Telemetry + Escrow Total) */}
            <div className="lg:col-span-5 flex flex-col gap-gutter lg:sticky lg:top-20">
              {/* Hardware Spotlight Card */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/25 mb-space-md">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                    Hardware Escrow Summary ({items.length}{' '}
                    {items.length === 1 ? 'Component' : 'Components'})
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    Serial Verified
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {items.map((it, idx) => {
                    const comp = it.component || it;
                    const meta = getCardBadgesAndSpecs(it);
                    return (
                      <div
                        key={it.id || idx}
                        className="flex gap-space-md items-center p-2 rounded-lg bg-surface-container-low/60 border border-outline-variant/15"
                      >
                        <div className="w-16 h-16 rounded-lg bg-surface-container-lowest p-1.5 border border-outline-variant/25 shrink-0 flex items-center justify-center">
                          <img
                            alt={comp.name}
                            className="w-full h-full object-contain"
                            src={getComponentImage(comp)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                              {meta.categoryLabel.split('•')[0]}
                            </span>
                            <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Qty: {it.quantity || 1}
                            </span>
                          </div>
                          <h3 className="font-body-md text-body-md font-bold text-on-surface mt-0.5 truncate">
                            {comp.brand} {comp.name}
                          </h3>
                          <div className="font-label-md text-label-md font-bold text-primary">
                            ${((parseFloat(it.price || 0) || 0) * (it.quantity || 1)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Seller Mini Bar */}
                <div className="mt-space-md pt-space-sm border-t border-outline-variant/25 flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
                      SF
                    </div>
                    <div>
                      <div className="font-body-sm text-body-sm font-bold text-on-surface flex items-center gap-1">
                        <span>{primaryItem.seller_username || 'SiliconFoundry_Official'}</span>
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          verified
                        </span>
                      </div>
                      <div className="font-label-sm text-[11px] text-on-surface-variant">
                        99.8% Positive • Avg. Response: 14 mins
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-label-sm text-[11px] text-on-surface-variant block">
                      Asking Total
                    </span>
                    <span className="font-label-lg text-label-lg font-bold text-on-surface line-through opacity-75">
                      ${askingSubtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* RigSync Active Rig Compatibility HUD */}
              <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/40">
                <div className="flex items-center justify-between mb-space-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      memory
                    </span>
                    <span className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">
                      RigSync Live Compatibility Check
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">
                    {rigMetrics.isCompatible ? '100% Fitment Verified' : 'Review Notes'}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
                  Checked against active build:{' '}
                  <span className="font-semibold text-on-surface">
                    {rigMetrics.platformLabel} ({rigMetrics.totalTdp || 545}W TDP)
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2 font-label-sm text-label-sm">
                  <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/25 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">
                      check_circle
                    </span>
                    <span className="text-on-surface">PSU Headroom Verified</span>
                  </div>
                  <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/25 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">
                      check_circle
                    </span>
                    <span className="text-on-surface">Clearance: 455mm Max</span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown & Submit Action */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-md">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-md">
                  Financial Escrow Breakdown
                </h3>
                <div className="flex flex-col gap-2.5 font-body-md text-body-md">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Your Binding Offer</span>
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                      ${offerAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span>RigForge Escrow &amp; Diagnostics Fee</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-sm text-label-sm line-through text-outline">
                        $12.00
                      </span>
                      <span className="font-label-md text-label-md font-bold text-secondary">
                        WAIVED
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">
                      Insured Courier Dispatch (FedEx)
                    </span>
                    <span className="font-label-md text-label-md font-bold text-secondary">
                      FREE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Estimated Sales Tax (8.5%)</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      ${estTax.toFixed(2)}
                    </span>
                  </div>

                  <div className="my-1 border-t border-outline-variant/30"></div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm font-bold text-on-surface block">
                        Total Hold Amount
                      </span>
                      <span className="font-label-sm text-[11px] text-on-surface-variant">
                        Authorized only if seller accepts
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-label-lg text-[26px] font-extrabold text-primary tracking-tight">
                        ${totalHoldAmount.toFixed(2)}
                      </span>
                      {savingsAmount > 0 && (
                        <span className="block font-label-sm text-[11px] text-secondary font-semibold">
                          You Save ${savingsAmount.toFixed(2)} off Ask
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legal Agreement Checkbox */}
                <label className="mt-space-md flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-outline text-primary focus:ring-primary"
                  />
                  <span className="font-body-sm text-[12px] text-on-surface-variant leading-snug">
                    I agree to the{' '}
                    <span className="text-primary font-semibold">
                      RigForge Binding Offer &amp; Escrow Terms
                    </span>
                    . If the seller accepts within 24 hours, my payment method will be placed in escrow hold.
                  </span>
                </label>

                {/* Primary Submit Action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-space-md w-full py-3.5 px-space-lg rounded-xl bg-gradient-to-r from-primary to-primary-container hover:opacity-95 text-on-primary font-headline-sm text-body-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                  <span>
                    {submitting
                      ? 'Authorizing Escrow Hold...'
                      : `Submit Escrow Offer — $${totalHoldAmount.toFixed(2)}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomOfferAmount('');
                    setOfferRatio(1.0);
                  }}
                  className="mt-2 w-full py-2.5 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[17px] text-primary">bolt</span>
                  <span>Or Buy Instantly at Asking Price (${askingSubtotal.toFixed(2)})</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
