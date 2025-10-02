'use client';

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
import { MoreVertical, Edit, Trash2, Ban, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  totalSpent: number;
  joinedAt: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    username: 'Nazuori S.',
    email: 'nazuori@example.com',
    role: 'user',
    status: 'active',
    totalSpent: 283.50,
    joinedAt: '2024-01-15'
  },
  {
    id: '2',
    username: 'Piterson D.',
    email: 'piterson@example.com',
    role: 'user',
    status: 'active',
    totalSpent: 425.00,
    joinedAt: '2024-02-20'
  },
  {
    id: '3',
    username: 'Irena K.',
    email: 'irena@example.com',
    role: 'user',
    status: 'active',
    totalSpent: 775.00,
    joinedAt: '2024-03-10'
  },
  {
    id: '4',
    username: 'Veronika B.',
    email: 'veronika@example.com',
    role: 'admin',
    status: 'active',
    totalSpent: 0,
    joinedAt: '2023-12-01'
  },
];

export function UsersTable() {
  return (
    <Card className="bg-[#1e2236] border-white/10">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white">Recent Users</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">User</TableHead>
              <TableHead className="text-white/60">Email</TableHead>
              <TableHead className="text-white/60">Role</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Total Spent</TableHead>
              <TableHead className="text-white/60">Joined</TableHead>
              <TableHead className="text-white/60 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockUsers.map((user) => (
              <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {user.username.charAt(0)}
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
                        : 'bg-white/10 text-white/70'
                    }
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === 'active' ? 'default' : 'secondary'}
                    className={
                      user.status === 'active'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-white font-semibold">
                  ${user.totalSpent.toFixed(2)}
                </TableCell>
                <TableCell className="text-white/60">{user.joinedAt}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1d2e] border-white/10">
                      <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer">
                        <Ban className="mr-2 h-4 w-4" />
                        Suspend
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 cursor-pointer">
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
  );
}
