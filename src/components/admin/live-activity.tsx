'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  amount?: string;
  timestamp: Date;
  type: 'win' | 'purchase' | 'registration' | 'withdrawal';
}

const mockActivities: Activity[] = [
  {
    id: '1',
    user: { name: 'Marmelada J.' },
    action: 'played dead man\'s chest and won a unique item. Who wants to...',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    type: 'win'
  },
  {
    id: '2',
    user: { name: 'Anderson V.' },
    action: 'I played btro roulette 3 times and won valuable prizes 3 times. It\'s very...',
    timestamp: new Date(Date.now() - 13 * 60 * 1000),
    type: 'win'
  },
  {
    id: '3',
    user: { name: 'Michaila J.' },
    action: '1d ago gdfgsafgj g sho fsvhsjgm jhvfnv zhjylfsjsvm jhjvhh',
    timestamp: new Date(Date.now() - 19 * 60 * 1000),
    type: 'purchase'
  },
  {
    id: '4',
    user: { name: 'Oleksii R.' },
    action: 'King roulette 3 times and won valuable prizes 3 times.',
    amount: '+$283',
    timestamp: new Date(Date.now() - 32 * 60 * 1000),
    type: 'win'
  },
];

export function LiveActivity() {
  return (
    <Card className="bg-[#1e2236] border-white/10 h-full">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white flex items-center gap-2">
          Live Chat
          <span className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <span key={i} className="w-8 h-8 rounded-full border-2 border-white/20 bg-gradient-to-br from-purple-500 to-pink-500" />
            ))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-4">
            {mockActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {activity.user.name.charAt(0)}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-white font-medium text-sm">{activity.user.name}</p>
                    <span className="text-white/40 text-xs">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {activity.action}
                  </p>
                  {activity.amount && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-semibold">
                      {activity.amount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
