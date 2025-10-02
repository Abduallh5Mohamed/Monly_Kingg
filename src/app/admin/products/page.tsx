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
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const products = [
  { id: 1, name: 'PUBG Mobile Account - Level 50', game: 'PUBG', price: 45.99, stock: 12, sales: 145, status: 'active', image: '🎮' },
  { id: 2, name: 'Valorant Account - Immortal', game: 'Valorant', price: 89.99, stock: 5, sales: 89, status: 'active', image: '🔫' },
  { id: 3, name: 'FIFA 24 Account - Ultimate Team', game: 'FIFA', price: 65.00, stock: 0, sales: 234, status: 'out_of_stock', image: '⚽' },
  { id: 4, name: 'Call of Duty Account - Prestige 10', game: 'COD', price: 75.50, stock: 8, sales: 178, status: 'active', image: '🎯' },
  { id: 5, name: 'League of Legends - Diamond', game: 'LOL', price: 120.00, stock: 3, sales: 67, status: 'active', image: '⚔️' },
  { id: 6, name: 'Fortnite Account - Rare Skins', game: 'Fortnite', price: 55.00, stock: 15, sales: 201, status: 'active', image: '🏰' },
  { id: 7, name: 'Apex Legends - Predator', game: 'Apex', price: 95.00, stock: 4, sales: 92, status: 'active', image: '🎖️' },
  { id: 8, name: 'Clash of Clans - TH14', game: 'COC', price: 150.00, stock: 2, sales: 45, status: 'low_stock', image: '🏰' },
];

export default function ProductsPage() {
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const totalSales = products.reduce((sum, p) => sum + p.sales, 0);
  const totalRevenue = products.reduce((sum, p) => sum + (p.price * p.sales), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Products</h1>
          <p className="text-white/60">Manage your gaming accounts inventory</p>
        </div>
        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{totalProducts}</div>
            <p className="text-white/60 text-sm">Total Products</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">{activeProducts}</div>
            <p className="text-white/60 text-sm">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-400">{totalSales}</div>
            <p className="text-white/60 text-sm">Total Sales</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-400">${totalRevenue.toFixed(0)}</div>
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
                placeholder="Search products..."
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

      {/* Products Table */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">All Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Product</TableHead>
                <TableHead className="text-white/60 hidden md:table-cell">Game</TableHead>
                <TableHead className="text-white/60">Price</TableHead>
                <TableHead className="text-white/60 hidden lg:table-cell">Stock</TableHead>
                <TableHead className="text-white/60 hidden lg:table-cell">Sales</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
                <TableHead className="text-white/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="border-white/10 hover:bg-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl flex-shrink-0">
                        {product.image}
                      </div>
                      <span className="text-white font-medium">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/70 hidden md:table-cell">
                    <Badge variant="outline" className="border-white/20 text-white/70">
                      {product.game}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white font-semibold">${product.price}</TableCell>
                  <TableCell className="text-white/70 hidden lg:table-cell">{product.stock}</TableCell>
                  <TableCell className="text-white/70 hidden lg:table-cell">{product.sales}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        product.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : product.status === 'out_of_stock'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }
                    >
                      {product.status.replace('_', ' ')}
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
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-white/10">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
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
