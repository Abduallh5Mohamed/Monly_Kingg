'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Send, X, Shield, User, Clock, CheckCircle2, AlertCircle, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureCsrfToken } from '@/utils/csrf';

interface Attachment {
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}

interface Message {
  _id: string;
  sender: { _id: string; username: string; avatar?: string };
  senderRole: string;
  content: string;
  attachments?: Attachment[];
  read: boolean;
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  userRole: string;
  messages: Message[];
  user: { _id: string; username: string; avatar?: string };
  assignedTo?: { username: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  answered: { label: 'Answered', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  closed: { label: 'Closed', color: 'text-white/40 bg-white/5 border-white/10' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-green-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  high: { label: 'High', color: 'text-red-400' },
};

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/tickets/${params.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTicket(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchTicket();
  }, [user, fetchTicket]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  // Poll for new messages every 10s
  useEffect(() => {
    if (!user || !ticket || ticket.status === 'closed') return;
    const interval = setInterval(fetchTicket, 10000);
    return () => clearInterval(interval);
  }, [user, ticket?.status, fetchTicket]);

  const handleSend = async () => {
    if ((!message.trim() && selectedFiles.length === 0) || sending) return;
    setSending(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const formData = new FormData();
      if (message.trim()) formData.append('content', message);
      selectedFiles.forEach(f => formData.append('attachments', f));

      const res = await fetch(`/api/v1/tickets/${params.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.data);
        setMessage('');
        setSelectedFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(f.type);
      const sizeOk = f.size <= 10 * 1024 * 1024;
      return ok && sizeOk;
    });
    setSelectedFiles(prev => [...prev, ...valid].slice(0, 5));
    if (e.target) e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/tickets/${params.id}/close`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
      });
      const data = await res.json();
      if (data.success) setTicket(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setClosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#060811] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#060811] flex items-center justify-center">
        <p className="text-white/40">Ticket not found</p>
      </div>
    );
  }

  const st = STATUS_MAP[ticket.status] || STATUS_MAP.open;
  const pr = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.medium;

  return (
    <div className="min-h-screen bg-[#060811] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0d16]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.push('/user/tickets')} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-bold truncate">{ticket.subject}</h1>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white/30 text-xs font-mono">{ticket.ticketNumber}</span>
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                  <span className={`text-xs ${pr.color}`}>● {pr.label}</span>
                </div>
              </div>
            </div>
            {ticket.status !== 'closed' && (
              <Button
                onClick={handleClose}
                disabled={closing}
                variant="outline"
                size="sm"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 shrink-0"
              >
                {closing ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {ticket.messages.map((msg) => {
            const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'moderator';
            const isMe = msg.sender._id === user?.id;

            return (
              <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isMe ? 'order-1' : ''}`}>
                  {/* Sender info */}
                  <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'justify-end' : ''}`}>
                    {isAdmin && <Shield className="w-3 h-3 text-purple-400" />}
                    <span className={`text-xs ${isAdmin ? 'text-purple-400' : 'text-white/40'}`}>
                      {isAdmin ? 'Support' : msg.sender.username}
                    </span>
                    <span className="text-white/20 text-xs">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Message bubble */}
                  <div className={`px-4 py-3 rounded-2xl ${isMe
                    ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/20 text-white'
                    : isAdmin
                      ? 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-white'
                      : 'bg-white/[0.04] border border-white/[0.08] text-white/90'
                    }`}>
                    {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`flex flex-wrap gap-2 ${msg.content ? 'mt-2' : ''}`}>
                        {msg.attachments.map((att, i) => {
                          const isImage = att.mimeType.startsWith('image/');
                          const isPdf = att.mimeType === 'application/pdf';
                          return isImage ? (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                              <img src={att.url} alt={att.originalName} className="max-w-[240px] max-h-[180px] rounded-lg object-cover border border-white/10" />
                            </a>
                          ) : isPdf ? (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-colors">
                              <FileText className="w-5 h-5 text-red-400 shrink-0" />
                              <span className="text-xs text-white/70 truncate max-w-[180px]">{att.originalName}</span>
                            </a>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      {ticket.status !== 'closed' ? (
        <div className="sticky bottom-0 bg-[#0a0d16]/95 backdrop-blur-xl border-t border-white/[0.06] pb-24 md:pb-4">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10">
                    {f.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> : <FileText className="w-3.5 h-3.5 text-red-400" />}
                    <span className="text-xs text-white/60 max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-white/30 hover:text-white/60 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors shrink-0"
                title="Attach files"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={autoResize}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  maxLength={2000}
                  rows={1}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/40 resize-none text-sm"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={sending || (!message.trim() && selectedFiles.length === 0)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl h-[46px] w-[46px] p-0 shrink-0"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0a0d16]/95 border-t border-white/[0.06] pb-24 md:pb-4">
          <div className="max-w-3xl mx-auto px-4 py-4 text-center">
            <p className="text-white/40 text-sm">This ticket has been closed {ticket.closedAt && `on ${new Date(ticket.closedAt).toLocaleDateString()}`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
