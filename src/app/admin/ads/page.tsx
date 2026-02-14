'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  BarChart3,
  MousePointer,
  Calendar,
  X,
  Upload,
  Save,
  AlertCircle,
  CheckCircle,
  Layout,
  Star,
} from 'lucide-react';

interface Ad {
  _id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  position: 'hero' | 'banner' | 'sidebar' | 'popup';
  priority: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate: string | null;
  endDate: string | null;
  clicks: number;
  views: number;
  createdBy: { username: string; email: string } | null;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  scheduled: number;
  totalClicks: number;
  totalViews: number;
}

const positionLabels: Record<string, string> = {
  hero: 'Hero Banner',
  banner: 'Dashboard Banner',
  sidebar: 'Sidebar',
  popup: 'Popup',
};

const positionColors: Record<string, string> = {
  hero: 'from-orange-500 to-red-500',
  banner: 'from-blue-500 to-cyan-500',
  sidebar: 'from-purple-500 to-pink-500',
  popup: 'from-yellow-500 to-orange-500',
};

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  active: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  inactive: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  scheduled: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
};

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: '',
    link: '',
    position: 'hero',
    priority: 0,
    status: 'active',
    startDate: '',
    endDate: '',
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchAds();
    fetchStats();
  }, [filter]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/ads?status=${filter}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setAds(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/ads/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
  };

  const openCreate = () => {
    setEditingAd(null);
    setForm({ title: '', description: '', image: '', link: '', position: 'hero', priority: 0, status: 'active', startDate: '', endDate: '' });
    setPreviewUrl('');
    setShowModal(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      description: ad.description,
      image: ad.image,
      link: ad.link,
      position: ad.position,
      priority: ad.priority,
      status: ad.status,
      startDate: ad.startDate ? new Date(ad.startDate).toISOString().split('T')[0] : '',
      endDate: ad.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : '',
    });
    setPreviewUrl(ad.image);
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'ads');
      const res = await fetch('/api/v1/uploads', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setForm(prev => ({ ...prev, image: data.data.url }));
      }
    } catch {}
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.title || !form.image) {
      setToast({ type: 'error', msg: 'Title and image are required' });
      return;
    }

    setSaving(true);
    try {
      const url = editingAd ? `/api/v1/ads/${editingAd._id}` : '/api/v1/ads';
      const method = editingAd ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          priority: Number(form.priority),
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', msg: editingAd ? 'Ad updated!' : 'Ad created!' });
        setShowModal(false);
        fetchAds();
        fetchStats();
      } else {
        setToast({ type: 'error', msg: data.message || 'Failed' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Network error' });
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/ads/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', msg: 'Ad deleted' });
        setDeleteId(null);
        fetchAds();
        fetchStats();
      }
    } catch {
      setToast({ type: 'error', msg: 'Failed to delete' });
    }
  };

  const toggleStatus = async (ad: Ad) => {
    const newStatus = ad.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`/api/v1/ads/${ad._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });
      fetchAds();
      fetchStats();
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border ${
          toast.type === 'success' ? 'bg-green-500/15 border-green-500/20 text-green-400' : 'bg-red-500/15 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            Ads Management
          </h1>
          <p className="text-sm text-white/40 mt-1">Create and manage advertisements for the user dashboard</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Ad
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Ads', value: stats.total, icon: ImageIcon, color: 'from-white/5 to-white/[0.02]', textColor: 'text-white' },
            { label: 'Active', value: stats.active, icon: Eye, color: 'from-green-500/10 to-green-600/5', textColor: 'text-green-400' },
            { label: 'Inactive', value: stats.inactive, icon: EyeOff, color: 'from-red-500/10 to-red-600/5', textColor: 'text-red-400' },
            { label: 'Scheduled', value: stats.scheduled, icon: Calendar, color: 'from-yellow-500/10 to-yellow-600/5', textColor: 'text-yellow-400' },
            { label: 'Total Clicks', value: stats.totalClicks, icon: MousePointer, color: 'from-cyan-500/10 to-cyan-600/5', textColor: 'text-cyan-400' },
            { label: 'Total Views', value: stats.totalViews, icon: BarChart3, color: 'from-purple-500/10 to-purple-600/5', textColor: 'text-purple-400' },
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.color} border border-white/[0.06] rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.textColor}`} />
                <span className="text-[11px] text-white/40 uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-2xl font-black ${stat.textColor}`}>{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'active', 'inactive', 'scheduled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
              filter === f
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Ads List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No ads found</p>
          <button onClick={openCreate} className="mt-4 text-orange-400 text-sm hover:underline">
            Create your first ad
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const sc = statusConfig[ad.status];
            const pc = positionColors[ad.position];
            return (
              <div
                key={ad._id}
                className="bg-[#111318] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-all group"
              >
                {/* Image Preview */}
                <div className="relative aspect-[16/9] overflow-hidden bg-white/[0.02]">
                  <img src={ad.image} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Position Badge */}
                  <span className={`absolute top-3 left-3 bg-gradient-to-r ${pc} text-white text-[10px] font-bold px-2.5 py-1 rounded-lg`}>
                    {positionLabels[ad.position]}
                  </span>

                  {/* Status Badge */}
                  <span className={`absolute top-3 right-3 ${sc.bg} ${sc.border} border ${sc.color} text-[10px] font-bold px-2 py-0.5 rounded-md capitalize`}>
                    {ad.status}
                  </span>

                  {/* Priority */}
                  {ad.priority > 0 && (
                    <span className="absolute bottom-3 right-3 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3" /> {ad.priority}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-white truncate">{ad.title}</h3>
                  {ad.description && (
                    <p className="text-xs text-white/30 mt-1 line-clamp-2">{ad.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[11px] text-white/30 flex items-center gap-1">
                      <MousePointer className="w-3 h-3" /> {ad.clicks} clicks
                    </span>
                    <span className="text-[11px] text-white/30 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {ad.views} views
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                    <button
                      onClick={() => toggleStatus(ad)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        ad.status === 'active'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      {ad.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {ad.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEdit(ad)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(ad._id)}
                      className="w-9 h-9 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/30 hover:bg-red-500/15 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#131620] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white">Delete Ad?</h3>
            <p className="text-sm text-white/40 mt-2">This action cannot be undone.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-[#131620] border border-white/[0.08] rounded-2xl max-w-lg w-full mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-lg font-bold text-white">{editingAd ? 'Edit Ad' : 'Create New Ad'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Image Upload */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">Ad Image *</label>
                <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-white/[0.02]">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80 transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" /> Change
                    </button>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center gap-2 text-white/30 hover:text-white/50 transition-all bg-white/[0.01]"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8" />
                        <span className="text-xs">Click to upload image</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ad title..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/20 placeholder:text-white/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/20 placeholder:text-white/20 resize-none"
                />
              </div>

              {/* Link */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Link URL</label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={form.link}
                    onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/20 placeholder:text-white/20"
                  />
                </div>
              </div>

              {/* Position & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Position</label>
                  <select
                    value={form.position}
                    onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    <option value="hero" className="bg-[#131620]">Hero Banner</option>
                    <option value="banner" className="bg-[#131620]">Dashboard Banner</option>
                    <option value="sidebar" className="bg-[#131620]">Sidebar</option>
                    <option value="popup" className="bg-[#131620]">Popup</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                    min={0}
                    max={100}
                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Status</label>
                <div className="flex gap-2">
                  {['active', 'inactive', 'scheduled'].map(s => (
                    <button
                      key={s}
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                        form.status === s
                          ? `${statusConfig[s].bg} ${statusConfig[s].color} ${statusConfig[s].border} border`
                          : 'bg-white/[0.03] text-white/30 border border-transparent hover:bg-white/[0.06]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 text-sm font-medium transition-all">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingAd ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
