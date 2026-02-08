'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  MoreVertical,
  Archive,
  Ban,
  CheckCheck,
  Clock,
  Loader2,
  Eye,
  MessageSquare,
  Users,
  TrendingUp,
  Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Participant {
  _id: string;
  username?: string;
  email: string;
  avatar?: string;
  role: string;
  verified: boolean;
}

interface Message {
  _id: string;
  sender: Participant;
  content: string;
  type: string;
  timestamp: string;
  read: boolean;
  delivered: boolean;
}

interface Chat {
  _id: string;
  chatNumber: string;
  type: string;
  participants: Participant[];
  participantNames: string;
  lastMessage?: {
    content: string;
    sender: Participant;
    timestamp: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatDetails {
  chat: Chat;
  messages: Message[];
  stats: {
    totalMessages: number;
    participantCount: number;
    createdAt: string;
    lastActivity: string;
  };
}

interface ChatStatistics {
  totalChats: number;
  chatsByType: {
    direct: number;
    support: number;
    group: number;
  };
  activeChatsToday: number;
  activityRate: number;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const [statistics, setStatistics] = useState<ChatStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchStatistics();
    fetchChats();
  }, [typeFilter, currentPage]);

  useEffect(() => {
    if (selectedChat) {
      fetchChatDetails(selectedChat._id);
    }
  }, [selectedChat]);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/chats/statistics', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      if (data.success) {
        setStatistics(data.data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        type: typeFilter,
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`http://localhost:5000/api/v1/admin/chats?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch chats');

      const data = await response.json();
      if (data.success) {
        setChats(data.data.chats);
        if (data.data.chats.length > 0 && !selectedChat) {
          setSelectedChat(data.data.chats[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chats');
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatDetails = async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`http://localhost:5000/api/v1/admin/chats/${chatId}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch chat details');

      const data = await response.json();
      if (data.success) {
        setChatDetails(data.data);
      }
    } catch (err) {
      console.error('Error fetching chat details:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchChats();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && chats.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && chats.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">Error loading chats</p>
          <p className="text-white/60">{error}</p>
          <button
            onClick={fetchChats}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            <Shield className="inline-block mr-2 h-8 w-8" />
            Chat Monitor
          </h1>
          <p className="text-white/60">Monitor and oversee all user conversations</p>
        </div>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2">
          <Eye className="mr-2 h-4 w-4" />
          Read-Only Mode
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total Chats</p>
                <p className="text-2xl font-bold text-white">{statistics?.totalChats || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Direct Chats</p>
                <p className="text-2xl font-bold text-purple-400">{statistics?.chatsByType.direct || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Support Chats</p>
                <p className="text-2xl font-bold text-green-400">{statistics?.chatsByType.support || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Active Today</p>
                <p className="text-2xl font-bold text-yellow-400">{statistics?.activeChatsToday || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
        {/* Chat List - Left Side */}
        <Card className="lg:col-span-4 bg-[#1e2236] border-white/10 flex flex-col">
          <CardHeader className="border-b border-white/10 pb-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search by email or chat number (9 digits)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="direct">Direct</option>
                <option value="support">Support</option>
                <option value="group">Group</option>
              </select>
            </form>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${selectedChat?._id === chat._id
                      ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                        {chat.participants.length === 2 ? (
                          chat.participants.map(p => (p.username || p.email).charAt(0).toUpperCase()).join('')
                        ) : (
                          `${chat.participants.length}`
                        )}
                      </div>
                      <Badge className="absolute -bottom-1 -right-1 text-xs px-1 bg-blue-500">
                        {chat.type}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium text-sm truncate">
                          {chat.participantNames}
                        </h3>
                        <span className="text-xs text-white/40">
                          {chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : 'No messages'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 bg-blue-500/10 text-blue-400 font-mono">
                          #{chat.chatNumber}
                        </Badge>
                      </div>
                      <p className="text-white/60 text-xs truncate">
                        {chat.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {chats.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No chats found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Messages - Right Side */}
        <Card className="lg:col-span-8 bg-[#1e2236] border-white/10 flex flex-col">
          {selectedChat && chatDetails ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {chatDetails.chat.participants.length === 2 ? (
                          chatDetails.chat.participants.map(p => (p.username || p.email).charAt(0).toUpperCase()).join('')
                        ) : (
                          `${chatDetails.chat.participants.length}`
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-medium flex items-center gap-2">
                        {selectedChat.participantNames}
                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-500/30 bg-blue-500/10 text-blue-400 font-mono">
                          #{selectedChat.chatNumber}
                        </Badge>
                      </h3>
                      <p className="text-white/60 text-xs flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                          {chatDetails.chat.type}
                        </Badge>
                        <span>{chatDetails.stats.totalMessages} messages</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <Eye className="mr-1 h-3 w-3" />
                      Monitoring
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatDetails.messages.map((message) => {
                      const isFromSender = message.sender._id === chatDetails.chat.participants[0]._id;
                      const sender = chatDetails.chat.participants.find(p => p._id === message.sender._id);

                      return (
                        <div key={message._id} className={`flex ${!isFromSender ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${!isFromSender ? 'order-2' : 'order-1'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-white/60">
                                {sender?.username || sender?.email}
                              </span>
                              {sender?.role === 'admin' && (
                                <Badge className="bg-purple-500/20 text-purple-400 text-xs">Admin</Badge>
                              )}
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2 ${!isFromSender
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                                  : 'bg-white/10 text-white'
                                }`}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                            </div>
                            <div className={`flex items-center gap-1 mt-1 ${!isFromSender ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs text-white/40">
                                {new Date(message.timestamp).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {message.read ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Clock className="h-3 w-3 text-white/40" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {chatDetails.messages.length === 0 && (
                      <div className="text-center py-12 text-white/60">
                        <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>No messages in this chat yet</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Info Footer - Read Only */}
              <div className="border-t border-white/10 p-4 bg-yellow-500/10">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>Admin monitoring mode - Read-only view</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white/60">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a chat to view messages</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
