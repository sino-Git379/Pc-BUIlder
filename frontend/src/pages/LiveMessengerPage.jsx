import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getComponentImage, STITCH_IMAGES } from '../data/hardwareMedia';
import ErrorBoundary from '../components/ErrorBoundary';
import VoicePlayer from '../components/VoicePlayer';

function formatTime(dateVal, fallback = 'Now') {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return fallback;
  }
}

function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://student3.softclub.tj')) {
    return 'https://' + url.slice('http://'.length);
  }
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith(`http://${window.location.host}`)
  ) {
    return 'https://' + url.slice('http://'.length);
  }
  return url;
}

const DEMO_CONVERSATIONS = [
  {
    id: 'demo-viktor',
    isDemo: true,
    seller_username: 'Viktor HardwareLab',
    buyer_username: 'Alex K.',
    roleTag: 'Sellers',
    verified: true,
    online: true,
    rating: '4.98 ★ (312 Completed Rigs)',
    avatar: STITCH_IMAGES.avatarAlex,
    componentTitle: 'GPU • ASUS ROG Strix GeForce RTX 4080 Super',
    price: '999.00',
    unread_count: 0,
    updatedAtLabel: '14:22',
    messages: [
      {
        id: 'm1',
        sender: 'Alex K.',
        isMe: true,
        text: 'Hey Viktor! Saw your listing for the ROG Strix 4080 Super. Has the card ever been disassembled or waterblocked, or is the factory warranty seal still intact on the backplate screw?',
        timestamp: '14:15',
        status: 'read',
      },
      {
        id: 'm2',
        sender: 'Viktor HardwareLab',
        isMe: false,
        text: 'Hi Alex! Factory warranty sticker is 100% intact. It was only used in a climate-controlled studio workstation for 4 months (Octane Render + light gaming). Zero coil whine under load.',
        timestamp: '14:17',
        status: 'read',
      },
      {
        id: 'm3',
        sender: 'Viktor HardwareLab',
        isMe: false,
        text: 'Here is the close-up of the serial sticker and a 30-minute FurMark 4K thermal stress log I just ran this morning:',
        attachment: {
          image: STITCH_IMAGES.rtx4080,
          fileName: 'IMG_4080_Thermal_Log.png',
          meta: '2.4 MB • Max Core: 63.4°C • Hotspot: 74.1°C',
        },
        timestamp: '14:18',
        status: 'read',
      },
      {
        id: 'm4',
        sender: 'Alex K.',
        isMe: true,
        text: "Thermals look super clean! RigSync shows 455mm clearance in my Lian Li O11 EVO so length is no issue. I'm sending over an Escrow Offer now.",
        timestamp: '14:20',
        status: 'read',
      },
      {
        id: 'm5',
        sender: 'Alex K.',
        isMe: true,
        offerCard: {
          code: '#OFR-8829',
          amount: '949.00',
          ask: '999.00',
          discountLabel: '-5% off Ask',
          status: 'Pending Seller Review',
        },
        timestamp: '14:21',
        status: 'read',
      },
      {
        id: 'm6',
        sender: 'Viktor HardwareLab',
        isMe: false,
        text: 'Includes original 12VHPWR braided adapter & box. Ready to ship today via FedEx Express if we lock in Escrow.',
        timestamp: '14:22',
        status: 'read',
      },
    ],
  },
  {
    id: 'demo-bot',
    isDemo: true,
    seller_username: 'RigForge Verification Bot',
    buyer_username: 'Alex K.',
    roleTag: 'Support',
    verified: true,
    online: true,
    rating: 'Automated RigSync v4.2 Diagnostics',
    avatar: STITCH_IMAGES.logo,
    componentTitle: 'RigSync Alert • Seasonic GX-850 ATX 3.0',
    price: '129.99',
    unread_count: 0,
    updatedAtLabel: 'Tue',
    messages: [
      {
        id: 'b1',
        sender: 'RigForge Verification Bot',
        isMe: false,
        text: 'Telemetry Check Passed: Your active AM5 build (Ryzen 7 7800X3D + RTX 4080 Super) draws an estimated 545W peak TDP. Your selected 850W ATX 3.0 PSU provides 35% transient headroom.',
        timestamp: '11:05',
        status: 'read',
      },
    ],
  },
];

function LiveMessengerContent() {
  const {
    user,
    access,
    apiFetch,
    listings,
    rigMetrics,
    setUnreadCount,
    openModal,
    setCheckoutPayload,
    addToast,
  } = useApp();
  const { t } = useTheme();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(
    searchParams.get('room') || (user ? null : 'demo-viktor')
  );
  const [messagesByRoom, setMessagesByRoom] = useState(() => {
    const map = {};
    if (Array.isArray(DEMO_CONVERSATIONS)) {
      for (const d of DEMO_CONVERSATIONS) {
        map[d.id] = Array.isArray(d.messages) ? d.messages : [];
      }
    }
    return map;
  });

  const [channelTab, setChannelTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(Boolean(searchParams.get('room')));
  const [openMenuRoomId, setOpenMenuRoomId] = useState(null);
  const [hiddenDemoIds, setHiddenDemoIds] = useState([]);

  const chatWsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuRoomId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Unified list of conversations (Real Backend Rooms + Demo Showcase Rooms)
  const allConversations = useMemo(() => {
    const mappedBackend = (Array.isArray(rooms) ? rooms : []).map((r) => {
      const comp = r?.listing?.component || {};
      const otherName =
        user && r?.buyer_username === user.username
          ? r?.seller_username || 'Merchant'
          : r?.buyer_username || r?.seller_username || 'Merchant';
      const lastMsg =
        r?.last_message ||
        (Array.isArray(r?.messages) && r.messages[r.messages.length - 1]) ||
        null;
      const hasVoice = Boolean(lastMsg?.voice_file || lastMsg?.voice_url);
      const hasImage = Boolean(lastMsg?.image || lastMsg?.image_url);
      const lastPreview = hasVoice
        ? `🎤 Voice note (${lastMsg?.voice_duration || '0:05'})`
        : hasImage
        ? `📷 Photo${lastMsg?.attachment_name ? `: ${lastMsg.attachment_name}` : ''}`
        : (lastMsg?.text || 'Chat channel initialized');

      return {
        id: r?.id,
        isDemo: false,
        rawRoom: r,
        listing: r?.listing,
        seller_username: otherName,
        roleTag: 'Sellers',
        verified: true,
        online: true,
        rating: '4.95 ★ Verified RigForge Merchant',
        avatar: getComponentImage(comp),
        componentTitle: comp?.name ? `${comp.brand || ''} ${comp.name}`.trim() : 'Hardware Inquiry',
        price: r?.listing?.price || comp?.price_avg || '299.00',
        unread_count: r?.unread_count || 0,
        lastMessagePreview: lastPreview,
        updatedAtLabel: formatTime(lastMsg?.created_at, 'Now'),
      };
    });

    const demoMapped = (Array.isArray(DEMO_CONVERSATIONS) ? DEMO_CONVERSATIONS : [])
      .filter((d) => !hiddenDemoIds.includes(String(d.id)))
      .map((d) => {
      const roomMsgs = Array.isArray(messagesByRoom[d.id])
        ? messagesByRoom[d.id]
        : Array.isArray(d.messages)
        ? d.messages
        : [];
      const last = roomMsgs[roomMsgs.length - 1];
      const hasVoice = Boolean(last?.voiceNote?.url);
      return {
        ...d,
        lastMessagePreview:
          hasVoice
            ? `🎤 Voice note (${last?.voiceNote?.duration || '0:05'})`
            : last?.text ||
              (last?.offerCard
                ? `Escrow Offer $${last.offerCard.amount || ''}`
                : last
                ? 'Attachment'
                : 'No messages yet'),
      };
    });

    // Clean Slate: Authenticated users only see their own real conversations.
    // Unauthenticated guest visitors see the demo showcase channels.
    const combined = user ? mappedBackend : demoMapped;

    return combined.filter((c) => {
      if (!c) return false;
      if (channelTab !== 'All' && c.roleTag !== channelTab) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const hay = `${c.seller_username || ''} ${c.componentTitle || ''} ${c.lastMessagePreview || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rooms, user, messagesByRoom, channelTab, searchQuery, hiddenDemoIds]);

  const activeConversation = useMemo(() => {
    const list = Array.isArray(allConversations) ? allConversations : [];
    if (selectedRoomId) {
      const found = list.find((c) => String(c?.id) === String(selectedRoomId));
      if (found) return found;
    }
    return list[0] || (user ? null : Array.isArray(DEMO_CONVERSATIONS) ? DEMO_CONVERSATIONS[0] : null);
  }, [allConversations, selectedRoomId, user]);

  const activeMessages = useMemo(() => {
    if (!activeConversation?.id) return [];
    const list = messagesByRoom[activeConversation.id];
    if (Array.isArray(list)) return list;
    if (Array.isArray(activeConversation.messages)) return activeConversation.messages;
    return [];
  }, [messagesByRoom, activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages.length, activeConversation?.id]);

  // Load real backend chat rooms if logged in
  const loadBackendRooms = useCallback(async () => {
    if (!access) return;
    setLoadingRooms(true);
    try {
      const res = await apiFetch('/api/chat/rooms/');
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data)
          ? data
          : data && Array.isArray(data.results)
          ? data.results
          : [];
        setRooms(arr);

        const paramRoom = searchParams.get('room');
        if (paramRoom && arr.some((r) => String(r?.id) === String(paramRoom))) {
          setSelectedRoomId(Number(paramRoom));
        } else if (arr.length > 0 && (!selectedRoomId || selectedRoomId === 'demo-viktor') && !paramRoom) {
          setSelectedRoomId(arr[0].id);
        } else if (arr.length === 0) {
          setSelectedRoomId(null);
        }
      }
    } catch (_) {
    } finally {
      setLoadingRooms(false);
    }
  }, [access, apiFetch, searchParams, selectedRoomId]);

  useEffect(() => {
    loadBackendRooms();
  }, [loadBackendRooms]);

  // Listen for global chat notifications so room list refreshes
  useEffect(() => {
    const handler = () => {
      loadBackendRooms();
    };
    window.addEventListener('rigforge:chat-notification', handler);
    return () => window.removeEventListener('rigforge:chat-notification', handler);
  }, [loadBackendRooms]);

  // Handle Clearing Chat History
  const handleClearChat = async (conv) => {
    setOpenMenuRoomId(null);
    if (!window.confirm(`Clear all messages in chat with "${conv.seller_username}"?`)) return;

    const roomId = conv.id;
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [],
    }));

    if (!conv.isDemo && access) {
      try {
        const res = await apiFetch(`/api/chat/rooms/${roomId}/clear_history/`, {
          method: 'POST',
        });
        if (res.ok) {
          addToast({
            type: 'info',
            title: 'Chat History Cleared',
            message: `Cleared conversation messages with ${conv.seller_username}.`,
          });
        }
      } catch (_) {}
    } else {
      addToast({
        type: 'info',
        title: 'Showcase History Cleared',
        message: `Cleared messages with ${conv.seller_username}.`,
      });
    }
  };

  // Handle Deleting Chat Completely
  const handleDeleteChat = async (conv) => {
    setOpenMenuRoomId(null);
    if (!window.confirm(`Delete conversation with "${conv.seller_username}" completely?`)) return;

    const roomId = conv.id;
    if (conv.isDemo) {
      setHiddenDemoIds((prev) => [...prev, String(roomId)]);
      setMessagesByRoom((prev) => {
        const copy = { ...prev };
        delete copy[roomId];
        return copy;
      });
      addToast({
        type: 'info',
        title: 'Chat Deleted',
        message: `Removed ${conv.seller_username} from your conversation list.`,
      });
      if (String(selectedRoomId) === String(roomId)) {
        setSelectedRoomId(null);
      }
      return;
    }

    if (access) {
      try {
        const res = await apiFetch(`/api/chat/rooms/${roomId}/`, {
          method: 'DELETE',
        });
        if (res.ok || res.status === 204) {
          setRooms((prev) => prev.filter((r) => String(r.id) !== String(roomId)));
          setMessagesByRoom((prev) => {
            const copy = { ...prev };
            delete copy[roomId];
            return copy;
          });
          addToast({
            type: 'success',
            title: 'Chat Deleted',
            message: `Deleted conversation with ${conv.seller_username}.`,
          });
          if (String(selectedRoomId) === String(roomId)) {
            setSelectedRoomId(null);
          }
        }
      } catch (_) {}
    }
  };

  // Listen for AI 3D Build Render share events to send directly into active chat
  useEffect(() => {
    const handleShareBuild = (e) => {
      const detail = e.detail;
      const targetRoomId = activeConversation?.id || selectedRoomId || 'demo-viktor';
      if (!detail || !targetRoomId) return;

      const buildRenderMsg = {
        id: `render-${Date.now()}`,
        sender: user?.username || 'You',
        isMe: true,
        text: detail.text || 'RigForge 3D Build Render',
        attachment: {
          image: detail.image,
          fileName: detail.fileName || 'RigForge_3D_Build_Render.png',
          meta: detail.meta || 'AI 3D Assembled Render',
        },
        timestamp: formatTime(new Date()),
        status: 'read',
      };

      setMessagesByRoom((prev) => ({
        ...prev,
        [targetRoomId]: [...(Array.isArray(prev[targetRoomId]) ? prev[targetRoomId] : []), buildRenderMsg],
      }));

      if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
        chatWsRef.current.send(
          JSON.stringify({
            message: detail.text || '[RigForge 3D Build Render]',
          })
        );
      }
      setTimeout(scrollToBottom, 60);
    };

    window.addEventListener('rigforge:share-build-to-chat', handleShareBuild);
    return () => window.removeEventListener('rigforge:share-build-to-chat', handleShareBuild);
  }, [activeConversation, selectedRoomId, user]);

  // Load messages for selected backend room & connect WebSocket
  useEffect(() => {
    const isDemo = String(selectedRoomId).startsWith('demo-');
    if (isDemo || !access || !selectedRoomId) {
      setWsConnected(isDemo);
      return;
    }

    let isMounted = true;
    let pingTimer = null;
    let ws = null;

    // 1. Fetch room message history & mark read
    const fetchRoomHistory = async () => {
      try {
        const res = await apiFetch(`/api/chat/rooms/${selectedRoomId}/messages/`);
        if (res.ok && isMounted) {
          const msgs = await res.json();
          const msgsList = Array.isArray(msgs)
            ? msgs
            : msgs && Array.isArray(msgs.results)
            ? msgs.results
            : [];

          setMessagesByRoom((prev) => ({
            ...prev,
            [selectedRoomId]: msgsList.map((m) => {
              const voiceUrl = normalizeMediaUrl(m?.voice_url || m?.voice_file || null);
              const imageUrl = normalizeMediaUrl(m?.image_url || m?.image || null);
              const hasVoice = Boolean(voiceUrl);
              const hasImage = Boolean(imageUrl);
              const isVoicePlaceholder =
                m?.text === 'Voice Message' ||
                (typeof m?.text === 'string' && m.text.startsWith('[Voice Message'));
              const isAttachmentPlaceholder =
                typeof m?.text === 'string' &&
                (m.text.startsWith('[Attachment:') || m.text.startsWith('Shared photo:'));
              return {
                id: m?.id || `m-${Date.now()}-${Math.random()}`,
                sender: m?.sender_username || m?.sender || 'User',
                sender_id: m?.sender,
                isMe: user && (m?.sender === user.id || m?.sender_username === user.username),
                text:
                  (hasVoice && isVoicePlaceholder) || (hasImage && isAttachmentPlaceholder)
                    ? ''
                    : (m?.text || ''),
                attachment: hasImage
                  ? {
                      image: imageUrl,
                      fileName: m?.attachment_name || 'Photo',
                      meta: 'Image Attachment',
                      isDocument: false,
                    }
                  : null,
                voiceNote: hasVoice
                  ? {
                      url: voiceUrl,
                      duration: m?.voice_duration || '0:05',
                    }
                  : null,
                timestamp: formatTime(m?.created_at, 'Now'),
                status: 'read',
              };
            }),
          }));
        }
        // Mark read
        const markRes = await apiFetch('/api/chat/mark_read/', {
          method: 'POST',
          body: JSON.stringify({ room_id: selectedRoomId }),
        });
        if (markRes.ok) {
          const markData = await markRes.json();
          if (typeof markData?.unread_count === 'number') {
            setUnreadCount(markData.unread_count);
          }
        }
      } catch (_) {}
    };

    fetchRoomHistory();

    // 2. Connect Room WebSocket safely
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/chat/${selectedRoomId}/?token=${encodeURIComponent(
        access
      )}`;
      ws = new WebSocket(wsUrl);
      chatWsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setWsConnected(true);
        pingTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'pong') return;
          if (data?.message || data?.voice_url || data?.image_url) {
            const voiceUrl = normalizeMediaUrl(data.voice_url);
            const imageUrl = normalizeMediaUrl(data.image_url);
            const hasVoice = Boolean(voiceUrl);
            const hasImage = Boolean(imageUrl);
            const isVoicePlaceholder =
              data.message === 'Voice Message' ||
              (typeof data.message === 'string' && data.message.startsWith('[Voice Message'));
            const isAttachmentPlaceholder =
              typeof data.message === 'string' &&
              (data.message.startsWith('[Attachment:') || data.message.startsWith('Shared photo:'));
            const incomingMsg = {
              id: data.message_id || `ws-${Date.now()}`,
              sender: data.sender || 'User',
              sender_id: data.sender_id,
              isMe: user && (data.sender_id === user.id || data.sender === user.username),
              text:
                (hasVoice && isVoicePlaceholder) || (hasImage && isAttachmentPlaceholder)
                  ? ''
                  : (data.message || ''),
              attachment: hasImage
                ? {
                    image: imageUrl,
                    fileName: data.attachment_name || 'Photo',
                    meta: 'Image Attachment',
                    isDocument: false,
                  }
                : null,
              voiceNote: hasVoice
                ? {
                    url: voiceUrl,
                    duration: data.voice_duration || '0:05',
                  }
                : null,
              timestamp: formatTime(data.timestamp, 'Just now'),
              status: 'read',
            };

            setMessagesByRoom((prev) => {
              const existing = Array.isArray(prev[selectedRoomId]) ? prev[selectedRoomId] : [];
              const optimisticIdx = existing.findIndex(
                (m) =>
                  m?.optimistic &&
                  ((incomingMsg.voiceNote && m?.voiceNote) ||
                    (incomingMsg.attachment && m?.attachment) ||
                    (m?.text && m.text === incomingMsg.text))
              );
              if (optimisticIdx > -1) {
                const copy = [...existing];
                copy[optimisticIdx] = incomingMsg;
                return { ...prev, [selectedRoomId]: copy };
              }
              if (existing.some((m) => String(m?.id) === String(incomingMsg.id))) return prev;
              return { ...prev, [selectedRoomId]: [...existing, incomingMsg] };
            });
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        if (isMounted) setWsConnected(false);
      };

      ws.onclose = () => {
        if (isMounted) setWsConnected(false);
        if (pingTimer) clearInterval(pingTimer);
      };
    } catch (wsErr) {
      console.warn('WebSocket connection error:', wsErr);
      if (isMounted) setWsConnected(false);
    }

    return () => {
      isMounted = false;
      if (pingTimer) clearInterval(pingTimer);
      if (ws) {
        try {
          ws.close();
        } catch (_) {}
      }
    };
  }, [selectedRoomId, access, apiFetch, user, setUnreadCount]);

  // Send a message (via WebSocket or REST fallback + Demo auto-reply)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeConversation) return;

    setInputText('');
    const roomId = activeConversation.id;
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      optimistic: true,
      sender: user?.username || 'Alex K.',
      isMe: true,
      text,
      timestamp: nowLabel,
      status: 'sending',
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), optimisticMsg],
    }));

    if (activeConversation.isDemo) {
      // Mark delivered after 350ms and simulate intelligent merchant reply
      setTimeout(() => {
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] || []).map((m) =>
            m.id === optimisticMsg.id ? { ...m, optimistic: false, status: 'read' } : m
          ),
        }));
      }, 350);

      setTimeout(() => {
        const replyMsg = {
          id: `reply-${Date.now()}`,
          sender: activeConversation.seller_username,
          isMe: false,
          text: text.toLowerCase().includes('offer')
            ? 'Received your offer! Everything looks solid on RigSync — I can accept this in Escrow and have FedEx pick it up within 2 hours.'
            : 'Sounds great! All original accessories, thermal test certificates, and retail packaging are ready for insured dispatch.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        };
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: [...(prev[roomId] || []), replyMsg],
        }));
      }, 1100);
      return;
    }

    // Real backend room: send over WebSocket if open, else POST to REST endpoint
    if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
      chatWsRef.current.send(JSON.stringify({ message: text }));
    } else if (access) {
      try {
        const res = await apiFetch(`/api/chat/rooms/${roomId}/messages/`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const saved = await res.json();
          setMessagesByRoom((prev) => ({
            ...prev,
            [roomId]: (prev[roomId] || []).map((m) =>
              m.id === optimisticMsg.id
                ? { ...m, id: saved.id, optimistic: false, status: 'read' }
                : m
            ),
          }));
        }
      } catch (_) {}
    }
  };

  // Start a new real chat room with a marketplace seller
  const handleStartNewListingChat = async () => {
    if (!access) {
      openModal('auth', {
        initialTab: 'login',
        message: 'Sign in to start a live WebSocket chat with a verified seller.',
      });
      return;
    }
    const targetListing =
      listings.find((l) => l.seller_username !== user?.username) || listings[0];
    if (!targetListing) return;

    const res = await apiFetch('/api/chat/rooms/', {
      method: 'POST',
      body: JSON.stringify({ listing_id: targetListing.id }),
    });
    if (res.ok) {
      const room = await res.json();
      await loadBackendRooms();
      setSelectedRoomId(room.id);
      addToast({
        type: 'success',
        title: 'Live Chat Connected',
        message: `Connected with ${targetListing.seller_username} regarding ${targetListing.component?.name}.`,
      });
    } else {
      addToast({
        type: 'info',
        title: 'Select any Marketplace Listing',
        message: 'Open any product details modal and click "Message Seller" to start a chat.',
      });
    }
  };

  const handleSendThermalAttachment = () => {
    const roomId = activeConversation?.id;
    if (!roomId) return;

    const thermalMsg = {
      id: `thermal-${Date.now()}`,
      sender: user?.username || 'Alex K.',
      isMe: true,
      text: 'RigSync Hardware Diagnostics & Telemetry Log',
      attachment: {
        image: STITCH_IMAGES.kraken360,
        fileName: 'RigSync_Thermal_Log_v4.png',
        meta: `Estimated TDP: ${rigMetrics?.totalTdp || 540}W • Est. Temp: 64.2°C • Compatibility Score: ${rigMetrics?.compatibilityScore || 98}%`,
      },
      timestamp: formatTime(new Date()),
      status: 'read',
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(Array.isArray(prev[roomId]) ? prev[roomId] : []), thermalMsg],
    }));

    if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
      chatWsRef.current.send(
        JSON.stringify({
          message: `[RigSync Telemetry Snapshot: ${thermalMsg.attachment.meta}]`,
        })
      );
    }
    setTimeout(scrollToBottom, 60);
  };

  const handleInsertRigTag = () => {
    setInputText((prev) =>
      `${prev} [My RigSync Profile: ${rigMetrics.platformLabel}, Est. ${rigMetrics.totalTdp}W TDP] `.trimStart()
    );
  };

  // Real File Upload Handler (Native Device File Picker)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const roomId = activeConversation?.id;
    if (!roomId) return;

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      const isImg = file.type.startsWith('image/');
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      const optimisticId = `file-${Date.now()}`;

      const fileMsg = {
        id: optimisticId,
        optimistic: !activeConversation.isDemo,
        sender: user?.username || 'You',
        isMe: true,
        text: isImg ? '' : `Shared document: ${file.name}`,
        attachment: {
          image: isImg ? dataUrl : null,
          fileName: file.name,
          meta: `${sizeKb} KB • ${file.type || 'file'}`,
          isDocument: !isImg,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: activeConversation.isDemo ? 'read' : 'sending',
      };

      setMessagesByRoom((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), fileMsg],
      }));
      setTimeout(scrollToBottom, 60);

      if (activeConversation.isDemo) {
        return;
      }

      let sentViaRest = false;
      if (access) {
        try {
          const formData = new FormData();
          if (isImg) {
            formData.append('image', file, file.name);
            formData.append('attachment_name', file.name);
            formData.append('text', '');
          } else {
            formData.append('image', file, file.name);
            formData.append('attachment_name', file.name);
            formData.append('text', `Shared document: ${file.name} (${sizeKb} KB)`);
          }

          const res = await apiFetch(`/api/chat/rooms/${roomId}/messages/`, {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            sentViaRest = true;
            const saved = await res.json();
            const serverImgUrl = normalizeMediaUrl(saved.image_url || saved.image);
            setMessagesByRoom((prev) => ({
              ...prev,
              [roomId]: (Array.isArray(prev[roomId]) ? prev[roomId] : []).map((m) =>
                m.id === optimisticId
                  ? {
                      ...m,
                      id: saved.id || m.id,
                      optimistic: false,
                      status: 'read',
                      attachment: {
                        ...m.attachment,
                        image: isImg ? (serverImgUrl || dataUrl) : null,
                      },
                    }
                  : m
              ),
            }));
          }
        } catch (_) {}
      }

      // Fallback over WebSocket if REST failed
      if (!sentViaRest && chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
        chatWsRef.current.send(
          JSON.stringify({
            message: isImg ? '' : `Shared document: ${file.name} (${sizeKb} KB)`,
            image_base64: isImg ? dataUrl : null,
            attachment_name: file.name,
          })
        );
      }
    };

    reader.readAsDataURL(file);

    // Reset input so user can pick same file again
    e.target.value = '';
  };

  // Voice Note Recording Logics (Record, Stop, Send, Playback)
  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startVoiceRecording = async () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      addToast({
        type: 'error',
        title: 'Microphone Not Supported',
        message: 'Your browser or device does not support audio recording.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const localAudioUrl = URL.createObjectURL(audioBlob);
        const durationSec = recordingSeconds || 1;
        const durationFormatted = `${Math.floor(durationSec / 60)}:${(durationSec % 60)
          .toString()
          .padStart(2, '0')}`;

        const roomId = activeConversation?.id;
        if (roomId && audioChunksRef.current.length > 0) {
          const optimisticId = `voice-${Date.now()}`;
          const voiceMsg = {
            id: optimisticId,
            optimistic: true,
            sender: user?.username || 'You',
            isMe: true,
            text: '',
            voiceNote: {
              url: localAudioUrl,
              duration: durationFormatted,
            },
            timestamp: formatTime(new Date()),
            status: 'sending',
          };

          setMessagesByRoom((prev) => ({
            ...prev,
            [roomId]: [...(Array.isArray(prev[roomId]) ? prev[roomId] : []), voiceMsg],
          }));
          setTimeout(scrollToBottom, 60);

          if (activeConversation.isDemo) {
            setTimeout(() => {
              setMessagesByRoom((prev) => ({
                ...prev,
                [roomId]: (Array.isArray(prev[roomId]) ? prev[roomId] : []).map((m) =>
                  m.id === optimisticId ? { ...m, optimistic: false, status: 'read' } : m
                ),
              }));
            }, 400);

            setTimeout(() => {
              const demoReply = {
                id: `reply-${Date.now()}`,
                sender: activeConversation.seller_username,
                isMe: false,
                text: 'Listening to your voice note right now! Audio sounds crystal clear — I have packed the GPU securely in anti-static film.',
                timestamp: formatTime(new Date()),
                status: 'read',
              };
              setMessagesByRoom((prev) => ({
                ...prev,
                [roomId]: [...(Array.isArray(prev[roomId]) ? prev[roomId] : []), demoReply],
              }));
              setTimeout(scrollToBottom, 60);
            }, 1400);
            return;
          }

          // Real backend room:
          // 1. Upload multipart FormData via REST endpoint first (also broadcasts via Channels to recipient)
          const sendVoice = async () => {
            let sentViaRest = false;
            if (access) {
              try {
                const formData = new FormData();
                formData.append('voice_file', audioBlob, 'voice_message.webm');
                formData.append('voice_duration', durationFormatted);
                formData.append('text', 'Voice Message');

                const res = await apiFetch(`/api/chat/rooms/${roomId}/messages/`, {
                  method: 'POST',
                  body: formData,
                });
                if (res.ok) {
                  sentViaRest = true;
                  const saved = await res.json();
                  const serverVoiceUrl = normalizeMediaUrl(saved.voice_url || saved.voice_file);
                  setMessagesByRoom((prev) => ({
                    ...prev,
                    [roomId]: (Array.isArray(prev[roomId]) ? prev[roomId] : []).map((m) =>
                      m.id === optimisticId
                        ? {
                            ...m,
                            id: saved.id || m.id,
                            optimistic: false,
                            status: 'read',
                            voiceNote: {
                              url: serverVoiceUrl || localAudioUrl,
                              duration: saved.voice_duration || durationFormatted,
                            },
                          }
                        : m
                    ),
                  }));
                }
              } catch (_) {}
            }

            // 2. Fallback to base64 over WebSocket if REST failed
            if (!sentViaRest && chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
              const reader = new FileReader();
              reader.onloadend = () => {
                try {
                  chatWsRef.current.send(
                    JSON.stringify({
                      message: '',
                      voice_base64: reader.result,
                      voice_duration: durationFormatted,
                    })
                  );
                } catch (_) {}
              };
              reader.readAsDataURL(audioBlob);
            }
          };
          sendVoice();
        }

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (_) {
      addToast({
        type: 'error',
        title: 'Microphone Permission Required',
        message: 'Please allow microphone access to record voice messages.',
      });
    }
  };

  const matchedListing = useMemo(() => {
    if (!activeConversation) return null;
    if (activeConversation.listing) return activeConversation.listing;
    const safeListings = Array.isArray(listings) ? listings : [];
    if (activeConversation.rawRoom?.listing?.id) {
      const found = safeListings.find((l) => l?.id === activeConversation.rawRoom?.listing?.id);
      if (found) return found;
    }
    const title = (activeConversation.componentTitle || '').toLowerCase();
    if (title) {
      const found = safeListings.find((l) =>
        title.includes((l?.component?.name || '').toLowerCase())
      );
      if (found) return found;
    }
    return safeListings[0] || null;
  }, [activeConversation, listings]);

  return (
    <main className="w-full h-[calc(100vh-4rem)] pb-14 lg:pb-0 bg-background overflow-hidden animate-page-enter">
      <div className="max-w-[1440px] h-full mx-auto px-0 sm:px-margin py-0 sm:py-space-md flex flex-col">
        <div className="w-full flex-1 flex bg-surface-container-lowest sm:rounded-xl shadow-sm border border-outline-variant/25 overflow-hidden relative">
          {/* LEFT PANEL: Conversation List (Telegram style: full width on mobile when no chat is open, hidden on mobile when chat is open) */}
          <aside
            className={`w-full md:w-80 lg:w-[370px] shrink-0 flex flex-col bg-surface-container-lowest md:border-r border-outline-variant/25 transition-all duration-300 ${
              mobileChatOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-space-md flex flex-col gap-space-sm border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
                    Messages
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">
                    {allConversations.length} Active
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleStartNewListingChat}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                    title="Start New Seller Inquiry"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit_square</span>
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchChats')}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low focus:bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-lg border border-transparent focus:border-primary/40 focus:outline-none transition-all"
                />
              </div>

              {/* Channel Filter Tabs */}
              <div className="flex items-center gap-1 pt-0.5">
                {[
                  { key: 'All', label: t('allChannels') },
                  { key: 'Sellers', label: t('sellers') },
                  { key: 'Support', label: t('support') },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setChannelTab(tab.key)}
                    className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-bold transition-colors ${
                      channelTab === tab.key
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/15">
              {loadingRooms && (
                <div className="p-3 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span>Syncing channels...</span>
                </div>
              )}
              {(!allConversations || allConversations.length === 0) && !loadingRooms && (
                <div className="p-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl mb-1 text-outline">forum</span>
                  <div className="font-body-md text-body-md font-bold text-on-surface">
                    {t('noConversationsYet')}
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant max-w-[220px] leading-relaxed">
                    {t('noConversationsDesc')}
                  </p>
                </div>
              )}
              {(Array.isArray(allConversations) ? allConversations : []).map((conv) => {
                if (!conv) return null;
                const isSelected = String(conv.id) === String(activeConversation?.id);
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedRoomId(conv.id);
                      setMobileChatOpen(true);
                    }}
                    className={`p-space-md cursor-pointer transition-colors relative flex gap-space-sm items-start ${
                      isSelected
                        ? 'bg-surface-container-high/65'
                        : 'hover:bg-surface-container-low'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1 bg-primary absolute left-0 top-2 bottom-2 rounded-r-full"></div>
                    )}
                    <div className="relative shrink-0">
                      <img
                        alt={conv.seller_username}
                        className="w-12 h-12 rounded-full object-cover bg-surface-container p-0.5"
                        src={conv.avatar || STITCH_IMAGES.avatarAlex}
                      />
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 truncate">
                          <span className="font-body-md text-body-md font-bold text-on-surface truncate">
                            {conv.seller_username}
                          </span>
                          {conv.verified && (
                            <span
                              className="material-symbols-outlined text-primary text-[15px] shrink-0"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-label-sm text-[11px] text-primary font-semibold">
                            {conv.updatedAtLabel}
                          </span>
                          {/* 3-dots Context Menu for Chat Management */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuRoomId((curr) => (curr === conv.id ? null : conv.id));
                              }}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                              title="Chat Options"
                            >
                              <span className="material-symbols-outlined text-[16px]">more_vert</span>
                            </button>

                            {openMenuRoomId === conv.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-6 w-40 rounded-xl bg-surface-container-lowest border border-outline-variant/35 shadow-xl py-1 z-30 animate-menu-enter"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleClearChat(conv)}
                                  className="w-full px-3 py-1.5 text-left font-body-sm text-[12px] text-on-surface hover:bg-surface-container-low flex items-center gap-2 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                                    cleaning_services
                                  </span>
                                  <span>{t('clearChat')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChat(conv)}
                                  className="w-full px-3 py-1.5 text-left font-body-sm text-[12px] text-error hover:bg-error-container/40 flex items-center gap-2 transition-colors border-t border-outline-variant/15"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    delete
                                  </span>
                                  <span>{t('deleteChat')}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-primary font-label-sm text-[10px] font-bold truncate">
                          {conv.componentTitle}
                        </span>
                        <span className="font-label-sm text-[11px] font-bold text-on-surface">
                          ${conv.price}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          {conv.lastMessagePreview}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="shrink-0 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-primary text-on-primary font-label-sm text-[10px] font-bold">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* RIGHT PANEL: Active Chat Stream or Clean Empty Slate */}
          <section
            className={`flex-1 flex-col bg-surface-container-low relative min-w-0 ${
              mobileChatOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-outline mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[32px] text-primary">chat</span>
                </div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-1">
                  {t('noConversationsYet')}
                </h3>
                <p className="font-body-sm text-sm text-on-surface-variant max-w-sm mb-5 leading-relaxed">
                  {t('noConversationsDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn-interactive px-4 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm text-sm font-bold shadow-md hover:bg-on-primary-fixed-variant flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  <span>{t('browseMarketplace')}</span>
                </button>
              </div>
            ) : (
              <>
            {/* Chat Top Header: Seller Identity + Pinned PC Part Deal Banner */}
            <div className="bg-surface-container-lowest border-b border-outline-variant/25 z-10">
              {/* Top Row: Seller Info & Mobile Back Button */}
              <div className="px-3 sm:px-space-lg py-2.5 sm:py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-space-md min-w-0">
                  {/* Telegram-style Back to Conversations Button on Mobile */}
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors flex items-center justify-center shrink-0"
                    title="Back to conversation list"
                  >
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                  </button>

                  <div className="relative shrink-0">
                    <img
                      alt={activeConversation?.seller_username}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover bg-surface-container"
                      src={activeConversation?.avatar || STITCH_IMAGES.avatarAlex}
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="font-headline-sm text-sm sm:text-[16px] font-bold text-on-surface truncate">
                        {activeConversation?.seller_username}
                      </h2>
                      {activeConversation?.verified && (
                        <span
                          className="material-symbols-outlined text-primary text-[15px] sm:text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                      )}
                      <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold">
                        Tier 1 Merchant
                      </span>
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                        <span className="hidden xs:inline">{wsConnected ? 'WebSocket Live' : 'Ready'}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 font-body-sm text-[11px] sm:text-[12px] text-on-surface-variant truncate">
                      <span className="text-secondary font-medium">{t('activeNow')}</span>
                      <span>•</span>
                      <span className="truncate">{activeConversation?.rating}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">Avg. reply &lt; 3m</span>
                    </div>
                  </div>
                </div>

                {/* Right Utility Icons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSendThermalAttachment}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                    title="Share RigSync Telemetry Snapshot"
                  >
                    <span className="material-symbols-outlined text-[20px]">analytics</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (matchedListing) openModal('productDetails', { item: matchedListing });
                    }}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                    title="Inspect Hardware Specs"
                  >
                    <span className="material-symbols-outlined text-[20px]">info</span>
                  </button>
                </div>
              </div>

              {/* Pinned PC Part Marketplace Deal Banner */}
              <div className="px-space-lg py-2.5 bg-surface-container-low/80 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-surface-container-lowest p-1 border border-outline-variant/20 shrink-0 flex items-center justify-center">
                    <img
                      alt="Hardware Part"
                      className="w-full h-full object-contain"
                      src={
                        matchedListing
                          ? getComponentImage(matchedListing.component)
                          : STITCH_IMAGES.rtx4080
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        Active Listing Inquiry
                      </span>
                      <span className="font-label-sm text-[11px] text-secondary font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        In Stock • Verified Compatible
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <h3 className="font-body-md text-body-md font-bold text-on-surface truncate">
                        {activeConversation?.componentTitle}
                      </h3>
                      <span className="font-label-lg text-label-lg font-bold text-primary shrink-0">
                        ${activeConversation?.price}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deal Action Buttons */}
                <div className="flex items-center gap-space-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (matchedListing) {
                        openModal('productDetails', { item: matchedListing });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm text-body-sm font-semibold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>{t('viewListing')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openModal('makeOffer', {
                        item: matchedListing,
                        askingPrice: parseFloat(activeConversation?.price || 999),
                        onSendOfferToChat: (offerAmt, note) => {
                          const roomId = activeConversation?.id;
                          if (!roomId) return;
                          const newOfferMsg = {
                            id: `ofr-${Date.now()}`,
                            sender: user?.username || 'Alex K.',
                            isMe: true,
                            offerCard: {
                              code: `#OFR-${Math.floor(1000 + Math.random() * 9000)}`,
                              amount: parseFloat(offerAmt).toFixed(2),
                              ask: activeConversation?.price || '999.00',
                              discountLabel: note || 'Binding Escrow Offer',
                              status: 'Pending Seller Review',
                            },
                            timestamp: formatTime(new Date()),
                            status: 'read',
                          };
                          setMessagesByRoom((prev) => ({
                            ...prev,
                            [roomId]: [...(prev[roomId] || []), newOfferMsg],
                          }));
                        },
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-sm text-body-sm font-bold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">local_offer</span>
                    <span>Make Offer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-space-lg py-space-md flex flex-col gap-3">
              {/* Encryption / Escrow Notice Pill */}
              <div className="flex justify-center my-1">
                <div className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    verified_user
                  </span>
                  <span>
                    Messages are protected by RigForge Escrow. Never transfer funds outside the platform.
                  </span>
                </div>
              </div>

              {(Array.isArray(activeMessages) ? activeMessages : []).map((msg) => {
                if (!msg) return null;
                if (msg.offerCard) {
                  return (
                    <div
                      key={msg.id}
                      className="flex flex-col items-end ml-auto max-w-[85%] sm:max-w-[420px]"
                    >
                      <div className="w-full rounded-2xl rounded-br-sm bg-surface-container-lowest border-2 border-primary/30 shadow-md overflow-hidden">
                        <div className="px-3.5 py-2 bg-primary text-on-primary flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">
                              local_offer
                            </span>
                            <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">
                              Escrow Offer Sent
                            </span>
                          </div>
                          <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-on-primary/20 text-on-primary">
                            {msg.offerCard.code}
                          </span>
                        </div>
                        <div className="p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <div className="font-label-sm text-[11px] text-on-surface-variant uppercase">
                                Proposed Offer Amount
                              </div>
                              <div className="font-headline-md text-headline-md font-bold text-on-surface">
                                ${msg.offerCard.amount}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-body-sm text-[12px] text-on-surface-variant line-through">
                                ${msg.offerCard.ask || activeConversation?.price || '0.00'} Ask
                              </span>
                              <div className="font-label-sm text-[11px] text-secondary font-bold">
                                {msg.offerCard.discountLabel}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                            <span className="font-label-sm text-[11px] text-primary font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                              {msg.offerCard.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedListing) {
                                  setCheckoutPayload({
                                    mode: 'single',
                                    initialOfferRatio:
                                      parseFloat(msg.offerCard.amount) /
                                      Math.max(1, parseFloat(msg.offerCard.ask || activeConversation?.price || 1)),
                                    items: [
                                      {
                                        id: matchedListing.id,
                                        listing_id: matchedListing.id,
                                        component: matchedListing.component,
                                        price: parseFloat(matchedListing.price || activeConversation?.price || 0),
                                        seller_username: activeConversation?.seller_username || 'Seller',
                                        quantity: 1,
                                      },
                                    ],
                                  });
                                }
                                navigate('/checkout');
                              }}
                              className="px-2.5 py-1 rounded bg-primary text-on-primary font-label-sm text-[11px] font-bold hover:opacity-90 transition-opacity"
                            >
                              Complete in Escrow
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.isMe) {
                  return (
                    <div
                      key={msg.id}
                      className="flex flex-col items-end max-w-[85%] sm:max-w-[65%] ml-auto"
                    >
                      <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-primary text-on-primary shadow-sm">
                        {msg.attachment && (
                          <div className="mb-2 rounded-xl overflow-hidden bg-surface-container-lowest p-2 text-on-surface">
                            {msg.attachment.image && (
                              <img
                                src={msg.attachment.image}
                                alt={msg.attachment.fileName}
                                className="w-full max-h-48 object-contain rounded-lg bg-surface-container-low"
                              />
                            )}
                            <div className="mt-1 font-label-sm text-[11px] font-bold">
                              {msg.attachment.fileName}
                            </div>
                            <div className="font-label-sm text-[10px] text-secondary">
                              {msg.attachment.meta}
                            </div>
                          </div>
                        )}
                        {msg.voiceNote?.url ? (
                          <div className="mb-1">
                            <VoicePlayer
                              src={msg.voiceNote.url}
                              duration={msg.voiceNote.duration}
                              isMe={true}
                            />
                          </div>
                        ) : null}
                        {msg.text &&
                          !msg.text.startsWith('[Voice') &&
                          msg.text !== 'Voice Message' && (
                            <p className="font-body-md text-body-md leading-relaxed">{msg.text}</p>
                          )}
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-80">
                          <span className="font-label-sm text-[10px]">{msg.timestamp}</span>
                          <span className="material-symbols-outlined text-[14px]">
                            {msg.status === 'sending' ? 'done' : 'done_all'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className="flex items-end gap-2 max-w-[85%] sm:max-w-[68%]"
                  >
                    <img
                      alt={msg.sender}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mb-0.5 bg-surface-container"
                      src={activeConversation?.avatar || STITCH_IMAGES.avatarAlex}
                    />
                    <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-surface-container-lowest text-on-surface shadow-sm border border-outline-variant/20">
                      {msg.attachment && (
                        <div className="mb-2 rounded-xl overflow-hidden bg-surface-container-low p-2 border border-outline-variant/20">
                          {msg.attachment.image && (
                            <img
                              src={msg.attachment.image}
                              alt={msg.attachment.fileName}
                              className="w-full max-h-48 object-contain rounded-lg bg-surface-container-lowest p-2"
                            />
                          )}
                          <div className="mt-1.5 flex items-center justify-between">
                            <div>
                              <div className="font-label-sm text-[11px] font-bold text-on-surface">
                                {msg.attachment.fileName}
                              </div>
                              <div className="font-label-sm text-[10px] text-secondary font-semibold">
                                {msg.attachment.meta}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {msg.voiceNote?.url ? (
                        <div className="mb-1">
                          <VoicePlayer
                            src={msg.voiceNote.url}
                            duration={msg.voiceNote.duration}
                            isMe={false}
                          />
                        </div>
                      ) : null}
                      {msg.text &&
                        !msg.text.startsWith('[Voice') &&
                        msg.text !== 'Voice Message' && (
                          <p className="font-body-md text-body-md leading-relaxed">{msg.text}</p>
                        )}
                      <div className="flex items-center justify-end gap-1 mt-1 text-outline">
                        <span className="font-label-sm text-[10px]">{msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Telegram-Style Pill Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="px-3 sm:px-space-lg py-2.5 sm:py-3 bg-surface-container-lowest border-t border-outline-variant/25 flex items-center gap-2"
            >
              {/* Hidden Real File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.zip"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Attachment Button: Triggers Real Native File Picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-low flex items-center justify-center shrink-0 transition-colors"
                title="Attach Photo or Document"
              >
                <span className="material-symbols-outlined text-[24px]">add_circle</span>
              </button>

              {/* Pill Input Container or Audio Recording Indicator */}
              {isRecording ? (
                <div className="flex-1 flex items-center justify-between bg-error-container/30 border border-error/40 rounded-full px-4 py-2 animate-pulse">
                  <div className="flex items-center gap-2 text-error">
                    <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
                    <span className="font-label-sm text-xs font-bold uppercase tracking-wider">
                      {t('recordingVoice')}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-error">
                    {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex items-center bg-surface-container-low focus-within:bg-surface-container-lowest rounded-full px-4 py-1.5 border border-outline-variant/30 focus-within:border-primary/60 transition-all">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`${t('writeMessage')} ${activeConversation?.seller_username || 'seller'}...`}
                    className="w-full bg-transparent text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none py-1"
                  />
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleInsertRigTag}
                      className="hidden sm:flex p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                      title="Insert Active Rig Compatibility Tag"
                    >
                      <span className="material-symbols-outlined text-[19px]">memory</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Message Button / Stop Recording Button */}
              <button
                type="button"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all ${
                  isRecording
                    ? 'bg-error text-on-error scale-110 animate-bounce'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                }`}
                title={isRecording ? 'Stop and send voice recording' : t('recordVoice')}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {isRecording ? 'stop' : 'mic'}
                </span>
              </button>

              {/* Send Action Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-full bg-primary disabled:opacity-40 hover:bg-on-primary-fixed-variant text-on-primary flex items-center justify-center shrink-0 shadow-sm transition-all"
                title={t('send')}
              >
                <span className="material-symbols-outlined text-[19px] translate-x-0.5">
                  send
                </span>
              </button>
            </form>
            </>
          )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function LiveMessengerPage(props) {
  return (
    <ErrorBoundary>
      <LiveMessengerContent {...props} />
    </ErrorBoundary>
  );
}
