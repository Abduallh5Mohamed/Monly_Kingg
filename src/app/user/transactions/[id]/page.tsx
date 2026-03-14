'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, CheckCircle2, AlertTriangle, Clock, Shield, Send } from 'lucide-react';
import { ensureCsrfToken } from '@/utils/csrf';

type TxStatus = 'waiting_seller' | 'waiting_buyer' | 'completed' | 'disputed' | 'refunded' | 'auto_confirmed';

interface Credential { key: string; value: string; }
interface GameField { name: string; type: 'email' | 'password' | 'phone' | 'number' | 'text'; required: boolean; placeholder?: string; }
interface Transaction {
  _id: string;
  amount: number;
  status: TxStatus;
  createdAt: string;
  autoConfirmAt?: string;
  credentials: Credential[];
  disputeReason?: string;
  resolvedNote?: string;
  timeline: { event: string; note: string; timestamp: string }[];
  listing: { _id: string; title: string; coverImage: string; price: number; game?: { _id: string; name: string; fields: GameField[] } };
  buyer: { _id: string; username: string; avatar?: string };
  seller: { _id: string; username: string; avatar?: string };
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Seller credential form (initialized from game fields)
  const [fields, setFields] = useState<Credential[]>([]);
  const [gameFieldsLoaded, setGameFieldsLoaded] = useState(false);

  // Dispute
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const fetchTx = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/transactions/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTx(data.data);
      else setError(data.message);
    } catch { setError('Failed to load transaction'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  // Initialize fields from game-defined fields when transaction loads
  useEffect(() => {
    if (tx && !gameFieldsLoaded) {
      const gameFields = tx.listing?.game?.fields;
      if (gameFields && gameFields.length > 0) {
        setFields(gameFields.map(gf => ({ key: gf.name, value: '' })));
      } else {
        setFields([{ key: '', value: '' }]);
      }
      setGameFieldsLoaded(true);
    }
  }, [tx, gameFieldsLoaded]);

  const isSeller = user && tx && user.id === tx.seller._id;
  const isBuyer = user && tx && user.id === tx.buyer._id;

  // ── Seller: submit credentials ───────────────────────────────────────────
  const handleSubmitCredentials = async () => {
    const gFields = tx?.listing?.game?.fields ?? [];
    if (gFields.length > 0) {
      // Validate game-defined required fields
      for (let i = 0; i < fields.length; i++) {
        const gf = gFields[i];
        if (gf?.required && !fields[i].value.trim()) {
          setError(`"${fields[i].key}" is required.`); return;
        }
      }
    } else {
      // Generic fallback validation
      if (fields.some(f => !f.key.trim() || !f.value.trim())) {
        setError('All fields must have a label and a value.'); return;
      }
    }
    setSubmitting(true); setError('');
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/transactions/${id}/credentials`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ credentials: fields }),
      });
      const data = await res.json();
      if (data.success) { setSuccess('Credentials sent!'); fetchTx(); }
      else setError(data.message);
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  // ── Buyer: confirm receipt ───────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!confirm('Are you sure you want to confirm? Funds will be released to the seller.')) return;
    setSubmitting(true); setError('');
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/transactions/${id}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-XSRF-TOKEN': csrfToken,
        },
      });
      const data = await res.json();
      if (data.success) { setSuccess('Confirmed! Funds released.'); fetchTx(); }
      else setError(data.message);
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  // ── Buyer: open dispute ──────────────────────────────────────────────────
  const handleDispute = async () => {
    if (!disputeReason.trim()) { setError('Please describe the issue.'); return; }
    setSubmitting(true); setError('');
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/transactions/${id}/dispute`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      if (data.success) { setSuccess('Dispute opened. Admin will review.'); setShowDisputeForm(false); fetchTx(); }
      else setError(data.message);
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  // ── Field helpers ────────────────────────────────────────────────────────
  const gameFields = tx?.listing?.game?.fields ?? [];
  const hasGameFields = gameFields.length > 0;
  const addField = () => setFields(f => [...f, { key: '', value: '' }]);
  const removeField = (i: number) => setFields(f => f.filter((_, idx) => idx !== i));
  const updateField = (i: number, k: keyof Credential, v: string) =>
    setFields(f => f.map((fld, idx) => idx === i ? { ...fld, [k]: v } : fld));

  const getInputType = (fieldType?: string) => {
    switch (fieldType) {
      case 'email': return 'email';
      case 'password': return 'password';
      case 'phone': return 'tel';
      case 'number': return 'number';
      default: return 'text';
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#060811] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  if (!tx) return (
    <div className="min-h-screen bg-[#060811] flex items-center justify-center text-white">
      <div className="text-center"><p className="text-white/50 mb-4">{error || 'Transaction not found'}</p>
        <Button onClick={() => router.back()}>Go Back</Button></div>
    </div>
  );

  const statusConfig: Record<TxStatus, { label: string; color: string; icon: React.ReactNode }> = {
    waiting_seller: { label: 'Waiting for Credentials', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', icon: <Clock className="w-4 h-4" /> },
    waiting_buyer: { label: 'Review Credentials', color: 'text-cyan-400   border-cyan-500/30   bg-cyan-500/10', icon: <Shield className="w-4 h-4" /> },
    completed: { label: 'Completed', color: 'text-green-400  border-green-500/30  bg-green-500/10', icon: <CheckCircle2 className="w-4 h-4" /> },
    auto_confirmed: { label: 'Auto-Confirmed', color: 'text-green-400  border-green-500/30  bg-green-500/10', icon: <CheckCircle2 className="w-4 h-4" /> },
    disputed: { label: 'Disputed – Under Review', color: 'text-red-400    border-red-500/30    bg-red-500/10', icon: <AlertTriangle className="w-4 h-4" /> },
    refunded: { label: 'Refunded', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: <CheckCircle2 className="w-4 h-4" /> },
  };
  const sc = statusConfig[tx.status];

  return (
    <div className="min-h-screen bg-[#060811]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-600/[0.03] blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex-1 truncate">{tx.listing.title}</h1>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${sc.color}`}>
            {sc.icon}{sc.label}
          </span>
        </div>

        {/* Alerts */}
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
        {success && <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm">{success}</div>}

        {/* Summary card */}
        <div className="bg-[#0a0d16]/80 border border-white/[0.06] rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-white/50 text-xs mb-1">Transaction ID</p>
              <p className="text-white/70 font-mono text-xs">{tx._id}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs mb-1">Amount</p>
              <p className="text-cyan-400 font-bold text-2xl">{tx.amount} EGP</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Buyer</p>
              <p className="text-white font-medium">{tx.buyer.username}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Seller</p>
              <p className="text-white font-medium">{tx.seller.username}</p>
            </div>
          </div>
          {tx.autoConfirmAt && tx.status === 'waiting_buyer' && (
            <div className="mt-3 p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl text-yellow-400 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              Auto-confirms at {new Date(tx.autoConfirmAt).toLocaleString()} if no action taken
            </div>
          )}
        </div>

        {/* ── SELLER ACTION: Submit Credentials ─────────────────────────────── */}
        {isSeller && tx.status === 'waiting_seller' && (
          <div className="bg-[#0a0d16]/80 border border-yellow-500/20 rounded-2xl p-5">
            <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
              <Send className="w-5 h-5 text-yellow-400" />
              Submit Account Credentials
            </h2>
            <p className="text-white/50 text-sm mb-4">Add the account details the buyer needs. These will only be visible to the buyer after submission.</p>

            <div className="space-y-3 mb-4">
              {hasGameFields ? (
                /* Game-defined fields: show labeled inputs */
                fields.map((f, i) => {
                  const gf = gameFields[i];
                  return (
                    <div key={i} className="space-y-1.5">
                      <label className="text-white/70 text-sm font-medium flex items-center gap-1">
                        {f.key}
                        {gf?.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={getInputType(gf?.type)}
                        placeholder={gf?.placeholder || `Enter ${f.key}`}
                        value={f.value}
                        onChange={e => updateField(i, 'value', e.target.value)}
                        required={gf?.required}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-yellow-500/40"
                      />
                    </div>
                  );
                })
              ) : (
                /* Fallback: generic key/value fields */
                fields.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder="Field name (e.g. Email)"
                      value={f.key}
                      onChange={e => updateField(i, 'key', e.target.value)}
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-yellow-500/40"
                    />
                    <input
                      placeholder="Value"
                      value={f.value}
                      onChange={e => updateField(i, 'value', e.target.value)}
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-yellow-500/40"
                    />
                    {fields.length > 1 && (
                      <button onClick={() => removeField(i)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3">
              {!hasGameFields && (
                <button onClick={addField} className="flex items-center gap-2 text-white/60 hover:text-white text-sm py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all">
                  <Plus className="w-4 h-4" /> Add Field
                </button>
              )}
              <Button onClick={handleSubmitCredentials} disabled={submitting}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold">
                {submitting ? 'Sending…' : 'Send Credentials'}
              </Button>
            </div>
          </div>
        )}

        {/* ── BUYER ACTION: Review Credentials ──────────────────────────────── */}
        {isBuyer && tx.status === 'waiting_buyer' && tx.credentials.length > 0 && (
          <div className="bg-[#0a0d16]/80 border border-cyan-500/20 rounded-2xl p-5">
            <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Account Credentials
            </h2>
            <p className="text-white/50 text-sm mb-4">Verify the credentials below. Confirm if they're correct, or open a dispute if something is wrong.</p>

            <div className="space-y-2 mb-5">
              {tx.credentials.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-xl p-3">
                  <span className="text-white/60 text-sm">{c.key}</span>
                  <span className="text-white font-medium text-sm font-mono bg-white/[0.04] px-3 py-1 rounded-lg select-all">{c.value}</span>
                </div>
              ))}
            </div>

            {!showDisputeForm ? (
              <div className="flex gap-3">
                <Button onClick={() => setShowDisputeForm(true)} variant="outline"
                  className="flex-1 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Dispute
                </Button>
                <Button onClick={handleConfirm} disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {submitting ? 'Confirming…' : 'Confirm Receipt'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue (e.g., wrong password, account already changed, etc.)"
                  rows={3}
                  className="w-full bg-white/[0.04] border border-red-500/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-red-500/40 resize-none"
                />
                <div className="flex gap-3">
                  <Button onClick={() => setShowDisputeForm(false)} variant="outline"
                    className="flex-1 bg-white/[0.03] border-white/10 text-white/70">Cancel</Button>
                  <Button onClick={handleDispute} disabled={submitting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold">
                    {submitting ? 'Submitting…' : 'Submit Dispute'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SELLER: waiting for buyer ──────────────────────────────────────── */}
        {isSeller && tx.status === 'waiting_buyer' && (
          <div className="bg-[#0a0d16]/80 border border-cyan-500/10 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Waiting for Buyer Confirmation
            </h2>
            <p className="text-white/50 text-sm">Your credentials have been sent. Funds will be released when the buyer confirms or after 48 hours.</p>
          </div>
        )}

        {/* ── Credentials view (disputed only — credentials are encrypted & hidden after completion) ── */}
        {['disputed'].includes(tx.status) && tx.credentials.length > 0 && isBuyer && (
          <div className="bg-[#0a0d16]/80 border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Account Credentials (Disputed)
            </h2>
            <div className="space-y-2">
              {tx.credentials.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-xl p-3">
                  <span className="text-white/60 text-sm">{c.key}</span>
                  <span className="text-white font-medium text-sm font-mono bg-white/[0.04] px-3 py-1 rounded-lg select-all">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Dispute/Resolution info (visible without credentials) ── */}
        {['completed', 'auto_confirmed', 'disputed', 'refunded'].includes(tx.status) && (tx.disputeReason || tx.resolvedNote) && (
          <div className="bg-[#0a0d16]/80 border border-white/[0.06] rounded-2xl p-5">
            {tx.disputeReason && (
              <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <p className="text-red-400 text-xs font-medium mb-1">Dispute reason</p>
                <p className="text-white/70 text-sm">{tx.disputeReason}</p>
              </div>
            )}
            {tx.resolvedNote && (
              <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                <p className="text-purple-400 text-xs font-medium mb-1">Admin resolution</p>
                <p className="text-white/70 text-sm">{tx.resolvedNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        {tx.timeline?.length > 0 && (
          <div className="bg-[#0a0d16]/80 border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4">Timeline</h2>
            <div className="space-y-3">
              {tx.timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-white/80 text-sm capitalize">{t.event.replace(/_/g, ' ')}</p>
                    {t.note && <p className="text-white/40 text-xs">{t.note}</p>}
                    <p className="text-white/30 text-xs">{new Date(t.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
