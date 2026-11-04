import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getComponentImage, resolveComponentCategoryKind } from '../data/hardwareMedia';

const AppContext = createContext(null);

const AUTH_STORAGE_KEY = 'pcforge_auth_v1';
const RIG_STORAGE_KEY = 'rigforge_active_rig_v1';

function readStoredTokens() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { access: parsed.access, refresh: parsed.refresh || '' };
    }
    const fallbackAccess = localStorage.getItem('access_token') || localStorage.getItem('access');
    const fallbackRefresh = localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
    if (fallbackAccess) return { access: fallbackAccess, refresh: fallbackRefresh || '' };
  } catch (_) {}
  return { access: '', refresh: '' };
}

function writeStoredTokens(access, refresh, user = null) {
  try {
    if (!access) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      return;
    }
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ access, refresh: refresh || '', user })
    );
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  } catch (_) {}
}

export function AppProvider({ children }) {
  const [{ access, refresh }, setTokens] = useState(readStoredTokens);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Catalog state
  const [listings, setListings] = useState([]);
  const [components, setComponents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');

  // Split-Screen Active System Build ("RigForge Cart")
  const [rigItems, setRigItems] = useState(() => {
    try {
      const saved = localStorage.getItem(RIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [isRigOpen, setIsRigOpen] = useState(false);
  const [justAddedItem, setJustAddedItem] = useState(null);
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [orders, setOrders] = useState([]);

  // Compare Queue
  const [compareItems, setCompareItems] = useState([]);

  // Checkout state
  const [checkoutPayload, setCheckoutPayload] = useState(null);

  // Modal Manager
  const [activeModal, setActiveModal] = useState(null);
  const [modalProps, setModalProps] = useState({});

  // Live Notifications & Unread Count
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const globalWsRef = useRef(null);

  const addToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }
      if (access) {
        headers.set('Authorization', `Bearer ${access}`);
      }
      const res = await fetch(url, { ...options, headers });
      return res;
    },
    [access]
  );

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    if (!access) {
      setUser(null);
      setAuthLoading(false);
      return null;
    }
    try {
      const res = await apiFetch('/api/auth/me/');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        writeStoredTokens(access, refresh, data);
        setAuthLoading(false);
        return data;
      } else if (res.status === 401) {
        setTokens({ access: '', refresh: '' });
        writeStoredTokens('', '');
        setUser(null);
      }
    } catch (_) {}
    setAuthLoading(false);
    return null;
  }, [access, refresh, apiFetch]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Fetch catalog data
  const fetchCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [listRes, compRes, catRes] = await Promise.all([
        fetch('/api/marketplace/listings/'),
        fetch('/api/components/components/'),
        fetch('/api/components/categories/'),
      ]);
      const listData = listRes.ok ? await listRes.json() : [];
      const compData = compRes.ok ? await compRes.json() : [];
      const catData = catRes.ok ? await catRes.json() : [];

      const normalizedListings = Array.isArray(listData) ? listData : listData.results || [];
      const normalizedComponents = Array.isArray(compData) ? compData : compData.results || [];
      const normalizedCategories = Array.isArray(catData) ? catData : catData.results || [];

      setListings(normalizedListings);
      setComponents(normalizedComponents);
      setCategories(normalizedCategories);
    } catch (_) {
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Persist rigItems
  useEffect(() => {
    try {
      localStorage.setItem(RIG_STORAGE_KEY, JSON.stringify(rigItems));
    } catch (_) {}
  }, [rigItems]);

  // Fetch user saved builds, orders, unread messages when logged in
  const fetchUserResources = useCallback(async () => {
    if (!access) {
      setSavedBuilds([]);
      setOrders([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [buildsRes, ordersRes, unreadRes] = await Promise.all([
        apiFetch('/api/builder/builds/'),
        apiFetch('/api/marketplace/orders/'),
        apiFetch('/api/chat/unread/'),
      ]);
      if (buildsRes.ok) {
        const bData = await buildsRes.json();
        setSavedBuilds(Array.isArray(bData) ? bData : bData.results || []);
      }
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(Array.isArray(oData) ? oData : oData.results || []);
      }
      if (unreadRes.ok) {
        const uData = await unreadRes.json();
        setUnreadCount(Number(uData.unread_count || 0));
      }
    } catch (_) {}
  }, [access, apiFetch]);

  useEffect(() => {
    fetchUserResources();
  }, [fetchUserResources]);

  // Connect Global WebSocket for live unread count & incoming chat toasts
  useEffect(() => {
    if (!access) {
      if (globalWsRef.current) {
        globalWsRef.current.close();
        globalWsRef.current = null;
      }
      return;
    }

    let isMounted = true;
    let reconnectTimer = null;
    let pingTimer = null;

    const connectGlobalWs = () => {
      if (!isMounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/global/?token=${encodeURIComponent(access)}`;
      const ws = new WebSocket(wsUrl);
      globalWsRef.current = ws;

      ws.onopen = () => {
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'unread_update' && typeof data.unread_count === 'number') {
            setUnreadCount(data.unread_count);
          } else if (data.type === 'chat_notification') {
            if (typeof data.unread_count === 'number') {
              setUnreadCount(data.unread_count);
            }
            addToast({
              type: 'chat',
              title: `New message from ${data.sender}`,
              subtitle: data.component_name || 'Marketplace Inquiry',
              message: data.voice_url ? `🎤 Voice message (${data.voice_duration || '0:05'})` : data.message,
              roomId: data.room_id,
            });
            window.dispatchEvent(new CustomEvent('rigforge:chat-notification', { detail: data }));
          } else if (data.type === 'system_broadcast') {
            addToast({
              type: data.level || 'info',
              title: `System Broadcast (${data.sender || 'Admin'})`,
              message: data.message,
              duration: 7000,
            });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (isMounted) {
          reconnectTimer = setTimeout(connectGlobalWs, 3500);
        }
      };
    };

    connectGlobalWs();

    return () => {
      isMounted = false;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (globalWsRef.current) {
        globalWsRef.current.close();
      }
    };
  }, [access, addToast]);

  // Auth Actions
  const login = async (username, password) => {
    const res = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Invalid username or password');
    }
    setTokens({ access: data.access, refresh: data.refresh || '' });
    writeStoredTokens(data.access, data.refresh || '');
    const meRes = await fetch('/api/auth/me/', {
      headers: { Authorization: `Bearer ${data.access}` },
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      setUser(meData);
      writeStoredTokens(data.access, data.refresh || '', meData);
    }
    addToast({
      type: 'success',
      title: 'Signed In Successfully',
      message: `Welcome back to RigForge, ${username}!`,
    });
    return data;
  };

  const register = async (username, email, password, passwordConfirm) => {
    const res = await fetch('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        password_confirm: passwordConfirm || password,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const firstErr = Object.values(data).flat()[0];
      throw new Error(typeof firstErr === 'string' ? firstErr : 'Registration failed');
    }
    // Clean slate for new user: 0 components in rig, empty saved builds
    setRigItems([]);
    setSavedBuilds([]);
    setOrders([]);
    try {
      localStorage.removeItem(RIG_STORAGE_KEY);
    } catch (_) {}

    await login(username, password);
    return data;
  };

  const logout = async () => {
    try {
      if (refresh && access) {
        await apiFetch('/api/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      }
    } catch (_) {}
    setTokens({ access: '', refresh: '' });
    writeStoredTokens('', '');
    setUser(null);
    setUnreadCount(0);
    setRigItems([]);
    setSavedBuilds([]);
    setOrders([]);
    try {
      localStorage.removeItem(RIG_STORAGE_KEY);
    } catch (_) {}
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Your session has been closed safely.',
    });
  };

  // Active Rig / Cart Actions
  const addToRig = useCallback(
    async (listingOrComp, openSidebar = true) => {
      const isListing = Boolean(listingOrComp.component);
      const comp = isListing ? listingOrComp.component : listingOrComp;
      const price = parseFloat(listingOrComp.price ?? comp.price_avg ?? 0);
      const listingId = isListing ? listingOrComp.id : null;
      const compId = comp.id;

      const entry = {
        id: listingId || `comp-${compId}`,
        listing_id: listingId,
        component_id: compId,
        component: comp,
        price,
        seller_username: listingOrComp.seller_username || 'RigForge Verified',
        condition: listingOrComp.condition || 'new',
        quantity: 1,
      };

      setRigItems((prev) => {
        const existingIdx = prev.findIndex(
          (item) =>
            (listingId && item.listing_id === listingId) ||
            (!listingId && item.component_id === compId)
        );
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + 1,
          };
          return updated;
        }
        return [entry, ...prev];
      });

      setJustAddedItem(entry);
      if (openSidebar) {
        setIsRigOpen(true);
      }

      // Also sync with backend cart if authenticated and listingId exists
      if (access && listingId) {
        try {
          await apiFetch('/api/marketplace/cart/', {
            method: 'POST',
            body: JSON.stringify({ listing_id: listingId, quantity: 1 }),
          });
        } catch (_) {}
      }
    },
    [access, apiFetch]
  );

  const updateRigQty = useCallback((itemId, delta) => {
    setRigItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== itemId) return item;
          const nextQty = item.quantity + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        })
        .filter(Boolean)
    );
  }, []);

  const removeFromRig = useCallback((itemId) => {
    setRigItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearRig = useCallback(() => {
    setRigItems([]);
    setJustAddedItem(null);
  }, []);

  // RigSync v4.2 Live Compatibility & Wattage Calculation
  const rigMetrics = useMemo(() => {
    let subtotal = 0;
    let totalParts = 0;
    let totalTdp = 0;
    let psuWattage = 0;
    const cpus = [];
    const mobos = [];
    const rams = [];
    const gpus = [];
    const cases = [];
    const coolers = [];

    for (const item of rigItems) {
      const qty = item.quantity || 1;
      subtotal += (parseFloat(item.price) || 0) * qty;
      totalParts += qty;

      const comp = item.component || {};
      const kind = resolveComponentCategoryKind(comp);
      if (kind === 'psu') {
        psuWattage = Math.max(psuWattage, Number(comp.power_supply || 850));
      } else {
        totalTdp += Number(comp.tdp || 35) * qty;
      }

      if (kind === 'cpu') cpus.push(comp);
      if (kind === 'motherboard') mobos.push(comp);
      if (kind === 'memory') rams.push(comp);
      if (kind === 'gpu') gpus.push(comp);
      if (kind === 'case') cases.push(comp);
      if (kind === 'cooling') coolers.push(comp);
    }

    const conflicts = [];

    // Check CPU <-> Motherboard Socket
    for (const cpu of cpus) {
      for (const mobo of mobos) {
        if (cpu.socket && mobo.socket && cpu.socket.toLowerCase() !== mobo.socket.toLowerCase()) {
          conflicts.push(`Socket mismatch: CPU ${cpu.name} (${cpu.socket}) vs Motherboard ${mobo.name} (${mobo.socket}).`);
        }
      }
    }

    // Check Motherboard <-> RAM Type
    for (const mobo of mobos) {
      for (const ram of rams) {
        if (mobo.ram_type && ram.ram_type && mobo.ram_type.toLowerCase() !== ram.ram_type.toLowerCase()) {
          conflicts.push(`Memory mismatch: ${ram.name} (${ram.ram_type}) is incompatible with ${mobo.name} (${mobo.ram_type}).`);
        }
      }
    }

    // Check Case <-> GPU Length
    for (const c of cases) {
      for (const g of gpus) {
        if (c.max_gpu_length_mm && g.length_mm && g.length_mm > c.max_gpu_length_mm) {
          conflicts.push(`Clearance alert: ${g.name} (${g.length_mm}mm) exceeds ${c.name} max GPU clearance (${c.max_gpu_length_mm}mm).`);
        }
      }
    }

    const recommendedPsu = Math.max(650, Math.ceil((totalTdp * 1.35) / 50) * 50);
    if (psuWattage > 0 && totalTdp > 0 && psuWattage < Math.ceil(totalTdp * 1.2)) {
      conflicts.push(`Power warning: Est. load ${totalTdp}W exceeds safe headroom for ${psuWattage}W PSU (${recommendedPsu}W recommended).`);
    }

    const detectedSocket =
      cpus[0]?.socket || mobos[0]?.socket || 'AM5';
    const detectedRam =
      rams[0]?.ram_type || mobos[0]?.ram_type || 'DDR5-6000';

    return {
      subtotal,
      totalParts,
      totalTdp: totalTdp || 0,
      psuWattage: psuWattage || recommendedPsu,
      recommendedPsu,
      isCompatible: conflicts.length === 0,
      conflicts,
      platformLabel: `Socket ${detectedSocket} Platform`,
      summaryNote:
        conflicts.length === 0
          ? `Socket ${detectedSocket}, ${detectedRam} & ${psuWattage || recommendedPsu}W Gold PSU verified with zero physical clearance or power bottlenecks.`
          : conflicts[0],
    };
  }, [rigItems]);

  // Compare Queue Actions
  const toggleCompare = useCallback(
    (listingOrComp) => {
      const comp = listingOrComp.component || listingOrComp;
      const itemKey = listingOrComp.id || `comp-${comp.id}`;
      setCompareItems((prev) => {
        const exists = prev.some((x) => (x.id || `comp-${x.component?.id}`) === itemKey);
        if (exists) {
          return prev.filter((x) => (x.id || `comp-${x.component?.id}`) !== itemKey);
        }
        if (prev.length >= 4) {
          addToast({
            type: 'warning',
            title: 'Compare Queue Full',
            message: 'You can compare up to 4 hardware components side-by-side.',
          });
          return prev;
        }
        return [
          ...prev,
          {
            id: itemKey,
            listing_id: listingOrComp.component ? listingOrComp.id : null,
            component: comp,
            price: parseFloat(listingOrComp.price ?? comp.price_avg ?? 0),
            seller_username: listingOrComp.seller_username || 'RigForge Verified',
          },
        ];
      });
    },
    [addToast]
  );

  // Modal helpers
  const openModal = useCallback((name, props = {}) => {
    setModalProps(props);
    setActiveModal(name);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalProps({});
  }, []);

  // Save Build to Backend
  const saveBuildToBackend = useCallback(
    async (title = 'Custom Kinetic Rig v1', isPublic = true) => {
      if (!access) {
        openModal('auth', { initialTab: 'login', message: 'Sign in to save your custom PC build to your account.' });
        return null;
      }
      const res = await apiFetch('/api/builder/builds/', {
        method: 'POST',
        body: JSON.stringify({ title, is_public: isPublic }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Could not create build');
      }
      const build = await res.json();
      for (const item of rigItems) {
        const cid = item.component_id || item.component?.id;
        if (cid) {
          await apiFetch(`/api/builder/builds/${build.id}/add_item/`, {
            method: 'POST',
            body: JSON.stringify({ component_id: cid, quantity: item.quantity || 1 }),
          });
        }
      }
      await fetchUserResources();
      addToast({
        type: 'success',
        title: 'Build Saved to Profile',
        message: `"${title}" (${rigItems.length} components) saved with RigSync verification.`,
      });
      return build;
    },
    [access, apiFetch, rigItems, fetchUserResources, openModal, addToast]
  );

  // Start Seller Chat for a listing
  const startSellerChat = useCallback(
    async (listing, initialMessage = '') => {
      if (!access) {
        openModal('auth', { initialTab: 'login', message: 'Sign in to message the verified merchant.' });
        return null;
      }
      const listingId = listing?.id || listing?.listing_id;
      if (!listingId) return null;

      const res = await apiFetch('/api/chat/rooms/', {
        method: 'POST',
        body: JSON.stringify({ listing_id: listingId }),
      });
      let room = null;
      if (res.ok) {
        room = await res.json();
      } else {
        // Might already exist or user is seller; fetch rooms
        const listRes = await apiFetch('/api/chat/rooms/');
        if (listRes.ok) {
          const allRooms = await listRes.json();
          const roomsArr = Array.isArray(allRooms) ? allRooms : allRooms.results || [];
          room = roomsArr.find((r) => r.listing?.id === listingId) || roomsArr[0];
        }
      }

      if (room && initialMessage) {
        await apiFetch(`/api/chat/rooms/${room.id}/messages/`, {
          method: 'POST',
          body: JSON.stringify({ text: initialMessage }),
        });
      }
      return room;
    },
    [access, apiFetch, openModal]
  );

  const value = {
    // Auth
    user,
    access,
    authLoading,
    login,
    register,
    logout,
    fetchCurrentUser,
    apiFetch,

    // Catalog
    listings,
    components,
    categories,
    loadingCatalog,
    fetchCatalog,
    globalSearch,
    setGlobalSearch,

    // Active Rig Split-Panel
    rigItems,
    setRigItems,
    isRigOpen,
    setIsRigOpen,
    justAddedItem,
    setJustAddedItem,
    addToRig,
    updateRigQty,
    removeFromRig,
    clearRig,
    rigMetrics,
    savedBuilds,
    saveBuildToBackend,

    // Compare
    compareItems,
    toggleCompare,
    clearCompare: () => setCompareItems([]),

    // Checkout & Orders
    checkoutPayload,
    setCheckoutPayload,
    orders,
    fetchUserResources,

    // Modals
    activeModal,
    modalProps,
    openModal,
    closeModal,

    // Chat & Notifications
    unreadCount,
    setUnreadCount,
    toasts,
    addToast,
    dismissToast,
    startSellerChat,
    getComponentImage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
