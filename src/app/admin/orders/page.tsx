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
import { Search, Filter, MoreVertical, Eye, CheckCircle, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const orders = [
  { id: 'ORD-001', customer: 'Ahmed Hassan', product: 'PUBG Mobile Account', amount: 45.99, status: 'completed', date: '2024-05-15 10:30', payment: 'PayPal' },
  { id: 'ORD-002', customer: 'Sara Mohamed', product: 'Valorant Account - Immortal', amount: 89.99, status: 'pending', date: '2024-05-15 09:15', payment: 'Vodafone Cash' },
  { id: 'ORD-003', customer: 'Khaled Ali', product: 'FIFA 24 Account', amount: 65.00, status: 'completed', date: '2024-05-14 18:45', payment: 'InstaPay' },
  { id: 'ORD-004', customer: 'Mona Ibrahim', product: 'Call of Duty Account', amount: 75.50, status: 'processing', date: '2024-05-14 16:20', payment: 'PayPal' },
  { id: 'ORD-005', customer: 'Omar Youssef', product: 'League of Legends', amount: 120.00, status: 'completed', date: '2024-05-14 14:10', payment: 'Vodafone Cash' },
  { id: 'ORD-006', customer: 'Layla Ahmed', product: 'Fortnite Account', amount: 55.00, status: 'cancelled', date: '2024-05-13 20:30', payment: 'InstaPay' },
  { id: 'ORD-007', customer: 'Hassan Mahmoud', product: 'Apex Legends', amount: 95.00, status: 'completed', date: '2024-05-13 11:25', payment: 'PayPal' },
  { id: 'ORD-008', customer: 'Nour Adel', product: 'Clash of Clans', amount: 150.00, status: 'processing', date: '2024-05-13 09:00', payment: 'Vodafone Cash' },
];

export default function OrdersPage() {
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Orders</h1>
          <p className="text-white/60">Manage and track all customer orders</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{totalOrders}</div>
            <p className="text-white/60 text-sm">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">{completedOrders}</div>
            <p className="text-white/60 text-sm">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-400">{pendingOrders}</div>
            <p className="text-white/60 text-sm">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-400">${totalRevenue.toFixed(2)}</div>
            <p className="text-white/60 text-sm">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search orders..."
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

      {/* Orders Table */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Order ID</TableHead>
                <TableHead className="text-white/60 hidden md:table-cell">Customer</TableHead>
                <TableHead className="text-white/60 hidden lg:table-cell">Product</TableHead>
                <TableHead className="text-white/60">Amount</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
                <TableHead className="text-white/60 hidden xl:table-cell">Payment</TableHead>
                <TableHead className="text-white/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{order.id}</TableCell>
                  <TableCell className="text-white/70 hidden md:table-cell">{order.customer}</TableCell>
                  <TableCell className="text-white/70 hidden lg:table-cell">{order.product}</TableCell>
                  <TableCell className="text-white font-semibold">${order.amount}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        order.status === 'completed'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : order.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : order.status === 'processing'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/70 hidden xl:table-cell">
                    <Badge variant="outline" className="border-white/20 text-white/70">
                      {order.payment}
                    </Badge>
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
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-green-400 hover:bg-green-500/10">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
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
