'use client';

import { useState, useEffect, useRef } from 'react';
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
  Phone,
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
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
          console.log('🍪 Token found in cookies ✅');
          return token;
        }
      }

      // Fallback to localStorage
      const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      if (accessToken) {
        console.log('� Token found in localStorage ✅');
        return accessToken;
      }

      console.log('⚠️ No token found in cookies or localStorage');
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
            console.log('👤 Current User ID set from API:', userId);
            console.log('� Current User:', data.data.username);
          }
        } else {
          console.warn('⚠️ Failed to fetch current user');
        }
      } catch (error) {
        console.error('❌ Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.warn('⚠️ No token found');
      setIsLoading(false);
      // Don't redirect immediately, user might be using cookie-based auth
      return;
    }

    console.log('✅ Initializing Socket.IO with token...');

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true // Important for cookie-based auth
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
      setIsConnected(true);
      newSocket.emit('get_online_users');

      // Rejoin selected chat if any
      if (selectedChat) {
        console.log('🔄 Rejoining chat:', selectedChat._id);
        newSocket.emit('join_chat', selectedChat._id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    newSocket.on('user_chats', (userChats: Chat[]) => {
      setChats(userChats);
      setIsLoading(false);
    });

    newSocket.on('new_message', ({ chatId, message }) => {
      console.log('💬 New message received:', message);

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

    newSocket.on('user_typing', ({ userId, username }) => {
      setTypingUsers(prev => new Set(prev).add(username));
    });

    newSocket.on('user_stop_typing', ({ userId }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
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
      console.log('📖 Messages read in chat:', chatId, 'by:', readBy);
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
      console.log('✅ Message delivered:', messageId);
      if (selectedChat?._id === chatId) {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId
            ? { ...msg, delivered: true }
            : msg
        ));
      }
    });

    newSocket.on('message_sent', ({ chatId, message }) => {
      console.log('📤 Message sent confirmation:', message);
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
      console.log('📥 Loading messages for chat:', chatId);

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
      console.log('📦 Messages loaded:', data);

      if (data.success) {
        setMessages(data.data.messages);
        console.log('✅ Set messages:', data.data.messages.length, 'messages');
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) {
      console.warn('⚠️ Cannot send: empty message or already sending');
      return;
    }

    if (!selectedChat) {
      console.error('❌ No chat selected');
      alert('Please select a chat first');
      return;
    }

    console.log('📤 Sending message...', {
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
        console.log('🔌 Sending via Socket.IO...');
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
        console.warn('⚠️ Socket not connected, using API fallback');

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
        console.log('✅ Message sent via API:', data);

        // Reload messages to get the real message
        await loadMessages(selectedChat._id);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
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

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleVideoUpload = () => {
    videoInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedChat) {
      console.log('📎 File selected:', file.name);
      // TODO: Implement file upload logic
      alert(`File upload: ${file.name}\nFeature coming soon!`);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedChat) {
      console.log('🎥 Video selected:', file.name);
      // TODO: Implement video upload logic
      alert(`Video upload: ${file.name}\nFeature coming soon!`);
    }
  };

  const startRecording = async () => {
    try {
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🎤 Recording stopped, size:', audioBlob.size, 'duration:', recordingTime, 's');
        
        if (recordingTime > 0 && selectedChat) {
          // TODO: Send audio message to backend
          const tempMessage: Message = {
            _id: `temp-audio-${Date.now()}`,
            sender: {
              _id: currentUserId || 'unknown',
              username: 'You',
              avatar: ''
            },
            content: `🎤 Voice message (${recordingTime}s)`,
            type: 'audio',
            timestamp: new Date(),
            read: false,
            delivered: false
          };
          
          setMessages(prev => [...prev, tempMessage]);
          scrollToBottom();
        }
        
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('🎤 Recording started...');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      alert('Please allow microphone access to record voice messages.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      audioChunksRef.current = [];
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      console.log('🎤 Recording cancelled');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    
    // Update recent emojis
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 16); // Keep only 16 recent
      localStorage.setItem('recentEmojis', JSON.stringify(updated));
      return updated;
    });
  };

  const createSupportChat = async () => {
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/v1/chats/support', {
        method: 'POST',
        headers,
        credentials: 'include' // Important for cookie-based auth
      });
      const data = await response.json();
      if (data.success) {
        setChats(prev => [data.data, ...prev]);
        setSelectedChat(data.data);
      }
    } catch (error) {
      console.error('Failed to create support chat:', error);
    }
  };

  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  const getOtherParticipant = (chat: Chat) => {
    // Filter out current user from participants
    const others = chat.participants.filter(p => p._id !== currentUserId);

    if (others.length > 0) {
      console.log('👥 Other participant:', others[0].username, '(ID:', others[0]._id, ')');
      return others[0];
    }

    // Fallback: return first participant that's not me
    const fallback = chat.participants.find(p => p._id !== currentUserId);
    if (fallback) {
      console.log('👥 Fallback participant:', fallback.username);
      return fallback;
    }

    console.warn('⚠️ No other participant found, currentUserId:', currentUserId);
    console.warn('Chat participants:', chat.participants.map(p => ({ id: p._id, name: p.username })));
    return chat.participants[0];
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'support') return 'Customer Support';
    const other = getOtherParticipant(chat);
    return other?.username || 'Unknown User';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'support') return 'https://api.dicebear.com/7.x/avataaars/svg?seed=support';
    const other = getOtherParticipant(chat);
    
    // If user has avatar, use it
    if (other?.avatar) return other.avatar;
    
    // Default avatars based on gender or role
    // Check if user data has gender field, otherwise use male as default
    const isFemale = other?.email?.toLowerCase().includes('female') || 
                     other?.username?.toLowerCase().includes('female') ||
                     other?.role === 'female';
    
    // Use big-smile style with specific male/female seeds for consistent avatars
    return isFemale 
      ? 'https://api.dicebear.com/7.x/big-smile/svg?seed=female-default'
      : 'https://api.dicebear.com/7.x/big-smile/svg?seed=male-default';
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`http://localhost:5000/api/v1/users/search?q=${encodeURIComponent(query)}`, {
        headers,
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const startChatWithUser = async (userId: string) => {
    try {
      console.log('💬 Starting chat with user:', userId);
      console.log('👤 Current user ID:', currentUserId);

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
        body: JSON.stringify({ recipientId: userId })
      });

      const data = await response.json();
      console.log('📦 Chat creation response:', data);

      if (data.success && data.data) {
        const newChat = data.data;

        // Log participants for debugging
        console.log('👥 Chat participants:', newChat.participants.map((p: any) => ({
          id: p._id,
          name: p.username,
          isMe: p._id === currentUserId
        })));

        // Add to chats if not already there
        const exists = chats.find(c => c._id === newChat._id);
        if (!exists) {
          setChats(prev => [newChat, ...prev]);
        }

        setSelectedChat(newChat);
        setSearchQuery('');
        setSearchResults([]);

        // Join the chat room via socket
        if (socket) {
          socket.emit('join_chat', newChat._id);
        }
      } else {
        console.error('❌ Failed to create chat:', data.message);
      }
    } catch (error) {
      console.error('❌ Failed to start chat:', error);
    }
  };

  // Filter chats based on search query
  const filteredChats = searchQuery.trim()
    ? chats.filter(chat => {
      const chatName = getChatName(chat).toLowerCase();
      const query = searchQuery.toLowerCase();
      return chatName.includes(query);
    })
    : chats;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
          <p className="mt-4 text-gray-400">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="h-[calc(100vh-120px)] bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e] rounded-3xl shadow-2xl flex overflow-hidden border border-white/10">
        {/* Sidebar - Chat List */}
        <div className="w-full md:w-96 bg-gradient-to-br from-[#131720] to-[#1a1d2e] border-r border-white/10 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-br from-[#131720] to-[#1a1d2e]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">Messages</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse shadow-lg ${isConnected ? 'shadow-green-500/50' : 'shadow-red-500/50'}`} />
                  <span className="text-xs text-gray-400">{isConnected ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="relative group mb-3">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            <Input
              placeholder="Search users or chats..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-11 bg-[#1a1d2e] border border-white/10 hover:border-cyan-500/30 focus:border-cyan-500/50 text-white placeholder:text-gray-500 rounded-2xl h-12 transition-all"
            />
          </div>

          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div className="mb-3 bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-2 space-y-1">
                <p className="text-xs text-white/60 px-2 py-1">Search Results</p>
                {searchResults.map((user: any) => {
                  const isFemale = user.gender === 'female' || 
                                   user.email?.toLowerCase().includes('female') || 
                                   user.username?.toLowerCase().includes('female');
                  const defaultAvatar = isFemale 
                    ? 'https://api.dicebear.com/7.x/big-smile/svg?seed=female-default'
                    : 'https://api.dicebear.com/7.x/big-smile/svg?seed=male-default';
                  
                  return (
                  <div
                    key={user._id}
                    onClick={() => startChatWithUser(user._id)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition-all"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-600">
                      <img
                        src={user.avatar || defaultAvatar}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{user.username}</p>
                      <p className="text-white/60 text-xs">{user.email}</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {searchQuery && isSearching && (
            <div className="mb-3 text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto" />
              <p className="text-white/60 text-xs mt-2">Searching...</p>
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="mb-3 text-center py-4">
              <p className="text-white/60 text-sm">No users found</p>
            </div>
          )}
        </div>

        {/* Chats List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {!searchQuery && chats.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-white/20 mb-3" />
                <p className="text-white/40 text-sm mb-4">No chats yet</p>
                <Button
                  onClick={createSupportChat}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Chat
                </Button>
              </div>
            )}
            {filteredChats.map((chat) => {
              const isOnline = chat.participants.some(p => isUserOnline(p._id));
              const chatName = getChatName(chat);
              const chatAvatar = getChatAvatar(chat);

              return (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`group p-4 rounded-2xl cursor-pointer transition-all duration-300 ${selectedChat?._id === chat._id
                    ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
                        <img src={chatAvatar} alt={chatName} className="w-full h-full object-cover" />
                      </div>
                      {isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#131720] animate-pulse shadow-lg shadow-green-500/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-semibold text-sm truncate">{chatName}</h3>
                        <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                          {chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-white/50 text-xs truncate group-hover:text-white/70 transition-colors">
                          {chat.lastMessage?.content || 'No messages yet'}
                        </p>
                        {chat.unreadCount && chat.unreadCount > 0 && (
                          <span className="ml-2 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/50 animate-pulse font-bold">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0e1118]/50 to-[#0a0b14]/80 backdrop-blur-sm">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-5 bg-gradient-to-b from-[#131720]/80 to-transparent backdrop-blur-xl border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
                      <img src={getChatAvatar(selectedChat)} alt={getChatName(selectedChat)} className="w-full h-full object-cover" />
                    </div>
                    {selectedChat.participants.some(p => isUserOnline(p._id)) && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#131720] animate-pulse shadow-lg shadow-green-500/50" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-lg">{getChatName(selectedChat)}</h2>
                    <div className="flex items-center gap-2">
                      {selectedChat.participants.some(p => isUserOnline(p._id)) ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <p className="text-green-400 text-sm font-medium">Active now</p>
                        </>
                      ) : (
                        <p className="text-white/60 text-sm">Offline</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all group">
                    <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all group">
                    <MoreVertical className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6 relative">
              {/* Decorative Background */}
              <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M50 0 L50 100 M0 50 L100 50" stroke="%23ffffff" stroke-width="0.5" fill="none"/%3E%3C/svg%3E")',
                backgroundSize: '50px 50px'
              }} />

              <div className="space-y-6 max-w-4xl mx-auto relative">
                <div className="text-center my-8">
                  <span className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm text-white/70 text-xs px-4 py-2 rounded-full border border-white/10 shadow-lg">
                    <Clock className="h-3 w-3" />
                    Today
                  </span>
                </div>
                {messages.map((message, index) => {
                  const isOwn = message.sender._id === currentUserId;
                  const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;

                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`max-w-[70%] group`}>
                        <div
                          className={`relative rounded-3xl px-5 py-3 shadow-2xl backdrop-blur-sm transition-all duration-300 ${isOwn
                            ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-br-md hover:shadow-cyan-500/50'
                            : 'bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-bl-md hover:bg-white/15'
                            }`}
                        >
                          {!isOwn && showAvatar && (
                            <p className="text-xs text-white/70 mb-1 font-semibold">
                              {message.sender.username}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          <div className={`flex items-center gap-1.5 mt-2 ${isOwn ? 'justify-end' : 'justify-start'
                            }`}>
                            <span className="text-xs text-white/70 font-medium">
                              {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwn && (
                              <>
                                {message.read ? (
                                  <div className="flex items-center gap-0.5">
                                    <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                                  </div>
                                ) : message.delivered ? (
                                  <div className="flex items-center gap-0.5">
                                    <CheckCheck className="h-3.5 w-3.5 text-white/60" />
                                  </div>
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-white/50" />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-3xl px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-white/70">typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-5 bg-gradient-to-t from-[#131720]/95 to-transparent backdrop-blur-xl border-t border-white/5">
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
              />

              <div className="flex items-center gap-3 max-w-4xl mx-auto">
                <div className="flex items-center gap-2">
                  {/* Emoji Picker Button */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-xl flex-shrink-0 transition-all group"
                      title="Add emoji"
                    >
                      <Smile className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </Button>
                    
                    {/* Enhanced Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full mb-2 left-0 bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 w-80">
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-white/10">
                          <h3 className="text-white font-semibold text-sm">Emoji</h3>
                          <button
                            onClick={() => setShowEmojiPicker(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 border-b border-white/10">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                              type="text"
                              placeholder="Search emojis"
                              className="w-full bg-[#131720] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
                            />
                          </div>
                        </div>

                        {/* Recent Emojis */}
                        <div className="p-3 border-b border-white/10">
                          <p className="text-xs text-gray-400 mb-2 font-medium">Recent</p>
                          <div className="flex gap-1 flex-wrap min-h-[48px]">
                            {recentEmojis.length > 0 ? (
                              recentEmojis.map((emoji, index) => (
                                <button
                                  key={`${emoji}-${index}`}
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="text-2xl hover:bg-white/10 rounded-lg p-1.5 transition-all hover:scale-110"
                                >
                                  {emoji}
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-gray-500 italic py-2">No recent emojis yet. Start using emojis!</p>
                            )}
                          </div>
                        </div>

                        {/* Emoji Grid */}
                        <div className="max-h-64 overflow-y-auto p-3">
                          {/* Smileys & People */}
                          <div className="mb-4">
                            <p className="text-xs text-gray-400 mb-2 font-medium">Smileys & People</p>
                            <div className="grid grid-cols-8 gap-1">
                              {['😀', '�', '😄', '😁', '😆', '😅', '🤣', '�😂', '�', '🙃', '😉', '😊', '😇', '🥰', '�', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '�😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="text-2xl hover:bg-white/10 rounded-lg p-1 transition-all hover:scale-125"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Gestures & Body Parts */}
                          <div className="mb-4">
                            <p className="text-xs text-gray-400 mb-2 font-medium">Gestures & Body Parts</p>
                            <div className="grid grid-cols-8 gap-1">
                              {['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '�', '👈', '👉', '👆', '🖕', '�', '☝️', '👍', '👎', '✊', '�', '🤛', '🤜', '�👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="text-2xl hover:bg-white/10 rounded-lg p-1 transition-all hover:scale-125"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Hearts & Symbols */}
                          <div className="mb-4">
                            <p className="text-xs text-gray-400 mb-2 font-medium">Hearts & Symbols</p>
                            <div className="grid grid-cols-8 gap-1">
                              {['❤️', '🧡', '�', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍�🔥', '❤️‍🩹', '�', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '�💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '�', '💹', '❇️', '✳️', '❎', '🌐', '💠', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '◼️', '◻️', '◾', '◽', '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💧', '💦', '🔥', '✨', '🌟', '⭐', '🌠', '🌌'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="text-2xl hover:bg-white/10 rounded-lg p-1 transition-all hover:scale-125"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Objects */}
                          <div>
                            <p className="text-xs text-gray-400 mb-2 font-medium">Objects</p>
                            <div className="grid grid-cols-8 gap-1">
                              {['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '�️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🖼️', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '�', '�'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="text-2xl hover:bg-white/10 rounded-lg p-1 transition-all hover:scale-125"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex items-center justify-around p-2 border-t border-white/10">
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Recent">
                            <Clock className="h-5 w-5 text-gray-400" />
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Smileys">
                            <Smile className="h-5 w-5 text-gray-400" />
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Gestures">
                            <span className="text-lg">👋</span>
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Objects">
                            <span className="text-lg">💡</span>
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Symbols">
                            <span className="text-lg">❤️</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* File Upload Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFileUpload}
                    className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl flex-shrink-0 transition-all group"
                    title="Upload file"
                  >
                    <Paperclip className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>

                  {/* Video Upload Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVideoUpload}
                    className="text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl flex-shrink-0 transition-all group"
                    title="Upload video"
                  >
                    <ImageIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </div>

                <div className="flex-1 relative">
                  <Input
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isSending}
                    className="w-full bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/30 focus:border-purple-500/50 text-white placeholder:text-white/40 rounded-2xl h-12 pl-5 pr-12 transition-all"
                  />
                  {!messageText.trim() && !isRecording && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startRecording}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl transition-all group text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                      title="Record voice message"
                    >
                      <Mic className="h-5 w-5 transition-transform group-hover:scale-110" />
                    </Button>
                  )}
                  {isRecording && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-xl px-3 py-1.5 border border-red-500/50">
                      <button
                        onClick={cancelRecording}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 font-mono text-xs min-w-[32px]">
                          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      
                      <button
                        onClick={stopRecording}
                        className="p-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg shadow-cyan-500/30"
                        title="Send"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  size="icon"
                  className={`h-12 w-12 rounded-2xl flex-shrink-0 transition-all duration-300 ${messageText.trim() && !isSending
                    ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/50 scale-100'
                    : 'bg-white/10 hover:bg-white/20 scale-95 opacity-50'
                    }`}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className={`h-5 w-5 transition-transform ${messageText.trim() ? 'scale-100' : 'scale-90'}`} />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white/40">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-4">No conversations yet</p>
              <Button
                onClick={createSupportChat}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Start Support Chat
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </UserDashboardLayout>
  );
}
