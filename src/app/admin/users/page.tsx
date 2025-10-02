'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Filter, MoreVertical, Edit, Trash2, Ban } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const users = [
  { id: 1, username: 'Ahmed Hassan', email: 'ahmed@example.com', role: 'user', status: 'active', totalSpent: 1250.00, orders: 12, joinedAt: '2024-01-15' },
  { id: 2, username: 'Sara Mohamed', email: 'sara@example.com', role: 'user', status: 'active', totalSpent: 2340.50, orders: 23, joinedAt: '2024-02-10' },
  { id: 3, username: 'Khaled Ali', email: 'khaled@example.com', role: 'user', status: 'suspended', totalSpent: 450.00, orders: 5, joinedAt: '2024-03-05' },
  { id: 4, username: 'Mona Ibrahim', email: 'mona@example.com', role: 'admin', status: 'active', totalSpent: 0, orders: 0, joinedAt: '2023-12-01' },
  { id: 5, username: 'Omar Youssef', email: 'omar@example.com', role: 'user', status: 'active', totalSpent: 890.00, orders: 8, joinedAt: '2024-04-12' },
  { id: 6, username: 'Layla Ahmed', email: 'layla@example.com', role: 'user', status: 'active', totalSpent: 3200.00, orders: 34, joinedAt: '2023-11-20' },
  { id: 7, username: 'Hassan Mahmoud', email: 'hassan@example.com', role: 'user', status: 'pending', totalSpent: 0, orders: 0, joinedAt: '2024-05-01' },
  { id: 8, username: 'Nour Adel', email: 'nour@example.com', role: 'user', status: 'active', totalSpent: 1580.00, orders: 15, joinedAt: '2024-01-28' },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Users Management</h1>
          <p className="text-white/60">Manage all registered users</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <p className="text-white/60 text-sm">Total Users</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">{users.filter(u => u.status === 'active').length}</div>
            <p className="text-white/60 text-sm">Active Users</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === 'admin').length}</div>
            <p className="text-white/60 text-sm">Admins</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-400">{users.filter(u => u.status === 'pending').length}</div>
            <p className="text-white/60 text-sm">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search users..."
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">User</TableHead>
                <TableHead className="text-white/60 hidden md:table-cell">Email</TableHead>
                <TableHead className="text-white/60">Role</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
                <TableHead className="text-white/60 hidden lg:table-cell">Orders</TableHead>
                <TableHead className="text-white/60 hidden lg:table-cell">Total Spent</TableHead>
                <TableHead className="text-white/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {user.username.charAt(0)}
                      </div>
                      <span className="text-white font-medium">{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/70 hidden md:table-cell">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.role === 'admin'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                          : 'bg-white/10 text-white/70'
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : user.status === 'suspended'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/70 hidden lg:table-cell">{user.orders}</TableCell>
                  <TableCell className="text-white font-semibold hidden lg:table-cell">
                    ${user.totalSpent.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1d2e] border-white/10">
                        <DropdownMenuItem className="text-white hover:bg-white/10">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-white/10">
                          <Ban className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
