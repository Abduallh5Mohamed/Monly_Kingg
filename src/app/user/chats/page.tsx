'use client';

import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import {
  Send,
  Paperclip,
  Smile,
  Search,
  MoreVertical,
  Video,
  CheckCheck,
  Clock,
  ArrowLeft,
  Mic,
  Image as ImageIcon,
  Zap,
  Loader2,
  MessageCircle,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const router = useRouter();

  // Get token from cookies or localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      // First check cookies (primary method)
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token' || name === process.env.NEXT_PUBLIC_ACCESS_TOKEN_COOKIE_NAME) {
          const token = decodeURIComponent(value).replace(/^"|"$/g, '');
          console.log(' Token found in cookies ');
          return token;
        }
      }

      // Fallback to localStorage
      const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      if (accessToken) {
        console.log(' Token found in localStorage ');
        return accessToken;
      }

      console.log(' No token found in cookies or localStorage');
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

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Get current user ID from backend
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/v1/auth/me', {
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
            console.log(' Current User ID set from API:', userId);
            console.log(' Current User:', data.data.username);
          }
        } else {
          console.warn(' Failed to fetch current user');
        }
      } catch (error) {
        console.error(' Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.warn(' No token found');
      setIsLoading(false);
      // Don't redirect immediately, user might be using cookie-based auth
      return;
    }

    console.log(' Initializing Socket.IO with token...');

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true // Important for cookie-based auth
    });

    newSocket.on('connect', () => {
      console.log(' Connected to Socket.IO');
      setIsConnected(true);
      newSocket.emit('get_online_users');

      // Rejoin selected chat if any
      if (selectedChat) {
        console.log(' Rejoining chat:', selectedChat._id);
        newSocket.emit('join_chat', selectedChat._id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log(' Disconnected from Socket.IO');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error(' Socket connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error(' Socket error:', error);
    });

    newSocket.on('user_chats', (userChats: Chat[]) => {
      setChats(userChats);
      setIsLoading(false);
    });

    newSocket.on('new_message', ({ chatId, message }) => {
      console.log(' New message received:', message);

      if (selectedChat?._id === chatId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();

        // Mark as delivered if I'm the receiver
        if (message.sender._id !== currentUserId) {
          newSocket.emit('message_delivered', {
            chatId,
            messageId: message._id
          });

          // Auto mark as read if chat is open
          setTimeout(() => {
            newSocket.emit('mark_read', { chatId });
          }, 500);
        }
      }

      setChats(prev => prev.map(chat =>
        chat._id === chatId
          ? { ...chat, lastMessage: { content: message.content, timestamp: message.timestamp } }
          : chat
      ));
    });

    newSocket.on('user_typing', ({ chatId, userId, username }) => {
      if (!chatId) return;
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.set(chatId, username || 'Someone');
        return next;
      });
    });

    newSocket.on('user_stop_typing', ({ chatId }) => {
      if (!chatId) return;
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(chatId);
        return next;
      });
    });

    newSocket.on('online_users', (users: string[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => [...prev, userId]);
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    newSocket.on('messages_read', ({ chatId, readBy }) => {
      console.log(' Messages read in chat:', chatId, 'by:', readBy);
      if (selectedChat?._id === chatId) {
        setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
      }
      // Update chats list: mark messages as read and clear unread count
      setChats(prev => prev.map(chat => {
        if (chat._id === chatId) {
          return {
            ...chat,
            unreadCount: 0, // Clear unread count
            lastMessage: chat.lastMessage ? {
              content: chat.lastMessage.content || '',
              timestamp: chat.lastMessage.timestamp || new Date(),
              sender: chat.lastMessage.sender,
              read: true
            } : undefined
          };
        }
        return chat;
      }));
    });

    newSocket.on('message_delivered', ({ chatId, messageId }) => {
      console.log(' Message delivered:', messageId);
      if (selectedChat?._id === chatId) {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId
            ? { ...msg, delivered: true }
            : msg
        ));
      }
    });

    newSocket.on('message_sent', ({ chatId, message }) => {
      console.log(' Message sent confirmation:', message);
      if (selectedChat?._id === chatId) {
        // Replace temp message with real message
        setMessages(prev => {
          const filtered = prev.filter(m => !m._id.startsWith('temp-'));
          return [...filtered, message];
        });
      }
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [router]);

  // Load chats
  useEffect(() => {
    loadChats();
  }, []);

  // Load messages when chat selected
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat._id);

      // Clear unread count immediately when opening chat
      setChats(prev => prev.map(chat =>
        chat._id === selectedChat._id
          ? { ...chat, unreadCount: 0 }
          : chat
      ));

      if (socket) {
        socket.emit('join_chat', selectedChat._id);
        socket.emit('mark_read', { chatId: selectedChat._id });
      }
    }
  }, [selectedChat, socket]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/v1/chats', {
        headers,
        credentials: 'include' // Important for cookie-based auth
      });
      const data = await response.json();
      if (data.success) {
        setChats(data.data.chats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      console.log(' Loading messages for chat:', chatId);

      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`http://localhost:5000/api/v1/chats/${chatId}`, {
        headers,
        credentials: 'include' // Important for cookie-based auth
      });
      const data = await response.json();
      console.log(' Messages loaded:', data);

      if (data.success) {
        setMessages(data.data.messages);
        console.log(' Set messages:', data.data.messages.length, 'messages');
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) {
      console.warn(' Cannot send: empty message or already sending');
      return;
    }

    if (!selectedChat) {
      console.error(' No chat selected');
      alert('Please select a chat first');
      return;
    }

    console.log(' Sending message...', {
      chatId: selectedChat._id,
      socketConnected: socket?.connected,
      hasCurrentUserId: !!currentUserId
    });

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
        console.log(' Sending via Socket.IO...');
        socket.emit('send_message', {
          chatId: selectedChat._id,
          content: messageContent,
          type: 'text'
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        socket.emit('stop_typing', { chatId: selectedChat._id });
      } else {
        // Fallback to API if socket not connected
        console.warn(' Socket not connected, using API fallback');

        const token = getToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`http://localhost:5000/api/v1/chats/${selectedChat._id}/messages`, {
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
        console.log(' Message sent via API:', data);

        // Reload messages to get the real message
        await loadMessages(selectedChat._id);
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

  const isPartnerOnline = (chat: Chat) => {
    const partner = getChatPartner(chat);
    if (!partner) return false;
    return onlineUsers.includes(partner._id);
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setShowEmojiPicker(false);
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

    // Search for new users to chat with
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`http://localhost:5000/api/v1/users/search?q=${encodeURIComponent(value)}`, {
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out current user and users already in chats
          const existingUserIds = chats.flatMap(chat =>
            chat.participants.map(p => p._id)
          );

          const newUsers = data.data.filter((user: any) =>
            user._id !== currentUserId && !existingUserIds.includes(user._id)
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
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/v1/chats', {
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
        console.log('✅ Create chat response:', data);

        if (data.success) {
          // The API returns the chat directly in data.data
          const newChat = data.data;
          console.log('📝 New chat created:', newChat._id);

          // Check if chat already exists in list
          const existingChat = chats.find(c => c._id === newChat._id);

          if (!existingChat) {
            console.log('➕ Adding new chat to list');
            setChats(prev => [newChat, ...prev]);
          } else {
            console.log('🔄 Chat already exists in list');
          }

          // Set the selected chat FIRST
          console.log('🎯 Setting selected chat:', newChat._id);
          setSelectedChat(newChat);
          setMessages([]); // Clear old messages

          // Join the chat room via socket BEFORE loading messages
          if (socket?.connected) {
            console.log('🔌 Joining chat room via socket');
            socket.emit('join_chat', newChat._id);
          } else {
            console.warn('⚠️ Socket not connected');
          }

          // Load messages for this chat
          console.log('📨 Loading messages for chat:', newChat._id);
          await loadMessages(newChat._id);

          // Clear search
          setSearchQuery('');
          setUserSearchResults([]);
          setSearchResults([]);

          console.log('✅ Chat opened successfully!');
        }
      } else {
        console.error('❌ Failed to create chat:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Failed to start new chat:', error);
    }
  };

  const handleFileAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageAttachmentClick = () => {
    imageInputRef.current?.click();
  };

  const handleVideoAttachmentClick = () => {
    videoInputRef.current?.click();
  };

  const sendMediaMessage = async (file: File, messageType: 'image' | 'video' | 'audio' | 'file') => {
    if (!selectedChat) return;

    const tempId = `temp-${messageType}-${Date.now()}`;
    const tempMessage: Message = {
      _id: tempId,
      sender: {
        _id: currentUserId || 'unknown',
        username: 'You'
      },
      content: messageType === 'audio' ? 'Voice message' : file.name,
      type: messageType,
      timestamp: new Date(),
      read: false,
      delivered: false
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('type', messageType);
      formData.append('file', file);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`http://localhost:5000/api/v1/chats/${selectedChat._id}/messages`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to send attachment');
      }

      const data = await response.json();
      if (data?.success && data?.data?.message) {
        setMessages(prev => {
          const filtered = prev.filter(message => message._id !== tempId);
          return [...filtered, data.data.message];
        });
      } else {
        await loadMessages(selectedChat._id);
      }
    } catch (error) {
      console.error('Failed to send attachment:', error);
      setMessages(prev => prev.filter(message => message._id !== tempId));
      alert('Failed to send attachment. Please try again.');
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, messageType: 'image' | 'video' | 'file') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    await sendMediaMessage(file, messageType);
  };

  const startRecording = async () => {
    if (!selectedChat) {
      alert('Please select a chat first');
      return;
    }

    try {
      if (typeof window === 'undefined') return;
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Voice messages are not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setRecordingTime(0);

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());

        if (blob.size === 0) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await sendMediaMessage(file, 'audio');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (!shouldSend) {
      recorder.onstop = null;
    }

    recorder.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    audioChunksRef.current = [];
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
    if (message.type === 'image') {
      return (
        <img
          src={message.content}
          alt="Shared image"
          className="mt-2 max-w-xs rounded-xl border border-white/10"
        />
      );
    }

    if (message.type === 'video') {
      return (
        <video
          controls
          className="mt-2 max-w-xs rounded-xl border border-white/10"
        >
          <source src={message.content} />
        </video>
      );
    }

    if (message.type === 'audio') {
      return (
        <audio controls className="mt-2 w-full">
          <source src={message.content} />
        </audio>
      );
    }

    if (message.type === 'file') {
      const isLink = /^https?:\/\//i.test(message.content);
      const displayName = message.content.split('/').pop() || 'Attachment';

      return (
        <a
          href={isLink ? message.content : undefined}
          target={isLink ? '_blank' : undefined}
          rel={isLink ? 'noopener noreferrer' : undefined}
          className={`mt-2 inline-flex max-w-xs items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-cyan-200 ${isLink ? 'hover:text-cyan-100' : ''
            }`}
        >
          <Paperclip className="h-4 w-4" />
          <span className="truncate">{displayName}</span>
        </a>
      );
    }

    return <p className="text-sm leading-relaxed text-white/90">{message.content}</p>;
  };

  const renderStatusIcon = (message: Message) => {
    const isOwn = message.sender._id === currentUserId;
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
      <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <section className="hidden rounded-3xl border border-white/10 bg-white/5/10 p-6 shadow-xl shadow-black/20 backdrop-blur-2xl transition-all lg:block">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-cyan-300/80">Support Center</p>
              <h1 className="text-2xl font-semibold text-white">Conversations</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-300 hover:border-cyan-300 hover:text-cyan-200"
              title="Start a quick chat"
            >
              <Zap className="h-5 w-5" />
            </Button>
          </header>

          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <Input
                value={searchQuery}
                onChange={event => handleSearch(event.target.value)}
                placeholder="Search chats"
                className="h-12 rounded-full border-white/10 bg-white/5 pl-12 text-white placeholder:text-white/40 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/40"
              />
              {isSearching ? (
                <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-300" />
              ) : searchQuery ? (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <ScrollArea className="mt-6 h-[calc(100%-6rem)] pr-3">
            {isLoading && (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
              </div>
            )}

            {!isLoading && isChatListEmpty && (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-white/60">
                <MessageCircle className="h-8 w-8" />
                <p>No conversations yet</p>
                <p className="text-sm text-white/40">Start chatting with our support team when you need help.</p>
              </div>
            )}

            <div className="space-y-2">
              {/* New users to chat with */}
              {searchQuery && userSearchResults.length > 0 && (
                <>
                  <div className="mb-2 mt-4 px-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400/70">New Conversations</p>
                  </div>
                  {userSearchResults.map(user => (
                    <button
                      key={user._id}
                      onClick={() => startNewChat(user._id)}
                      className="w-full rounded-2xl border border-transparent bg-white/5 p-4 text-left transition-all hover:border-cyan-400/30 hover:bg-cyan-500/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/80">
                              {getInitials(user.username || user.email)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{user.username || user.email}</p>
                          <p className="mt-1 text-xs text-white/50">Click to start chatting</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {displayedChats.length > 0 && (
                    <div className="mb-2 mt-4 px-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Existing Chats</p>
                    </div>
                  )}
                </>
              )}

              {/* Existing chats */}
              {displayedChats.map(chat => {
                const partner = getChatPartner(chat);
                const active = selectedChat?._id === chat._id;
                const unread = chat.unreadCount ?? 0;

                return (
                  <button
                    key={chat._id}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full rounded-2xl border border-transparent p-4 text-left transition-all ${active
                        ? 'border-cyan-400/40 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent shadow-lg shadow-cyan-500/10'
                        : 'bg-white/5 hover:border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {partner?.avatar ? (
                          <img src={partner.avatar} alt={partner.username} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/80">
                            {getInitials(partner?.username || partner?.email)}
                          </div>
                        )}
                        {isPartnerOnline(chat) && (
                          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0a0b14] bg-emerald-400" />
                        )}
                      </div>

                      <div className="flex flex-1 items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {partner?.username || 'Support Team'}
                          </p>
                          <p className="mt-1 line-clamp-1 text-sm text-white/50">
                            {typingUsers.has(chat._id)
                              ? 'typing...'
                              : chat.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-white/40">
                            {formatRelativeTime(chat.lastMessage?.timestamp)}
                          </p>
                          {unread > 0 && (
                            <span className="mt-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-cyan-500/80 px-2 text-xs font-semibold text-white">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </section>

        <section className="relative flex min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-transparent p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
          {!selectedChat ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-white/70">
              <MessageCircle className="h-12 w-12 text-cyan-300" />
              <h2 className="mt-4 text-2xl font-semibold text-white">Connect with Support</h2>
              <p className="mt-2 max-w-sm text-sm text-white/60">
                Select a conversation from the sidebar to view messages or start a new chat with our support agents.
              </p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </Button>
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {getChatPartner(selectedChat)?.avatar ? (
                      <img
                        src={getChatPartner(selectedChat)?.avatar}
                        alt={getChatPartner(selectedChat)?.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/80">
                        {getInitials(getChatPartner(selectedChat)?.username || getChatPartner(selectedChat)?.email)}
                      </div>
                    )}
                    {isPartnerOnline(selectedChat) && (
                      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0a0b14] bg-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white flex items-center gap-2">
                      {getChatPartner(selectedChat)?.username || 'Support Team'}
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono">
                        #{selectedChat.chatNumber}
                      </span>
                    </p>
                    <p className="text-xs text-white/50">
                      {isPartnerOnline(selectedChat) ? 'Online now' : 'Offline'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="rounded-full text-white/60 hover:text-white">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </header>

              <ScrollArea className="mt-4 flex-1 pr-2">
                <div className="space-y-4">
                  {messages.map(message => {
                    const isOwn = message.sender._id === currentUserId;

                    return (
                      <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-3xl border px-5 py-4 shadow-lg ${isOwn
                              ? 'border-cyan-400/40 bg-cyan-500/10 text-white'
                              : 'border-white/10 bg-white/5 text-white/90'
                            }`}
                        >
                          {!isOwn && (
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                              {message.sender.username}
                            </p>
                          )}

                          {renderMessageContent(message)}

                          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-white/60">
                            <span>{formatTimestamp(message.timestamp)}</span>
                            {renderStatusIcon(message)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {typingIndicator && (
                <div className="mt-2 px-4 text-sm text-white/60">
                  {typingIndicator} is typing...
                </div>
              )}

              <div className="mt-4 space-y-3">
                {isRecording ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                      </span>
                      <span>Recording voice message...</span>
                    </div>
                    <span className="ml-auto font-mono text-sm">{recordingTime}s</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={() => stopRecording(true)}>
                        Send
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={cancelRecording}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-white/60 hover:text-white"
                        onClick={handleFileAttachmentClick}
                        title="Attach file"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-white/60 hover:text-white"
                        onClick={handleImageAttachmentClick}
                        title="Attach image"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-white/60 hover:text-white"
                        onClick={handleVideoAttachmentClick}
                        title="Attach video"
                      >
                        <Video className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={`text-white/60 hover:text-white ${showEmojiPicker ? 'text-cyan-300' : ''}`}
                        onClick={handleEmojiToggle}
                        title="Emoji picker"
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                    </div>

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
                      placeholder="Type a message"
                      className="flex-1 border-none bg-transparent text-white placeholder:text-white/40 focus:ring-0"
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={`rounded-full ${isRecording ? 'bg-red-600/20 text-red-400' : 'text-white/60 hover:text-white'}`}
                        onClick={isRecording ? () => stopRecording(true) : startRecording}
                        title="Record voice message"
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        disabled={isSending || !messageText.trim()}
                        onClick={handleSendMessage}
                        className="rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110 disabled:opacity-50"
                      >
                        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </div>

                    {showEmojiPicker && (
                      <div className="absolute bottom-16 left-4 z-20 w-64 rounded-2xl border border-white/10 bg-[#090B14]/95 p-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Emojis</p>
                          <button
                            onClick={handleEmojiToggle}
                            className="text-white/40 transition hover:text-white"
                            aria-label="Close emoji picker"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {recentEmojis.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] uppercase tracking-wide text-white/40">Recent</p>
                            <div className="mt-2 grid grid-cols-6 gap-2">
                              {recentEmojis.map(emoji => (
                                <button
                                  key={`recent-${emoji}`}
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl transition hover:bg-white/10"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <p className="text-[11px] uppercase tracking-wide text-white/40">Popular</p>
                          <div className="mt-2 grid grid-cols-6 gap-2">
                            {emojiPalette.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleEmojiSelect(emoji)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl transition hover:bg-white/10"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
            className="hidden"
            onChange={event => handleFileChange(event, 'file')}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => handleFileChange(event, 'image')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={event => handleFileChange(event, 'video')}
          />
        </section>
      </div>
    </UserDashboardLayout>
  );
}
