'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Archive,
  Ban,
  CheckCheck,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const chats = [
  {
    id: 1,
    user: { name: 'Ahmed Hassan', avatar: 'AH', status: 'online' },
    lastMessage: 'هل يمكنني الحصول على خصم على حساب PUBG؟',
    time: '2m ago',
    unread: 3,
    active: true
  },
  {
    id: 2,
    user: { name: 'Sara Mohamed', avatar: 'SM', status: 'online' },
    lastMessage: 'شكراً جزيلاً على المساعدة السريعة!',
    time: '15m ago',
    unread: 0,
    active: false
  },
  {
    id: 3,
    user: { name: 'Khaled Ali', avatar: 'KA', status: 'offline' },
    lastMessage: 'متى سيتم تسليم الحساب؟',
    time: '1h ago',
    unread: 1,
    active: false
  },
  {
    id: 4,
    user: { name: 'Mona Ibrahim', avatar: 'MI', status: 'online' },
    lastMessage: 'لدي مشكلة في تسجيل الدخول',
    time: '2h ago',
    unread: 5,
    active: false
  },
  {
    id: 5,
    user: { name: 'Omar Youssef', avatar: 'OY', status: 'offline' },
    lastMessage: 'هل توجد عروض جديدة؟',
    time: '3h ago',
    unread: 0,
    active: false
  },
  {
    id: 6,
    user: { name: 'Layla Ahmed', avatar: 'LA', status: 'online' },
    lastMessage: 'ممتاز! سأقوم بالشراء الآن',
    time: '5h ago',
    unread: 0,
    active: false
  },
];

const messages = [
  {
    id: 1,
    sender: 'user',
    text: 'مرحباً، أنا مهتم بشراء حساب PUBG Mobile',
    time: '10:30 AM',
    status: 'read'
  },
  {
    id: 2,
    sender: 'admin',
    text: 'أهلاً بك! بالتأكيد، لدينا عدة حسابات PUBG متاحة. ما هو المستوى الذي تبحث عنه؟',
    time: '10:31 AM',
    status: 'read'
  },
  {
    id: 3,
    sender: 'user',
    text: 'أبحث عن حساب Level 50 على الأقل',
    time: '10:32 AM',
    status: 'read'
  },
  {
    id: 4,
    sender: 'admin',
    text: 'رائع! لدينا حساب Level 50 ممتاز بسعر $45.99 ويحتوي على العديد من الأسلحة النادرة',
    time: '10:33 AM',
    status: 'read'
  },
  {
    id: 5,
    sender: 'user',
    text: 'هل يمكنني الحصول على خصم على حساب PUBG؟',
    time: '10:35 AM',
    status: 'delivered'
  },
];

export default function ChatsPage() {
  const [selectedChat, setSelectedChat] = useState(chats[0]);
  const [messageText, setMessageText] = useState('');

  const totalChats = chats.length;
  const unreadChats = chats.filter(c => c.unread > 0).length;
  const onlineUsers = chats.filter(c => c.user.status === 'online').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Live Chats</h1>
          <p className="text-white/60">Monitor and manage all customer conversations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total Chats</p>
                <p className="text-2xl font-bold text-white">{totalChats}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Unread</p>
                <p className="text-2xl font-bold text-yellow-400">{unreadChats}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <span className="text-2xl">📧</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Online Now</p>
                <p className="text-2xl font-bold text-green-400">{onlineUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">🟢</span>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search conversations..."
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedChat.id === chat.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {chat.user.avatar}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e2236] ${
                        chat.user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium text-sm truncate">{chat.user.name}</h3>
                        <span className="text-xs text-white/40">{chat.time}</span>
                      </div>
                      <p className="text-white/60 text-xs truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <Badge className="bg-purple-500 text-white text-xs">{chat.unread}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Messages - Right Side */}
        <Card className="lg:col-span-8 bg-[#1e2236] border-white/10 flex flex-col">
          {/* Chat Header */}
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {selectedChat.user.avatar}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e2236] ${
                    selectedChat.user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </div>
                <div>
                  <h3 className="text-white font-medium">{selectedChat.user.name}</h3>
                  <p className="text-white/60 text-xs flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      selectedChat.user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    {selectedChat.user.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                  <Video className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1a1d2e] border-white/10">
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                      <Ban className="mr-2 h-4 w-4" />
                      Block User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${message.sender === 'admin' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        message.sender === 'admin'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-white/40">{message.time}</span>
                      {message.sender === 'admin' && (
                        message.status === 'read' ? (
                          <CheckCheck className="h-3 w-3 text-blue-400" />
                        ) : (
                          <Clock className="h-3 w-3 text-white/40" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 flex-shrink-0">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-white/5 border-white/10 text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && messageText.trim()) {
                    // Send message logic here
                    setMessageText('');
                  }
                }}
              />
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 flex-shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
              <Button 
                size="icon"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-shrink-0"
                onClick={() => {
                  if (messageText.trim()) {
                    // Send message logic here
                    setMessageText('');
                  }
                }}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
