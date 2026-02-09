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
  Gamepad2,
  Crosshair,
  Trophy,
  Swords,
  Castle,
  Target,
  Flame,
  Star,
  Users,
  DollarSign
} from 'lucide-react';

const gameIcons: Record<string, React.ReactNode> = {
  'PUBG Mobile': <Gamepad2 className="h-5 w-5 text-white/70" />,
  'Valorant': <Crosshair className="h-5 w-5 text-white/70" />,
  'FIFA 24': <Trophy className="h-5 w-5 text-white/70" />,
  'League of Legends': <Swords className="h-5 w-5 text-white/70" />,
  'Fortnite': <Castle className="h-5 w-5 text-white/70" />,
  'Call of Duty': <Target className="h-5 w-5 text-white/70" />,
  'Apex Legends': <Flame className="h-5 w-5 text-white/70" />,
  'Genshin Impact': <Star className="h-5 w-5 text-white/70" />,
};

const games = [
  { id: 1, name: 'PUBG Mobile', category: 'Battle Royale', accounts: 156, revenue: '$12,450', status: 'active', trend: 'up', change: '+15%' },
  { id: 2, name: 'Valorant', category: 'FPS', accounts: 89, revenue: '$8,920', status: 'active', trend: 'up', change: '+8%' },
  { id: 3, name: 'FIFA 24', category: 'Sports', accounts: 134, revenue: '$15,680', status: 'active', trend: 'up', change: '+22%' },
  { id: 4, name: 'League of Legends', category: 'MOBA', accounts: 78, revenue: '$6,340', status: 'active', trend: 'down', change: '-5%' },
  { id: 5, name: 'Fortnite', category: 'Battle Royale', accounts: 112, revenue: '$9,870', status: 'active', trend: 'up', change: '+12%' },
  { id: 6, name: 'Call of Duty', category: 'FPS', accounts: 95, revenue: '$11,230', status: 'active', trend: 'up', change: '+6%' },
  { id: 7, name: 'Apex Legends', category: 'Battle Royale', accounts: 67, revenue: '$5,450', status: 'active', trend: 'down', change: '-3%' },
  { id: 8, name: 'Genshin Impact', category: 'RPG', accounts: 145, revenue: '$18,900', status: 'active', trend: 'up', change: '+28%' },
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
          <h1 className="text-2xl font-bold text-white mb-1">Games Management</h1>
          <p className="text-white/40 text-sm">Manage available games and their accounts</p>
        </div>
        <Button className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.06] w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New Game
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Total Games</p>
                <p className="text-2xl font-bold text-white">{totalGames}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  All active
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Total Accounts</p>
                <p className="text-2xl font-bold text-white">{totalAccounts}</p>
                <p className="text-xs text-white/40 mt-1">Available for sale</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-400">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% this month
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Table */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white text-sm font-semibold">All Games</CardTitle>
              <CardDescription className="text-white/40 text-xs">Manage your game catalog</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm h-9 rounded-lg"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Game</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Accounts</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Revenue</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Trend</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game) => (
                  <tr key={game.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          {gameIcons[game.name] || <Gamepad2 className="h-5 w-5 text-white/70" />}
                        </div>
                        <span className="text-white/90 font-medium text-sm">{game.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className="bg-white/[0.04] text-white/60 border border-white/[0.06] font-normal text-xs">
                        {game.category}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/80 text-sm">{game.accounts}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/90 font-medium text-sm">{game.revenue}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        {game.trend === 'up' ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className={`text-xs font-medium ${game.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {game.change}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs font-medium">
                        {game.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-white/40 hover:text-white/80 hover:bg-white/[0.04]">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-white/40 hover:text-white/80 hover:bg-white/[0.04]">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10">
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
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] py-4">
          <CardTitle className="text-white text-sm font-semibold">Top Performing Games</CardTitle>
          <CardDescription className="text-white/40 text-xs">Best selling games this month</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {games
              .sort((a, b) => {
                const revenueA = parseFloat(a.revenue.replace('$', '').replace(',', ''));
                const revenueB = parseFloat(b.revenue.replace('$', '').replace(',', ''));
                return revenueB - revenueA;
              })
              .slice(0, 4)
              .map((game, index) => (
                <div key={game.id} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      {gameIcons[game.name] || <Gamepad2 className="h-5 w-5 text-white/70" />}
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                  <h3 className="text-white/90 font-medium text-sm mb-0.5">{game.name}</h3>
                  <p className="text-white/40 text-xs mb-3">{game.category}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold text-sm">{game.revenue}</span>
                    <span className="text-emerald-400 text-xs flex items-center gap-1">
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
