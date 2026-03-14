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
import {
  Search, Filter, MoreVertical, Trash2, Eye, Gamepad2,
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Package, ShoppingCart, DollarSign, AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState, useCallback } from 'react';
import { ensureCsrfToken } from '@/utils/csrf';

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  status: 'available' | 'in_progress' | 'sold';
  images: string[];
  coverImage: string;
  createdAt: string;
  game: { _id: string; name: string } | null;
  seller: { _id: string; username: string; email: string; avatar?: string } | null;
  sales: number;
  revenue: number;
}

interface Stats {
  totalListings: number;
  availableListings: number;
  soldListings: number;
  inProgressListings: number;
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
}

export default function ProductsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/v1/admin/listings/stats', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch {
      console.error('Failed to fetch stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy,
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/v1/admin/listings?${params}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch listings');

      const data = await response.json();
      if (data.success) {
        setListings(data.data.listings);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      } else {
        throw new Error('Failed to fetch listings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, sortBy]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchListings();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      setDeleteLoading(id);
      const csrfToken = await ensureCsrfToken() || '';
      const response = await fetch(`/api/v1/admin/listings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
      });

      const data = await response.json();
      if (data.success) {
        fetchListings();
        fetchStats();
      } else {
        alert(data.message || 'Failed to delete listing');
      }
    } catch {
      alert('Failed to delete listing');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const csrfToken = await ensureCsrfToken() || '';
      const response = await fetch(`/api/v1/admin/listings/${id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        fetchListings();
        fetchStats();
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch {
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">Available</Badge>;
      case 'sold':
        return <Badge className="bg-red-500/10 text-red-400 border-0 text-xs">Sold</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">In Progress</Badge>;
      default:
        return <Badge className="bg-white/10 text-white/60 border-0 text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Products</h1>
          <p className="text-white/40 text-sm">Manage all marketplace listings</p>
        </div>
        <Button
          onClick={() => { fetchListings(); fetchStats(); }}
          variant="outline"
          className="border-white/[0.06] text-white/60 hover:bg-white/[0.04] hover:text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Total Listings</p>
            </div>
            <div className="text-2xl font-bold text-white">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.totalListings ?? 0}
            </div>
            <div className="flex gap-2 mt-2 text-xs text-white/30">
              <span className="text-emerald-400">{stats?.availableListings ?? 0} available</span>
              <span>·</span>
              <span className="text-amber-400">{stats?.inProgressListings ?? 0} in progress</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Active</p>
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.availableListings ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Total Sales</p>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.totalSales ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Commission</p>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `EGP ${(stats?.totalCommission ?? 0).toLocaleString()}`}
            </div>
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
                placeholder="Search listings by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm h-9 rounded-lg"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px] bg-white/[0.04] border-white/[0.06] text-white/80 text-sm h-9">
                <Filter className="mr-2 h-3.5 w-3.5 text-white/30" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#131620] border-white/[0.06]">
                <SelectItem value="all" className="text-white/80">All Status</SelectItem>
                <SelectItem value="available" className="text-white/80">Available</SelectItem>
                <SelectItem value="sold" className="text-white/80">Sold</SelectItem>
                <SelectItem value="in_progress" className="text-white/80">In Progress</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px] bg-white/[0.04] border-white/[0.06] text-white/80 text-sm h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-[#131620] border-white/[0.06]">
                <SelectItem value="newest" className="text-white/80">Newest First</SelectItem>
                <SelectItem value="oldest" className="text-white/80">Oldest First</SelectItem>
                <SelectItem value="price_asc" className="text-white/80">Price: Low to High</SelectItem>
                <SelectItem value="price_desc" className="text-white/80">Price: High to Low</SelectItem>
                <SelectItem value="title" className="text-white/80">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              onClick={fetchListings}
              variant="outline"
              size="sm"
              className="ml-auto border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm font-semibold">
            All Listings {!loading && <span className="text-white/30 font-normal">({total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white/30" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No listings found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Listing</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Game</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Seller</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Price</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Sales</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing._id} className="border-white/[0.03] hover:bg-white/[0.02]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                          {listing.coverImage ? (
                            <img src={listing.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Gamepad2 className="h-4 w-4 text-white/50" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-white/90 font-medium text-sm block truncate max-w-[200px]">{listing.title}</span>
                          <span className="text-white/30 text-xs">{listing._id.slice(-6)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60 hidden md:table-cell">
                      <Badge variant="outline" className="border-white/[0.06] text-white/60 font-normal text-xs">
                        {listing.game?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-white/60 text-sm">{listing.seller?.username || 'Unknown'}</div>
                      <div className="text-white/30 text-xs">{listing.seller?.email || ''}</div>
                    </TableCell>
                    <TableCell className="text-white/90 font-medium text-sm">EGP {listing.price.toLocaleString()}</TableCell>
                    <TableCell className="text-white/60 text-sm hidden lg:table-cell">{listing.sales}</TableCell>
                    <TableCell>{getStatusBadge(listing.status)}</TableCell>
                    <TableCell className="text-white/40 text-xs hidden md:table-cell">
                      {new Date(listing.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-white/40 hover:text-white/80">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#131620] border-white/[0.06]">
                          <DropdownMenuItem
                            className="text-white/80 hover:bg-white/[0.04] text-sm cursor-pointer"
                            onSelect={() => window.open(`/listing/${listing._id}`, '_blank')}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          {listing.status !== 'available' && (
                            <DropdownMenuItem
                              className="text-emerald-400 hover:bg-emerald-500/10 text-sm cursor-pointer"
                              onSelect={() => handleStatusChange(listing._id, 'available')}
                            >
                              Mark Available
                            </DropdownMenuItem>
                          )}
                          {listing.status !== 'sold' && (
                            <DropdownMenuItem
                              className="text-amber-400 hover:bg-amber-500/10 text-sm cursor-pointer"
                              onSelect={() => handleStatusChange(listing._id, 'sold')}
                            >
                              Mark Sold
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-red-500/10 text-sm cursor-pointer"
                            onSelect={() => handleDelete(listing._id)}
                            disabled={deleteLoading === listing._id}
                          >
                            {deleteLoading === listing._id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-white/30 text-sm">
            Page {currentPage} of {totalPages} ({total} listings)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-white/[0.06] text-white/60 hover:bg-white/[0.04] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-white/[0.06] text-white/60 hover:bg-white/[0.04] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
