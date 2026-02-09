'use client';

import { useEffect, useState } from 'react';
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
import { Search, UserPlus, Filter, MoreVertical, Edit, Trash2, Ban, Loader2, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  _id: string;
  email: string;
  username?: string;
  role: string;
  verified: boolean;
  active: boolean;
  createdAt: string;
}

interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    currentPage: number;
    totalPages: number;
    totalUsers: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      const response = await fetch(`http://localhost:5000/api/v1/admin/users?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: UsersResponse = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.totalPages);
        setTotalUsers(data.data.totalUsers);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      alert('Failed to update user role');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/admin/users/${userId}/toggle-status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle user status');
      }

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      alert('Failed to toggle user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">Error loading users</p>
          <p className="text-white/60">{error}</p>
          <button
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Users Management</h1>
          <p className="text-white/60">Manage all registered users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{totalUsers}</div>
            <p className="text-white/60 text-sm">Total Users</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">{users.filter(u => u.active).length}</div>
            <p className="text-white/60 text-sm">Active Users</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === 'admin').length}</div>
            <p className="text-white/60 text-sm">Admins</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-400">{users.filter(u => !u.verified).length}</div>
            <p className="text-white/60 text-sm">Unverified</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/[0.06] text-white"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-white/5 border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-white">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-white/60">User</TableHead>
                <TableHead className="text-white/60 hidden md:table-cell">Email</TableHead>
                <TableHead className="text-white/60">Role</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
                <TableHead className="text-white/60 hidden lg:table-cell">Joined</TableHead>
                <TableHead className="text-white/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id} className="border-white/[0.06] hover:bg-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(user.username || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{user.username || user.email}</span>
                        {user.verified && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/70 hidden md:table-cell">{user.email}</TableCell>
                  <TableCell>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                      className="px-2 py-1 bg-white/5 border border-white/[0.06] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {user.active ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/70 hidden lg:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#131620] border-white/[0.06]">
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user._id)}
                          className="text-white hover:bg-white/10"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {user.active ? 'Suspend' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm">
            Page {currentPage} of {totalPages} ({totalUsers} total users)
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              className="border-white/[0.06] text-white hover:bg-white/10 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              className="border-white/[0.06] text-white hover:bg-white/10 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
