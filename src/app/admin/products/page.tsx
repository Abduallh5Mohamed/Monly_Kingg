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
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Eye, Gamepad2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const products = [
  { id: 1, name: 'PUBG Mobile Account - Level 50', game: 'PUBG', price: 45.99, stock: 12, sales: 145, status: 'active' },
  { id: 2, name: 'Valorant Account - Immortal', game: 'Valorant', price: 89.99, stock: 5, sales: 89, status: 'active' },
  { id: 3, name: 'FIFA 24 Account - Ultimate Team', game: 'FIFA', price: 65.00, stock: 0, sales: 234, status: 'out_of_stock' },
  { id: 4, name: 'Call of Duty Account - Prestige 10', game: 'COD', price: 75.50, stock: 8, sales: 178, status: 'active' },
  { id: 5, name: 'League of Legends - Diamond', game: 'LOL', price: 120.00, stock: 3, sales: 67, status: 'active' },
  { id: 6, name: 'Fortnite Account - Rare Skins', game: 'Fortnite', price: 55.00, stock: 15, sales: 201, status: 'active' },
  { id: 7, name: 'Apex Legends - Predator', game: 'Apex', price: 95.00, stock: 4, sales: 92, status: 'active' },
  { id: 8, name: 'Clash of Clans - TH14', game: 'COC', price: 150.00, stock: 2, sales: 45, status: 'low_stock' },
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
          <h1 className="text-2xl font-bold text-white mb-1">Products</h1>
          <p className="text-white/40 text-sm">Manage your gaming accounts inventory</p>
        </div>
        <Button className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.06]">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Total Products</p>
            <div className="text-2xl font-bold text-white">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Active</p>
            <div className="text-2xl font-bold text-emerald-400">{activeProducts}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Total Sales</p>
            <div className="text-2xl font-bold text-blue-400">{totalSales}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Revenue</p>
            <div className="text-2xl font-bold text-amber-400">${totalRevenue.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Search products..."
                className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm h-9 rounded-lg"
              />
            </div>
            <Button variant="outline" className="border-white/[0.06] text-white/60 hover:bg-white/[0.04] hover:text-white">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] py-4">
          <CardTitle className="text-white text-sm font-semibold">All Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Product</TableHead>
                <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Game</TableHead>
                <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Price</TableHead>
                <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Stock</TableHead>
                <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Sales</TableHead>
                <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="border-white/[0.03] hover:bg-white/[0.02]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="h-4 w-4 text-white/50" />
                      </div>
                      <span className="text-white/90 font-medium text-sm">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/60 hidden md:table-cell">
                    <Badge variant="outline" className="border-white/[0.06] text-white/60 font-normal text-xs">
                      {product.game}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/90 font-medium text-sm">${product.price}</TableCell>
                  <TableCell className="text-white/60 text-sm hidden lg:table-cell">{product.stock}</TableCell>
                  <TableCell className="text-white/60 text-sm hidden lg:table-cell">{product.sales}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        product.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-0 text-xs'
                          : product.status === 'out_of_stock'
                          ? 'bg-red-500/10 text-red-400 border-0 text-xs'
                          : 'bg-amber-500/10 text-amber-400 border-0 text-xs'
                      }
                    >
                      {product.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-white/40 hover:text-white/80">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#131620] border-white/[0.06]">
                        <DropdownMenuItem className="text-white/80 hover:bg-white/[0.04] text-sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white/80 hover:bg-white/[0.04] text-sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 text-sm">
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
