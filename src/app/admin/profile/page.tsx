'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Edit,
  Camera,
  Save,
  Key,
  Bell,
  Activity,
  Lock,
  Package,
  MessageCircle,
  Settings
} from 'lucide-react';

const recentActivity = [
  { action: 'Updated user permissions', time: '2 hours ago', type: 'security' },
  { action: 'Created new product listing', time: '5 hours ago', type: 'product' },
  { action: 'Responded to customer chat', time: '1 day ago', type: 'support' },
  { action: 'Changed password', time: '3 days ago', type: 'security' },
  { action: 'Updated site settings', time: '5 days ago', type: 'settings' },
];

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Admin Profile</h1>
          <p className="text-white/60">Manage your account information and settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="bg-[#131620] border-white/[0.06] lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                  MK
                </div>
                <Button 
                  size="icon" 
                  className="absolute bottom-0 right-0 rounded-full bg-purple-600 hover:bg-purple-700 w-10 h-10"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Monly King</h2>
              <p className="text-white/60 mb-3">Admin</p>
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white mb-4">
                <Shield className="mr-1 h-3 w-3" />
                Super Admin
              </Badge>
              
              <div className="w-full space-y-3 mt-4">
                <div className="flex items-center gap-3 text-white/60">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">admin@monlyking.com</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">+20 123 456 7890</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Cairo, Egypt</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Joined Jan 2024</span>
                </div>
              </div>

              <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">Personal Information</CardTitle>
              <CardDescription className="text-white/60">Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-white">First Name</Label>
                  <Input id="firstName" defaultValue="Monly" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-white">Last Name</Label>
                  <Input id="lastName" defaultValue="King" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input id="email" type="email" defaultValue="admin@monlyking.com" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">Phone Number</Label>
                  <Input id="phone" defaultValue="+20 123 456 7890" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white">Bio</Label>
                <Input id="bio" defaultValue="Platform administrator and founder" className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-white/60">Manage your password and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-white">Current Password</Label>
                <Input id="currentPassword" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" className="bg-white/5 border-white/[0.06] text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-white">New Password</Label>
                  <Input id="newPassword" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" className="bg-white/5 border-white/[0.06] text-white" />
                </div>
              </div>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Key className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-white/60">Your latest actions on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'security' ? 'bg-red-500/10' :
                      activity.type === 'product' ? 'bg-blue-500/10' :
                      activity.type === 'support' ? 'bg-emerald-500/10' :
                      'bg-violet-500/10'
                    }`}>
                      {activity.type === 'security' ? <Lock className="h-4 w-4 text-red-400" /> :
                       activity.type === 'product' ? <Package className="h-4 w-4 text-blue-400" /> :
                       activity.type === 'support' ? <MessageCircle className="h-4 w-4 text-emerald-400" /> :
                       <Settings className="h-4 w-4 text-violet-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{activity.action}</p>
                      <p className="text-white/40 text-xs mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
