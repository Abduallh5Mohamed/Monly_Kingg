'use client';

import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function UserDashboardPage() {
  const stats = [
    {
      title: 'Total Messages',
      value: '48',
      change: '+12%',
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Active Chats',
      value: '12',
      change: '+5%',
      icon: Users,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Scheduled Meetings',
      value: '8',
      change: '+3%',
      icon: Calendar,
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Tasks Completed',
      value: '24',
      change: '+18%',
      icon: CheckCircle,
      color: 'from-green-500 to-green-600'
    }
  ];

  const recentChats = [
    {
      name: 'Jonathan',
      message: 'Lorem ipsum is simply text...',
      time: '9:00 AM',
      unread: 1,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jonathan',
      online: true
    },
    {
      name: 'Elizabeth Jan',
      message: 'It is a long established fact',
      time: '10:00 AM',
      unread: 0,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elizabeth',
      online: false
    },
    {
      name: 'Kevin',
      message: 'Contrary to popular belief...',
      time: '02:00 PM',
      unread: 2,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin',
      online: true
    }
  ];

  const upcomingEvents = [
    {
      title: 'Team Meeting',
      time: '10:00 AM - 11:00 AM',
      date: 'Today',
      color: 'bg-blue-500'
    },
    {
      title: 'Project Review',
      time: '2:00 PM - 3:30 PM',
      date: 'Today',
      color: 'bg-purple-500'
    },
    {
      title: 'Client Call',
      time: '4:00 PM - 5:00 PM',
      date: 'Tomorrow',
      color: 'bg-pink-500'
    }
  ];

  return (
    <UserDashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl shadow-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, Natalie! 👋</h1>
              <p className="text-white/80">Here's what's happening with your account today.</p>
            </div>
            <Button className="bg-white text-cyan-600 hover:bg-white/90 rounded-full px-6 font-bold">
              View Profile
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-[#131720]/80 to-[#1a1d2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-green-500 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-white/60 text-sm mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Chats */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#131720]/80 to-[#1a1d2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Chats</h2>
              <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                View All <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="space-y-4">
              {recentChats.map((chat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 hover:border-cyan-500/30 border border-transparent transition-all cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full"
                    />
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#131720]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{chat.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{chat.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">{chat.time}</p>
                    {chat.unread > 0 && (
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-cyan-500 text-white text-xs font-bold rounded-full">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-gradient-to-br from-[#131720]/80 to-[#1a1d2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-6">Upcoming Events</h2>
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => (
                <div
                  key={index}
                  className="border-l-4 border-cyan-500 pl-4 py-3 hover:bg-white/5 rounded-r-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 ${event.color} rounded-full mt-2`} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{event.title}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 rounded-full shadow-lg shadow-cyan-500/20">
              Schedule New Meeting
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-[#131720]/80 to-[#1a1d2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-xl flex flex-col gap-2 shadow-lg shadow-cyan-500/20">
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm">New Chat</span>
            </Button>
            <Button className="h-20 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 rounded-xl flex flex-col gap-2 shadow-lg shadow-cyan-600/20">
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Schedule</span>
            </Button>
            <Button className="h-20 bg-gradient-to-br from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 rounded-xl flex flex-col gap-2 shadow-lg shadow-cyan-400/20">
              <Users className="h-6 w-6" />
              <span className="text-sm">Create Group</span>
            </Button>
            <Button className="h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-xl flex flex-col gap-2 shadow-lg shadow-cyan-500/20">
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm">View Tasks</span>
            </Button>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}
