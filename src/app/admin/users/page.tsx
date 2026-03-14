'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import {
  Search, MoreVertical, Trash2, ShieldCheck, ShieldOff,
  Loader2, CheckCircle, ChevronDown, Users, UserCheck, Crown, AlertCircle,
  ShieldAlert, Store
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { ensureCsrfToken } from '@/utils/csrf';

interface User {
  _id: string;
  email: string;
  username?: string;
  role: string;
  verified: boolean;
  active: boolean;
  isSeller?: boolean;
  commissionExempt?: boolean;
  avatar?: string;
  wallet?: { balance: number };
  createdAt: string;
}

interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUsers: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  moderator: { label: 'Moderator', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  user: { label: 'User', className: 'bg-white/10      text-white/70   border-white/10' },
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchUsers = useCallback(async (page = currentPage, role = roleFilter, search = searchQuery) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (search) params.append('search', search);
      if (role !== 'all') params.append('role', role);

      const response = await fetch(`/api/v1/admin/users?${params}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data: UsersResponse = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
        setTotalUsers(data.data.pagination.totalUsers);
        setCurrentPage(data.data.pagination.currentPage);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers(currentPage, roleFilter, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, roleFilter, searchQuery);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setActionLoading(`role-${userId}`);
    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
        toast({ title: 'Role updated', description: `Role changed to ${newRole}` });
      } else {
        throw new Error(data.message || 'Failed to update role');
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update role', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    setActionLoading(`status-${userId}`);
    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(`/api/v1/admin/users/${userId}/toggle-status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
      });

      const data = await response.json();
      if (data.success) {
        const newVerified: boolean = data.data?.verified;
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, verified: newVerified } : u));
        toast({ title: 'Status updated', description: data.message });
      } else {
        throw new Error(data.message || 'Failed to toggle status');
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to toggle status', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This action cannot be undone.`)) return;

    setActionLoading(`delete-${userId}`);
    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
      });

      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        setTotalUsers(prev => prev - 1);
        toast({ title: 'User deleted', description: `"${username}" has been removed.` });
      } else {
        throw new Error(data.message || 'Failed to delete user');
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete user', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-lg mb-1">Error loading users</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          <Button onClick={() => fetchUsers()} className="bg-blue-600 hover:bg-blue-700">Retry</Button>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{totalUsers}</div>
                <p className="text-white/50 text-xs">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{users.filter(u => u.verified).length}</div>
                <p className="text-white/50 text-xs">Verified (this page)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Crown className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === 'admin').length}</div>
                <p className="text-white/50 text-xs">Admins (this page)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Store className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">{users.filter(u => u.isSeller).length}</div>
                <p className="text-white/50 text-xs">Sellers (this page)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="pt-5 pb-5">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search by username or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/[0.06] text-white placeholder:text-white/30"
              />
            </div>
            {/* Styled role filter using DropdownMenu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/[0.06] bg-white/5 text-white hover:bg-white/10 min-w-[130px] justify-between"
                >
                  {roleFilter === 'all' ? 'All Roles' : ROLE_CONFIG[roleFilter]?.label ?? roleFilter}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1f2e] border-white/[0.06] text-white min-w-[130px]">
                {[
                  { value: 'all', label: 'All Roles' },
                  { value: 'user', label: 'User' },
                  { value: 'moderator', label: 'Moderator' },
                  { value: 'admin', label: 'Admin' },
                ].map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => { setRoleFilter(opt.value); setCurrentPage(1); }}
                    className={`cursor-pointer hover:bg-white/10 ${roleFilter === opt.value ? 'text-blue-400' : 'text-white/80'}`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">All Users</CardTitle>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-white/50 font-medium pl-5">User</TableHead>
                <TableHead className="text-white/50 font-medium hidden md:table-cell">Email</TableHead>
                <TableHead className="text-white/50 font-medium">Role</TableHead>
                <TableHead className="text-white/50 font-medium">Verified</TableHead>
                <TableHead className="text-white/50 font-medium hidden lg:table-cell">Joined</TableHead>
                <TableHead className="text-white/50 font-medium text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-white/40 py-12">
                    No users found
                  </TableCell>
                </TableRow>
              ) : users.map((user) => {
                const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.user;
                const isActing = actionLoading?.endsWith(user._id);
                return (
                  <TableRow key={user._id} className="border-white/[0.06] hover:bg-white/[0.03]">
                    {/* User cell */}
                    <TableCell className="pl-5">
                      <Link href={`/admin/users/${user._id}`} className="flex items-center gap-3 group">
                        <div className="relative w-9 h-9 flex-shrink-0">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={user.username ?? user.email}
                              fill
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                              {(user.username || user.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          {user.isSeller && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                              <Store className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-white font-medium text-sm group-hover:text-cyan-400 transition-colors truncate">
                            {user.username || user.email}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {user.commissionExempt && (
                              <span className="text-xs text-yellow-400/80">Exempt</span>
                            )}
                            {user.wallet?.balance !== undefined && (
                              <span className="text-xs text-white/40">${user.wallet.balance.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-white/60 text-sm hidden md:table-cell">
                      {user.email}
                    </TableCell>

                    {/* Role — custom dropdown, no native select */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={isActing}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium transition-opacity hover:opacity-80 ${roleCfg.className}`}
                          >
                            {roleCfg.label}
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1f2e] border-white/[0.06] text-white" align="start">
                          <DropdownMenuLabel className="text-white/40 text-xs">Change Role</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          {(['user', 'admin'] as const).map(r => (
                            <DropdownMenuItem
                              key={r}
                              onClick={() => handleUpdateRole(user._id, r)}
                              disabled={user.role === r}
                              className={`cursor-pointer hover:bg-white/10 text-sm ${user.role === r ? 'opacity-40' : ''} ${ROLE_CONFIG[r].className.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}
                            >
                              {ROLE_CONFIG[r].label}
                              {user.role === r && <CheckCircle className="ml-auto h-3 w-3" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                    {/* Verification status */}
                    <TableCell>
                      <Badge
                        className={
                          user.verified
                            ? 'bg-green-500/15 text-green-400 border-green-500/20'
                            : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
                        }
                      >
                        {user.verified ? (
                          <><ShieldCheck className="h-3 w-3 mr-1" />Verified</>
                        ) : (
                          <><ShieldOff className="h-3 w-3 mr-1" />Unverified</>
                        )}
                      </Badge>
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="text-white/50 text-sm hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isActing}
                            className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                          >
                            {isActing
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <MoreVertical className="h-4 w-4" />
                            }
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/[0.06]">
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(user._id)}
                            className="text-white/80 hover:bg-white/10 cursor-pointer text-sm"
                          >
                            {user.verified
                              ? <><ShieldAlert className="mr-2 h-4 w-4 text-yellow-400" /> Unverify</>
                              : <><ShieldCheck className="mr-2 h-4 w-4 text-green-400" /> Verify</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user._id, user.username ?? user.email)}
                            className="text-red-400 hover:bg-red-500/10 cursor-pointer text-sm"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">
          Page {currentPage} of {totalPages} &mdash; {totalUsers} total users
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
            variant="outline"
            size="sm"
            className="border-white/[0.06] text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
            variant="outline"
            size="sm"
            className="border-white/[0.06] text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
