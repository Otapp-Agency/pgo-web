'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc/client';
import { RecentTransactionsTable } from './recent-transactions-table';
import { RecentDisbursementsTable } from './recent-disbursements-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconListDetails, IconFolder } from '@tabler/icons-react';
import type { DashboardStatsParams } from '../types';

interface RecentActivitySectionProps {
    params?: DashboardStatsParams;
}

export function RecentActivitySection({ params }: RecentActivitySectionProps) {
    const trpc = useTRPC();
    const {
        data: statsData,
        isLoading,
        isFetching,
        error,
    } = useQuery(trpc.dashboard.stats.queryOptions(params));

    const recentActivity = statsData?.recentActivity;
    const transactions = recentActivity?.transactions || [];
    const disbursements = recentActivity?.disbursements || [];
    const isLoadingData = isLoading || isFetching;

    // Show error state
    if (error) {
        return (
            <div className="px-4 lg:px-6 py-4 text-muted-foreground">
                Failed to load recent activity: {error.message}
            </div>
        );
    }

    return (
        <div className="px-4 lg:px-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
                <p className="text-sm text-muted-foreground">
                    Latest transactions and disbursements
                </p>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList>
                    <TabsTrigger value="transactions">
                        <IconListDetails className="mr-2 size-4" />
                        Transactions
                        {transactions.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                                {transactions.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="disbursements">
                        <IconFolder className="mr-2 size-4" />
                        Disbursements
                        {disbursements.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                                {disbursements.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="mt-4">
                    <RecentTransactionsTable
                        data={transactions}
                        isLoading={isLoadingData}
                    />
                </TabsContent>

                <TabsContent value="disbursements" className="mt-4">
                    <RecentDisbursementsTable
                        data={disbursements}
                        isLoading={isLoadingData}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}


