'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreVertical, Edit, Trash2, Ban, CheckCircle, Search, Loader2, UserCheck, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminApi } from '@/lib/admin-api';
import { toast } from '@/hooks/use-toast';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  verified: boolean;
  createdAt: string;
  authLogs?: Array<{ action: string; timestamp: Date; ip?: string }>;
}

interface UsersData {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function UsersTable() {
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; username: string }>({
    open: false,
    userId: '',
    username: ''
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, search, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({
        page: currentPage,
        limit: 10,
        search,
        role: roleFilter
      });

      if (response.success) {
        setUsersData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      setActionLoading(userId);
      await adminApi.updateUserRole(userId, newRole);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setActionLoading(deleteDialog.userId);
      await adminApi.deleteUser(deleteDialog.userId);
      setDeleteDialog({ open: false, userId: '', username: '' });
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminApi.toggleUserStatus(userId);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserInitials = (username: string) => {
    return username.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading && !usersData) {
    return (
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] py-4">
          <CardTitle className="text-white text-sm font-semibold">Users Management</CardTitle>
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
    <>
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-white text-sm font-semibold">Users Management</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm h-9 rounded-lg"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 bg-white/[0.04] border-white/[0.06] text-white text-sm h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-white/60">User</TableHead>
                <TableHead className="text-white/60">Email</TableHead>
                <TableHead className="text-white/60">Role</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
                <TableHead className="text-white/60">Joined</TableHead>
                <TableHead className="text-white/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersData?.users.map((user) => (
                <TableRow key={user._id} className="border-white/[0.06] hover:bg-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-xs">
                        {getUserInitials(user.username)}
                      </div>
                      <span className="text-white font-medium">{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/70">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === 'admin' ? 'default' : 'secondary'}
                      className={
                        user.role === 'admin'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                          : user.role === 'moderator'
                            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                            : 'bg-white/10 text-white/70'
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.verified ? 'default' : 'secondary'}
                      className={
                        user.verified
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {user.verified ? (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Verified
                        </>
                      ) : (
                        <>
                          <UserX className="h-3 w-3 mr-1" />
                          Unverified
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/60">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/60 hover:text-white"
                          disabled={actionLoading === user._id}
                        >
                          {actionLoading === user._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#131620] border-white/[0.06]">
                        <DropdownMenuItem
                          onClick={() => handleRoleUpdate(user._id, user.role === 'admin' ? 'user' : 'admin')}
                          className="text-white hover:bg-white/10"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user._id)}
                          className="text-white hover:bg-white/10"
                        >
                          {user.verified ? (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend User
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate User
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog({ open: true, userId: user._id, username: user.username })}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {usersData?.pagination && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
              <div className="text-white/60 text-sm">
                Showing {((usersData.pagination.currentPage - 1) * 10) + 1} to {Math.min(usersData.pagination.currentPage * 10, usersData.pagination.totalUsers)} of {usersData.pagination.totalUsers} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!usersData.pagination.hasPrev || loading}
                  className="bg-transparent border-white/[0.06] text-white hover:bg-white/10"
                >
                  Previous
                </Button>
                <span className="text-white/60 text-sm px-3">
                  Page {usersData.pagination.currentPage} of {usersData.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!usersData.pagination.hasNext || loading}
                  className="bg-transparent border-white/[0.06] text-white hover:bg-white/10"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[#131620] border-white/[0.06]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This action cannot be undone. This will permanently delete the user account for <span className="font-semibold text-white">{deleteDialog.username}</span> and remove all their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/[0.06] text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading === deleteDialog.userId}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {actionLoading === deleteDialog.userId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

