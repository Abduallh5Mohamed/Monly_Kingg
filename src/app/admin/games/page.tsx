'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Gamepad2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const games = [
  {
    id: 1,
    name: 'PUBG Mobile',
    category: 'Battle Royale',
    icon: '🎮',
    accounts: 156,
    revenue: '$12,450',
    status: 'active',
    trend: 'up',
    change: '+15%'
  },
  {
    id: 2,
    name: 'Valorant',
    category: 'FPS',
    icon: '🎯',
    accounts: 89,
    revenue: '$8,920',
    status: 'active',
    trend: 'up',
    change: '+8%'
  },
  {
    id: 3,
    name: 'FIFA 24',
    category: 'Sports',
    icon: '⚽',
    accounts: 134,
    revenue: '$15,680',
    status: 'active',
    trend: 'up',
    change: '+22%'
  },
  {
    id: 4,
    name: 'League of Legends',
    category: 'MOBA',
    icon: '⚔️',
    accounts: 78,
    revenue: '$6,340',
    status: 'active',
    trend: 'down',
    change: '-5%'
  },
  {
    id: 5,
    name: 'Fortnite',
    category: 'Battle Royale',
    icon: '🏰',
    accounts: 112,
    revenue: '$9,870',
    status: 'active',
    trend: 'up',
    change: '+12%'
  },
  {
    id: 6,
    name: 'Call of Duty',
    category: 'FPS',
    icon: '🔫',
    accounts: 95,
    revenue: '$11,230',
    status: 'active',
    trend: 'up',
    change: '+6%'
  },
  {
    id: 7,
    name: 'Apex Legends',
    category: 'Battle Royale',
    icon: '🎪',
    accounts: 67,
    revenue: '$5,450',
    status: 'active',
    trend: 'down',
    change: '-3%'
  },
  {
    id: 8,
    name: 'Genshin Impact',
    category: 'RPG',
    icon: '🌟',
    accounts: 145,
    revenue: '$18,900',
    status: 'active',
    trend: 'up',
    change: '+28%'
  },
];

export default function GamesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const totalGames = games.length;
  const totalAccounts = games.reduce((sum, game) => sum + game.accounts, 0);
  const totalRevenue = games.reduce((sum, game) => {
    const revenue = parseFloat(game.revenue.replace('$', '').replace(',', ''));
    return sum + revenue;
  }, 0);

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Games Management</h1>
          <p className="text-white/60">Manage available games and their accounts</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New Game
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total Games</p>
                <p className="text-2xl font-bold text-white">{totalGames}</p>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  All active
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Gamepad2 className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total Accounts</p>
                <p className="text-2xl font-bold text-white">{totalAccounts}</p>
                <p className="text-xs text-white/60 mt-1">Available for sale</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% this month
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Table */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white">All Games</CardTitle>
              <CardDescription className="text-white/60">Manage your game catalog</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Game</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Category</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Accounts</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Revenue</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Trend</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Status</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game) => (
                  <tr key={game.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xl">
                          {game.icon}
                        </div>
                        <span className="text-white font-medium">{game.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className="bg-white/10 text-white/80">
                        {game.category}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white">{game.accounts}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-medium">{game.revenue}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        {game.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <span className={game.trend === 'up' ? 'text-green-400' : 'text-red-400'}>
                          {game.change}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className="bg-green-500/20 text-green-400">
                        {game.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Games */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Top Performing Games</CardTitle>
          <CardDescription className="text-white/60">Best selling games this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {games
              .sort((a, b) => {
                const revenueA = parseFloat(a.revenue.replace('$', '').replace(',', ''));
                const revenueB = parseFloat(b.revenue.replace('$', '').replace(',', ''));
                return revenueB - revenueA;
              })
              .slice(0, 4)
              .map((game, index) => (
                <div key={game.id} className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                      {game.icon}
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      #{index + 1}
                    </Badge>
                  </div>
                  <h3 className="text-white font-medium mb-1">{game.name}</h3>
                  <p className="text-white/60 text-sm mb-2">{game.category}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold">{game.revenue}</span>
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {game.change}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
