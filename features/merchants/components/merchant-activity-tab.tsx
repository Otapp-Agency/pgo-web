'use client';

import { useTRPC } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconLoader, IconTrendingUp, IconTrendingDown, IconClock, IconCheck, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';

interface MerchantActivityTabProps {
    merchantUid: string;
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Never';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
        return dateString;
    }
}

export default function MerchantActivityTab({ merchantUid }: MerchantActivityTabProps) {
    const trpc = useTRPC();
    const { data: activity, isLoading, error } = useQuery(
        trpc.merchants.activity.queryOptions({ uid: merchantUid })
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                    <CardDescription>Transaction and disbursement metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <IconLoader className="size-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !activity) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                    <CardDescription>Transaction and disbursement metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-destructive py-8 text-center">
                        {error instanceof Error ? error.message : 'Failed to load activity summary'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const successRate = activity.totalTransactions > 0
        ? ((activity.successfulTransactions / activity.totalTransactions) * 100).toFixed(1)
        : '0';

    return (
        <div className="flex flex-col gap-4">
            {/* Transaction Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                        <IconTrendingUp className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activity.totalTransactions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {activity.lastTransactionAt ? `Last: ${formatDate(activity.lastTransactionAt)}` : 'No transactions yet'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Successful</CardTitle>
                        <IconCheck className="size-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {activity.successfulTransactions.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {successRate}% success rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <IconX className="size-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {activity.failedTransactions.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {activity.totalTransactions > 0
                                ? `${((activity.failedTransactions / activity.totalTransactions) * 100).toFixed(1)}% failure rate`
                                : 'No failures'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <IconClock className="size-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {activity.pendingTransactions.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            In progress
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Disbursement Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle>Disbursements</CardTitle>
                    <CardDescription>Total disbursement count</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{activity.totalDisbursements.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Total disbursements associated with this merchant
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

