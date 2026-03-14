// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Lock, Eye, Activity,
  Globe, Users, Settings, FileText, Bell, Monitor, Wifi, WifiOff,
  Trash2, LogOut, Ban, Flag, Send, RefreshCw, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

const API = '/api/v1/admin/security';

async function apiFetch(path, options = {}) {
  const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '';
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf, ...options.headers },
    ...options,
  });
  return res.json();
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
  { id: 'ip-security', label: 'IP Security', icon: Globe },
  { id: 'login-attempts', label: 'Login Attempts', icon: Eye },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
  { id: 'controls', label: 'Controls', icon: Settings },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. OVERVIEW TAB
 * ═══════════════════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/overview').then(r => { if (r.success) setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;

  const d = data || { securityScore: 0, blockedAttacks: 0, activeSessions: 0, blockedIPsCount: 0, recentAlerts: [] };
  const scoreColor = d.securityScore >= 80 ? 'text-green-400' : d.securityScore >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Security Score" value={`${d.securityScore}%`} sub={d.securityScore >= 80 ? 'Excellent' : d.securityScore >= 50 ? 'Good' : 'Needs Attention'} icon={Shield} color="green" valueClass={scoreColor} />
        <StatCard title="Blocked Attacks" value={d.blockedAttacks} sub="Last 24 hours" icon={AlertTriangle} color="red" />
        <StatCard title="Active Sessions" value={d.activeSessions} sub="Currently online" icon={Activity} color="blue" />
        <StatCard title="Blocked IPs" value={d.blockedIPsCount} sub="Total banned" icon={Lock} color="purple" />
      </div>

      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Bell className="h-5 w-5 text-yellow-400" />Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {d.recentAlerts.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No recent alerts — all clear! ✅</p>
          ) : (
            <div className="space-y-2">
              {d.recentAlerts.map((a, i) => (
                <div key={a._id || i} className="p-3 rounded-lg bg-white/5 border border-white/[0.06] flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {a.status === 'blocked' ? <XCircle className="h-4 w-4 text-red-400 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />}
                    <div>
                      <p className="text-white text-sm font-medium">{a.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-white/50 text-xs">IP: {a.ip} · {a.username || 'Unknown'} · {a.attempts} attempts</p>
                    </div>
                  </div>
                  <span className="text-white/30 text-xs">{timeAgo(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. SESSIONS TAB
 * ═══════════════════════════════════════════════════════════════════════════ */
function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/sessions?page=${page}&limit=15`).then(r => {
      if (r.success) { setSessions(r.data.sessions); setPagination(r.data.pagination); }
      setLoading(false);
    });
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const terminate = async (userId, ip, createdAt) => {
    if (!confirm('Terminate this session?')) return;
    await apiFetch(`/sessions/${userId}/terminate`, {
      method: 'POST', body: JSON.stringify({ sessionIp: ip, sessionCreatedAt: createdAt })
    });
    load();
  };

  const forceLogout = async (userId, username) => {
    if (!confirm(`Force logout all sessions for ${username}?`)) return;
    await apiFetch(`/sessions/${userId}/force-logout`, { method: 'POST' });
    load();
  };

  const terminateAll = async () => {
    if (!confirm('⚠️ Terminate ALL sessions platform-wide? Everyone will be logged out!')) return;
    await apiFetch('/sessions/terminate-all', { method: 'POST' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-semibold">Active Sessions</h3>
        <Button onClick={terminateAll} size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs"><LogOut className="h-3 w-3 mr-1" />Terminate All</Button>
      </div>
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/[0.06] text-white/50 text-xs">
                <th className="p-3 text-left">User</th><th className="p-3 text-left">IP</th><th className="p-3 text-left">Device / Browser</th><th className="p-3 text-left">Login Time</th><th className="p-3 text-left">Actions</th>
              </tr></thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-3"><div><p className="text-white font-medium">{s.username}</p><p className="text-white/40 text-xs">{s.email}</p></div></td>
                    <td className="p-3 text-white/70 font-mono text-xs">{s.ip || 'N/A'}</td>
                    <td className="p-3 text-white/60 text-xs max-w-[200px] truncate">{parseUA(s.userAgent)}</td>
                    <td className="p-3 text-white/50 text-xs">{timeAgo(s.loginTime)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs" onClick={() => terminate(s._id, s.ip, s.loginTime)}><Trash2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 h-7 text-xs" onClick={() => forceLogout(s._id, s.username)}><LogOut className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-white/30">No active sessions</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. IP SECURITY TAB
 * ═══════════════════════════════════════════════════════════════════════════ */
function IPSecurityTab() {
  const [ips, setIps] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ip: '', ipRangeStart: '', ipRangeEnd: '', reason: '', type: 'blocked', mode: 'single' });

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/blocked-ips?page=${page}&limit=15&type=${filter}`).then(r => {
      if (r.success) { setIps(r.data.ips); setPagination(r.data.pagination); }
      setLoading(false);
    });
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const handleBlock = async (e) => {
    e.preventDefault();
    const body = { type: form.type, reason: form.reason };
    if (form.mode === 'single') body.ip = form.ip;
    else { body.ipRangeStart = form.ipRangeStart; body.ipRangeEnd = form.ipRangeEnd; }
    const r = await apiFetch('/blocked-ips', { method: 'POST', body: JSON.stringify(body) });
    if (r.success) { setForm({ ip: '', ipRangeStart: '', ipRangeEnd: '', reason: '', type: 'blocked', mode: 'single' }); load(); }
    else alert(r.message);
  };

  const unblock = async (id) => {
    if (!confirm('Remove this IP entry?')) return;
    await apiFetch(`/blocked-ips/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader><CardTitle className="text-white text-base">Add IP Rule</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleBlock} className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {['single', 'range'].map(m => (
                <Button key={m} type="button" size="sm" className={`text-xs ${form.mode === m ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`} onClick={() => setForm(f => ({ ...f, mode: m }))}>{m === 'single' ? 'Single IP' : 'IP Range'}</Button>
              ))}
              <span className="mx-2 border-l border-white/10" />
              {['blocked', 'whitelisted'].map(t => (
                <Button key={t} type="button" size="sm" className={`text-xs ${form.type === t ? (t === 'blocked' ? 'bg-red-600 text-white' : 'bg-green-600 text-white') : 'bg-white/5 text-white/60'}`} onClick={() => setForm(f => ({ ...f, type: t }))}>{t === 'blocked' ? '🚫 Block' : '✅ Whitelist'}</Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {form.mode === 'single' ? (
                <input value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} placeholder="IP Address (e.g. 192.168.1.1)" className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none focus:border-purple-500" required />
              ) : (
                <>
                  <input value={form.ipRangeStart} onChange={e => setForm(f => ({ ...f, ipRangeStart: e.target.value }))} placeholder="Start IP" className="flex-1 min-w-[150px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none focus:border-purple-500" required />
                  <input value={form.ipRangeEnd} onChange={e => setForm(f => ({ ...f, ipRangeEnd: e.target.value }))} placeholder="End IP" className="flex-1 min-w-[150px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none focus:border-purple-500" required />
                </>
              )}
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason" className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none focus:border-purple-500" />
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs">Add</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {['all', 'blocked', 'whitelisted'].map(f => (
          <Button key={f} size="sm" className={`text-xs ${filter === f ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`} onClick={() => { setFilter(f); setPage(1); }}>{f.charAt(0).toUpperCase() + f.slice(1)}</Button>
        ))}
      </div>

      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/[0.06] text-white/50 text-xs">
                <th className="p-3 text-left">IP</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Reason</th><th className="p-3 text-left">By</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Action</th>
              </tr></thead>
              <tbody>
                {ips.map(ip => (
                  <tr key={ip._id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-mono text-xs">{ip.ip || `${ip.ipRangeStart} - ${ip.ipRangeEnd}`}</td>
                    <td className="p-3"><Badge className={`text-xs ${ip.type === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{ip.type}</Badge></td>
                    <td className="p-3 text-white/60 text-xs max-w-[200px] truncate">{ip.reason || '-'}</td>
                    <td className="p-3 text-white/50 text-xs">{ip.blockedBy?.username || 'System'}</td>
                    <td className="p-3 text-white/40 text-xs">{timeAgo(ip.createdAt)}</td>
                    <td className="p-3"><Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-7 text-xs" onClick={() => unblock(ip._id)}>Remove</Button></td>
                  </tr>
                ))}
                {ips.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-white/30">No IP entries</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. LOGIN ATTEMPTS TAB
 * ═══════════════════════════════════════════════════════════════════════════ */
function LoginAttemptsTab() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/login-attempts?page=${page}&limit=20`).then(r => {
      if (r.success) { setEvents(r.data.events); setPagination(r.data.pagination); }
      setLoading(false);
    });
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const blockIP = async (ip) => {
    if (!confirm(`Block IP ${ip}?`)) return;
    await apiFetch(`/login-attempts/${encodeURIComponent(ip)}/block`, { method: 'POST' });
    load();
  };

  const flagIP = async (ip) => {
    await apiFetch(`/login-attempts/${encodeURIComponent(ip)}/flag`, { method: 'POST' });
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/[0.06] text-white/50 text-xs">
                <th className="p-3 text-left">IP Address</th><th className="p-3 text-left">Username</th><th className="p-3 text-left">Attempts</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Country</th><th className="p-3 text-left">Time</th><th className="p-3 text-left">Actions</th>
              </tr></thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e._id || i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-mono text-xs">{e.ip}</td>
                    <td className="p-3 text-white/70 text-xs">{e.username || '-'}</td>
                    <td className="p-3"><Badge className="bg-red-500/20 text-red-400 text-xs">{e.attempts}</Badge></td>
                    <td className="p-3"><Badge className={`text-xs ${e.status === 'blocked' ? 'bg-red-500/20 text-red-400' : e.status === 'flagged' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/60'}`}>{e.status}</Badge></td>
                    <td className="p-3 text-white/50 text-xs">{e.country || 'Unknown'}</td>
                    <td className="p-3 text-white/40 text-xs">{timeAgo(e.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-7 text-xs" onClick={() => blockIP(e.ip)} title="Block IP"><Ban className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-500/10 h-7 text-xs" onClick={() => flagIP(e.ip)} title="Flag"><Flag className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-white/30">No login attempts recorded</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. ALERTS TAB
 * ═══════════════════════════════════════════════════════════════════════════ */
function AlertsTab() {
  const [alerts, setAlerts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/alerts?page=${page}&limit=15&resolved=${showResolved}`).then(r => {
      if (r.success) { setAlerts(r.data.alerts); setPagination(r.data.pagination); }
      setLoading(false);
    });
  }, [page, showResolved]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id) => {
    await apiFetch(`/alerts/${id}/resolve`, { method: 'POST' });
    load();
  };

  const testWebhook = async (type) => {
    const r = await apiFetch('/alerts/test-webhook', { method: 'POST', body: JSON.stringify({ type }) });
    alert(r.data?.message || 'Failed');
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Send className="h-4 w-4" />Test Alert Webhooks</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => testWebhook('email')}>📧 Test Email</Button>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white text-xs" onClick={() => testWebhook('telegram')}>✈️ Test Telegram</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs" onClick={() => testWebhook('discord')}>🎮 Test Discord</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button size="sm" className={`text-xs ${!showResolved ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`} onClick={() => { setShowResolved(false); setPage(1); }}>Active</Button>
          <Button size="sm" className={`text-xs ${showResolved ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`} onClick={() => { setShowResolved(true); setPage(1); }}>All</Button>
        </div>
      </div>

      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="pt-4">
          {loading ? <LoadingSpinner /> : alerts.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No alerts</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a._id} className={`p-3 rounded-lg border flex items-start justify-between ${a.resolved ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex items-start gap-3">
                    {a.status === 'blocked' ? <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-white text-sm font-medium">{a.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-white/50 text-xs">IP: {a.ip} · {a.attempts} attempts · {a.country}</p>
                      {a.resolved && <p className="text-green-400/60 text-xs mt-1">Resolved by {a.resolvedBy?.username || 'admin'} · {timeAgo(a.resolvedAt)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs">{timeAgo(a.createdAt)}</span>
                    {!a.resolved && <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7" onClick={() => resolve(a._id)}>Resolve</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. AUDIT LOGS TAB
 * ═══════════════════════════════════════════════════════════════════════════ */
function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/audit-logs?page=${page}&limit=20&category=${category}&search=${search}`).then(r => {
      if (r.success) { setLogs(r.data.logs); setPagination(r.data.pagination); }
      setLoading(false);
    });
  }, [page, category, search]);

  useEffect(() => { load(); }, [load]);

  const cats = ['all', 'auth', 'ip_management', 'settings', 'session', 'security', 'user_management'];
  const catColors = { auth: 'bg-blue-500/20 text-blue-400', ip_management: 'bg-red-500/20 text-red-400', settings: 'bg-purple-500/20 text-purple-400', session: 'bg-green-500/20 text-green-400', security: 'bg-yellow-500/20 text-yellow-400', user_management: 'bg-cyan-500/20 text-cyan-400' };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {cats.map(c => (
          <Button key={c} size="sm" className={`text-xs ${category === c ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`} onClick={() => { setCategory(c); setPage(1); }}>{c.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase())}</Button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-white text-xs w-40 outline-none focus:border-purple-500 placeholder:text-white/30" />
        </div>
      </div>

      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/[0.06] text-white/50 text-xs">
                <th className="p-3 text-left">Action</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Admin</th><th className="p-3 text-left">Details</th><th className="p-3 text-left">IP</th><th className="p-3 text-left">Time</th>
              </tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l._id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-3 text-white text-xs font-medium">{l.action.replace(/_/g, ' ')}</td>
                    <td className="p-3"><Badge className={`text-xs ${catColors[l.category] || 'bg-white/10 text-white/60'}`}>{l.category}</Badge></td>
                    <td className="p-3 text-white/70 text-xs">{l.performedBy?.username || '-'}</td>
                    <td className="p-3 text-white/50 text-xs max-w-[250px] truncate">{l.details}</td>
                    <td className="p-3 text-white/40 font-mono text-xs">{l.ip || '-'}</td>
                    <td className="p-3 text-white/40 text-xs">{timeAgo(l.createdAt)}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-white/30">No audit logs</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 7. SECURITY CONTROLS TAB
 * ═══════════════════════════════════════════════════════════════════════════ */
function ControlsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/settings').then(r => { if (r.success) setSettings(r.data); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const r = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(settings) });
    setSaving(false);
    if (r.success) alert('Settings saved!');
    else alert(r.message || 'Failed');
  };

  if (loading || !settings) return <LoadingSpinner />;

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rate Limiting */}
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardHeader><CardTitle className="text-white text-base">⚡ Rate Limiting</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SettingsField label="Max Requests" value={settings.rateLimitMaxRequests} onChange={v => update('rateLimitMaxRequests', parseInt(v))} type="number" />
            <SettingsField label="Window (minutes)" value={settings.rateLimitWindowMinutes} onChange={v => update('rateLimitWindowMinutes', parseInt(v))} type="number" />
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardHeader><CardTitle className="text-white text-base">🔑 Password Policy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SettingsField label="Min Length" value={settings.passwordMinLength} onChange={v => update('passwordMinLength', parseInt(v))} type="number" />
            <SettingsToggle label="Require Uppercase" value={settings.passwordRequireUppercase} onChange={v => update('passwordRequireUppercase', v)} />
            <SettingsToggle label="Require Numbers" value={settings.passwordRequireNumbers} onChange={v => update('passwordRequireNumbers', v)} />
            <SettingsToggle label="Require Special Chars" value={settings.passwordRequireSpecial} onChange={v => update('passwordRequireSpecial', v)} />
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardHeader><CardTitle className="text-white text-base">🛡️ Two-Factor Authentication</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {['disabled', 'optional', 'required'].map(v => (
                <Button key={v} size="sm" className={`text-xs ${settings.twoFactorEnforcement === v ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`} onClick={() => update('twoFactorEnforcement', v)}>{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session */}
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardHeader><CardTitle className="text-white text-base">⏱️ Session Expiration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SettingsField label="Expiration (hours)" value={settings.sessionExpirationHours} onChange={v => update('sessionExpirationHours', parseInt(v))} type="number" />
            <SettingsField label="Max Active Sessions" value={settings.maxActiveSessions} onChange={v => update('maxActiveSessions', parseInt(v))} type="number" />
          </CardContent>
        </Card>

        {/* Webhooks */}
        <Card className="bg-[#131620] border-white/[0.06] lg:col-span-2">
          <CardHeader><CardTitle className="text-white text-base">🔔 Alert Webhooks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SettingsField label="Alert Email" value={settings.alertEmail} onChange={v => update('alertEmail', v)} placeholder="security@example.com" />
            <SettingsField label="Telegram Bot Token" value={settings.alertTelegramBotToken} onChange={v => update('alertTelegramBotToken', v)} placeholder="bot123:ABC..." />
            <SettingsField label="Telegram Chat ID" value={settings.alertTelegramChatId} onChange={v => update('alertTelegramChatId', v)} placeholder="-1001234567890" />
            <SettingsField label="Discord Webhook URL" value={settings.alertDiscordWebhookUrl} onChange={v => update('alertDiscordWebhookUrl', v)} placeholder="https://discord.com/api/webhooks/..." />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}{saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SHARED COMPONENTS
 * ═══════════════════════════════════════════════════════════════════════════ */
function StatCard({ title, value, sub, icon: Icon, color, valueClass }) {
  const bg = { green: 'bg-green-500/20', red: 'bg-red-500/20', blue: 'bg-blue-500/20', purple: 'bg-purple-500/20' }[color];
  const ic = { green: 'text-green-400', red: 'text-red-400', blue: 'text-blue-400', purple: 'text-purple-400' }[color];
  return (
    <Card className="bg-[#131620] border-white/[0.06]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div><p className="text-white/60 text-sm mb-1">{title}</p><p className={`text-2xl font-bold ${valueClass || 'text-white'}`}>{value}</p><p className="text-xs text-white/50 mt-1">{sub}</p></div>
          <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`h-6 w-6 ${ic}`} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSpinner() { return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" /></div>; }

function Pagination({ pagination, page, setPage }) {
  if (!pagination?.totalPages || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40 text-xs">Page {page} of {pagination.totalPages} ({pagination.total} total)</span>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-white/60 h-7"><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)} className="text-white/60 h-7"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function SettingsField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-white/70 text-sm shrink-0">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm w-full max-w-[250px] outline-none focus:border-purple-500 placeholder:text-white/30" />
    </div>
  );
}

function SettingsToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-white/70 text-sm">{label}</label>
      <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-purple-600' : 'bg-white/10'}`}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function timeAgo(date) {
  if (!date) return '-';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function parseUA(ua) {
  if (!ua) return 'Unknown';
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)/i)?.[1] || 'Browser';
  const os = ua.match(/(Windows|Mac|Linux|Android|iOS|iPhone)/i)?.[1] || 'Unknown OS';
  return `${browser} · ${os}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN PAGE
 * ═══════════════════════════════════════════════════════════════════════════ */
export default function SecurityPage() {
  const [tab, setTab] = useState('overview');

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <OverviewTab />;
      case 'sessions': return <SessionsTab />;
      case 'ip-security': return <IPSecurityTab />;
      case 'login-attempts': return <LoginAttemptsTab />;
      case 'alerts': return <AlertsTab />;
      case 'audit-logs': return <AuditLogsTab />;
      case 'controls': return <ControlsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Security Center</h1>
        <p className="text-white/60">Monitor and manage platform security</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {renderTab()}
    </div>
  );
}
