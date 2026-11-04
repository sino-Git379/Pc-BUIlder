(() => {
  const API = '/api';
  const tokenKey = 'pcforge.access';
  const refreshKey = 'pcforge.refresh';
  const token = () => localStorage.getItem(tokenKey);
  const headers = (json = false) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token() ? { Authorization: `Bearer ${token()}` } : {})
  });

  const refreshAccessToken = async () => {
    const refresh = localStorage.getItem(refreshKey);
    if (!refresh) return false;
    try {
      const renewed = await fetch(`${API}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
      });
      if (renewed.ok) {
        const data = await renewed.json();
        localStorage.setItem(tokenKey, data.access);
        return true;
      }
    } catch {}
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(refreshKey);
    return false;
  };

  const request = async (path, options = {}) => {
    let response = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...headers(Boolean(options.body)), ...(options.headers || {}) }
    });
    if (response.status === 401 && localStorage.getItem(refreshKey)) {
      const ok = await refreshAccessToken();
      if (ok) {
        response = await fetch(`${API}${path}`, {
          ...options,
          headers: { ...headers(Boolean(options.body)), ...(options.headers || {}) }
        });
      }
    }
    if (!response.ok) {
      const error = new Error(`Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  };

  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const t = text => window.pcforgeLanguage?.t(text) || text;

  const showToast = (message, isError = false) => {
    let container = document.querySelector('#pcforge-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pcforge-toast-container';
      container.className = 'fixed bottom-24 right-6 z-[140] flex flex-col gap-2 pointer-events-none';
      document.body.append(container);
    }
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 ${
      isError
        ? 'bg-error-container text-on-error-container border border-error/40'
        : 'bg-surface-container-highest text-on-surface border border-primary/35'
    }`;
    toast.innerHTML = `<span class="material-symbols-outlined text-lg ${isError ? 'text-error' : 'text-primary'}">${isError ? 'error' : 'check_circle'}</span><span class="text-body-sm font-medium">${escape(message)}</span>`;
    container.append(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3400);
  };

  // -------------------------------------------------------------
  // Pop-up Chat Message Toast Notification (Bottom-Left)
  // -------------------------------------------------------------
  let activeChatRoomId = null;
  let switchChatRoomHandler = null;

  const showChatNotificationToast = payload => {
    if (!payload || !payload.room_id) return;
    if (currentUser && payload.sender === currentUser.username) return;
    if (location.pathname.startsWith('/chat/') && String(activeChatRoomId) === String(payload.room_id)) {
      return;
    }

    let container = document.querySelector('#pcforge-chat-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pcforge-chat-toast-container';
      container.className = 'fixed bottom-6 left-6 z-[150] flex flex-col gap-2.5 max-w-sm w-[min(92vw,360px)] pointer-events-none';
      document.body.append(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto cursor-pointer rounded-2xl bg-surface-container-low/95 backdrop-blur-md p-4 shadow-2xl border border-primary/40 transition-all duration-300 transform translate-y-3 opacity-0 hover:bg-surface-container group';
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-xl">mark_chat_unread</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold text-primary truncate">
              ${escape(t('New message from'))} @${escape(payload.sender)}
            </span>
            <button type="button" data-close-chat-toast class="h-6 w-6 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          ${payload.component_name ? `<p class="text-[11px] font-code-sm text-on-surface-variant truncate mt-0.5">${escape(payload.component_name)}</p>` : ''}
          <p class="text-body-sm font-medium text-on-surface line-clamp-2 mt-1">${escape(payload.message)}</p>
          <span class="mt-2 inline-block text-[11px] font-semibold text-primary group-hover:underline">
            ${escape(t('Click to open conversation →'))}
          </span>
        </div>
      </div>
    `;

    const closeBtn = toast.querySelector('[data-close-chat-toast]');
    if (closeBtn) {
      closeBtn.onclick = e => {
        e.stopPropagation();
        toast.remove();
      };
    }

    toast.onclick = () => {
      toast.remove();
      if (location.pathname.startsWith('/chat/') && typeof switchChatRoomHandler === 'function') {
        switchChatRoomHandler(payload.room_id);
      } else {
        location.href = `/chat/?room=${encodeURIComponent(payload.room_id)}`;
      }
    };

    container.append(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('translate-y-3', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }
    }, 8000);
  };

  const getCategoryIcon = (categoryName = '', slug = '') => {
    const s = `${categoryName} ${slug}`.toLowerCase();
    if (/processor|cpu|процессор/.test(s)) return 'memory';
    if (/graphic|gpu|video|видеокарт/.test(s)) return 'videogame_asset';
    if (/motherboard|mainboard|материнск/.test(s)) return 'developer_board';
    if (/memory|ram|памят/.test(s)) return 'storage';
    if (/power|psu|питани/.test(s)) return 'bolt';
    if (/case|chassis|корпус/.test(s)) return 'desktop_windows';
    if (/cooler|fan|охлажд|кулер/.test(s)) return 'ac_unit';
    return 'memory';
  };

  const setMessage = (region, text, error = false) => {
    region.innerHTML = `<div class="col-span-full p-space-lg rounded-2xl bg-surface-container-low border border-outline-variant/20 text-center ${error ? 'text-error' : 'text-on-surface-variant'}" role="status">${escape(text)}</div>`;
  };

  const region = (selector, className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg') => {
    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement('section');
      element.className = className;
      const main = document.querySelector('main') || document.body;
      main.append(element);
    }
    element.dataset.apiRegion = 'true';
    return element;
  };

  let currentUser = null;
  const page = location.pathname;
  let activeBuild = null;

  // -------------------------------------------------------------
  // Unread Messages Badge System
  // -------------------------------------------------------------
  const setUnreadBadgeCount = count => {
    const num = Number(count) || 0;
    document.querySelectorAll('[data-path="messages"]').forEach(link => {
      let badge = link.querySelector('[data-unread-badge]');
      if (!badge) {
        badge = document.createElement('span');
        badge.dataset.unreadBadge = 'true';
        badge.className = 'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error shadow-sm ring-2 ring-surface-container-low transition-all';
        link.classList.add('relative');
        link.append(badge);
      }
      if (num > 0) {
        badge.textContent = num > 99 ? '99+' : String(num);
        badge.classList.remove('hidden');
      } else {
        badge.textContent = '0';
        badge.classList.add('hidden');
      }
    });
  };

  const updateUnreadBadge = async () => {
    if (!token()) {
      setUnreadBadgeCount(0);
      return;
    }
    try {
      const data = await request('/chat/unread/');
      setUnreadBadgeCount(data?.unread_count || 0);
    } catch {}
  };

  // -------------------------------------------------------------
  // Global WebSocket (Broadcasts, Unread Counter & Chat Toasts)
  // -------------------------------------------------------------
  const showGlobalBroadcastBanner = data => {
    let banner = document.querySelector('#global-broadcast-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'global-broadcast-banner';
      banner.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-[min(94vw,560px)] rounded-2xl bg-surface-container-low/95 p-5 shadow-2xl border border-primary/50 backdrop-blur-md transition-all duration-300 transform -translate-y-4 opacity-0';
      document.body.append(banner);
    }
    const levelColors = {
      info: 'text-primary border-primary/40 bg-primary/10',
      warning: 'text-tertiary border-tertiary/40 bg-tertiary/10',
      critical: 'text-error border-error/40 bg-error/10'
    };
    const levelStyle = levelColors[data.level] || levelColors.info;
    banner.innerHTML = `
      <div class="flex items-start gap-3.5">
        <div class="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${levelStyle}">
          <span class="material-symbols-outlined text-2xl">campaign</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-on-surface text-body-md">${escape(data.title || t('System Notification'))}</h4>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-code-sm font-semibold uppercase tracking-wider border ${levelStyle}">BROADCAST</span>
          </div>
          <p class="text-on-surface-variant text-body-sm mt-1 leading-relaxed">${escape(data.message)}</p>
          ${data.timestamp ? `<span class="text-[10px] text-on-surface-variant/70 mt-1 block">${new Date(data.timestamp).toLocaleTimeString()}</span>` : ''}
        </div>
        <button type="button" class="h-8 w-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors shrink-0" onclick="this.closest('#global-broadcast-banner').remove()">
          <span class="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    `;
    requestAnimationFrame(() => {
      banner.classList.remove('-translate-y-4', 'opacity-0');
    });
    setTimeout(() => {
      if (banner && banner.parentElement) {
        banner.classList.add('-translate-y-4', 'opacity-0');
        setTimeout(() => banner.remove(), 350);
      }
    }, 10000);
  };

  let globalSocket = null;
  let globalSocketToken = null;
  let globalPingTimer = null;
  let globalReconnectTimer = null;

  const initGlobalSocket = () => {
    const currentToken = token() || '';
    if (
      globalSocket &&
      (globalSocket.readyState === WebSocket.OPEN || globalSocket.readyState === WebSocket.CONNECTING) &&
      globalSocketToken === currentToken
    ) {
      return;
    }

    if (globalSocket) {
      try {
        globalSocket.onclose = null;
        globalSocket.close();
      } catch {}
      globalSocket = null;
    }
    if (globalPingTimer) {
      clearInterval(globalPingTimer);
      globalPingTimer = null;
    }
    if (globalReconnectTimer) {
      clearTimeout(globalReconnectTimer);
      globalReconnectTimer = null;
    }

    globalSocketToken = currentToken;
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const query = currentToken ? `?token=${encodeURIComponent(currentToken)}` : '';
    const url = `${wsProto}//${location.host}/ws/global/${query}`;

    try {
      globalSocket = new WebSocket(url);
      globalSocket.onopen = () => {
        if (globalPingTimer) clearInterval(globalPingTimer);
        globalPingTimer = setInterval(() => {
          if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
            try {
              globalSocket.send(JSON.stringify({ type: 'ping' }));
            } catch {}
          }
        }, 20000);
      };
      globalSocket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'broadcast') {
            showGlobalBroadcastBanner(payload);
          } else if (payload.type === 'unread_update') {
            setUnreadBadgeCount(payload.unread_count);
          } else if (payload.type === 'chat_notification') {
            setUnreadBadgeCount(payload.unread_count);
            showChatNotificationToast(payload);
          }
        } catch {}
      };
      globalSocket.onclose = () => {
        globalSocket = null;
        if (globalPingTimer) {
          clearInterval(globalPingTimer);
          globalPingTimer = null;
        }
        globalReconnectTimer = setTimeout(initGlobalSocket, 3000);
      };
      globalSocket.onerror = () => {
        try { globalSocket?.close(); } catch {}
      };
    } catch {}
  };

  // -------------------------------------------------------------
  // Floating Cart, Offcanvas Sidebar & Card Checkout Modal
  // -------------------------------------------------------------
  let currentCartItems = [];

  const openCartOffcanvas = () => {
    const offcanvas = document.querySelector('#cart-offcanvas');
    const backdrop = document.querySelector('#cart-offcanvas-backdrop');
    if (!offcanvas) return;
    offcanvas.classList.remove('translate-x-full');
    if (backdrop) {
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      backdrop.classList.add('opacity-100', 'pointer-events-auto');
    }
    loadFloatingCart(false);
  };

  const closeCartOffcanvas = () => {
    const offcanvas = document.querySelector('#cart-offcanvas');
    const backdrop = document.querySelector('#cart-offcanvas-backdrop');
    if (!offcanvas) return;
    offcanvas.classList.add('translate-x-full');
    if (backdrop) {
      backdrop.classList.add('opacity-0', 'pointer-events-none');
      backdrop.classList.remove('opacity-100', 'pointer-events-auto');
    }
  };

  const renderOffcanvasCart = (items, animateBadge = false) => {
    currentCartItems = items;
    const floatingBtn = document.querySelector('#floating-cart-btn');
    const badge = document.querySelector('#floating-cart-badge');
    const itemsContainer = document.querySelector('#offcanvas-cart-items');
    const subtitle = document.querySelector('#offcanvas-cart-subtitle');
    const totalEl = document.querySelector('#offcanvas-cart-total');
    const checkoutBtn = document.querySelector('#offcanvas-checkout-btn');

    const totalCount = items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
    const totalPrice = items.reduce((acc, i) => acc + (Number(i.listing?.price || 0) * (Number(i.quantity) || 1)), 0);

    if (badge) {
      if (totalCount > 0) {
        badge.textContent = totalCount > 99 ? '99+' : String(totalCount);
        badge.classList.remove('hidden');
      } else {
        badge.textContent = '0';
        badge.classList.add('hidden');
      }
      if (animateBadge) {
        badge.classList.remove('animate-cart-bounce');
        void badge.offsetWidth;
        badge.classList.add('animate-cart-bounce');
      }
    }

    if (floatingBtn && animateBadge) {
      floatingBtn.classList.remove('animate-cart-bounce');
      void floatingBtn.offsetWidth;
      floatingBtn.classList.add('animate-cart-bounce');
    }

    if (subtitle) {
      subtitle.textContent = `${totalCount} ${t('items selected')}`;
    }
    if (totalEl) {
      totalEl.textContent = `$${totalPrice.toFixed(2)}`;
    }
    if (checkoutBtn) {
      checkoutBtn.disabled = items.length === 0;
    }

    if (!itemsContainer) return;
    if (!items.length) {
      itemsContainer.innerHTML = `
        <div class="my-auto py-12 text-center flex flex-col items-center gap-3 text-on-surface-variant">
          <div class="h-16 w-16 rounded-2xl bg-surface-container flex items-center justify-center text-primary/70">
            <span class="material-symbols-outlined text-4xl">shopping_cart_off</span>
          </div>
          <p class="font-semibold text-on-surface">${escape(t('Your cart is empty.'))}</p>
          <p class="text-xs max-w-[240px]">${escape(t('Add hardware from the marketplace to get started.'))}</p>
        </div>
      `;
      return;
    }

    itemsContainer.innerHTML = items.map(item => {
      const l = item.listing || {};
      const c = l.component || {};
      const icon = getCategoryIcon(c.category_name);
      const sub = (Number(l.price || 0) * (Number(item.quantity) || 1)).toFixed(2);
      return `
        <article class="flex items-center gap-3.5 rounded-2xl bg-surface-container p-3.5 border border-outline-variant/25 transition-all hover:border-outline-variant/50">
          <div class="h-14 w-14 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0 overflow-hidden border border-outline-variant/15">
            ${c.image ? `
              <img src="${escape(c.image)}" alt="${escape(c.name)}" class="h-full w-full object-cover">
            ` : `
              <span class="material-symbols-outlined text-2xl text-primary">${icon}</span>
            `}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-code-sm uppercase text-primary font-semibold truncate">${escape(c.category_name || 'Hardware')}</p>
            <h3 class="font-semibold text-body-sm text-on-surface truncate">${escape(c.brand)} ${escape(c.name)}</h3>
            <div class="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
              <strong class="text-primary font-bold text-body-sm">$${escape(sub)}</strong>
              <span>·</span>
              <span>×${item.quantity}</span>
            </div>
          </div>
          <button type="button" data-offcanvas-remove="${item.id}" class="h-8 w-8 rounded-xl bg-surface-container-high hover:bg-error-container text-on-surface-variant hover:text-error flex items-center justify-center transition-colors shrink-0" title="${escape(t('Remove'))}">
            <span class="material-symbols-outlined text-base">delete_outline</span>
          </button>
        </article>
      `;
    }).join('');

    itemsContainer.querySelectorAll('[data-offcanvas-remove]').forEach(btn => {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          await request(`/marketplace/cart/${btn.dataset.offcanvasRemove}/`, { method: 'DELETE' });
          await loadFloatingCart(false);
        } catch {
          btn.disabled = false;
        }
      };
    });
  };

  const loadFloatingCart = async (animateBadge = false) => {
    const floatingBtn = document.querySelector('#floating-cart-btn');
    if (floatingBtn) {
      const isStaff = currentUser && ['Admin', 'Manager'].includes(currentUser.role);
      floatingBtn.classList.toggle('hidden', Boolean(isStaff));
    }
    if (!token() || (currentUser && currentUser.role !== 'Buyer')) {
      renderOffcanvasCart([], false);
      return;
    }
    try {
      const data = await request('/marketplace/cart/');
      const items = Array.isArray(data) ? data : (data.results || []);
      renderOffcanvasCart(items, animateBadge);
    } catch {
      renderOffcanvasCart([], false);
    }
  };

  // Wire Floating Cart & Offcanvas controls
  document.querySelector('#floating-cart-btn')?.addEventListener('click', () => {
    if (!token()) {
      location.href = '/accounts/login/';
      return;
    }
    openCartOffcanvas();
  });
  document.querySelector('#close-cart-offcanvas')?.addEventListener('click', closeCartOffcanvas);
  document.querySelector('#cart-offcanvas-backdrop')?.addEventListener('click', closeCartOffcanvas);
  document.querySelector('#offcanvas-checkout-btn')?.addEventListener('click', () => {
    openCheckoutModal();
  });

  // -------------------------------------------------------------
  // Card Payment & Checkout Simulation Modal
  // -------------------------------------------------------------
  let checkoutModal = null;
  const getOrCreateCheckoutModal = () => {
    if (!checkoutModal) {
      checkoutModal = document.querySelector('#checkout-card-modal');
      if (!checkoutModal) {
        checkoutModal = document.createElement('dialog');
        checkoutModal.id = 'checkout-card-modal';
        checkoutModal.className = 'w-[min(94vw,480px)] rounded-2xl bg-surface-container-low p-0 text-on-surface shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs border border-outline-variant/30';
        document.body.append(checkoutModal);
        checkoutModal.addEventListener('click', event => {
          if (event.target === checkoutModal) checkoutModal.close();
        });
      }
    }
    return checkoutModal;
  };

  const openCheckoutModal = () => {
    if (!currentCartItems.length) {
      showToast(t('Your cart is empty.'), true);
      return;
    }
    const totalPrice = currentCartItems.reduce(
      (acc, i) => acc + (Number(i.listing?.price || 0) * (Number(i.quantity) || 1)),
      0
    ).toFixed(2);

    const dialog = getOrCreateCheckoutModal();
    dialog.innerHTML = `
      <div class="p-6 sm:p-7 flex flex-col gap-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">credit_score</span>
            </div>
            <div>
              <h2 class="text-headline-sm font-bold text-on-surface">${escape(t('Card payment'))}</h2>
              <p class="text-xs text-on-surface-variant">${escape(t('Total amount'))}: <strong class="text-primary">$${totalPrice}</strong></p>
            </div>
          </div>
          <button type="button" data-checkout-close class="h-8 w-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <!-- Visual Bank Card Preview -->
        <div class="rounded-2xl bg-gradient-to-br from-primary to-secondary p-5 text-on-primary shadow-lg flex flex-col justify-between h-44 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="font-code-sm text-xs uppercase tracking-widest opacity-85">PCForge Pay · Virtual</span>
            <span class="material-symbols-outlined text-2xl opacity-90">contactless</span>
          </div>
          <div id="preview-card-number" class="font-code-md text-lg sm:text-xl tracking-widest font-semibold my-2">
            4242 •••• •••• 4242
          </div>
          <div class="flex items-end justify-between text-xs">
            <div>
              <span class="block text-[10px] uppercase opacity-75">${escape(t('Cardholder name'))}</span>
              <strong id="preview-card-holder" class="font-code-sm uppercase tracking-wider">${escape((currentUser?.username || 'TEST BUYER').toUpperCase())}</strong>
            </div>
            <div class="text-right">
              <span class="block text-[10px] uppercase opacity-75">EXP</span>
              <strong id="preview-card-expiry" class="font-code-sm">12/28</strong>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-on-surface-variant">${escape(t('Enter any test card details to complete simulated checkout.'))}</p>
          <button type="button" id="fill-test-card-btn" class="shrink-0 rounded-lg bg-surface-container-high hover:bg-surface-container-highest px-2.5 py-1 text-xs font-semibold text-primary transition-colors">
            ${escape(t('Fill test card'))}
          </button>
        </div>

        <form id="checkout-payment-form" class="grid gap-3.5" novalidate>
          <label class="grid gap-1 text-xs font-medium text-on-surface-variant">
            <span>${escape(t('Card number'))}</span>
            <input name="card_number" type="text" maxlength="24" placeholder="4242 4242 4242 4242" class="rounded-xl bg-surface-container-lowest border border-outline-variant/35 px-3.5 py-2.5 font-code-md text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-xs font-medium text-on-surface-variant">
              <span>${escape(t('Expiry date'))}</span>
              <input name="card_expiry" type="text" maxlength="7" placeholder="12/28" class="rounded-xl bg-surface-container-lowest border border-outline-variant/35 px-3.5 py-2.5 font-code-md text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
            </label>
            <label class="grid gap-1 text-xs font-medium text-on-surface-variant">
              <span>${escape(t('CVV / CVC'))}</span>
              <input name="card_cvv" type="password" maxlength="4" placeholder="777" class="rounded-xl bg-surface-container-lowest border border-outline-variant/35 px-3.5 py-2.5 font-code-md text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
            </label>
          </div>
          <label class="grid gap-1 text-xs font-medium text-on-surface-variant">
            <span>${escape(t('Cardholder name'))}</span>
            <input name="card_holder" type="text" maxlength="80" placeholder="${escape((currentUser?.username || 'Test Buyer').toUpperCase())}" class="rounded-xl bg-surface-container-lowest border border-outline-variant/35 px-3.5 py-2.5 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
          </label>

          <p id="checkout-form-error" class="text-xs text-error hidden"></p>

          <div class="mt-2 flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/20">
            <button type="button" data-checkout-close class="rounded-xl bg-surface-container-high hover:bg-surface-container-highest px-4 py-2.5 text-body-sm font-medium text-on-surface transition-colors">
              ${escape(t('Cancel'))}
            </button>
            <button type="submit" id="checkout-submit-btn" class="rounded-xl bg-primary px-5 py-2.5 text-body-sm font-semibold text-on-primary hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md">
              <span class="material-symbols-outlined text-lg">lock</span>
              <span>${escape(t('Confirm & Pay'))} ($${totalPrice})</span>
            </button>
          </div>
        </form>
      </div>
    `;

    dialog.showModal();

    dialog.querySelectorAll('[data-checkout-close]').forEach(btn => {
      btn.onclick = () => dialog.close();
    });

    const form = dialog.querySelector('#checkout-payment-form');
    const numInput = form.elements.card_number;
    const expInput = form.elements.card_expiry;
    const cvvInput = form.elements.card_cvv;
    const holderInput = form.elements.card_holder;

    const updatePreview = () => {
      const rawNum = numInput.value.trim();
      dialog.querySelector('#preview-card-number').textContent = rawNum || '4242 •••• •••• 4242';
      dialog.querySelector('#preview-card-holder').textContent = (holderInput.value.trim() || currentUser?.username || 'TEST BUYER').toUpperCase();
      dialog.querySelector('#preview-card-expiry').textContent = expInput.value.trim() || '12/28';
    };

    numInput.addEventListener('input', () => {
      const cleaned = numInput.value.replace(/\s+/g, '').slice(0, 16);
      const groups = cleaned.match(/.{1,4}/g);
      if (groups) numInput.value = groups.join(' ');
      updatePreview();
    });
    expInput.addEventListener('input', updatePreview);
    holderInput.addEventListener('input', updatePreview);

    dialog.querySelector('#fill-test-card-btn')?.addEventListener('click', () => {
      numInput.value = '4242 4242 4242 4242';
      expInput.value = '12/28';
      cvvInput.value = '777';
      holderInput.value = (currentUser?.username || 'Alex Forge').toUpperCase();
      updatePreview();
    });

    form.onsubmit = async event => {
      event.preventDefault();
      // Soft validation: accept any test data; fill fallback defaults if left empty
      const cardNumber = numInput.value.trim() || '4242 4242 4242 4242';
      const cardExpiry = expInput.value.trim() || '12/28';
      const cardCvv = cvvInput.value.trim() || '777';
      const cardHolder = holderInput.value.trim() || currentUser?.username || 'Test Buyer';

      const submitBtn = dialog.querySelector('#checkout-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span><span>Processing…</span>`;

      try {
        await request('/marketplace/orders/', {
          method: 'POST',
          body: JSON.stringify({
            card_number: cardNumber,
            card_expiry: cardExpiry,
            card_cvv: cardCvv,
            card_holder: cardHolder
          })
        });
        dialog.close();
        closeCartOffcanvas();
        await loadFloatingCart(true);
        showToast(t('Order placed successfully!'));
        if (location.pathname.startsWith('/accounts/session/')) {
          loadBuyerOrders();
        }
      } catch {
        const errEl = dialog.querySelector('#checkout-form-error');
        if (errEl) {
          errEl.textContent = 'Could not complete order.';
          errEl.classList.remove('hidden');
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="material-symbols-outlined text-lg">lock</span><span>${escape(t('Confirm & Pay'))} ($${totalPrice})</span>`;
      }
    };
  };

  // -------------------------------------------------------------
  // Universal Product Detail Modal
  // -------------------------------------------------------------
  const componentCache = new Map();
  let detailModal = null;
  const getOrCreateDetailModal = () => {
    if (!detailModal) {
      detailModal = document.querySelector('#product-detail-modal');
      if (!detailModal) {
        detailModal = document.createElement('dialog');
        detailModal.id = 'product-detail-modal';
        detailModal.className = 'w-[min(94vw,820px)] max-h-[92vh] overflow-y-auto rounded-2xl bg-surface-container-low p-0 text-on-surface shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs border border-outline-variant/30';
        document.body.append(detailModal);
        detailModal.addEventListener('click', event => {
          if (event.target === detailModal) detailModal.close();
        });
      }
    }
    return detailModal;
  };

  const openProductDetailModal = async ({ component, listing, context = 'marketplace' }) => {
    const dialog = getOrCreateDetailModal();
    dialog.innerHTML = '<div class="p-8 text-center text-on-surface-variant"><span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span><p class="mt-2 text-body-sm">Loading details…</p></div>';
    dialog.showModal();

    let comp = (typeof component === 'object' && component !== null) ? component : null;
    let list = (typeof listing === 'object' && listing !== null) ? listing : null;
    const compId = (typeof component === 'number' || typeof component === 'string') ? Number(component) : (comp?.id || null);
    const listId = (typeof listing === 'number' || typeof listing === 'string') ? Number(listing) : (list?.id || null);

    try {
      if (!comp && list?.component) comp = list.component;
      if (listId && (!list || !list.price || !comp)) {
        const fullListing = await request(`/marketplace/listings/${listId}/`);
        list = fullListing;
        if (!comp && fullListing?.component) comp = fullListing.component;
      }
      if (!comp && compId) {
        if (componentCache.has(compId)) {
          comp = componentCache.get(compId);
        } else {
          comp = await request(`/components/components/${compId}/`);
        }
      }
      if (comp?.id) {
        componentCache.set(comp.id, comp);
      }
    } catch {
      dialog.innerHTML = `<div class="p-8 text-center text-error"><p>${t('Listing not found.')}</p><button type="button" class="mt-4 rounded-xl bg-surface-container-high px-4 py-2" onclick="this.closest('dialog').close()">${t('Close')}</button></div>`;
      return;
    }

    if (!comp) {
      dialog.innerHTML = `<div class="p-8 text-center text-error"><p>${t('Listing not found.')}</p><button type="button" class="mt-4 rounded-xl bg-surface-container-high px-4 py-2" onclick="this.closest('dialog').close()">${t('Close')}</button></div>`;
      return;
    }

    const categoryIcon = getCategoryIcon(comp.category_name);
    const image = comp.image || '';
    const price = list ? list.price : comp.price_avg;
    const isOwner = currentUser && list && (currentUser.username === list.seller_username || currentUser.id === list.seller);
    const isStaff = currentUser && ['Admin', 'Manager'].includes(currentUser.role);
    const disableBuyerActions = isStaff || isOwner;

    const specs = [];
    if (comp.socket) specs.push({ label: t('Socket'), value: comp.socket });
    if (comp.ram_type) specs.push({ label: t('RAM type'), value: comp.ram_type });
    if (comp.tdp) specs.push({ label: t('TDP'), value: `${comp.tdp} W` });
    if (comp.power_supply) specs.push({ label: t('PSU output'), value: `${comp.power_supply} W`, highlight: true });
    if (comp.form_factor) specs.push({ label: t('Form factor'), value: comp.form_factor });
    if (comp.length_mm || comp.height_mm) {
      const dims = [];
      if (comp.length_mm) dims.push(`L: ${comp.length_mm} mm`);
      if (comp.height_mm) dims.push(`H: ${comp.height_mm} mm`);
      specs.push({ label: t('Dimensions'), value: dims.join(' · ') });
    }
    if (comp.max_gpu_length_mm || comp.max_cooler_height_mm) {
      const cl = [];
      if (comp.max_gpu_length_mm) cl.push(`GPU: ${comp.max_gpu_length_mm} mm`);
      if (comp.max_cooler_height_mm) cl.push(`Cooler: ${comp.max_cooler_height_mm} mm`);
      specs.push({ label: t('Case clearance'), value: cl.join(' · ') });
    }

    dialog.innerHTML = `
      <div class="relative p-6 sm:p-8">
        <button type="button" data-modal-close class="absolute top-4 right-4 h-9 w-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-lg">close</span>
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
          <div class="relative aspect-square w-full rounded-2xl bg-surface-container overflow-hidden border border-outline-variant/30 flex items-center justify-center">
            ${image ? `
              <img src="${escape(image)}" alt="${escape(comp.brand)} ${escape(comp.name)}" class="h-full w-full object-cover">
            ` : `
              <div class="flex flex-col items-center justify-center gap-3 p-6 text-center text-primary">
                <div class="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span class="material-symbols-outlined text-5xl text-primary">${categoryIcon}</span>
                </div>
                <span class="font-code-sm uppercase tracking-widest text-on-surface-variant text-xs">${escape(comp.category_name || 'Component')}</span>
              </div>
            `}
          </div>

          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-primary/15 px-3 py-1 font-code-sm text-xs font-semibold uppercase tracking-wider text-primary">
                ${escape(comp.category_name || 'Component')}
              </span>
              ${list ? `
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${list.condition === 'new' ? 'bg-primary-container text-on-primary-container' : 'bg-tertiary-container text-on-tertiary-container'}">
                  ${t(list.condition === 'new' ? 'New' : 'Used')}
                </span>
              ` : ''}
            </div>

            <h2 class="mt-3 text-headline-md font-bold text-on-surface leading-tight">
              ${escape(comp.brand)} ${escape(comp.name)}
            </h2>

            <div class="mt-3 flex items-baseline gap-3">
              <span class="text-3xl font-extrabold text-primary">$${escape(price)}</span>
              ${list && comp.price_avg ? `<span class="text-body-sm text-on-surface-variant">${t('Average price:')} $${escape(comp.price_avg)}</span>` : ''}
            </div>

            ${list ? `
              <div class="mt-4 rounded-xl bg-surface-container/60 p-3 text-body-sm border border-outline-variant/20 flex flex-col gap-1.5">
                <div class="flex items-center gap-2 text-on-surface">
                  <span class="material-symbols-outlined text-base text-primary">storefront</span>
                  <span>${t('Seller:')} <strong class="text-primary font-semibold">${escape(list.seller_username)}</strong></span>
                </div>
                ${list.used_condition ? `
                  <div class="text-xs text-on-surface-variant mt-0.5">
                    <strong>${t('Condition:')}</strong> ${escape(list.used_condition)}
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div class="mt-5">
              <h3 class="font-code-sm uppercase text-xs tracking-wider text-on-surface-variant font-semibold mb-2.5">
                ${t('Technical specifications')}
              </h3>
              <dl class="grid grid-cols-2 gap-2 text-body-sm">
                ${specs.map(s => `
                  <div class="rounded-xl bg-surface-container/80 p-2.5 border border-outline-variant/15">
                    <dt class="text-xs text-on-surface-variant mb-0.5">${escape(s.label)}</dt>
                    <dd class="font-semibold ${s.highlight ? 'text-primary' : 'text-on-surface'}">${escape(s.value)}</dd>
                  </div>
                `).join('')}
              </dl>
            </div>

            <div class="mt-5">
              <p class="text-body-sm text-on-surface-variant leading-relaxed">
                ${escape(list?.description || comp.description || '')}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-8 pt-5 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
          ${context === 'builder' ? `
            <div class="text-xs text-on-surface-variant flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm text-primary">info</span>
              <span>${t('PC Builder')}</span>
            </div>
            <div class="flex items-center gap-3 ml-auto">
              <button type="button" data-modal-close class="rounded-xl bg-surface-container-high px-4 py-2.5 text-body-sm font-semibold text-on-surface hover:bg-surface-container-highest transition-colors">
                ${t('Close')}
              </button>
              <button type="button" data-action-add-build="${comp.id}" class="rounded-xl bg-primary px-6 py-2.5 text-body-sm font-semibold text-on-primary hover:bg-primary/90 flex items-center gap-2 shadow-md transition-all">
                <span class="material-symbols-outlined text-lg">add_circle</span>
                <span>${t('Add to build')}</span>
              </button>
            </div>
          ` : context === 'marketplace' && list ? `
            ${disableBuyerActions ? `
              <div class="rounded-xl bg-surface-container px-3.5 py-2 text-xs text-on-surface-variant flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-tertiary">shield</span>
                <span>${isOwner ? t('You cannot purchase your own listing.') : t('Buyer actions unavailable for staff/seller.')}</span>
              </div>
              <button type="button" data-modal-close class="rounded-xl bg-surface-container-high px-5 py-2.5 text-body-sm font-semibold text-on-surface hover:bg-surface-container-highest transition-colors ml-auto">
                ${t('Close')}
              </button>
            ` : `
              <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto ml-auto">
                <button type="button" data-action-chat="${list.id}" class="flex-1 sm:flex-initial rounded-xl border border-primary/40 bg-surface-container-high hover:bg-surface-container-highest px-4 py-2.5 text-body-sm font-semibold text-primary flex items-center justify-center gap-1.5 transition-colors">
                  <span class="material-symbols-outlined text-lg">chat</span>
                  <span>${t('Chat with seller')}</span>
                </button>
                <button type="button" data-action-cart="${list.id}" class="flex-1 sm:flex-initial rounded-xl bg-surface-container-high hover:bg-surface-container-highest px-4 py-2.5 text-body-sm font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors">
                  <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
                  <span>${t('Add to cart')}</span>
                </button>
                <button type="button" data-action-buy="${list.id}" class="w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 text-body-sm font-semibold text-on-primary hover:bg-primary/90 flex items-center justify-center gap-1.5 shadow-md transition-all">
                  <span class="material-symbols-outlined text-lg">shopping_bag</span>
                  <span>${t('Buy now')}</span>
                </button>
              </div>
            `}
          ` : `
            <div class="flex items-center gap-3 ml-auto">
              <a href="/builder/" class="rounded-xl bg-surface-container-high hover:bg-surface-container-highest px-4 py-2.5 text-body-sm font-semibold text-primary flex items-center gap-1.5 transition-colors">
                <span class="material-symbols-outlined text-base">build</span>
                <span>${t('Open in PC Builder')}</span>
              </a>
              <button type="button" data-modal-close class="rounded-xl bg-surface-container px-4 py-2.5 text-body-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors">
                ${t('Close')}
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    dialog.querySelectorAll('[data-modal-close]').forEach(b => {
      b.onclick = () => dialog.close();
    });

    const addBuildBtn = dialog.querySelector('[data-action-add-build]');
    if (addBuildBtn) {
      addBuildBtn.onclick = async () => {
        addBuildBtn.disabled = true;
        await addComponentToBuild(Number(addBuildBtn.dataset.actionAddBuild));
        dialog.close();
      };
    }

    const chatBtn = dialog.querySelector('[data-action-chat]');
    if (chatBtn) {
      chatBtn.onclick = async () => {
        if (!token()) {
          location.href = '/accounts/login/';
          return;
        }
        chatBtn.disabled = true;
        chatBtn.textContent = 'Connecting…';
        try {
          const room = await request('/chat/rooms/', {
            method: 'POST',
            body: JSON.stringify({ listing_id: Number(chatBtn.dataset.actionChat) })
          });
          dialog.close();
          location.href = `/chat/?room=${room.id}&listing=${list.id}`;
        } catch {
          showToast('Could not start chat with seller.', true);
          chatBtn.disabled = false;
          chatBtn.textContent = t('Chat with seller');
        }
      };
    }

    const cartBtn = dialog.querySelector('[data-action-cart]');
    if (cartBtn) {
      cartBtn.onclick = async () => {
        if (!token()) {
          location.href = '/accounts/login/';
          return;
        }
        cartBtn.disabled = true;
        try {
          await request('/marketplace/cart/', {
            method: 'POST',
            body: JSON.stringify({ listing_id: Number(cartBtn.dataset.actionCart), quantity: 1 })
          });
          cartBtn.innerHTML = `<span class="material-symbols-outlined text-lg">check</span><span>${t('Added to cart')}</span>`;
          showToast(t('Added to cart'));
          await loadFloatingCart(true);
        } catch {
          cartBtn.textContent = 'Error';
          cartBtn.disabled = false;
        }
      };
    }

    const buyBtn = dialog.querySelector('[data-action-buy]');
    if (buyBtn) {
      buyBtn.onclick = async () => {
        if (!token()) {
          location.href = '/accounts/login/';
          return;
        }
        buyBtn.disabled = true;
        try {
          await request('/marketplace/cart/', {
            method: 'POST',
            body: JSON.stringify({ listing_id: Number(buyBtn.dataset.actionBuy), quantity: 1 })
          });
          dialog.close();
          await loadFloatingCart(true);
          openCheckoutModal();
        } catch {
          showToast('Could not process purchase.', true);
          buyBtn.disabled = false;
        }
      };
    }
  };

  // Add component to build (auto-creates build if none exists)
  const addComponentToBuild = async componentId => {
    if (!token()) {
      showToast(t('Please sign in to add to build.'), true);
      setTimeout(() => { location.href = '/accounts/login/'; }, 800);
      return;
    }

    if (!activeBuild) {
      try {
        showToast(t('Creating build…'));
        const newBuild = await request('/builder/builds/', {
          method: 'POST',
          body: JSON.stringify({ title: t('New build') || 'New PC Build' })
        });
        activeBuild = newBuild;
        sessionStorage.setItem('pcforge.activeBuildId', newBuild.id);
        if (typeof window.pcforgeLoadBuilds === 'function') {
          await window.pcforgeLoadBuilds(newBuild.id);
        }
      } catch {
        showToast(t('Could not create the build.'), true);
        return;
      }
    }

    try {
      const updated = await request(`/builder/builds/${activeBuild.id}/add_item/`, {
        method: 'POST',
        body: JSON.stringify({ component_id: Number(componentId), quantity: 1 })
      });
      activeBuild = updated;
      if (typeof window.pcforgeRenderActiveBuild === 'function') {
        window.pcforgeRenderActiveBuild(updated);
      }
      showToast(t('Component added.'));
      const feedback = document.querySelector('#builder-feedback');
      if (feedback) {
        feedback.textContent = (updated.compatibility_errors || []).length
          ? t('Resolve the compatibility issues before saving.')
          : t('Component added.');
      }
    } catch {
      showToast(t('Could not add this component.'), true);
    }
  };

  // -------------------------------------------------------------
  // Admin Panel Modal
  // -------------------------------------------------------------
  let adminModal = null;
  const getOrCreateAdminModal = () => {
    if (!adminModal) {
      adminModal = document.querySelector('#admin-panel-modal');
      if (!adminModal) {
        adminModal = document.createElement('dialog');
        adminModal.id = 'admin-panel-modal';
        adminModal.className = 'w-[min(94vw,940px)] max-h-[92vh] overflow-y-auto rounded-2xl bg-surface-container-low p-0 text-on-surface shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-xs border border-outline-variant/35';
        document.body.append(adminModal);
        adminModal.addEventListener('click', event => {
          if (event.target === adminModal) adminModal.close();
        });
      }
    }
    return adminModal;
  };

  const openAdminPanelModal = async () => {
    const dialog = getOrCreateAdminModal();
    dialog.innerHTML = '<div class="p-8 text-center text-on-surface-variant"><span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span><p class="mt-2 text-body-sm">Loading admin console…</p></div>';
    dialog.showModal();

    dialog.innerHTML = `
      <div class="relative p-6 sm:p-8 flex flex-col gap-6">
        <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </div>
            <div>
              <h2 class="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span>${t('Admin panel')}</span>
                <span class="rounded bg-primary/15 text-primary text-[10px] font-code-sm px-2 py-0.5">ROOT ACCESS</span>
              </h2>
              <p class="text-xs text-on-surface-variant">System administration, role governance & real-time telemetry</p>
            </div>
          </div>
          <button type="button" data-admin-modal-close class="h-8 w-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div class="flex flex-wrap gap-2 border-b border-outline-variant/20 pb-3" role="tablist">
          <button type="button" data-admin-tab="dashboard" class="rounded-xl px-4 py-2 font-semibold text-body-sm transition-all flex items-center gap-2 bg-primary text-on-primary shadow-sm">
            <span class="material-symbols-outlined text-lg">insights</span>
            <span>${t('Dashboard & Broadcast')}</span>
          </button>
          <button type="button" data-admin-tab="roles" class="rounded-xl px-4 py-2 font-medium text-body-sm transition-all flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface">
            <span class="material-symbols-outlined text-lg">manage_accounts</span>
            <span>${t('Role management')}</span>
          </button>
          <button type="button" data-admin-tab="bans" class="rounded-xl px-4 py-2 font-medium text-body-sm transition-all flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface">
            <span class="material-symbols-outlined text-lg">block</span>
            <span>${t('User ban management')}</span>
          </button>
        </div>

        <div data-admin-section="dashboard" class="flex flex-col gap-6">
          <div>
            <h3 class="text-xs font-code-sm uppercase tracking-wider text-primary font-semibold mb-3">${t('Platform statistics')}</h3>
            <div id="admin-stats-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div class="rounded-xl bg-surface-container p-3.5 border border-outline-variant/20"><p class="text-xs text-on-surface-variant">${t('Total listings')}</p><p id="stat-listings" class="text-2xl font-bold text-on-surface mt-1">…</p></div>
              <div class="rounded-xl bg-surface-container p-3.5 border border-outline-variant/20"><p class="text-xs text-on-surface-variant">${t('Active chats')}</p><p id="stat-chats" class="text-2xl font-bold text-primary mt-1">…</p></div>
              <div class="rounded-xl bg-surface-container p-3.5 border border-outline-variant/20"><p class="text-xs text-on-surface-variant">${t('Saved builds')}</p><p id="stat-builds" class="text-2xl font-bold text-on-surface mt-1">…</p></div>
              <div class="rounded-xl bg-surface-container p-3.5 border border-outline-variant/20"><p class="text-xs text-on-surface-variant">${t('Registered users')}</p><p id="stat-users" class="text-2xl font-bold text-on-surface mt-1">…</p></div>
              <div class="rounded-xl bg-surface-container p-3.5 border border-outline-variant/20"><p class="text-xs text-on-surface-variant">${t('Components in catalog')}</p><p id="stat-components" class="text-2xl font-bold text-on-surface mt-1">…</p></div>
            </div>
          </div>

          <div class="rounded-2xl bg-surface-container/70 p-5 border border-outline-variant/25 flex flex-col gap-4">
            <div class="flex items-center gap-2 text-primary">
              <span class="material-symbols-outlined text-xl">campaign</span>
              <h3 class="font-bold text-body-md text-on-surface">${t('Send system broadcast')}</h3>
            </div>
            <p class="text-xs text-on-surface-variant">Sends instant real-time notification to all connected browser clients across the platform via WebSockets.</p>
            <form id="admin-broadcast-form" class="grid gap-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2">
                  <label class="block text-xs text-on-surface-variant mb-1">${t('Notification title')}</label>
                  <input name="title" required maxlength="120" value="Системное уведомление" class="w-full rounded-xl bg-surface-container-lowest px-3.5 py-2 text-body-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary">
                </div>
                <div>
                  <label class="block text-xs text-on-surface-variant mb-1">Level / Priority</label>
                  <select name="level" class="w-full rounded-xl bg-surface-container-lowest px-3.5 py-2 text-body-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary">
                    <option value="info">Info (Default)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="critical">Critical (Red alert)</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs text-on-surface-variant mb-1">${t('Broadcast message')}</label>
                <textarea name="message" rows="3" required placeholder="Type platform-wide message to broadcast…" class="w-full rounded-xl bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"></textarea>
              </div>
              <div class="flex justify-end pt-1">
                <button type="submit" class="rounded-xl bg-primary px-5 py-2.5 text-body-sm font-semibold text-on-primary hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm">
                  <span class="material-symbols-outlined text-lg">podcasts</span>
                  <span>${t('Send to all clients')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div data-admin-section="roles" class="hidden flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="relative flex-1">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input id="admin-role-search-input" type="text" placeholder="${t('Search users by username or ID…')}" class="w-full rounded-xl bg-surface-container-lowest pl-9 pr-4 py-2 text-body-sm text-on-surface border border-outline-variant/25 focus:outline-none focus:border-primary">
            </div>
          </div>
          <div id="admin-roles-table-container" class="max-h-[380px] overflow-y-auto rounded-xl border border-outline-variant/25 bg-surface-container/40">
            <p class="p-6 text-center text-on-surface-variant text-body-sm">Loading users…</p>
          </div>
        </div>

        <div data-admin-section="bans" class="hidden flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="relative flex-1">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input id="admin-ban-search-input" type="text" placeholder="${t('Search users by username or ID…')}" class="w-full rounded-xl bg-surface-container-lowest pl-9 pr-4 py-2 text-body-sm text-on-surface border border-outline-variant/25 focus:outline-none focus:border-primary">
            </div>
          </div>
          <div id="admin-bans-table-container" class="max-h-[380px] overflow-y-auto rounded-xl border border-outline-variant/25 bg-surface-container/40">
            <p class="p-6 text-center text-on-surface-variant text-body-sm">Loading users…</p>
          </div>
        </div>
      </div>
    `;

    dialog.querySelectorAll('[data-admin-modal-close]').forEach(b => {
      b.onclick = () => dialog.close();
    });

    const tabBtns = dialog.querySelectorAll('[data-admin-tab]');
    const sections = dialog.querySelectorAll('[data-admin-section]');
    const switchTab = tabName => {
      tabBtns.forEach(btn => {
        const isSelected = btn.dataset.adminTab === tabName;
        btn.classList.toggle('bg-primary', isSelected);
        btn.classList.toggle('text-on-primary', isSelected);
        btn.classList.toggle('shadow-sm', isSelected);
        btn.classList.toggle('bg-surface-container', !isSelected);
        btn.classList.toggle('text-on-surface', !isSelected);
      });
      sections.forEach(sec => {
        sec.classList.toggle('hidden', sec.dataset.adminSection !== tabName);
      });
      if (tabName === 'roles') loadAdminUsers('roles');
      if (tabName === 'bans') loadAdminUsers('bans');
    };
    tabBtns.forEach(btn => btn.onclick = () => switchTab(btn.dataset.adminTab));

    try {
      const stats = await request('/auth/admin/stats/');
      dialog.querySelector('#stat-listings').textContent = stats.total_listings ?? 0;
      dialog.querySelector('#stat-chats').textContent = stats.total_chats ?? 0;
      dialog.querySelector('#stat-builds').textContent = stats.total_builds ?? 0;
      dialog.querySelector('#stat-users').textContent = stats.total_users ?? 0;
      dialog.querySelector('#stat-components').textContent = stats.total_components ?? 0;
    } catch {}

    const broadcastForm = dialog.querySelector('#admin-broadcast-form');
    broadcastForm.onsubmit = async event => {
      event.preventDefault();
      const title = broadcastForm.elements.title.value.trim();
      const message = broadcastForm.elements.message.value.trim();
      const level = broadcastForm.elements.level.value;
      const submitBtn = broadcastForm.querySelector('button[type=submit]');
      submitBtn.disabled = true;
      try {
        await request('/auth/admin/broadcast/', {
          method: 'POST',
          body: JSON.stringify({ title, message, level })
        });
        broadcastForm.elements.message.value = '';
        showToast(t('Broadcast sent successfully.'));
      } catch {
        showToast('Could not send broadcast.', true);
      } finally {
        submitBtn.disabled = false;
      }
    };

    const loadAdminUsers = async (viewKind, searchTerm = '') => {
      const containerId = viewKind === 'roles' ? '#admin-roles-table-container' : '#admin-bans-table-container';
      const container = dialog.querySelector(containerId);
      if (!container) return;
      try {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
        const users = await request(`/auth/admin/users/${query}`);
        if (!users.length) {
          container.innerHTML = `<p class="p-6 text-center text-on-surface-variant text-body-sm">${t('No results match your search.')}</p>`;
          return;
        }

        if (viewKind === 'roles') {
          container.innerHTML = `
            <table class="w-full text-left text-body-sm">
              <thead class="bg-surface-container-high/60 text-xs font-semibold text-on-surface-variant uppercase border-b border-outline-variant/20 sticky top-0 backdrop-blur">
                <tr>
                  <th class="py-2.5 px-4">User</th>
                  <th class="py-2.5 px-4">${t('Role')}</th>
                  <th class="py-2.5 px-4 text-right">${t('Actions')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/15">
                ${users.map(u => `
                  <tr class="hover:bg-surface-container-high/40 transition-colors">
                    <td class="py-3 px-4">
                      <div class="font-semibold text-on-surface">${escape(u.username)}</div>
                      <div class="text-[11px] text-on-surface-variant">ID: ${u.id} · ${escape(u.email)}</div>
                    </td>
                    <td class="py-3 px-4">
                      <span class="rounded-full px-2.5 py-0.5 text-xs font-code-sm font-semibold ${u.role === 'Admin' ? 'bg-primary/15 text-primary border border-primary/30' : u.role === 'Manager' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-high text-on-surface-variant'}">
                        ${setRoleText(u.role)}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      ${u.role === 'Admin' ? `
                        <span class="text-xs text-on-surface-variant/70 italic">${t('Superuser')}</span>
                      ` : u.role === 'Manager' ? `
                        <button type="button" data-demote-user="${u.id}" class="rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-tertiary px-3 py-1.5 text-xs font-semibold transition-colors">
                          ${t('Demote to Buyer')}
                        </button>
                      ` : `
                        <button type="button" data-promote-user="${u.id}" class="rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/35 px-3 py-1.5 text-xs font-semibold transition-colors">
                          ${t('Promote to Manager')}
                        </button>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;

          container.querySelectorAll('[data-promote-user]').forEach(btn => {
            btn.onclick = async () => {
              btn.disabled = true;
              try {
                await request(`/auth/admin/users/${btn.dataset.promoteUser}/set_role/`, {
                  method: 'POST',
                  body: JSON.stringify({ role: 'Manager' })
                });
                showToast(t('User role updated.'));
                loadAdminUsers('roles', searchTerm);
              } catch {
                showToast('Failed to update user role.', true);
                btn.disabled = false;
              }
            };
          });

          container.querySelectorAll('[data-demote-user]').forEach(btn => {
            btn.onclick = async () => {
              btn.disabled = true;
              try {
                await request(`/auth/admin/users/${btn.dataset.demoteUser}/set_role/`, {
                  method: 'POST',
                  body: JSON.stringify({ role: 'Buyer' })
                });
                showToast(t('User role updated.'));
                loadAdminUsers('roles', searchTerm);
              } catch {
                showToast('Failed to update user role.', true);
                btn.disabled = false;
              }
            };
          });
        } else {
          container.innerHTML = `
            <table class="w-full text-left text-body-sm">
              <thead class="bg-surface-container-high/60 text-xs font-semibold text-on-surface-variant uppercase border-b border-outline-variant/20 sticky top-0 backdrop-blur">
                <tr>
                  <th class="py-2.5 px-4">User</th>
                  <th class="py-2.5 px-4">${t('Status')}</th>
                  <th class="py-2.5 px-4 text-right">${t('Actions')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/15">
                ${users.map(u => `
                  <tr class="hover:bg-surface-container-high/40 transition-colors">
                    <td class="py-3 px-4">
                      <div class="font-semibold text-on-surface">${escape(u.username)}</div>
                      <div class="text-[11px] text-on-surface-variant">Joined: ${u.date_joined}</div>
                    </td>
                    <td class="py-3 px-4">
                      <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.is_active ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}">
                        ${u.is_active ? t('Active') : t('Blocked')}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      ${u.is_self ? `
                        <span class="text-xs text-on-surface-variant/70 italic">${t('Cannot block yourself')}</span>
                      ` : u.role === 'Admin' ? `
                        <span class="text-xs text-on-surface-variant/70 italic">${t('Superuser')}</span>
                      ` : `
                        <button type="button" data-toggle-ban="${u.id}" class="rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${u.is_active ? 'bg-error-container hover:opacity-90 text-on-error-container' : 'bg-primary-container hover:opacity-90 text-on-primary-container'}">
                          ${u.is_active ? t('Block user') : t('Unblock user')}
                        </button>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;

          container.querySelectorAll('[data-toggle-ban]').forEach(btn => {
            btn.onclick = async () => {
              btn.disabled = true;
              try {
                await request(`/auth/admin/users/${btn.dataset.toggleBan}/toggle_block/`, { method: 'POST' });
                showToast(t('User status updated.'));
                loadAdminUsers('bans', searchTerm);
              } catch {
                showToast('Failed to change user status.', true);
                btn.disabled = false;
              }
            };
          });
        }
      } catch {
        container.innerHTML = '<p class="p-6 text-center text-error text-body-sm">Could not load users list.</p>';
      }
    };

    const roleSearch = dialog.querySelector('#admin-role-search-input');
    if (roleSearch) {
      roleSearch.oninput = () => loadAdminUsers('roles', roleSearch.value.trim());
    }
    const banSearch = dialog.querySelector('#admin-ban-search-input');
    if (banSearch) {
      banSearch.oninput = () => loadAdminUsers('bans', banSearch.value.trim());
    }
  };

  // Listing card HTML
  const listingCard = item => {
    const c = item.component || {};
    const image = c.image || '';
    const categoryIcon = getCategoryIcon(c.category_name);
    return `
      <article class="group bg-surface-container-low rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:bg-surface-container transition-all border border-outline-variant/25 hover:border-outline-variant/50" data-listing-id="${item.id}">
        <div class="block h-52 bg-surface-container overflow-hidden relative">
          ${image ? `
            <img src="${escape(image)}" alt="${escape(c.brand)} ${escape(c.name)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
          ` : `
            <div class="h-full flex flex-col items-center justify-center text-primary gap-2">
              <span class="material-symbols-outlined text-6xl text-primary/80">${categoryIcon}</span>
            </div>
          `}
          <span class="absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${item.condition === 'new' ? 'bg-primary-container text-on-primary-container' : 'bg-tertiary-container text-on-tertiary-container'}">
            ${t(item.condition === 'new' ? 'New' : 'Used')}
          </span>
        </div>
        <div class="p-5 flex flex-col">
          <p class="text-primary font-code-sm text-xs uppercase tracking-wider font-semibold">${escape(c.category_name || c.brand || 'Hardware')}</p>
          <h2 class="mt-1 font-headline-sm font-semibold leading-snug line-clamp-1">${escape(c.brand)} ${escape(c.name)}</h2>
          <p class="mt-2 text-on-surface-variant text-body-sm line-clamp-2 leading-relaxed">${escape(item.description || c.description || '')}</p>
          
          <div class="mt-4 flex justify-between items-baseline">
            <strong class="text-2xl font-bold text-primary">$${escape(item.price)}</strong>
            <span class="text-xs text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">person</span>${escape(item.seller_username)}
            </span>
          </div>

          <div class="mt-4 pt-3 border-t border-outline-variant/20 flex gap-2">
            <button class="flex-1 rounded-xl bg-primary px-3 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors shadow-sm" data-add-to-cart="${item.id}" type="button">
              ${t('Add to cart')}
            </button>
            <button class="rounded-xl bg-surface-container-high px-3 py-2 text-body-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors" data-open-detail="${item.id}" type="button">
              ${t('Details')}
            </button>
          </div>
        </div>
      </article>
    `;
  };

  const profileButton = document.querySelector('header button:last-of-type');
  const postListingButton = [...document.querySelectorAll('header button')].find(
    button => button.querySelector('.material-symbols-outlined')?.textContent.trim() === 'add'
  );
  const setPostButtonVisible = visible => {
    if (!postListingButton) return;
    postListingButton.style.display = visible ? 'inline-flex' : 'none';
    postListingButton.classList.toggle('hidden', !visible);
  };
  const setRoleText = role => window.pcforgeLanguage?.t(role) || role;

  const renderProfile = user => {
    if (!profileButton) return;
    profileButton.replaceChildren();
    profileButton.className = 'flex items-center gap-2 rounded-xl bg-surface-container-lowest border border-outline-variant/25 px-3 py-1.5 text-on-surface hover:bg-surface-container-high transition-colors';
    if (!user) {
      const label = document.createElement('span');
      label.textContent = t('Sign in');
      profileButton.append(label);
      profileButton.setAttribute('aria-label', label.textContent);
      profileButton.onclick = () => location.href = '/accounts/login/';
      return;
    }
    const name = document.createElement('span');
    name.className = 'font-body-sm font-medium';
    name.textContent = user.username;
    const badge = document.createElement('span');
    badge.dataset.roleBadge = 'true';
    badge.className = 'rounded-md bg-surface-container-high px-2 py-0.5 font-code-sm text-xs font-semibold text-primary';
    badge.textContent = `[${setRoleText(user.role)}]`;
    profileButton.append(name, badge);
    profileButton.setAttribute('aria-label', `${user.username} [${user.role}]`);
    profileButton.onclick = () => location.href = '/accounts/session/';
  };

  // -------------------------------------------------------------
  // Post Listing Dialog
  // -------------------------------------------------------------
  const renderListingForm = async (listing = null) => {
    let dialog = document.querySelector('#listing-editor-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'listing-editor-dialog';
      dialog.className = 'w-[min(92vw,680px)] max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-low p-0 text-on-surface shadow-2xl backdrop:bg-black/60 border border-outline-variant/30';
      dialog.innerHTML = `
        <form class="grid gap-4 p-6">
          <div class="flex items-center justify-between">
            <h2 class="text-headline-lg font-bold" data-dialog-title>New listing</h2>
            <button type="button" data-dialog-close class="rounded-full h-8 w-8 bg-surface-container-high flex items-center justify-center">✕</button>
          </div>
          <label class="grid gap-1 text-body-sm">Condition
            <select name="condition" required class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3 text-body-sm">
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </label>
          <label class="grid gap-1 text-body-sm">Category
            <select name="category" required class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3 text-body-sm">
              <option value="">Select a category…</option>
            </select>
          </label>
          <label class="grid gap-1 text-body-sm">Component model
            <select name="model_id" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3 text-body-sm" disabled>
              <option value="">Select a category first…</option>
            </select>
          </label>
          <section data-manual-fields class="hidden grid gap-4 rounded-xl bg-surface-container p-4">
            <h3 class="font-semibold text-body-sm">Component details</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-1 text-body-sm">Component name<input name="name" maxlength="200" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3"></label>
              <label class="grid gap-1 text-body-sm">Brand<input name="brand" maxlength="100" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3"></label>
            </div>
            <fieldset class="grid gap-3">
              <legend class="font-semibold text-body-sm">Specifications</legend>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="grid gap-1 text-xs">TDP (W)<input name="tdp" type="number" min="0" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5"></label>
                <label class="grid gap-1 text-xs">PSU capacity (W)<input name="power_supply" type="number" min="0" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5"></label>
                <label class="grid gap-1 text-xs">Socket<input name="socket" placeholder="AM5, LGA1700…" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5"></label>
                <label class="grid gap-1 text-xs">Memory type
                  <select name="ram_type" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5">
                    <option value="">Not applicable</option>
                    <option value="DDR4">DDR4</option>
                    <option value="DDR5">DDR5</option>
                  </select>
                </label>
                <label class="grid gap-1 text-xs">Form factor
                  <select name="form_factor" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5">
                    <option value="">Not applicable</option>
                    <option value="ATX">ATX</option>
                    <option value="Micro-ATX">Micro-ATX</option>
                    <option value="Mini-ITX">Mini-ITX</option>
                  </select>
                </label>
                <label class="grid gap-1 text-xs">Length (mm)<input name="length_mm" type="number" min="0" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5"></label>
                <label class="grid gap-1 text-xs">Height (mm)<input name="height_mm" type="number" min="0" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5"></label>
                <label class="grid gap-1 text-xs">Maximum GPU length (mm)<input name="max_gpu_length_mm" type="number" min="0" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5"></label>
                <label class="grid gap-1 text-xs">Maximum cooler height (mm)<input name="max_cooler_height_mm" type="number" min="0" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5"></label>
              </div>
            </fieldset>
          </section>
          <label data-used-condition-field class="hidden grid gap-1 text-body-sm">Exact used condition
            <input name="used_condition" maxlength="120" placeholder="Good, minor scratches…" class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3">
          </label>
          <label class="grid gap-1 text-body-sm">Price
            <input name="price" type="number" min="0.01" step="0.01" required class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3">
          </label>
          <label class="grid gap-1 text-body-sm">Description
            <textarea name="description" rows="3" required class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-3"></textarea>
          </label>
          <p data-form-error class="text-error text-body-sm" role="alert"></p>
          <button class="rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary/90" type="submit">Save listing</button>
        </form>
      `;
      document.body.append(dialog);
      dialog.querySelector('[data-dialog-close]').onclick = () => dialog.close();
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.querySelector('[name=condition]').addEventListener('change', () => syncListingMode(dialog));
      dialog.querySelector('[name=category]').addEventListener('change', () => populateModels(dialog));
      dialog.querySelector('[name=model_id]').addEventListener('change', () => syncListingMode(dialog));
      dialog.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const condition = form.elements.condition.value;
        const model = form.elements.model_id.value;
        const isExisting = condition === 'used' && model && model !== 'other';
        const numeric = (val, fallback = null) => val === '' ? fallback : Number(val);
        const payload = {
          price: form.elements.price.value,
          condition,
          used_condition: condition === 'used' ? form.elements.used_condition.value.trim() : '',
          description: form.elements.description.value,
          is_active: true
        };
        if (isExisting) {
          payload.component_id = Number(model);
        } else {
          payload.new_component = {
            category: Number(form.elements.category.value),
            name: form.elements.name.value.trim(),
            brand: form.elements.brand.value.trim(),
            tdp: numeric(form.elements.tdp.value, 0),
            power_supply: numeric(form.elements.power_supply.value, 0),
            socket: form.elements.socket.value.trim() || null,
            ram_type: form.elements.ram_type.value || null,
            form_factor: form.elements.form_factor.value || null,
            length_mm: numeric(form.elements.length_mm.value),
            height_mm: numeric(form.elements.height_mm.value),
            max_gpu_length_mm: numeric(form.elements.max_gpu_length_mm.value),
            max_cooler_height_mm: numeric(form.elements.max_cooler_height_mm.value)
          };
        }
        const target = dialog.dataset.listingId ? `/marketplace/listings/${dialog.dataset.listingId}/` : '/marketplace/listings/';
        try {
          await request(target, { method: dialog.dataset.listingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
          dialog.close();
          showToast('Listing saved.');
          if (location.pathname === '/accounts/session/') loadManagerListings();
          else if (location.pathname === '/') location.reload();
        } catch {
          form.querySelector('[data-form-error]').textContent = 'Could not save listing. Check the required fields and your permissions.';
        }
      });
    }

    const form = dialog.querySelector('form');
    form.reset();
    dialog.dataset.listingId = listing?.id || '';
    dialog.querySelector('[data-dialog-title]').textContent = listing ? 'Edit listing' : 'New listing';
    try {
      const [componentData, categoryData] = await Promise.all([
        request('/components/components/'),
        request('/components/categories/')
      ]);
      dialog._components = Array.isArray(componentData) ? componentData : (componentData.results || []);
      dialog._categories = Array.isArray(categoryData) ? categoryData : (categoryData.results || []);
      form.elements.category.innerHTML = `<option value="">Select a category…</option>${dialog._categories.map(category => `<option value="${category.id}">${escape(category.name)}</option>`).join('')}`;
    } catch {
      dialog._components = [];
      dialog._categories = [];
    }

    form.elements.price.value = listing?.price || '';
    form.elements.condition.value = listing?.condition || 'new';
    form.elements.description.value = listing?.description || '';
    form.elements.used_condition.value = listing?.used_condition || '';
    if (listing) {
      const comp = listing.component;
      form.elements.category.value = comp.category;
      populateModels(dialog, comp.id);
      form.elements.name.value = comp.name;
      form.elements.brand.value = comp.brand;
      for (const field of ['tdp', 'power_supply', 'socket', 'ram_type', 'form_factor', 'length_mm', 'height_mm', 'max_gpu_length_mm', 'max_cooler_height_mm']) {
        form.elements[field].value = comp[field] ?? '';
      }
    }
    syncListingMode(dialog);
    dialog.querySelector('[data-form-error]').textContent = '';
    dialog.showModal();
  };

  const populateModels = (dialog, selectedId = '') => {
    const form = dialog.querySelector('form');
    const categoryId = Number(form.elements.category.value);
    const options = (dialog._components || []).filter(c => c.category === categoryId);
    const modelSelect = form.elements.model_id;
    modelSelect.innerHTML = `<option value="">${categoryId ? 'Select a model…' : 'Select a category first…'}</option>${options.map(c => `<option value="${c.id}">${escape(c.brand)} ${escape(c.name)}</option>`).join('')}<option value="other">Other (not listed)</option>`;
    modelSelect.disabled = !categoryId;
    if (selectedId) modelSelect.value = String(selectedId);
    syncListingMode(dialog);
  };

  const syncListingMode = dialog => {
    const form = dialog.querySelector('form');
    const condition = form.elements.condition.value;
    const model = form.elements.model_id.value;
    const manual = condition === 'new' || (condition === 'used' && model === 'other');
    const used = condition === 'used';
    const manualPanel = dialog.querySelector('[data-manual-fields]');
    manualPanel.classList.toggle('hidden', !manual);
    manualPanel.querySelectorAll('input,select,textarea').forEach(control => control.disabled = !manual);
    dialog.querySelector('[data-used-condition-field]').classList.toggle('hidden', !used);
    form.elements.category.required = true;
    form.elements.model_id.required = used;
    form.elements.name.required = manual;
    form.elements.brand.required = manual;
    form.elements.used_condition.required = used;
  };

  const configureRoleControls = async () => {
    if (!token()) {
      renderProfile(null);
      setPostButtonVisible(false);
      syncCartButtons();
      updateUnreadBadge();
      loadFloatingCart(false);
      initGlobalSocket();
      if (page.startsWith('/accounts/session/')) {
        document.querySelector('#account-identity').textContent = t('You are not signed in.');
        document.querySelector('#account-guest')?.classList.remove('hidden');
      }
      return;
    }
    try {
      currentUser = await request('/auth/me/');
      renderProfile(currentUser);
    } catch {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(refreshKey);
      currentUser = null;
      renderProfile(null);
      setPostButtonVisible(false);
      syncCartButtons();
      updateUnreadBadge();
      loadFloatingCart(false);
      if (page.startsWith('/accounts/session/')) {
        document.querySelector('#account-identity').textContent = t('You are not signed in.');
        document.querySelector('#account-guest')?.classList.remove('hidden');
      }
      return;
    }
    const canPost = ['Manager', 'Admin'].includes(currentUser.role);
    if (postListingButton) {
      setPostButtonVisible(canPost);
      postListingButton.classList.toggle('ring-1', canPost);
      postListingButton.classList.toggle('ring-primary/50', canPost);
      postListingButton.onclick = () => renderListingForm();
    }
    syncCartButtons();
    updateUnreadBadge();
    loadFloatingCart(false);
    initGlobalSocket();
    if (page.startsWith('/accounts/session/')) renderAccount(currentUser);
  };

  configureRoleControls();

  function syncCartButtons() {
    document.querySelectorAll('[data-add-to-cart]').forEach(button => {
      button.classList.toggle('hidden', currentUser && ['Admin', 'Manager'].includes(currentUser.role));
    });
  }

  const loadManagerListings = async () => {
    const root = document.querySelector('#manager-listings');
    if (!root) return;
    root.innerHTML = '<p class="text-on-surface-variant">Loading your listings…</p>';
    try {
      const data = await request('/marketplace/listings/mine/');
      const items = Array.isArray(data) ? data : (data.results || []);
      root.innerHTML = items.length ? items.map(item => `
        <article class="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/25">
          <p class="font-code-sm text-xs text-primary uppercase">${escape(item.component.category_name || '')}</p>
          <h3 class="mt-2 text-headline-sm font-semibold">${escape(item.component.brand)} ${escape(item.component.name)}</h3>
          <p class="mt-2 text-primary font-bold text-lg">$${escape(item.price)} · <span class="text-on-surface-variant text-sm font-normal">${escape(item.condition)}</span></p>
          <div class="mt-4 flex gap-2">
            <button class="rounded-xl bg-surface-container-high px-4 py-2 text-body-sm font-medium" data-edit-listing="${item.id}">Edit</button>
            <button class="rounded-xl bg-error-container px-4 py-2 text-body-sm text-on-error-container font-medium" data-delete-listing="${item.id}">Delete</button>
          </div>
        </article>
      `).join('') : '<p class="rounded-2xl bg-surface-container-low p-6 border border-outline-variant/20">You have not posted any listings yet.</p>';

      root.querySelectorAll('[data-edit-listing]').forEach(button => {
        button.onclick = () => {
          const listing = items.find(item => item.id === Number(button.dataset.editListing));
          if (listing) renderListingForm(listing);
        };
      });
      root.querySelectorAll('[data-delete-listing]').forEach(button => {
        button.onclick = async () => {
          if (!window.confirm('Delete this listing?')) return;
          try {
            await request(`/marketplace/listings/${button.dataset.deleteListing}/`, { method: 'DELETE' });
            loadManagerListings();
          } catch {}
        };
      });
    } catch {
      root.innerHTML = '<p class="text-error">Could not load your listings.</p>';
    }
  };

  const loadBuyerOrders = async () => {
    const root = document.querySelector('#buyer-orders');
    if (!root) return;
    try {
      const data = await request('/marketplace/orders/');
      const orders = Array.isArray(data) ? data : (data.results || []);
      root.innerHTML = orders.length ? orders.map(order => `
        <article class="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/25 flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-outline-variant/20 pb-2.5">
            <div>
              <span class="font-code-sm text-xs uppercase font-bold text-primary">${escape(t('Order'))} #${order.id}</span>
              <span class="block text-xs text-on-surface-variant">${new Date(order.created_at).toLocaleString()}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-primary-container px-2.5 py-0.5 text-xs font-semibold text-on-primary-container">
                ${escape(t('Paid'))} •••• ${escape(order.card_last4 || '4242')}
              </span>
              <strong class="text-lg font-bold text-primary">$${escape(order.total_price)}</strong>
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            ${(order.items || []).map(item => `
              <div class="flex items-center justify-between text-body-sm">
                <span class="text-on-surface font-medium">${escape(item.component_name)} <span class="text-on-surface-variant text-xs">×${item.quantity}</span></span>
                <span class="font-semibold text-on-surface-variant">$${escape(item.price)}</span>
              </div>
            `).join('')}
          </div>
        </article>
      `).join('') : `<p class="rounded-2xl bg-surface-container-low p-5 text-on-surface-variant border border-outline-variant/20">${escape(t('No orders yet.'))}</p>`;
    } catch {
      root.innerHTML = `<p class="text-error">${escape(t('Could not load your orders.'))}</p>`;
    }
  };

  const renderAccount = async user => {
    const identity = document.querySelector('#account-identity');
    if (identity) identity.textContent = `${user.username} · ${setRoleText(user.role)}`;
    document.querySelector('#account-guest')?.classList.add('hidden');
    document.querySelector('#signout-btn')?.classList.remove('hidden');

    const adminPanelAction = document.querySelector('#admin-panel-actions');
    if (adminPanelAction) {
      const isAdmin = user.role === 'Admin';
      adminPanelAction.classList.toggle('hidden', !isAdmin);
      const openBtn = document.querySelector('#open-admin-panel-btn');
      if (openBtn) openBtn.onclick = () => openAdminPanelModal();
    }

    const manager = document.querySelector('#account-manager');
    const buyer = document.querySelector('#account-buyer');
    if (['Manager', 'Admin'].includes(user.role)) {
      manager?.classList.remove('hidden');
      buyer?.classList.add('hidden');
      loadManagerListings();
      return;
    }
    manager?.classList.add('hidden');
    buyer?.classList.remove('hidden');
    const buildsRoot = document.querySelector('#buyer-builds');
    if (buildsRoot) {
      try {
        const data = await request('/builder/builds/');
        const builds = Array.isArray(data) ? data : (data.results || []);
        buildsRoot.innerHTML = builds.length ? builds.map(b => `
          <article class="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/25">
            <h3 class="font-semibold">${escape(b.title)}</h3>
            <p class="mt-1 text-body-sm text-on-surface-variant">${b.items?.length || 0} components</p>
          </article>
        `).join('') : `<p class="rounded-2xl bg-surface-container-low p-5 text-on-surface-variant border border-outline-variant/20">${escape(t('No saved builds yet.'))}</p>`;
      } catch {
        buildsRoot.innerHTML = '<p class="text-error">Could not load your builds.</p>';
      }
    }
    loadBuyerOrders();
  };

  // Add to cart click handler
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button) return;
    event.stopPropagation();
    if (!currentUser) {
      location.href = '/accounts/login/';
      return;
    }
    if (currentUser.role !== 'Buyer') {
      showToast(t('Buyer actions unavailable for staff/seller.'), true);
      return;
    }
    try {
      await request('/marketplace/cart/', {
        method: 'POST',
        body: JSON.stringify({ listing_id: Number(button.dataset.addToCart), quantity: 1 })
      });
      button.textContent = t('Added to cart');
      showToast(t('Added to cart'));
      await loadFloatingCart(true);
    } catch {
      button.textContent = 'Could not add';
      showToast('Could not add to cart', true);
    }
  });

  // Global listener for card clicks -> open universal modal
  document.addEventListener('click', async event => {
    const detailBtn = event.target.closest('[data-open-detail]');
    if (detailBtn) {
      event.preventDefault();
      event.stopPropagation();
      openProductDetailModal({ listing: { id: Number(detailBtn.dataset.openDetail) }, context: 'marketplace' });
      return;
    }

    const listingCardEl = event.target.closest('#listing-grid [data-listing-id]');
    if (listingCardEl && !event.target.closest('button, a, input, select, textarea')) {
      const listingId = Number(listingCardEl.dataset.listingId);
      openProductDetailModal({ listing: { id: listingId }, context: 'marketplace' });
      return;
    }

    const builderCardEl = event.target.closest('#builder-components [data-component-card]');
    if (builderCardEl && !event.target.closest('button, a, input, select, textarea')) {
      let compData = null;
      if (builderCardEl.dataset.componentJson) {
        try { compData = JSON.parse(builderCardEl.dataset.componentJson); } catch {}
      }
      const compId = Number(builderCardEl.dataset.componentCard);
      openProductDetailModal({ component: compData || compId, context: 'builder' });
      return;
    }

    const componentCardEl = event.target.closest('#component-grid [data-component-card]');
    if (componentCardEl && !event.target.closest('button, a, input, select, textarea')) {
      let compData = null;
      if (componentCardEl.dataset.componentJson) {
        try { compData = JSON.parse(componentCardEl.dataset.componentJson); } catch {}
      }
      const compId = Number(componentCardEl.dataset.componentCard);
      openProductDetailModal({ component: compData || compId, context: 'components' });
      return;
    }
  });

  document.querySelector('#signout-btn')?.addEventListener('click', async () => {
    const refresh = localStorage.getItem(refreshKey);
    try {
      if (refresh) await request('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh }) });
    } catch {}
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(refreshKey);
    location.href = '/accounts/login/';
  });

  window.addEventListener('pcforge:languagechange', () => {
    if (currentUser) renderProfile(currentUser);
  });

  setInterval(updateUnreadBadge, 15000);

  // -------------------------------------------------------------
  // Page: Marketplace (/)
  // -------------------------------------------------------------
  if (page === '/') {
    const grid = region('#listing-grid');
    setMessage(grid, t('Loading products…'));
    request('/marketplace/listings/?is_active=true').then(data => {
      const items = Array.isArray(data) ? data : (data.results || []);
      grid.innerHTML = items.length ? items.map(listingCard).join('') : '<div class="col-span-full p-space-2xl rounded-2xl bg-surface-container-low text-center border border-outline-variant/25"><span class="material-symbols-outlined text-4xl text-primary">inventory_2</span><h2 class="mt-space-sm text-headline-lg font-semibold">Нет товаров</h2><p class="mt-space-sm text-on-surface-variant">Активных объявлений пока нет. Загляните позже.</p></div>';
      syncCartButtons();
    }).catch(() => setMessage(grid, t('Unable to load listings.'), true));
  }

  // -------------------------------------------------------------
  // Page: Saved builds (/builds/)
  // -------------------------------------------------------------
  if (page.startsWith('/builds/')) {
    const root = region('#builds-grid', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg');
    setMessage(root, token() ? t('Loading builds…') : t('Sign in to view your builds.'));
    if (token()) {
      request('/builder/builds/').then(d => {
        const a = Array.isArray(d) ? d : (d.results || []);
        root.innerHTML = a.length ? a.map(b => `
          <article class="p-space-md rounded-2xl bg-surface-container border border-outline-variant/25">
            <h2 class="text-headline-sm font-semibold">${escape(b.title)}</h2>
            <p class="text-body-sm text-on-surface-variant mt-1">${b.items?.length || 0} компонентов</p>
          </article>
        `).join('') : `<p class="col-span-full p-space-lg rounded-2xl bg-surface-container text-center text-on-surface-variant">${t('No saved builds yet.')}</p>`;
      }).catch(() => setMessage(root, t('Unable to load builds.'), true));
    }
  }

  // -------------------------------------------------------------
  // Page: Chat (/chat/) with Auto-Reconnecting Real-Time WebSockets
  // -------------------------------------------------------------
  if (page.startsWith('/chat/')) {
    const root = region('#room-list-content', 'grid gap-2');
    const workspace = document.querySelector('[aria-label="Conversation workspace"]');
    if (workspace) workspace.classList.add('hidden');
    setMessage(root, token() ? t('Loading conversations…') : t('Sign in to view messages.'));

    if (token()) {
      request('/chat/mark_read/', { method: 'POST', body: '{}' }).then(() => {
        setUnreadBadgeCount(0);
      }).catch(() => {});
    }

    if (token()) {
      const urlParams = new URLSearchParams(location.search);
      let targetRoomId = urlParams.get('room');
      const targetListingId = urlParams.get('listing');
      let activeRoomSocket = null;
      let roomPingTimer = null;
      let roomReconnectTimer = null;

      const cleanupRoomSocket = () => {
        if (roomPingTimer) {
          clearInterval(roomPingTimer);
          roomPingTimer = null;
        }
        if (roomReconnectTimer) {
          clearTimeout(roomReconnectTimer);
          roomReconnectTimer = null;
        }
        if (activeRoomSocket) {
          try {
            activeRoomSocket.onclose = null;
            activeRoomSocket.close();
          } catch {}
          activeRoomSocket = null;
        }
      };

      const initChat = async () => {
        try {
          if (targetListingId && !targetRoomId) {
            try {
              const created = await request('/chat/rooms/', {
                method: 'POST',
                body: JSON.stringify({ listing_id: Number(targetListingId) })
              });
              if (created?.id) targetRoomId = String(created.id);
            } catch {}
          }

          const data = await request('/chat/rooms/');
          const rooms = Array.isArray(data) ? data : (data.results || []);

          if (!rooms.length) {
            root.innerHTML = `<div class="p-6 rounded-2xl bg-surface-container text-center text-on-surface-variant">${t('No messages. Start a conversation from a listing.')}</div>`;
            return;
          }

          root.innerHTML = rooms.map(r => {
            const partner = r.seller_username === currentUser?.username ? r.buyer_username : r.seller_username;
            const compName = r.listing?.component?.name || t('Conversation');
            return `
              <button class="w-full text-left block p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/15" data-room-id="${r.id}">
                <div class="flex items-center justify-between">
                  <strong class="font-semibold text-on-surface text-body-sm">${escape(partner)}</strong>
                  ${r.listing?.price ? `<span class="font-code-sm text-xs font-semibold text-primary">$${escape(r.listing.price)}</span>` : ''}
                </div>
                <p class="text-xs text-on-surface-variant truncate mt-1">${escape(compName)}</p>
              </button>
            `;
          }).join('');

          const openRoom = async roomId => {
            activeChatRoomId = String(roomId);
            cleanupRoomSocket();

            request('/chat/mark_read/', { method: 'POST', body: JSON.stringify({ room_id: Number(roomId) }) }).then(res => {
              setUnreadBadgeCount(res?.unread_count || 0);
            }).catch(() => {});

            root.querySelectorAll('[data-room-id]').forEach(b => {
              const isSelected = String(b.dataset.roomId) === String(roomId);
              b.classList.toggle('ring-2', isSelected);
              b.classList.toggle('ring-primary', isSelected);
              b.classList.toggle('bg-surface-container-high', isSelected);
            });

            const currentRoom = rooms.find(r => String(r.id) === String(roomId));
            const messages = await request(`/chat/rooms/${roomId}/messages/`);
            if (!workspace) return;
            workspace.classList.remove('hidden');

            const partner = currentRoom?.seller_username === currentUser?.username ? currentRoom?.buyer_username : currentRoom?.seller_username;
            const listing = currentRoom?.listing;
            const comp = listing?.component;

            workspace.innerHTML = `
              <div class="flex flex-col h-[560px]">
                <div class="border-b border-outline-variant/20 pb-3 flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-primary text-2xl">account_circle</span>
                    <div>
                      <h3 class="font-semibold text-on-surface flex items-center gap-2">
                        <span>${escape(partner || t('Messages'))}</span>
                        <span id="socket-status-dot" class="inline-block h-2 w-2 rounded-full bg-primary ring-2 ring-primary/25" title="WebSocket Live Connected"></span>
                      </h3>
                      <p class="text-xs text-on-surface-variant">${t('Dialogue with seller')}</p>
                    </div>
                  </div>
                  ${listing ? `
                    <button type="button" data-view-listing="${listing.id}" class="text-xs rounded-xl bg-surface-container-high px-3 py-1.5 text-primary hover:bg-surface-container-highest flex items-center gap-1 font-semibold transition-colors">
                      <span class="material-symbols-outlined text-sm">visibility</span>
                      <span>${t('Product details')}</span>
                    </button>
                  ` : ''}
                </div>

                ${listing && comp ? `
                  <div class="my-3 flex items-center gap-3 rounded-xl bg-surface-container/70 p-3 border border-outline-variant/20">
                    <div class="h-12 w-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 overflow-hidden">
                      ${comp.image ? `
                        <img src="${escape(comp.image)}" alt="${escape(comp.name)}" class="h-full w-full object-cover">
                      ` : `
                        <span class="material-symbols-outlined text-primary text-xl">${getCategoryIcon(comp.category_name)}</span>
                      `}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] font-code-sm uppercase font-semibold text-primary">${escape(comp.category_name || '')}</span>
                        <span class="rounded bg-surface-container-high px-1.5 py-0.2 text-[10px] font-medium text-on-surface-variant">${t(listing.condition === 'new' ? 'New' : 'Used')}</span>
                      </div>
                      <h4 class="font-semibold text-body-sm text-on-surface truncate">${escape(comp.brand)} ${escape(comp.name)}</h4>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-lg font-bold text-primary">$${escape(listing.price)}</span>
                    </div>
                  </div>
                ` : ''}

                <div class="flex-1 space-y-2.5 overflow-y-auto py-3 pr-1" data-message-list>
                  ${messages.length ? messages.map(m => {
                    const isMine = currentUser && m.sender_username === currentUser.username;
                    return `
                      <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}" data-message-id="${m.id || ''}">
                        <span class="text-[10px] text-on-surface-variant px-1 mb-0.5">${escape(m.sender_username)}</span>
                        <div class="rounded-2xl px-4 py-2 text-body-sm max-w-[85%] ${isMine ? 'bg-primary text-on-primary rounded-br-sm shadow-xs' : 'bg-surface-container text-on-surface border border-outline-variant/20 rounded-bl-sm'}">
                          ${escape(m.text)}
                        </div>
                      </div>
                    `;
                  }).join('') : `
                    <div class="py-16 text-center text-on-surface-variant text-body-sm">
                      <span class="material-symbols-outlined text-3xl text-primary/60 mb-2 block">chat_bubble</span>
                      ${t('No messages in this conversation.')}
                    </div>
                  `}
                </div>

                <form data-send-message class="mt-3 flex gap-2 border-t border-outline-variant/20 pt-3">
                  <input name="text" required autocomplete="off" class="flex-1 rounded-xl bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="${t('Write a message…')}">
                  <button class="rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary text-body-sm flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs" type="submit">
                    <span class="material-symbols-outlined text-base">send</span>
                    <span>${t('Send')}</span>
                  </button>
                </form>
              </div>
            `;

            const msgList = workspace.querySelector('[data-message-list]');
            if (msgList) msgList.scrollTop = msgList.scrollHeight;

            const appendMsgToWorkspace = (senderName, text, isMine, messageId = null) => {
              if (!msgList) return;
              if (messageId && msgList.querySelector(`[data-message-id="${messageId}"]`)) {
                return;
              }
              const emptyState = msgList.querySelector('.py-16');
              if (emptyState) emptyState.remove();
              msgList.insertAdjacentHTML('beforeend', `
                <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'} transition-opacity duration-200" ${messageId ? `data-message-id="${messageId}"` : ''}>
                  <span class="text-[10px] text-on-surface-variant px-1 mb-0.5">${escape(senderName)}</span>
                  <div class="rounded-2xl px-4 py-2 text-body-sm max-w-[85%] ${isMine ? 'bg-primary text-on-primary rounded-br-sm shadow-xs' : 'bg-surface-container text-on-surface border border-outline-variant/20 rounded-bl-sm'}">
                    ${escape(text)}
                  </div>
                </div>
              `);
              msgList.scrollTop = msgList.scrollHeight;
            };

            const connectRoomSocket = () => {
              if (String(activeChatRoomId) !== String(roomId)) return;
              const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
              const roomWsUrl = `${wsProto}//${location.host}/ws/chat/${roomId}/?token=${encodeURIComponent(token() || '')}`;
              try {
                activeRoomSocket = new WebSocket(roomWsUrl);
                const statusDot = workspace.querySelector('#socket-status-dot');

                activeRoomSocket.onopen = () => {
                  if (statusDot) {
                    statusDot.className = 'inline-block h-2 w-2 rounded-full bg-primary ring-2 ring-primary/25';
                    statusDot.title = 'Live connected';
                  }
                  if (roomPingTimer) clearInterval(roomPingTimer);
                  roomPingTimer = setInterval(() => {
                    if (activeRoomSocket && activeRoomSocket.readyState === WebSocket.OPEN) {
                      try {
                        activeRoomSocket.send(JSON.stringify({ type: 'ping' }));
                      } catch {}
                    }
                  }, 20000);
                };

                activeRoomSocket.onmessage = event => {
                  try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'chat_message') {
                      const isMine = currentUser && data.sender === currentUser.username;
                      appendMsgToWorkspace(data.sender, data.message, isMine, data.message_id);
                      if (!isMine) {
                        request('/chat/mark_read/', { method: 'POST', body: JSON.stringify({ room_id: Number(roomId) }) }).then(res => {
                          setUnreadBadgeCount(res?.unread_count || 0);
                        }).catch(() => {});
                      }
                    }
                  } catch {}
                };

                activeRoomSocket.onclose = () => {
                  if (roomPingTimer) {
                    clearInterval(roomPingTimer);
                    roomPingTimer = null;
                  }
                  if (statusDot) {
                    statusDot.className = 'inline-block h-2 w-2 rounded-full bg-tertiary ring-2 ring-tertiary/25';
                    statusDot.title = 'Reconnecting…';
                  }
                  if (String(activeChatRoomId) === String(roomId)) {
                    roomReconnectTimer = setTimeout(connectRoomSocket, 2000);
                  }
                };

                activeRoomSocket.onerror = () => {
                  try { activeRoomSocket?.close(); } catch {}
                };
              } catch {}
            };

            connectRoomSocket();

            workspace.querySelector('[data-view-listing]')?.addEventListener('click', () => {
              if (listing) openProductDetailModal({ listing, component: comp, context: 'marketplace' });
            });

            workspace.querySelector('form').onsubmit = async event => {
              event.preventDefault();
              const input = event.currentTarget.elements.text;
              const text = input.value.trim();
              if (!text) return;

              if (activeRoomSocket && activeRoomSocket.readyState === WebSocket.OPEN) {
                activeRoomSocket.send(JSON.stringify({ message: text }));
                input.value = '';
              } else {
                try {
                  const sent = await request(`/chat/rooms/${roomId}/messages/`, {
                    method: 'POST',
                    body: JSON.stringify({ text })
                  });
                  input.value = '';
                  appendMsgToWorkspace(sent.sender_username, sent.text, true, sent.id);
                } catch {
                  input.setCustomValidity(t('Could not send the message.'));
                  input.reportValidity();
                }
              }
            };
          };

          switchChatRoomHandler = openRoom;

          root.querySelectorAll('[data-room-id]').forEach(button => {
            button.onclick = () => openRoom(button.dataset.roomId);
          });

          const initialRoom = targetRoomId || rooms[0]?.id;
          if (initialRoom) openRoom(initialRoom);
        } catch {
          setMessage(root, t('Unable to load conversations.'), true);
        }
      };

      initChat();
    }
  }

  // -------------------------------------------------------------
  // Page: Component Catalog (/components/)
  // -------------------------------------------------------------
  if (page.startsWith('/components/')) {
    document.querySelectorAll('#component-grid [data-component-json]').forEach(el => {
      try {
        const c = JSON.parse(el.dataset.componentJson);
        if (c?.id) componentCache.set(c.id, c);
      } catch {}
    });

    const root = region('#component-grid');
    setMessage(root, t('Loading components…'));
    const renderComponents = items => {
      items.forEach(c => componentCache.set(c.id, c));
      root.innerHTML = items.length ? items.map(c => `
        <article class="rounded-2xl bg-surface-container-low p-5 cursor-pointer hover:bg-surface-container transition-all border border-outline-variant/20 hover:border-outline-variant/45 shadow-sm" data-component-card="${c.id}" data-component-json='${escape(JSON.stringify(c))}'>
          <p class="font-code-sm uppercase text-xs font-semibold text-primary tracking-wider">${escape(c.category_name || t('Component'))}</p>
          <h2 class="mt-2 text-headline-sm font-semibold">${escape(c.brand)} ${escape(c.name)}</h2>
          <p class="mt-2 text-body-sm text-on-surface-variant line-clamp-2">${escape(c.description || '')}</p>
          <dl class="mt-4 grid grid-cols-2 gap-2 text-body-sm">
            <dt class="text-on-surface-variant">${t('Socket')}</dt><dd class="font-medium">${escape(c.socket || '—')}</dd>
            <dt class="text-on-surface-variant">${t('RAM')}</dt><dd class="font-medium">${escape(c.ram_type || '—')}</dd>
            <dt class="text-on-surface-variant">${t('TDP')}</dt><dd class="font-medium">${escape(c.tdp)} W</dd>
            <dt class="text-on-surface-variant">${t('Average price')}</dt><dd class="font-bold text-primary">$${escape(c.price_avg)}</dd>
          </dl>
        </article>
      `).join('') : `<p class="col-span-full rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">${t('No components have been added to the catalog.')}</p>`;
    };

    request('/components/components/')
      .then(d => renderComponents(Array.isArray(d) ? d : (d.results || [])))
      .catch(() => setMessage(root, t('Unable to load components.'), true));

    const search = document.querySelector('#component-search-input');
    if (search) {
      search.addEventListener('input', async () => {
        try {
          const d = await request(`/components/components/?search=${encodeURIComponent(search.value)}`);
          renderComponents(Array.isArray(d) ? d : (d.results || []));
        } catch {}
      });
    }
  }

  // -------------------------------------------------------------
  // Page: Parts detail (/parts/)
  // -------------------------------------------------------------
  if (page.startsWith('/parts/')) {
    const id = page.match(/\/parts\/(\d+)/)?.[1];
    if (id) {
      const root = region('#listing-detail', 'grid gap-space-md');
      setMessage(root, t('Loading listing…'));
      request(`/marketplace/listings/${id}/`).then(item => {
        root.innerHTML = listingCard(item);
        openProductDetailModal({ listing: item, component: item.component, context: 'marketplace' });
      }).catch(() => setMessage(root, t('Listing not found.'), true));
    }
  }

  // -------------------------------------------------------------
  // Auth Wiring
  // -------------------------------------------------------------
  if (page.startsWith('/accounts/login/')) wireAuth('login');
  if (page.startsWith('/accounts/register/')) wireAuth('register');

  function wireAuth(kind) {
    const form = document.querySelector('form');
    if (!form) return;
    if (kind === 'register') {
      const usernameField = form.querySelector('#username-input');
      const passwordField = form.querySelector('#password-input');
      const confirmField = form.querySelector('#confirm-input');
      if (usernameField) { usernameField.required = true; usernameField.minLength = 3; usernameField.maxLength = 20; }
      if (passwordField) { passwordField.required = true; passwordField.minLength = 8; }
      if (confirmField) confirmField.required = true;
      const usernameFeedback = form.querySelector('#username-feedback');
      const counter = form.querySelector('#char-counter');
      if (usernameFeedback) usernameFeedback.classList.add('hidden');
      if (counter) counter.textContent = `0/${usernameField?.maxLength || 20}`;
      const updateRule = (id, valid) => {
        const rule = form.querySelector(`#${id}`);
        if (!rule) return;
        const icon = rule.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = valid ? 'done' : 'close';
          icon.classList.toggle('text-primary', valid);
          icon.classList.toggle('text-error', !valid);
        }
      };
      const updatePassword = () => {
        const value = passwordField?.value || '';
        updateRule('rule-minlen', value.length >= 8);
        updateRule('rule-num', /\d/.test(value));
        updateRule('rule-sym', /[^A-Za-z0-9]/.test(value));
      };
      usernameField?.addEventListener('input', () => {
        if (counter) counter.textContent = `${usernameField.value.length}/${usernameField.maxLength}`;
        if (usernameFeedback) {
          usernameFeedback.classList.remove('hidden');
          const label = usernameFeedback.querySelectorAll('span')[1];
          const valid = /^[A-Za-z0-9_]{3,20}$/.test(usernameField.value);
          if (label) label.textContent = valid ? '✓ Valid format' : 'Use 3–20 letters, numbers, or underscores';
          usernameFeedback.classList.toggle('text-error', !valid);
          usernameFeedback.classList.toggle('text-primary', valid);
        }
      });
      const updateMatch = () => {
        const feedback = form.querySelector('#confirm-feedback');
        if (!feedback) return;
        const label = feedback.querySelectorAll('span')[1];
        const match = confirmField?.value.length > 0 && confirmField.value === passwordField?.value;
        feedback.classList.toggle('hidden', !confirmField?.value.length);
        feedback.classList.toggle('text-primary', match);
        feedback.classList.toggle('text-error', !match);
        if (label) label.textContent = match ? '✓ Passwords match' : 'Passwords do not match';
      };
      passwordField?.addEventListener('input', () => { updatePassword(); updateMatch(); });
      confirmField?.addEventListener('input', updateMatch);
      form.querySelectorAll('button[title="Toggle Visibility"]').forEach(button => {
        button.addEventListener('click', () => {
          const input = button.parentElement.querySelector('input');
          if (input) input.type = input.type === 'password' ? 'text' : 'password';
        });
      });
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const inputs = [...form.querySelectorAll('input')];
      const username = (form.querySelector('[name=username]') || form.querySelector('#username-input') || inputs.find(i => i.type !== 'password'))?.value?.trim();
      const password = (form.querySelector('[name=password]') || form.querySelector('#password-input') || inputs.find(i => i.type === 'password'))?.value;
      const confirmation = form.querySelector('#confirm-input')?.value;
      let msg = form.querySelector('[role=alert]');
      if (!msg) {
        msg = document.createElement('p');
        msg.setAttribute('role', 'alert');
        msg.className = 'text-error';
        form.prepend(msg);
      }
      if (kind === 'register' && password !== confirmation) {
        msg.textContent = t('Passwords do not match.');
        return;
      }
      const submit = form.querySelector('button[type=submit]');
      if (submit) submit.disabled = true;
      msg.textContent = '';
      try {
        if (kind === 'register') await request('/auth/register/', { method: 'POST', body: JSON.stringify({ username, password }) });
        const data = await request('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) });
        localStorage.setItem(tokenKey, data.access);
        localStorage.setItem(refreshKey, data.refresh);
        location.href = '/';
      } catch {
        msg.textContent = kind === 'register' ? t('Account could not be created. The username may already be in use.') : t('Check your username and password.');
        if (submit) submit.disabled = false;
      }
    });
  }

  // Marketplace search input
  const marketplaceSearch = document.querySelector('#hardware-search-input');
  if (marketplaceSearch) {
    marketplaceSearch.addEventListener('input', async () => {
      try {
        const data = await request(`/marketplace/listings/?is_active=true&search=${encodeURIComponent(marketplaceSearch.value)}`);
        const items = Array.isArray(data) ? data : (data.results || []);
        const grid = document.querySelector('#listing-grid');
        grid.innerHTML = items.length ? items.map(listingCard).join('') : '<div class="col-span-full rounded-2xl bg-surface-container-low p-12 text-center border border-outline-variant/20"><h2 class="text-headline-lg font-semibold">Нет товаров</h2><p class="mt-2 text-on-surface-variant">По вашему запросу ничего не найдено.</p></div>';
        syncCartButtons();
      } catch {}
    });
  }

  // -------------------------------------------------------------
  // Page: PC Builder (/builder/)
  // -------------------------------------------------------------
  if (page.startsWith('/builder/')) {
    document.querySelectorAll('#builder-components [data-component-json]').forEach(el => {
      try {
        const c = JSON.parse(el.dataset.componentJson);
        if (c?.id) componentCache.set(c.id, c);
      } catch {}
    });
    request('/components/components/').then(d => {
      const items = Array.isArray(d) ? d : (d.results || []);
      items.forEach(c => componentCache.set(c.id, c));
    }).catch(() => {});

    const buildForm = document.querySelector('#new-build-form');
    const feedback = document.querySelector('#builder-feedback');
    const buildSelector = document.querySelector('#build-selector');
    const buildPanel = document.querySelector('#active-build-panel');
    const compatibilityStatus = document.querySelector('#compatibility-status');
    const itemsRoot = document.querySelector('#active-build-items');
    const saveButton = document.querySelector('#save-build');

    const renderActiveBuild = build => {
      activeBuild = build;
      sessionStorage.setItem('pcforge.activeBuildId', build.id);
      if (!buildPanel) return;
      buildPanel.classList.remove('hidden');
      document.querySelector('#active-build-title').textContent = build.title;

      const errors = build.compatibility_errors || [];
      compatibilityStatus.classList.toggle('border-error', errors.length > 0);
      compatibilityStatus.classList.toggle('bg-error-container/20', errors.length > 0);
      compatibilityStatus.classList.toggle('text-error', errors.length > 0);
      compatibilityStatus.classList.toggle('border-primary/40', !errors.length);
      compatibilityStatus.classList.toggle('text-primary', !errors.length);

      compatibilityStatus.innerHTML = errors.length ? `
        <div class="flex items-start gap-2">
          <span class="material-symbols-outlined text-error shrink-0">warning</span>
          <div>
            <strong>Compatibility issues (${errors.length})</strong>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-body-sm">${errors.map(error => `<li>${escape(error)}</li>`).join('')}</ul>
          </div>
        </div>
      ` : `
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-xl">verified</span>
          <span class="font-medium">No compatibility issues detected. All components are compatible.</span>
        </div>
      `;

      itemsRoot.innerHTML = build.items?.length ? build.items.map(item => `
        <article class="flex items-start justify-between gap-3 rounded-xl bg-surface-container p-4 border border-outline-variant/20">
          <div>
            <p class="font-code-sm text-xs uppercase font-semibold text-primary">${escape(item.component.category_name || '')}</p>
            <h3 class="mt-1 font-semibold text-body-md">${escape(item.component.brand)} ${escape(item.component.name)}</h3>
            <p class="mt-1 text-xs text-on-surface-variant">
              Socket ${escape(item.component.socket || '—')} · RAM ${escape(item.component.ram_type || '—')} · TDP ${escape(item.component.tdp)} W · PSU ${escape(item.component.power_supply)} W
            </p>
            <p class="text-xs text-on-surface-variant">
              Length ${escape(item.component.length_mm || '—')} mm · Height ${escape(item.component.height_mm || '—')} mm
            </p>
          </div>
          <button data-remove-component="${item.component.id}" class="rounded-lg bg-surface-container-high hover:bg-error-container hover:text-on-error-container px-3 py-1.5 text-xs font-semibold transition-colors" type="button">
            ${t('Remove')}
          </button>
        </article>
      `).join('') : `<p class="rounded-xl bg-surface-container p-5 text-center text-on-surface-variant text-body-sm col-span-full">No components added yet.</p>`;

      if (saveButton) {
        saveButton.disabled = errors.length > 0;
        saveButton.classList.toggle('opacity-50', errors.length > 0);
      }
    };

    window.pcforgeRenderActiveBuild = renderActiveBuild;

    const selectBuild = async id => {
      try {
        const build = await request(`/builder/builds/${id}/`);
        renderActiveBuild(build);
        buildSelector.querySelectorAll('[data-build-id]').forEach(button => {
          const isSelected = Number(button.dataset.buildId) === Number(id);
          button.classList.toggle('ring-2', isSelected);
          button.classList.toggle('ring-primary', isSelected);
        });
      } catch {
        feedback.textContent = 'Could not load this build.';
      }
    };

    const loadBuilds = async selectId => {
      if (!token()) {
        buildSelector.innerHTML = '<p class="text-on-surface-variant text-body-sm">Sign in to load your builds.</p>';
        return;
      }
      try {
        const data = await request('/builder/builds/');
        const builds = Array.isArray(data) ? data : (data.results || []);
        buildSelector.innerHTML = builds.length ? builds.map(build => `
          <button class="rounded-xl bg-surface-container px-4 py-3 text-left hover:bg-surface-container-high transition-colors border border-outline-variant/20" data-build-id="${build.id}">
            <span class="block font-semibold text-body-md">${escape(build.title)}</span>
            <span class="text-xs text-on-surface-variant">${build.items?.length || 0} components</span>
          </button>
        `).join('') : '<p class="text-on-surface-variant text-body-sm">No builds yet. Create one above.</p>';

        buildSelector.querySelectorAll('[data-build-id]').forEach(button => {
          button.onclick = () => selectBuild(button.dataset.buildId);
        });

        const desired = selectId || sessionStorage.getItem('pcforge.activeBuildId') || builds[0]?.id;
        if (desired && builds.some(build => Number(build.id) === Number(desired))) {
          selectBuild(desired);
        } else {
          activeBuild = null;
          buildPanel?.classList.add('hidden');
        }
      } catch {
        buildSelector.innerHTML = '<p class="text-error text-body-sm">Could not load your builds.</p>';
      }
    };

    window.pcforgeLoadBuilds = loadBuilds;

    if (buildForm) {
      buildForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!token()) {
          location.href = '/accounts/login/';
          return;
        }
        const title = buildForm.elements.title.value.trim();
        if (!title) return;
        try {
          const build = await request('/builder/builds/', { method: 'POST', body: JSON.stringify({ title }) });
          buildForm.reset();
          feedback.textContent = 'Build created. Add components to check compatibility.';
          await loadBuilds(build.id);
        } catch {
          feedback.textContent = 'Could not create the build.';
        }
      });
    }

    document.querySelectorAll('[data-add-component]').forEach(button => {
      button.disabled = false;
      button.addEventListener('click', async event => {
        event.stopPropagation();
        button.disabled = true;
        await addComponentToBuild(button.dataset.addComponent);
        button.disabled = false;
      });
    });

    itemsRoot?.addEventListener('click', async event => {
      const button = event.target.closest('[data-remove-component]');
      if (!button || !activeBuild) return;
      try {
        await request(`/builder/builds/${activeBuild.id}/remove_item/`, {
          method: 'DELETE',
          body: JSON.stringify({ component_id: Number(button.dataset.removeComponent) })
        });
        await selectBuild(activeBuild.id);
      } catch {
        feedback.textContent = 'Could not remove this component.';
      }
    });

    saveButton?.addEventListener('click', async () => {
      if (!activeBuild || (activeBuild.compatibility_errors || []).length) return;
      saveButton.disabled = true;
      try {
        const saved = await request(`/builder/builds/${activeBuild.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ title: activeBuild.title, is_public: activeBuild.is_public })
        });
        renderActiveBuild(saved);
        feedback.textContent = 'Build saved.';
        showToast('Build saved.');
      } catch {
        feedback.textContent = 'Resolve the compatibility issues before saving.';
        saveButton.disabled = false;
      }
    });

    loadBuilds();
  }

  document.querySelectorAll('[data-path="marketplace"]').forEach(a => a.href = '/');
  document.querySelectorAll('[data-path="pc-builder"]').forEach(a => a.href = '/builder/');
  document.querySelectorAll('[data-path="components"]').forEach(a => a.href = '/components/');
  document.querySelectorAll('[data-path="messages"]').forEach(a => a.href = '/chat/');
})();
