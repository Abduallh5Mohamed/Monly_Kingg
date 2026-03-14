'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { DiscountCampaignsContent } from '@/components/seller/discount-campaigns';
import { Tag, Loader2 } from 'lucide-react';

export default function SellerDiscountsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && (!user || !user.isSeller)) {
            router.push('/user');
        }
    }, [user, authLoading, router]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0b14]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <UserDashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Tag className="w-8 h-8 text-orange-400" />
                        Discount Campaigns
                    </h1>
                    <p className="text-white/50 mt-1">View admin discount campaigns and choose which accounts to include</p>
                </div>
                <DiscountCampaignsContent />
            </div>
        </UserDashboardLayout>
    );
}
