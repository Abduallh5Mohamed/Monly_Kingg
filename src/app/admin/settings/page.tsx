'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/admin-api';
import {
  Save,
  Bell,
  Globe,
  Lock,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface SiteSettings {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  supportEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  autoBackup: boolean;
  userRegistration: boolean;
  orderNotifications: boolean;
  userRegNotifications: boolean;
  marketingEmails: boolean;
  browserNotifications: boolean;
  chatNotifications: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: '',
  siteUrl: '',
  siteDescription: '',
  supportEmail: '',
  supportPhone: '',
  maintenanceMode: false,
  autoBackup: true,
  userRegistration: true,
  orderNotifications: true,
  userRegNotifications: true,
  marketingEmails: false,
  browserNotifications: true,
  chatNotifications: true,
  twoFactorAuth: false,
  sessionTimeout: true,
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });

  // ── Fetch settings from API ──────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.get('/admin/settings');
      if (data.success && data.data) {
        setSettings({
          siteName: data.data.siteName ?? '',
          siteUrl: data.data.siteUrl ?? '',
          siteDescription: data.data.siteDescription ?? '',
          supportEmail: data.data.supportEmail ?? '',
          supportPhone: data.data.supportPhone ?? '',
          maintenanceMode: data.data.maintenanceMode ?? false,
          autoBackup: data.data.autoBackup ?? true,
          userRegistration: data.data.userRegistration ?? true,
          orderNotifications: data.data.orderNotifications ?? true,
          userRegNotifications: data.data.userRegNotifications ?? true,
          marketingEmails: data.data.marketingEmails ?? false,
          browserNotifications: data.data.browserNotifications ?? true,
          chatNotifications: data.data.chatNotifications ?? true,
          twoFactorAuth: data.data.twoFactorAuth ?? false,
          sessionTimeout: data.data.sessionTimeout ?? true,
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Save all settings ────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      const data = await adminApi.put('/admin/settings', settings);
      if (data.success) {
        toast({ title: 'Saved', description: 'Settings updated successfully' });
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!pw.current || !pw.newPw) {
      return toast({ title: 'Error', description: 'Fill all password fields', variant: 'destructive' });
    }
    if (pw.newPw !== pw.confirm) {
      return toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
    }
    if (pw.newPw.length < 8) {
      return toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' });
    }
    try {
      setChangingPw(true);
      const data = await adminApi.put('/admin/change-password', {
        currentPassword: pw.current,
        newPassword: pw.newPw,
      });
      if (data.success) {
        toast({ title: 'Done', description: 'Password updated successfully' });
        setPw({ current: '', newPw: '', confirm: '' });
      } else {
        toast({ title: 'Error', description: data.message || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to change password', variant: 'destructive' });
    } finally {
      setChangingPw(false);
    }
  };

  // helper to update a field
  const set = <K extends keyof SiteSettings>(key: K, val: SiteSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Manage your platform settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} className="border-white/10 text-white hover:bg-white/5">
            <RefreshCw className="mr-2 h-4 w-4" /> Reload
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-[#131620] border border-white/[0.06] p-1 flex flex-wrap h-auto">
          <TabsTrigger value="general" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <Globe className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <Bell className="mr-2 h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <Lock className="mr-2 h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ General Settings ═══════════ */}
        <TabsContent value="general" className="space-y-4">
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Platform Information</CardTitle>
              <CardDescription className="text-white/60">Update your platform&apos;s basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName" className="text-white">Site Name</Label>
                  <Input id="siteName" value={settings.siteName} onChange={e => set('siteName', e.target.value)} className="bg-white/5 border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteUrl" className="text-white">Site URL</Label>
                  <Input id="siteUrl" value={settings.siteUrl} onChange={e => set('siteUrl', e.target.value)} className="bg-white/5 border-white/[0.06] text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription" className="text-white">Site Description</Label>
                <Input id="siteDescription" value={settings.siteDescription} onChange={e => set('siteDescription', e.target.value)} className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail" className="text-white">Support Email</Label>
                  <Input id="supportEmail" type="email" value={settings.supportEmail} onChange={e => set('supportEmail', e.target.value)} className="bg-white/5 border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone" className="text-white">Support Phone</Label>
                  <Input id="supportPhone" value={settings.supportPhone} onChange={e => set('supportPhone', e.target.value)} className="bg-white/5 border-white/[0.06] text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">System Settings</CardTitle>
              <CardDescription className="text-white/60">Configure system behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Maintenance Mode</p>
                  <p className="text-white/60 text-sm">Put the site in maintenance mode</p>
                </div>
                <Switch checked={settings.maintenanceMode} onCheckedChange={v => set('maintenanceMode', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto Backup</p>
                  <p className="text-white/60 text-sm">Automatic daily database backups</p>
                </div>
                <Switch checked={settings.autoBackup} onCheckedChange={v => set('autoBackup', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">User Registration</p>
                  <p className="text-white/60 text-sm">Allow new user registrations</p>
                </div>
                <Switch checked={settings.userRegistration} onCheckedChange={v => set('userRegistration', v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ Notifications ═══════════ */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Email Notifications</CardTitle>
              <CardDescription className="text-white/60">Manage email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Order Notifications</p>
                  <p className="text-white/60 text-sm">Receive emails for new orders</p>
                </div>
                <Switch checked={settings.orderNotifications} onCheckedChange={v => set('orderNotifications', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">User Registrations</p>
                  <p className="text-white/60 text-sm">Get notified when users sign up</p>
                </div>
                <Switch checked={settings.userRegNotifications} onCheckedChange={v => set('userRegNotifications', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Marketing Emails</p>
                  <p className="text-white/60 text-sm">Promotional and marketing content</p>
                </div>
                <Switch checked={settings.marketingEmails} onCheckedChange={v => set('marketingEmails', v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Push Notifications</CardTitle>
              <CardDescription className="text-white/60">Configure push notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Browser Notifications</p>
                  <p className="text-white/60 text-sm">Show desktop notifications</p>
                </div>
                <Switch checked={settings.browserNotifications} onCheckedChange={v => set('browserNotifications', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Chat Messages</p>
                  <p className="text-white/60 text-sm">Notify for new chat messages</p>
                </div>
                <Switch checked={settings.chatNotifications} onCheckedChange={v => set('chatNotifications', v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ Security ═══════════ */}
        <TabsContent value="security" className="space-y-4">
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Authentication</CardTitle>
              <CardDescription className="text-white/60">Manage authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-white/60 text-sm">Add an extra layer of security</p>
                </div>
                <Switch checked={settings.twoFactorAuth} onCheckedChange={v => set('twoFactorAuth', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Session Timeout</p>
                  <p className="text-white/60 text-sm">Auto logout after 30 minutes</p>
                </div>
                <Switch checked={settings.sessionTimeout} onCheckedChange={v => set('sessionTimeout', v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Change Password</CardTitle>
              <CardDescription className="text-white/60">Update your admin password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-white">Current Password</Label>
                <Input id="currentPassword" type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-white">New Password</Label>
                <Input id="newPassword" type="password" value={pw.newPw} onChange={e => setPw(p => ({ ...p, newPw: e.target.value }))} className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPw}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {changingPw ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
