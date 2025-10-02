'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { adminApi } from '@/lib/admin-api';
import { Loader2, Activity as ActivityIcon } from 'lucide-react';

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

    // Set up polling for real-time updates
    const interval = setInterval(fetchRecentActivity, 30000); // Update every 30 seconds
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
        return 'from-green-500 to-emerald-500';
      case 'login':
        return activity.success ? 'from-blue-500 to-cyan-500' : 'from-red-500 to-pink-500';
      case 'verify':
        return 'from-purple-500 to-violet-500';
      case 'logout':
        return 'from-gray-500 to-slate-500';
      case 'forgot_password':
        return 'from-yellow-500 to-orange-500';
      case 'reset_password':
        return 'from-indigo-500 to-blue-500';
      case 'role_update':
        return 'from-pink-500 to-rose-500';
      default:
        return 'from-blue-500 to-purple-500';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return '👋';
      case 'login':
        return '🔐';
      case 'verify':
        return '✅';
      case 'logout':
        return '👋';
      case 'forgot_password':
        return '🔑';
      case 'reset_password':
        return '🔒';
      case 'role_update':
        return '⚡';
      default:
        return '📝';
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
      <Card className="bg-[#1e2236] border-white/10 h-full">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1e2236] border-white/10 h-full">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          Live Activity
          <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
            {activities.length} recent
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <ActivityIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No recent activity</p>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div key={`${activity.type}-${activity.timestamp}-${index}`} className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getActivityColor(activity)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    <span className="text-lg">
                      {getActivityIcon(activity.type)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-white font-medium text-sm">{activity.user.username}</p>
                        <p className="text-white/40 text-xs">{activity.user.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-white/40 text-xs">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                        {activity.success !== undefined && (
                          <div className={`text-xs px-2 py-1 rounded-full mt-1 ${activity.success
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                            }`}>
                            {activity.success ? 'Success' : 'Failed'}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {formatActivityDescription(activity)}
                    </p>
                    {activity.user.role === 'admin' && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-semibold">
                        🛡️ Admin
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
