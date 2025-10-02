'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Star,
  Zap
} from 'lucide-react';

const chatsList = [
  {
    id: 1,
    name: 'Customer Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=support',
    lastMessage: 'How can I help you today?',
    time: '10:30 AM',
    unread: 2,
    online: true,
    color: 'from-purple-500 to-blue-500'
  },
  {
    id: 2,
    name: 'Sales Team',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sales',
    lastMessage: 'Thank you for your purchase!',
    time: 'Yesterday',
    unread: 0,
    online: false,
    color: 'from-green-500 to-teal-500'
  },
  {
    id: 3,
    name: 'Technical Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    lastMessage: 'Issue resolved successfully',
    time: '2 days ago',
    unread: 0,
    online: true,
    color: 'from-orange-500 to-red-500'
  },
];

const supportMessages = [
  {
    id: 1,
    sender: 'support',
    text: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
    time: '10:30 AM',
    status: 'read'
  },
  {
    id: 2,
    sender: 'user',
    text: 'مرحباً، أريد الاستفسار عن حساب PUBG Mobile',
    time: '10:31 AM',
    status: 'read'
  },
  {
    id: 3,
    sender: 'support',
    text: 'بالتأكيد! يسعدني مساعدتك. ما هي المواصفات التي تبحث عنها في الحساب؟',
    time: '10:32 AM',
    status: 'read'
  },
  {
    id: 4,
    sender: 'user',
    text: 'أبحث عن حساب Level 50 على الأقل مع أسلحة نادرة',
    time: '10:33 AM',
    status: 'read'
  },
  {
    id: 5,
    sender: 'support',
    text: 'ممتاز! لدينا عدة حسابات تناسب طلبك. سأرسل لك بعض الخيارات المتاحة الآن...',
    time: '10:34 AM',
    status: 'read'
  },
  {
    id: 6,
    sender: 'support',
    text: '1️⃣ حساب Level 52 - يحتوي على M416 Glacier + AWM Dragon\n2️⃣ حساب Level 55 - يحتوي على AKM Gold + Kar98k Dragon\n\nكلاهما بأسعار ممتازة!',
    time: '10:35 AM',
    status: 'read'
  },
  {
    id: 7,
    sender: 'user',
    text: 'رائع! كم سعر الحساب الأول؟',
    time: '10:37 AM',
    status: 'delivered'
  },
];

export default function SupportPage() {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState(supportMessages);
  const [selectedChat] = useState(chatsList[0]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: 'user',
        text: messageText,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e] flex overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-full md:w-96 bg-gradient-to-b from-[#131720]/80 to-[#0a0b14]/80 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-white text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Messages</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40 group-hover:text-purple-400 transition-colors" />
            <Input
              placeholder="Search conversations..."
              className="pl-11 bg-white/5 border border-white/10 hover:border-purple-500/30 focus:border-purple-500/50 text-white placeholder:text-white/40 rounded-2xl h-12 transition-all"
            />
          </div>
        </div>

        {/* Chats List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {chatsList.map((chat) => (
              <div
                key={chat.id}
                className={`group p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  selectedChat.id === chat.id
                    ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${chat.color} flex items-center justify-center shadow-lg overflow-hidden`}>
                      <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                    </div>
                    {chat.online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#131720] animate-pulse shadow-lg shadow-green-500/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-semibold text-sm truncate">{chat.name}</h3>
                      <span className="text-xs text-white/40 flex-shrink-0 ml-2">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-white/50 text-xs truncate group-hover:text-white/70 transition-colors">{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <span className="ml-2 bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/50 animate-pulse">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0e1118]/50 to-[#0a0b14]/80 backdrop-blur-sm">
        {/* Chat Header */}
        <div className="p-5 bg-gradient-to-b from-[#131720]/80 to-transparent backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedChat.color} flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden transition-transform group-hover:scale-105`}>
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#131720] animate-pulse shadow-lg shadow-green-500/50" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">{selectedChat.name}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-green-400 text-sm font-medium">Active now</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all group">
                <Video className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all group">
                <Phone className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>
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
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`max-w-[70%] group`}>
                  <div
                    className={`relative rounded-3xl px-5 py-3 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-md hover:shadow-purple-500/50'
                        : 'bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-bl-md hover:bg-white/15'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    <div className={`flex items-center gap-1.5 mt-2 ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <span className="text-xs text-white/70 font-medium">{message.time}</span>
                      {message.sender === 'user' && (
                        <>
                          {message.status === 'read' && (
                            <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                          )}
                          {message.status === 'delivered' && (
                            <CheckCheck className="h-3.5 w-3.5 text-white/70" />
                          )}
                          {message.status === 'sent' && (
                            <Clock className="h-3.5 w-3.5 text-white/70" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-5 bg-gradient-to-t from-[#131720]/95 to-transparent backdrop-blur-xl border-t border-white/5">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/60 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl flex-shrink-0 transition-all group"
              >
                <Smile className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl flex-shrink-0 transition-all group"
              >
                <Paperclip className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/60 hover:text-green-400 hover:bg-green-500/10 rounded-xl flex-shrink-0 transition-all group"
              >
                <ImageIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
            
            <div className="flex-1 relative">
              <Input
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/30 focus:border-purple-500/50 text-white placeholder:text-white/40 rounded-2xl h-12 pl-5 pr-12 transition-all"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              {!messageText.trim() && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all group"
                >
                  <Mic className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </Button>
              )}
            </div>
            
            <Button 
              size="icon"
              className={`h-12 w-12 rounded-2xl flex-shrink-0 transition-all duration-300 ${
                messageText.trim() 
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50 scale-100' 
                  : 'bg-white/10 hover:bg-white/20 scale-95 opacity-50'
              }`}
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Send className={`h-5 w-5 transition-transform ${messageText.trim() ? 'scale-100' : 'scale-90'}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
