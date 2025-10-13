'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit2, 
  Save, 
  X, 
  Camera,
  Shield,
  Wallet,
  Trophy,
  Clock,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfile {
  username: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  level: number;
  balance: number;
  joinDate: string;
  totalPurchases: number;
  totalSales: number;
  rating: number;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  const [profile, setProfile] = useState<UserProfile>({
    username: 'GamerPro123',
    email: 'gamer@example.com',
    phone: '+20 123 456 7890',
    address: 'Cairo, Egypt',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GamerPro123',
    level: 12,
    balance: 2480,
    joinDate: 'January 15, 2024',
    totalPurchases: 8,
    totalSales: 15,
    rating: 4.8
  });

  const [editedProfile, setEditedProfile] = useState(profile);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // TODO: Fetch user profile from API
    // For now using mock data
  }, []);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedProfile(profile);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    try {
      // TODO: Save profile to API
      console.log('Saving profile:', editedProfile);
      setProfile(editedProfile);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setEditedProfile({ ...editedProfile, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters!');
      return;
    }

    try {
      // TODO: Change password via API
      console.log('Changing password...');
      alert('Password changed successfully!');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    }
  };

  return (
    <UserDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#1a1f2e] to-[#0f1419] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5dc]">
              My Profile
            </h1>
            <p className="text-gray-400 mt-1">Manage your account information and settings</p>
          </div>
          {!isEditing && !isChangingPassword && (
            <Button
              onClick={handleEditToggle}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/30 transition-all"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cyan-500/50 shadow-lg shadow-cyan-500/30">
                    <img
                      src={avatarPreview || profile.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isEditing && (
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 bg-gradient-to-r from-cyan-500 to-cyan-600 p-2 rounded-full cursor-pointer hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-[#f5f5dc] mt-4">
                  {profile.username}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{profile.email}</p>
              </div>

              {/* Stats */}
              <div className="space-y-3 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-300">Level</span>
                  </div>
                  <span className="text-lg font-bold text-purple-400">{profile.level}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm text-gray-300">Balance</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">
                    {profile.balance.toLocaleString()} ج
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-gray-300">Rating</span>
                  </div>
                  <span className="text-lg font-bold text-cyan-400">
                    {profile.rating} ⭐
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-300">Member Since</span>
                  </div>
                  <span className="text-sm font-medium text-[#f5f5dc]">{profile.joinDate}</span>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-[#f5f5dc] mb-3">Activity Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-2xl font-bold text-cyan-400">{profile.totalPurchases}</div>
                    <div className="text-xs text-gray-400 mt-1">Purchases</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-2xl font-bold text-purple-400">{profile.totalSales}</div>
                    <div className="text-xs text-gray-400 mt-1">Sales</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#f5f5dc]">Personal Information</h3>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={handleEditToggle}
                      variant="outline"
                      className="border-white/10 text-gray-300 hover:bg-white/5"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Username
                  </label>
                  <input
                    type="text"
                    value={isEditing ? editedProfile.username : profile.username}
                    onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                    disabled={!isEditing}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={isEditing ? editedProfile.email : profile.email}
                    onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                    disabled={!isEditing}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={isEditing ? editedProfile.phone : profile.phone}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    disabled={!isEditing}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={isEditing ? editedProfile.address : profile.address}
                    onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                    disabled={!isEditing}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Security Settings Card */}
            <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#f5f5dc]">
                  <Lock className="w-5 h-5 inline mr-2" />
                  Security Settings
                </h3>
                {!isChangingPassword && !isEditing && (
                  <Button
                    onClick={() => setIsChangingPassword(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30"
                  >
                    Change Password
                  </Button>
                )}
              </div>

              {isChangingPassword ? (
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f5f5dc]"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f5f5dc]"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f5f5dc]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handlePasswordChange}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Update Password
                    </Button>
                    <Button
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      variant="outline"
                      className="border-white/10 text-gray-300 hover:bg-white/5"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <p className="text-[#f5f5dc] font-medium">Password</p>
                    <p className="text-sm text-gray-400 mt-1">Last changed 30 days ago</p>
                  </div>
                  <div className="text-gray-400">••••••••</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}
