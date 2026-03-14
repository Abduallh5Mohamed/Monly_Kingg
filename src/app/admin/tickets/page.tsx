'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Search, MessageSquare, CheckCircle2, AlertCircle,
  User, Store, ChevronDown, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  userRole: string;
  user: { _id: string; username: string; avatar?: string; email?: string; isSeller?: boolean };
  assignedTo?: { username: string; avatar?: string };
  messages: { content: string; senderRole: string; read: boolean; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bgCard: string }> = {
  open: { label: 'Open', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', bgCard: 'border-blue-500/20' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', bgCard: 'border-yellow-500/20' },
  answered: { label: 'Answered', color: 'text-green-400 bg-green-500/10 border-green-500/20', bgCard: 'border-green-500/20' },
  closed: { label: 'Closed', color: 'text-white/40 bg-white/5 border-white/10', bgCard: 'border-white/[0.06]' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'text-green-400', dot: 'bg-green-400' },
  medium: { label: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  high: { label: 'High', color: 'text-red-400', dot: 'bg-red-400' },
};

const CATEGORY_MAP: Record<string, string> = {
  general: 'General', payment: 'Payment', account: 'Account',
  transaction: 'Transaction', technical: 'Technical', other: 'Other',
};

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusCounts, setStatusCounts] = useState({ open: 0, in_progress: 0, answered: 0, closed: 0 });

  const [roleOpen, setRoleOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'user', label: 'Users' },
    { value: 'seller', label: 'Sellers' },
  ];
  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];


  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('userRole', roleFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/v1/tickets/admin/all?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data.tickets);
        setTotal(data.data.total);
        setStatusCounts(data.data.statusCounts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, roleFilter, priorityFilter, search]);

  useEffect(() => {
    if (!authLoading && user) fetchTickets();
  }, [user, authLoading, fetchTickets]);

  const totalOpen = statusCounts.open + statusCounts.in_progress;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-orange-400" />
            Support Tickets
          </h1>
          <p className="text-white/40 text-sm mt-1">Manage user and seller complaints</p>
        </div>
        {totalOpen > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-medium text-sm">{totalOpen} need attention</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'open', label: 'Open', count: statusCounts.open, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20', textColor: 'text-blue-400' },
          { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress, color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20', textColor: 'text-yellow-400' },
          { key: 'answered', label: 'Answered', count: statusCounts.answered, color: 'from-green-500/20 to-green-600/10 border-green-500/20', textColor: 'text-green-400' },
          { key: 'closed', label: 'Closed', count: statusCounts.closed, color: 'from-white/5 to-white/[0.02] border-white/10', textColor: 'text-white/40' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => { setStatusFilter(statusFilter === s.key ? 'all' : s.key); setPage(1); }}
            className={`bg-gradient-to-br ${s.color} border rounded-xl p-4 text-left transition-all ${statusFilter === s.key ? 'ring-1 ring-white/20' : ''}`}
          >
            <p className="text-white/50 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.textColor}`}>{s.count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by ticket number or subject..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/40 text-sm"
          />
        </div>
        {/* Role Filter */}
        <div className="relative">
          {roleOpen && <div className="fixed inset-0 z-40" onClick={() => setRoleOpen(false)} />}
          <button
            onClick={() => { setRoleOpen(o => !o); setPriorityOpen(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl text-white/80 text-sm cursor-pointer min-w-[130px] transition-colors"
          >
            <span className="flex-1 text-left">{roleOptions.find(o => o.value === roleFilter)?.label}</span>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${roleOpen ? 'rotate-180' : ''}`} />
          </button>
          {roleOpen && (
            <div className="absolute top-full mt-1 left-0 z-50 w-full bg-[#12162a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
              {roleOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setRoleFilter(opt.value); setPage(1); setRoleOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${roleFilter === opt.value ? 'text-orange-400 bg-orange-500/10' : 'text-white/70'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Filter */}
        <div className="relative">
          {priorityOpen && <div className="fixed inset-0 z-40" onClick={() => setPriorityOpen(false)} />}
          <button
            onClick={() => { setPriorityOpen(o => !o); setRoleOpen(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl text-white/80 text-sm cursor-pointer min-w-[140px] transition-colors"
          >
            <span className="flex-1 text-left">{priorityOptions.find(o => o.value === priorityFilter)?.label}</span>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${priorityOpen ? 'rotate-180' : ''}`} />
          </button>
          {priorityOpen && (
            <div className="absolute top-full mt-1 left-0 z-50 w-full bg-[#12162a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setPriorityFilter(opt.value); setPage(1); setPriorityOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${priorityFilter === opt.value
                      ? opt.value === 'high' ? 'text-red-400 bg-red-500/10'
                        : opt.value === 'medium' ? 'text-yellow-400 bg-yellow-500/10'
                          : opt.value === 'low' ? 'text-green-400 bg-green-500/10'
                            : 'text-orange-400 bg-orange-500/10'
                      : 'text-white/70'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20">
          <Inbox className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => {
            const st = STATUS_MAP[ticket.status] || STATUS_MAP.open;
            const pr = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.medium;
            const lastMsg = ticket.messages[ticket.messages.length - 1];
            const unreadFromUser = ticket.messages.filter(m =>
              (m.senderRole === 'user' || m.senderRole === 'seller') && !m.read
            ).length;

            return (
              <Link key={ticket._id} href={`/admin/tickets/${ticket._id}`}>
                <div className={`bg-[#0f1117]/80 border rounded-xl p-4 hover:bg-white/[0.02] transition-all cursor-pointer ${unreadFromUser > 0 ? 'border-orange-500/30 ring-1 ring-orange-500/10' : `border-white/[0.06]`
                  }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white/30 text-xs font-mono">{ticket.ticketNumber}</span>
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                        <span className="flex items-center gap-1 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`} />
                          <span className={pr.color}>{pr.label}</span>
                        </span>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-white/30 text-xs">{CATEGORY_MAP[ticket.category] || ticket.category}</span>
                      </div>

                      <p className="text-white font-medium truncate">{ticket.subject}</p>

                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          {ticket.userRole === 'seller' ? (
                            <Store className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <User className="w-3 h-3 text-cyan-400" />
                          )}
                          <span className={`text-xs ${ticket.userRole === 'seller' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                            {ticket.user.username}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ticket.userRole === 'seller'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                            {ticket.userRole}
                          </span>
                        </div>
                        <span className="text-white/20">·</span>
                        <span className="text-white/30 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.assignedTo && (
                          <>
                            <span className="text-white/20">·</span>
                            <span className="text-purple-400 text-xs">Assigned: {ticket.assignedTo.username}</span>
                          </>
                        )}
                      </div>

                      {lastMsg && (
                        <p className="text-white/30 text-xs mt-2 truncate">
                          {lastMsg.senderRole === 'admin' || lastMsg.senderRole === 'moderator' ? '🛡️ ' : '👤 '}
                          {lastMsg.content}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="text-white/20 text-xs">{formatTimeAgo(ticket.updatedAt)}</span>
                      {unreadFromUser > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                          {unreadFromUser}
                        </span>
                      )}
                      <span className="text-white/20 text-xs flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.messages.length}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="outline"
            size="sm"
            className="border-white/10 text-white/60"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-white/40 text-sm">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            variant="outline"
            size="sm"
            className="border-white/10 text-white/60"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
