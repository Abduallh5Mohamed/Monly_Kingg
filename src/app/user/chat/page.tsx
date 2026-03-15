'use client';

import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { useLanguage } from '@/lib/language-context';
import {
  Send,
  Paperclip,
  Smile,
  Search,
  MoreVertical,
  CheckCheck,
  Clock,
  ArrowLeft,
  Image as ImageIcon,
  Zap,
  Loader2,
  MessageCircle,
  X,
  Trash2
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  } | null;
  content: string;
  type: string;
  timestamp: Date;
  read: boolean;
  delivered: boolean;
}

interface Chat {
  _id: string;
  chatNumber: string;
  type: string;
  participants: Array<{
    _id: string;
    username: string;
    email: string;
    avatar?: string;
    role?: string;
  }>;
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender?: string;
  };
  unreadCount?: number;
}

export default function SupportPage() {
  const { language } = useLanguage();
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerIdParam = searchParams.get('seller');
  const sellerHandledRef = useRef(false);

  // Refs to avoid stale closures in socket event handlers
  const selectedChatRef = useRef<Chat | null>(null);
  const currentUserIdRef = useRef<string>('');

  // Refresh access token silently using httpOnly refresh_token cookie
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Read the XSRF-TOKEN cookie (non-HttpOnly, safe for JS)
  const getCsrfToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const cookieName = 'XSRF-TOKEN';
    for (const cookie of document.cookie.split(';')) {
      const [name, ...rest] = cookie.trim().split('=');
      if (name === cookieName) return decodeURIComponent(rest.join('='));
    }
    return null;
  };

  // Get token from cookies or localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      // First check cookies (primary method)
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token' || name === process.env.NEXT_PUBLIC_ACCESS_TOKEN_COOKIE_NAME) {
          const token = decodeURIComponent(value).replace(/^"|"$/g, '');
          return token;
        }
      }

      // Fallback to localStorage
      const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      if (accessToken) {
        return accessToken;
      }

    }
    return null;
  };

  // Load recent emojis from localStorage
  useEffect(() => {
    const savedEmojis = localStorage.getItem('recentEmojis');
    if (savedEmojis) {
      setRecentEmojis(JSON.parse(savedEmojis));
    }
  }, []);

  // Get current user ID from backend
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const userId = data.data._id || data.data.id;
            setCurrentUserId(userId);
          }
        } else {
        }
      } catch (error) {
        console.error(' Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Keep refs in sync with state
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  // ─── Socket initialization (connection lifecycle only) ────────────────────
  useEffect(() => {
    const token = getToken();
    const socketOptions: any = {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    };
    if (token) socketOptions.auth = { token };

    const newSocket = io(window.location.origin, socketOptions);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('get_online_users');
      if (selectedChatRef.current) newSocket.emit('join_chat', selectedChatRef.current._id);
    });
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));

    newSocket.on('online_users', (users: string[]) => setOnlineUsers(users));
    newSocket.on('user_online', ({ userId }: { userId: string }) =>
      setOnlineUsers(prev => prev.includes(userId) ? prev : [...prev, userId]));
    newSocket.on('user_offline', ({ userId }: { userId: string }) =>
      setOnlineUsers(prev => prev.filter(id => id !== userId)));

    newSocket.on('user_typing', ({ chatId, username }: { chatId: string; username: string }) => {
      if (!chatId) return;
      setTypingUsers(prev => { const m = new Map(prev); m.set(chatId, username || 'Someone'); return m; });
    });
    newSocket.on('user_stop_typing', ({ chatId }: { chatId: string }) => {
      if (!chatId) return;
      setTypingUsers(prev => { const m = new Map(prev); m.delete(chatId); return m; });
    });

    newSocket.on('user_chats', (userChats: Chat[]) => setChats(userChats));

    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, []);

  // ─── Message-specific socket events (fresh values via refs) ──────────────
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ chatId, message }: { chatId: string; message: Message }) => {
      setChats(prev => prev.map(chat => {
        if (chat._id !== chatId) return chat;
        const isOpen = selectedChatRef.current?._id === chatId;
        return {
          ...chat,
          lastMessage: { content: message.content, timestamp: message.timestamp },
          unreadCount: isOpen ? 0 : (chat.unreadCount ?? 0) + 1
        };
      }));
      if (selectedChatRef.current?._id !== chatId) return;
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
      if (message.sender?._id !== currentUserIdRef.current) {
        socket.emit('message_delivered', { chatId, messageId: message._id });
        setTimeout(() => socket.emit('mark_read', { chatId }), 500);
      }
    };

    const onMessageSent = ({ chatId, message, tempId }: { chatId: string; message: Message; tempId?: string }) => {
      if (selectedChatRef.current?._id !== chatId) return;
      setMessages(prev => {
        const withoutTemp = tempId
          ? prev.filter(m => m._id !== tempId)
          : prev.filter(m => !m._id.startsWith('temp-') || m.content !== message.content);
        if (withoutTemp.some(m => m._id === message._id)) return withoutTemp;
        return [...withoutTemp, message];
      });
      scrollToBottom();
    };

    const onMessagesRead = ({ chatId }: { chatId: string }) => {
      if (selectedChatRef.current?._id === chatId)
        setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
      setChats(prev => prev.map(chat =>
        chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    };

    const onMessageDelivered = ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      if (selectedChatRef.current?._id === chatId)
        setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, delivered: true } : msg));
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_sent', onMessageSent);
    socket.on('messages_read', onMessagesRead);
    socket.on('message_delivered', onMessageDelivered);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_sent', onMessageSent);
      socket.off('messages_read', onMessagesRead);
      socket.off('message_delivered', onMessageDelivered);
    };
  }, [socket]);

  // Load chats
  useEffect(() => {
    loadChats();
  }, []);

  // Auto-open seller chat when navigated from listing page with ?seller=
  useEffect(() => {
    if (!sellerIdParam || sellerHandledRef.current || isLoading || !currentUserId) return;
    sellerHandledRef.current = true;

    // Check if we already have a chat with this seller
    const existingChat = chats.find(c =>
      c.type === 'direct' &&
      c.participants.some(p => p._id === sellerIdParam)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
    } else {
      // Create new chat with the seller
      startNewChat(sellerIdParam);
    }
  }, [sellerIdParam, isLoading, currentUserId, chats]);

  // Load messages when chat selected
  useEffect(() => {
    if (!selectedChat) return;
    setMessages([]);
    setChats(prev => prev.map(chat =>
      chat._id === selectedChat._id ? { ...chat, unreadCount: 0 } : chat
    ));
    loadMessages(selectedChat._id);
    if (socket?.connected) {
      socket.emit('join_chat', selectedChat._id);
      socket.emit('mark_read', { chatId: selectedChat._id });
    }
  }, [selectedChat]);

  // Rejoin chat on reconnect
  useEffect(() => {
    if (socket?.connected && selectedChat) {
      socket.emit('join_chat', selectedChat._id);
    }
  }, [socket, isConnected]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      const response = await fetch('/api/v1/chats', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) setChats(data.data.chats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/v1/chats/${chatId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data?.messages)) {
        setMessages(data.data.messages);
        setTimeout(scrollToBottom, 50);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) {
      return;
    }

    if (!selectedChat) {
      alert('Please select a chat first');
      return;
    }


    setIsSending(true);
    const messageContent = messageText.trim();
    setMessageText('');

    // Optimistic update - add message immediately with pending status
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      sender: {
        _id: currentUserId || 'unknown',
        username: 'You',
        avatar: ''
      },
      content: messageContent,
      type: 'text',
      timestamp: new Date(),
      read: false,
      delivered: false
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      // Send via socket if connected
      if (socket && socket.connected) {
        socket.emit('send_message', {
          chatId: selectedChat._id,
          content: messageContent,
          type: 'text',
          tempId: tempMessage._id
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('stop_typing', { chatId: selectedChat._id });
      } else {
        // Fallback to API if socket not connected

        const token = getToken();
        const csrfToken = getCsrfToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        if (csrfToken) {
          headers['X-XSRF-TOKEN'] = csrfToken;
        }

        const response = await fetch(`/api/v1/chats/${selectedChat._id}/messages`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            content: messageContent,
            type: 'text'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message via API');
        }

        const data = await response.json();

        if (data.success && data.data?.message) {
          const realMsg = data.data.message;
          setMessages(prev => {
            const withoutTemp = prev.filter(m => m._id !== tempMessage._id);
            if (withoutTemp.some(m => m._id === realMsg._id)) return withoutTemp;
            return [...withoutTemp, realMsg];
          });
        } else {
          await loadMessages(selectedChat._id);
        }
      }
    } catch (error) {
      console.error(' Failed to send message:', error);
      // Remove the temporary message
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (!socket || !selectedChat) return;

    socket.emit('typing', { chatId: selectedChat._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { chatId: selectedChat._id });
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatPartner = (chat: Chat) => {
    if (!chat) return undefined;
    if (chat.type === 'group') return undefined;
    return chat.participants.find(participant => participant._id !== currentUserId) || chat.participants[0];
  };

  const formatTimestamp = (input: Date | string) => {
    if (!input) return '';
    const date = new Date(input);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (input?: Date | string) => {
    if (!input) return '';
    const date = new Date(input);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  const getInitials = (value?: string) => {
    if (!value) return '??';
    const parts = value.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getSafeMessageUrl = (value?: string): string | null => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('/uploads/')) return trimmed;

    try {
      const parsed = new URL(trimmed, window.location.origin);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch {
      return null;
    }
  };

  const isPartnerOnline = (chat: Chat) => {
    const partner = getChatPartner(chat);
    if (!partner) return false;
    return onlineUsers.includes(partner._id);
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setShowEmojiPicker(false);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`/api/v1/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {})
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete failed:', errorData);
        throw new Error(errorData.message || 'Failed to delete chat');
      }

      // Remove chat from list
      setChats(prev => prev.filter(c => c._id !== chatId));

      // Clear selected chat if it was deleted
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }

      setShowDeleteConfirm(false);
      setDeletingChatId(null);

    } catch (error) {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const confirmDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection
    setDeletingChatId(chatId);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingChatId(null);
  };

  const handleSearch = async (value: string) => {
    setSearchQuery(value);

    if (!value.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      setUserSearchResults([]);
      return;
    }

    setIsSearching(true);
    const normalized = value.toLowerCase();

    // Search in existing chats
    const filtered = chats.filter(chat => {
      const partner = getChatPartner(chat);
      const partnerName = partner?.username || partner?.email || '';
      return partnerName.toLowerCase().includes(normalized);
    });

    setSearchResults(filtered);

    // Search for new users to chat with — backend requires min 2 chars
    if (value.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }

    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let response = await fetch(`/api/v1/users/search?q=${encodeURIComponent(value)}`, {
        headers,
        credentials: 'include'
      });

      // Token expired — try silent refresh then retry once
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          response = await fetch(`/api/v1/users/search?q=${encodeURIComponent(value)}`, {
            headers,
            credentials: 'include'
          });
        }
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out only the current user — allow searching users already in chats
          const newUsers = data.data.filter((user: any) =>
            user._id?.toString() !== currentUserId?.toString()
          );

          setUserSearchResults(newUsers);
        }
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }

    setIsSearching(false);
  };

  const startNewChat = async (userId: string) => {
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {})
      };

      const response = await fetch('/api/v1/chats', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          participantId: userId,
          type: 'direct'
        })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          const newChat = data.data;
          const existingChat = chats.find(c => c._id === newChat._id);

          if (!existingChat) {
            setChats(prev => [newChat, ...prev]);
          }

          setSelectedChat(newChat);
          setMessages([]);

          if (socket?.connected) {
            socket.emit('join_chat', newChat._id);
          }

          await loadMessages(newChat._id);

          setSearchQuery('');
          setUserSearchResults([]);
          setSearchResults([]);
        }
      }
    } catch (error) {
    }
  };

  const handleFileAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageAttachmentClick = () => {
    imageInputRef.current?.click();
  };

  const sendMediaMessage = async (file: File, messageType: 'image' | 'file') => {
    if (!selectedChat) return;

    const tempId = `temp-${messageType}-${Date.now()}`;
    const tempMessage: Message = {
      _id: tempId,
      sender: { _id: currentUserId || 'unknown', username: 'You' },
      content: file.name,
      type: messageType,
      timestamp: new Date(),
      read: false,
      delivered: false
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const csrfToken = getCsrfToken();

      // Step 1: upload file to /api/v1/uploads
      const formData = new FormData();
      // type/relatedModel/relatedId MUST come before 'file' so multer can read
      // req.body.type in the destination callback (multipart field order matters)
      formData.append('type', 'chat_media');
      formData.append('relatedModel', 'Chat');
      if (selectedChat?._id) formData.append('relatedId', selectedChat._id);
      formData.append('file', file);

      const uploadRes = await fetch('/api/v1/uploads', {
        method: 'POST',
        credentials: 'include',
        headers: { ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}) },
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const fileUrl: string = uploadData.data?.url;
      if (!fileUrl) throw new Error('No URL returned from upload');

      // Step 2: send chat message with the uploaded URL as content
      const msgRes = await fetch(`/api/v1/chats/${selectedChat._id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {})
        },
        body: JSON.stringify({ content: fileUrl, type: messageType })
      });

      if (!msgRes.ok) throw new Error('Failed to send message');

      const data = await msgRes.json();
      if (data?.success && data?.data?.message) {
        setMessages(prev => {
          const filtered = prev.filter(m => m._id !== tempId);
          return [...filtered, data.data.message];
        });
      } else {
        await loadMessages(selectedChat._id);
      }
    } catch (error) {
      console.error('Failed to send attachment:', error);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      alert('Failed to send. Please try again.');
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, messageType: 'image' | 'file') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await sendMediaMessage(file, messageType);
  };

  const handleEmojiToggle = () => {
    setShowEmojiPicker(prev => !prev);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);

    setRecentEmojis(prev => {
      const updated = [emoji, ...prev.filter(item => item !== emoji)].slice(0, 12);
      localStorage.setItem('recentEmojis', JSON.stringify(updated));
      return updated;
    });
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  const renderMessageContent = (message: Message) => {
    const safeUrl = getSafeMessageUrl(message.content);

    if (message.type === 'image') {
      if (!safeUrl) {
        return <p className="text-sm leading-relaxed text-white/70">Invalid image URL</p>;
      }

      return (
        <img
          src={safeUrl}
          alt="Shared image"
          className="mt-2 max-w-xs rounded-xl border border-white/10 cursor-pointer"
          onClick={() => window.open(safeUrl, '_blank', 'noopener,noreferrer')}
        />
      );
    }

    if (message.type === 'file') {
      if (!safeUrl) {
        return <p className="text-sm leading-relaxed text-white/70">Invalid attachment URL</p>;
      }

      const displayName = safeUrl.split('/').pop() || 'Attachment';
      return (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-xs items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-cyan-200 hover:text-cyan-100"
        >
          <Paperclip className="h-4 w-4" />
          <span className="truncate">{displayName}</span>
        </a>
      );
    }

    return <p className="text-sm leading-relaxed text-white/90">{message.content}</p>;
  };

  const renderStatusIcon = (message: Message) => {
    const isOwn = message.sender?._id === currentUserId;
    if (!isOwn) return null;

    if (message.read) {
      return <CheckCheck className="h-4 w-4 text-cyan-400" />;
    }

    if (message.delivered) {
      return <CheckCheck className="h-4 w-4 text-white/40" />;
    }

    return <Clock className="h-4 w-4 text-white/40" />;
  };

  const displayedChats = searchQuery.trim() ? searchResults : chats;
  const typingIndicator = selectedChat ? typingUsers.get(selectedChat._id) : undefined;
  const isChatListEmpty = !isLoading && displayedChats.length === 0;
  const emojiPalette = ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🙌', '🔥', '❤️', '👍'];

  return (
    <UserDashboardLayout>
      {/* ─── Main Chat Layout ─── */}
      <div className="flex h-[calc(100dvh-12rem)] lg:h-[calc(100dvh-13rem)] gap-3 overflow-hidden">

        {/* ════ SIDEBAR ════ */}
        <aside className={`${selectedChat ? 'hidden lg:flex' : 'flex'} lg:flex w-full lg:w-[300px] xl:w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#06080f] shadow-xl`}>

          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-400/70">{tr('الرسائل', 'Messages')}</p>
              <h1 className="mt-0.5 text-xl font-bold text-white">{tr('الدردشة', 'Chats')}</h1>
            </div>
            <button
              title={tr('محادثة جديدة', 'New chat')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/20 text-blue-400 transition hover:bg-blue-900/30 hover:text-blue-300 border border-blue-900/30"
            >
              <Zap className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                value={searchQuery}
                onChange={event => handleSearch(event.target.value)}
                placeholder={tr('ابحث في المحادثات...', 'Search conversations...')}
                className="h-10 rounded-xl border-white/[0.06] bg-[#0b0e18] pl-9 pr-9 text-sm text-white placeholder:text-white/25 focus:border-blue-800/50 focus:ring-0"
              />
              {isSearching ? (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-blue-400" />
              ) : searchQuery ? (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/70"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-0.5">
              {isLoading && (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                </div>
              )}

              {!isLoading && isChatListEmpty && (
                <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900/20 border border-blue-900/30">
                    <MessageCircle className="h-6 w-6 text-white/25" />
                  </div>
                  <p className="text-sm font-medium text-white/40">{tr('لا توجد محادثات بعد', 'No conversations yet')}</p>
                  <p className="text-xs text-white/25">{tr('ابدأ محادثة جديدة للحصول على المساعدة.', 'Start a new chat to get help.')}</p>
                </div>
              )}

              {/* User search results */}
              {searchQuery && userSearchResults.length > 0 && (
                <>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-blue-400/60">{tr('الأشخاص', 'People')}</p>
                  {userSearchResults.map(user => (
                    <button
                      key={user._id}
                      onClick={() => startNewChat(user._id)}
                      className="group w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-white/[0.05]"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-blue-900/15 border border-blue-900/25">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-blue-300">
                            {getInitials(user.username || user.email)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.username || user.email}</p>
                        <p className="text-xs text-white/35 mt-0.5">{tr('ابدأ المحادثة', 'Start chatting')}</p>
                      </div>
                    </button>
                  ))}
                  {displayedChats.length > 0 && (
                    <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">{tr('المحادثات', 'Conversations')}</p>
                  )}
                </>
              )}

              {/* Existing chats */}
              {displayedChats.map(chat => {
                const partner = getChatPartner(chat);
                const active = selectedChat?._id === chat._id;
                const unread = chat.unreadCount ?? 0;

                return (
                  <div key={chat._id} className="relative group">
                    <button
                      onClick={() => handleSelectChat(chat)}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 pr-11 text-left transition-all ${active
                        ? 'bg-[#0d1630] border border-blue-900/40'
                        : 'border border-transparent hover:bg-[#0a0d1a] hover:border-white/[0.05]'
                        }`}
                    >
                      {/* Avatar */}
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                        {partner?.avatar ? (
                          <img src={partner.avatar} alt={partner.username} className="h-full w-full object-cover" />
                        ) : (
                          <span className={`flex h-full w-full items-center justify-center text-sm font-bold ${active ? 'text-blue-300' : 'text-white/60'}`}>
                            {getInitials(partner?.username || partner?.email)}
                          </span>
                        )}
                        {isPartnerOnline(chat) && (
                          <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d0f1a] bg-emerald-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-1 min-w-0 flex-col">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-white/85'}`}>
                            {partner?.username || tr('فريق الدعم', 'Support Team')}
                          </p>
                          <span className="text-[10px] shrink-0 text-white/30 font-medium">
                            {formatRelativeTime(chat.lastMessage?.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className={`text-xs truncate ${typingUsers.has(chat._id) ? 'text-blue-400 italic' : 'text-white/35'}`}>
                            {typingUsers.has(chat._id) ? tr('يكتب الآن...', 'typing...') : (chat.lastMessage?.content || tr('لا توجد رسائل بعد', 'No messages yet'))}
                          </p>
                          {unread > 0 && (
                            <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => confirmDeleteChat(chat._id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400/70 transition hover:bg-red-500/20 hover:text-red-400"
                      title={tr('حذف المحادثة', 'Delete chat')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* ════ CHAT PANEL ════ */}
        <section className={`${!selectedChat ? 'hidden lg:flex' : 'flex'} lg:flex relative flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#05070d]`}>
          {!selectedChat ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900/15 border border-blue-900/25">
                <MessageCircle className="h-8 w-8 text-blue-500/70" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{tr('اختر محادثة', 'Select a conversation')}</h2>
                <p className="mt-1 text-sm text-white/40">{tr('اختر محادثة من القائمة لبدء المراسلة.', 'Choose a chat from the sidebar to start messaging.')}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <header className="flex shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#06080f] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden -ml-1 text-white/60 hover:text-white hover:bg-white/[0.06]"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                    {getChatPartner(selectedChat)?.avatar ? (
                      <img src={getChatPartner(selectedChat)?.avatar} alt={getChatPartner(selectedChat)?.username} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-bold text-blue-300">
                        {getInitials(getChatPartner(selectedChat)?.username || getChatPartner(selectedChat)?.email)}
                      </span>
                    )}
                    {isPartnerOnline(selectedChat) && (
                      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d0f1a] bg-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {getChatPartner(selectedChat)?.username || tr('فريق الدعم', 'Support Team')}
                      </p>
                      <span className="rounded-md bg-blue-900/20 border border-blue-900/30 px-1.5 py-0.5 font-mono text-[10px] text-blue-400">
                        #{selectedChat.chatNumber}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isPartnerOnline(selectedChat) ? 'text-emerald-400' : 'text-white/30'}`}>
                      {isPartnerOnline(selectedChat) ? tr('● متصل الآن', '● Online') : tr('غير متصل', 'Offline')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06]">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </header>

              {/* Messages Area */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                      <MessageCircle className="h-6 w-6 text-white/20" />
                    </div>
                    <p className="text-sm text-white/30">{tr('لا توجد رسائل بعد — ابدأ بالسلام.', 'No messages yet - say hello!')}</p>
                  </div>
                ) : (
                  <>
                    {messages.map(message => {
                      const isOwn = message.sender?._id === currentUserId;
                      return (
                        <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${isOwn
                              ? 'bg-[#1a2a6c] text-white rounded-br-sm'
                              : 'bg-[#0c0f1c] border border-white/[0.07] text-white/90 rounded-bl-sm'
                              } ${message._id.startsWith('temp-') ? 'opacity-60' : ''}`}
                          >
                            {!isOwn && message.sender && (
                              <p className="mb-1 text-[11px] font-semibold text-blue-400">
                                {message.sender.username}
                              </p>
                            )}
                            {renderMessageContent(message)}
                            <div className={`mt-1.5 flex items-center justify-end gap-1.5 ${isOwn ? 'text-blue-200/50' : 'text-white/30'}`}>
                              <span className="text-[10px]">{formatTimestamp(message.timestamp)}</span>
                              {renderStatusIcon(message)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Typing indicator */}
              {typingIndicator && (
                <div className="shrink-0 px-5 pb-1 text-xs text-blue-400/60 italic">
                  {typingIndicator} {tr('يكتب الآن...', 'is typing...')}
                </div>
              )}

              {/* Input Bar */}
              <div className="shrink-0 border-t border-white/[0.05] bg-[#06080f] px-4 py-3">
                <div className="relative flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#0b0e18] px-3 py-2 focus-within:border-blue-800/50 transition-colors">
                  {/* Attachment buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={handleFileAttachmentClick}
                      title={tr('إرفاق ملف', 'Attach file')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleImageAttachmentClick}
                      title={tr('إرفاق صورة', 'Attach image')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleEmojiToggle}
                      title={tr('اختيار إيموجي', 'Emoji picker')}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.06] ${showEmojiPicker ? 'text-blue-400' : 'text-white/35 hover:text-white/70'}`}
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="w-px h-5 bg-white/[0.08] mx-1" />

                  {/* Text input */}
                  <Input
                    value={messageText}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setMessageText(event.target.value)}
                    onFocus={() => socket?.emit('typing', { chatId: selectedChat._id })}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      } else {
                        handleTyping();
                      }
                    }}
                    placeholder={tr('اكتب رسالة...', 'Type a message...')}
                    className="flex-1 border-none bg-transparent p-0 text-sm text-white placeholder:text-white/25 focus:ring-0 focus-visible:ring-0"
                  />

                  {/* Send button */}
                  <button
                    type="button"
                    disabled={isSending || !messageText.trim()}
                    onClick={handleSendMessage}
                    className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a2a6c] text-white transition hover:bg-[#1e3080] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>

                  {/* Emoji picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-0 z-20 w-64 rounded-2xl border border-white/[0.06] bg-[#06080f] p-4 shadow-2xl shadow-black/80">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{tr('إيموجي', 'Emoji')}</p>
                        <button onClick={handleEmojiToggle} className="text-white/30 transition hover:text-white/70">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {recentEmojis.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/25">{tr('الأخيرة', 'Recent')}</p>
                          <div className="grid grid-cols-6 gap-1">
                            {recentEmojis.map(emoji => (
                              <button
                                key={`recent-${emoji}`}
                                onClick={() => handleEmojiSelect(emoji)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/[0.07]"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="mb-2 text-[10px] uppercase tracking-widest text-white/25">{tr('الأكثر استخدامًا', 'Popular')}</p>
                        <div className="grid grid-cols-6 gap-1">
                          {emojiPalette.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/[0.07]"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={event => handleFileChange(event, 'file')} />
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={event => handleFileChange(event, 'image')} />
        </section>
      </div>

      {/* ═══ Delete Confirmation Dialog ═══ */}
      {showDeleteConfirm && deletingChatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.06] bg-[#06080f] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{tr('حذف المحادثة', 'Delete Conversation')}</h3>
                <p className="text-xs text-white/40 mt-0.5">{tr('ستختفي من قائمتك فقط', 'Hidden from your list only')}</p>
              </div>
            </div>
            <p className="mb-5 text-sm text-white/50 leading-relaxed">
              {tr('سيتم إخفاء هذه المحادثة من طرفك فقط. الطرف الآخر سيظل قادرًا على رؤيتها.', 'This conversation will be hidden on your side only. The other person can still see it.')}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={cancelDelete}
                variant="outline"
                className="flex-1 border-white/[0.08] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                {tr('إلغاء', 'Cancel')}
              </Button>
              <Button
                onClick={() => deletingChatId && handleDeleteChat(deletingChatId)}
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
              >
                {tr('حذف', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </UserDashboardLayout>
  );
}
