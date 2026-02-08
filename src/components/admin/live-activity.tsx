'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { adminApi } from '@/lib/admin-api';
import {
  Loader2,
  Activity as ActivityIcon,
  UserPlus,
  LogIn,
  CheckCircle,
  LogOut,
  Key,
  Lock,
  Zap,
  FileText,
  Shield
} from 'lucide-react';

interface Activity {
  type: string;
  user: {
    email: string;
    username: string;
    role: string;
  };
  timestamp: string;
  description: string;
  success?: boolean;
  ip?: string;
}

export function LiveActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
    const interval = setInterval(fetchRecentActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getRecentActivity(15);
      if (response.success) {
        setActivities(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (activity: Activity) => {
    switch (activity.type) {
      case 'registration':
        return 'from-emerald-500 to-green-600';
      case 'login':
        return activity.success ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-rose-600';
      case 'verify':
        return 'from-violet-500 to-purple-600';
      case 'logout':
        return 'from-slate-400 to-slate-500';
      case 'forgot_password':
        return 'from-amber-500 to-orange-600';
      case 'reset_password':
        return 'from-indigo-500 to-blue-600';
      case 'role_update':
        return 'from-pink-500 to-rose-600';
      default:
        return 'from-blue-500 to-violet-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <UserPlus className="h-4 w-4 text-white" />;
      case 'login':
        return <LogIn className="h-4 w-4 text-white" />;
      case 'verify':
        return <CheckCircle className="h-4 w-4 text-white" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-white" />;
      case 'forgot_password':
        return <Key className="h-4 w-4 text-white" />;
      case 'reset_password':
        return <Lock className="h-4 w-4 text-white" />;
      case 'role_update':
        return <Zap className="h-4 w-4 text-white" />;
      default:
        return <FileText className="h-4 w-4 text-white" />;
    }
  };

  const formatActivityDescription = (activity: Activity) => {
    const baseDesc = activity.description;
    if (activity.ip) {
      return `${baseDesc} (IP: ${activity.ip})`;
    }
    return baseDesc;
  };

  if (loading && activities.length === 0) {
    return (
      <Card className="bg-[#131620] border-white/[0.06] h-full">
        <CardHeader className="border-b border-white/[0.06] py-4">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-white/40" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#131620] border-white/[0.06] h-full">
      <CardHeader className="border-b border-white/[0.06] py-4">
        <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-white/40" />
          Live Activity
          <span className="ml-auto text-[10px] font-medium bg-white/[0.06] text-white/50 px-2 py-0.5 rounded">
            {activities.length} recent
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <ActivityIcon className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No recent activity</p>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div key={`${activity.type}-${activity.timestamp}-${index}`} className="flex gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.04]">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getActivityColor(activity)} flex items-center justify-center flex-shrink-0`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="min-w-0">
                        <p className="text-white/90 font-medium text-sm truncate">{activity.user.username}</p>
                        <p className="text-white/30 text-[11px] truncate">{activity.user.email}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-white/30 text-[11px]">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                        {activity.success !== undefined && (
                          <div className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 font-medium ${activity.success
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                            }`}>
                            {activity.success ? 'Success' : 'Failed'}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-white/40 text-xs leading-relaxed">
                      {formatActivityDescription(activity)}
                    </p>
                    {activity.user.role === 'admin' && (
                      <div className="mt-1.5 inline-flex items-center gap-1 bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
