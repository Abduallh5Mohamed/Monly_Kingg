'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Bell, 
  Mail, 
  Globe, 
  Lock,
  Palette,
  Database,
  Zap,
  DollarSign
} from 'lucide-react';

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Manage your platform settings and preferences</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full md:w-auto">
          <Save className="mr-2 h-4 w-4" />
          Save All Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-[#131620] border border-white/[0.06] p-1 flex flex-wrap h-auto">
          <TabsTrigger value="general" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <Globe className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <Lock className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500">
            <DollarSign className="mr-2 h-4 w-4" />
            Payment
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Platform Information</CardTitle>
              <CardDescription className="text-white/60">Update your platform's basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName" className="text-white">Site Name</Label>
                  <Input id="siteName" defaultValue="Monly King" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteUrl" className="text-white">Site URL</Label>
                  <Input id="siteUrl" defaultValue="https://monlyking.com" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription" className="text-white">Site Description</Label>
                <Input id="siteDescription" defaultValue="Premium gaming accounts marketplace" className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail" className="text-white">Support Email</Label>
                  <Input id="supportEmail" type="email" defaultValue="support@monlyking.com" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone" className="text-white">Support Phone</Label>
                  <Input id="supportPhone" defaultValue="+20 123 456 7890" className="bg-white/5 border-white/[0.06] text-white" />
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
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto Backup</p>
                  <p className="text-white/60 text-sm">Automatic daily database backups</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">User Registration</p>
                  <p className="text-white/60 text-sm">Allow new user registrations</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
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
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">User Registrations</p>
                  <p className="text-white/60 text-sm">Get notified when users sign up</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Marketing Emails</p>
                  <p className="text-white/60 text-sm">Promotional and marketing content</p>
                </div>
                <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
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
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Chat Messages</p>
                  <p className="text-white/60 text-sm">Notify for new chat messages</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
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
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Session Timeout</p>
                  <p className="text-white/60 text-sm">Auto logout after 30 minutes</p>
                </div>
                <Switch defaultChecked />
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
                <Input id="currentPassword" type="password" className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-white">New Password</Label>
                <Input id="newPassword" type="password" className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <Input id="confirmPassword" type="password" className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Theme Settings</CardTitle>
              <CardDescription className="text-white/60">Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Theme Color</Label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 cursor-pointer ring-2 ring-white" />
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 cursor-pointer hover:ring-2 hover:ring-white" />
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 cursor-pointer hover:ring-2 hover:ring-white" />
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 cursor-pointer hover:ring-2 hover:ring-white" />
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 cursor-pointer hover:ring-2 hover:ring-white" />
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 cursor-pointer hover:ring-2 hover:ring-white" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Dark Mode</p>
                  <p className="text-white/60 text-sm">Currently enabled</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Payment Methods</CardTitle>
              <CardDescription className="text-white/60">Configure payment gateways</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">PayPal</p>
                  <p className="text-white/60 text-sm">Accept PayPal payments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Stripe</p>
                  <p className="text-white/60 text-sm">Accept credit card payments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Cryptocurrency</p>
                  <p className="text-white/60 text-sm">Accept Bitcoin, Ethereum, etc.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Commission Settings</CardTitle>
              <CardDescription className="text-white/60">Set platform commission rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commission" className="text-white">Platform Commission (%)</Label>
                <Input id="commission" type="number" defaultValue="10" className="bg-white/5 border-white/[0.06] text-white" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
