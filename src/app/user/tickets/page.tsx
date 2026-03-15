'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { ArrowLeft, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureCsrfToken } from '@/utils/csrf';
import Link from 'next/link';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  userRole: string;
  messages: { content: string; senderRole: string; read: boolean; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_MAP: Record<string, { ar: string; en: string; color: string; icon: any }> = {
  open: { ar: 'مفتوحة', en: 'Open', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: AlertCircle },
  in_progress: { ar: 'قيد المعالجة', en: 'In Progress', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  answered: { ar: 'تم الرد', en: 'Answered', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
  closed: { ar: 'مغلقة', en: 'Closed', color: 'text-white/40 bg-white/5 border-white/10', icon: CheckCircle2 },
};

const PRIORITY_MAP: Record<string, { ar: string; en: string; color: string }> = {
  low: { ar: 'منخفضة', en: 'Low', color: 'text-green-400' },
  medium: { ar: 'متوسطة', en: 'Medium', color: 'text-yellow-400' },
  high: { ar: 'مرتفعة', en: 'High', color: 'text-red-400' },
};

const CATEGORY_MAP: Record<string, { ar: string; en: string }> = {
  general: { ar: 'عام', en: 'General' },
  payment: { ar: 'الدفع', en: 'Payment' },
  account: { ar: 'الحساب', en: 'Account' },
  transaction: { ar: 'المعاملة', en: 'Transaction' },
  technical: { ar: 'تقني', en: 'Technical' },
  other: { ar: 'أخرى', en: 'Other' },
};

export default function TicketsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create ticket form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/v1/tickets/mine?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTickets(data.data.tickets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchTickets();
  }, [user, fetchTickets]);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    setCreating(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch('/api/v1/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
        body: JSON.stringify({ subject, message, category, priority }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setSubject('');
        setMessage('');
        setCategory('general');
        setPriority('medium');
        fetchTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const getUnreadCount = (ticket: Ticket) => {
    return ticket.messages.filter(m =>
      (m.senderRole === 'admin' || m.senderRole === 'moderator') && !m.read
    ).length;
  };

  return (
    <UserDashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{tr('الدعم', 'Support')}</h1>
              <p className="text-white/40 text-sm">{tr('إدارة التذاكر والشكاوى', 'Manage tickets and complaints')}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" />
            {tr('تذكرة جديدة', 'New Ticket')}
          </Button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { key: 'all', label: tr('الكل', 'All') },
            { key: 'open', label: tr('مفتوحة', 'Open') },
            { key: 'in_progress', label: tr('قيد المعالجة', 'In Progress') },
            { key: 'answered', label: tr('تم الرد', 'Answered') },
            { key: 'closed', label: tr('مغلقة', 'Closed') },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${statusFilter === f.key
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 mb-4">{tr('لا توجد تذاكر', 'No tickets')}</p>
            <Button onClick={() => setShowCreateModal(true)} variant="outline" className="border-white/10 text-white/60 hover:text-white">
              {tr('إنشاء تذكرة جديدة', 'Create New Ticket')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const st = STATUS_MAP[ticket.status] || STATUS_MAP.open;
              const pr = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.medium;
              const unread = getUnreadCount(ticket);
              const lastMsg = ticket.messages[ticket.messages.length - 1];
              const StatusIcon = st.icon;

              return (
                <Link key={ticket._id} href={`/user/tickets/${ticket._id}`}>
                  <div className={`bg-[#0a0d16]/80 border rounded-2xl p-4 hover:border-orange-500/30 transition-all cursor-pointer ${unread > 0 ? 'border-orange-500/40 ring-1 ring-orange-500/20' : 'border-white/[0.06]'
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white/30 text-xs font-mono">{ticket.ticketNumber}</span>
                          <span className={`text-xs ${pr.color}`}>● {language === 'ar' ? pr.ar : pr.en}</span>
                        </div>
                        <p className="text-white font-medium truncate">{ticket.subject}</p>
                        {lastMsg && (
                          <p className="text-white/40 text-xs mt-1 truncate">
                            {lastMsg.senderRole === 'admin' || lastMsg.senderRole === 'moderator'
                              ? `🛡️ ${tr('الدعم', 'Support')}: `
                              : `${tr('أنت', 'You')}: `}
                            {lastMsg.content}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-white/30 text-xs">{(CATEGORY_MAP[ticket.category] ? (language === 'ar' ? CATEGORY_MAP[ticket.category].ar : CATEGORY_MAP[ticket.category].en) : ticket.category)}</span>
                          <span className="text-white/20">·</span>
                          <span className="text-white/30 text-xs">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${st.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {language === 'ar' ? st.ar : st.en}
                        </span>
                        {unread > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">
                            {language === 'ar' ? `${unread} جديد` : `${unread} new`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-[#0f1117] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">{tr('تذكرة جديدة', 'New Ticket')}</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">{tr('العنوان', 'Subject')}</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder={tr('اكتب عنوان التذكرة...', 'Write ticket subject...')}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-sm mb-1 block">{tr('التصنيف', 'Category')}</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-[#161928] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-orange-500/40"
                    >
                      <option value="general" className="bg-[#161928] text-white">{tr('عام', 'General')}</option>
                      <option value="payment" className="bg-[#161928] text-white">{tr('الدفع', 'Payment')}</option>
                      <option value="account" className="bg-[#161928] text-white">{tr('الحساب', 'Account')}</option>
                      <option value="transaction" className="bg-[#161928] text-white">{tr('المعاملة', 'Transaction')}</option>
                      <option value="technical" className="bg-[#161928] text-white">{tr('تقني', 'Technical')}</option>
                      <option value="other" className="bg-[#161928] text-white">{tr('أخرى', 'Other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/60 text-sm mb-1 block">{tr('الأولوية', 'Priority')}</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                      className="w-full px-4 py-3 bg-[#161928] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-orange-500/40"
                    >
                      <option value="low" className="bg-[#161928] text-white">{tr('منخفضة', 'Low')}</option>
                      <option value="medium" className="bg-[#161928] text-white">{tr('متوسطة', 'Medium')}</option>
                      <option value="high" className="bg-[#161928] text-white">{tr('مرتفعة', 'High')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-1 block">{tr('الرسالة', 'Message')}</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={2000}
                    rows={5}
                    placeholder={tr('اشرح المشكلة بالتفصيل...', 'Describe your issue in detail...')}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/40 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    className="flex-1 border-white/10 text-white/60"
                  >
                    {tr('إلغاء', 'Cancel')}
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !subject.trim() || !message.trim()}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    {creating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      tr('إرسال التذكرة', 'Submit Ticket')
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
