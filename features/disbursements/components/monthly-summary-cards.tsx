'use client';

import { IconReceipt, IconCash, IconCheck, IconX, IconClock } from '@tabler/icons-react';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryCardsSkeleton } from '@/components/ui/page-skeleton';
import type { MonthlyDisbursementSummary, BreakdownItem } from '@/lib/definitions';

interface MonthlySummaryCardsProps {
    data: MonthlyDisbursementSummary | undefined;
    isLoading: boolean;
}

/**
 * Format number with thousand separators
 */
function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format currency value
 */
function formatCurrency(value: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Get status icon and color
 */
function getStatusStyle(status: string): { icon: React.ReactNode; color: string } {
    switch (status.toUpperCase()) {
        case 'SUCCESS':
            return {
                icon: <IconCheck className="size-4" />,
                color: 'text-emerald-600 dark:text-emerald-400',
            };
        case 'FAILED':
            return {
                icon: <IconX className="size-4" />,
                color: 'text-red-600 dark:text-red-400',
            };
        case 'PENDING':
            return {
                icon: <IconClock className="size-4" />,
                color: 'text-amber-600 dark:text-amber-400',
            };
        default:
            return {
                icon: null,
                color: 'text-muted-foreground',
            };
    }
}

function SummaryCardSkeleton() {
    return (
        <Card className="@container/card">
            <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32 mt-2" />
            </CardHeader>
        </Card>
    );
}

function StatusBreakdownCard({
    title,
    breakdown,
    currency,
    isLoading,
}: {
    title: string;
    breakdown: Record<string, BreakdownItem> | undefined;
    currency: string;
    isLoading: boolean;
}) {
    // if (isLoading) {
    //     return <SummaryCardSkeleton />;
    // }

    if (!breakdown) {
        return null;
    }

    return (
        <Card className="@container/card col-span-2">
            <CardHeader className="pb-2">
                <CardDescription>{title}</CardDescription>
            </CardHeader>
            <div className="px-6 pb-4 space-y-3">
                {Object.entries(breakdown).map(([key, item]) => {
                    const { icon, color } = getStatusStyle(key);
                    return (
                        <div key={key} className="flex items-center justify-between">
                            <div className={`flex items-center gap-2 ${color}`}>
                                {icon}
                                <span className="text-sm font-medium">{key}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-semibold tabular-nums">
                                    {formatNumber(item.count)} txns
                                </span>
                                <span className="text-muted-foreground text-xs ml-2">
                                    ({formatCurrency(item.value, currency)})
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

export function MonthlySummaryCards({ data, isLoading }: MonthlySummaryCardsProps) {
    // if (isLoading) {
    //     return <SummaryCardsSkeleton cardCount={4} columns={4} />;
    // }

    if (!data) {
        return (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
                No summary data available for this period
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Main summary cards */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @3xl/main:grid-cols-4">
                {/* Total Disbursements */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2">
                            <IconReceipt className="size-4" />
                            Total Disbursements
                        </CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatNumber(data.total_disbursements)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* Total Value */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2">
                            <IconCash className="size-4" />
                            Total Value
                        </CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatCurrency(data.total_value, data.currency)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* Status Breakdown Card */}
                <StatusBreakdownCard
                    title="Status Breakdown"
                    breakdown={data.status_breakdown}
                    currency={data.currency}
                    isLoading={isLoading}
                />
            </div>

            {/* Secondary breakdown cards */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2">
                {/* PGO Breakdown */}
                {data.pgo_breakdown && Object.keys(data.pgo_breakdown).length > 0 && (
                    <Card className="@container/card">
                        <CardHeader className="pb-2">
                            <CardDescription>PGO Breakdown</CardDescription>
                        </CardHeader>
                        <div className="px-6 pb-4 space-y-3">
                            {Object.entries(data.pgo_breakdown).map(([key, item]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{key}</span>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold tabular-nums">
                                            {formatNumber(item.count)} txns
                                        </span>
                                        <span className="text-muted-foreground text-xs ml-2">
                                            ({formatCurrency(item.value, data.currency)})
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Method Breakdown */}
                {data.method_breakdown && Object.keys(data.method_breakdown).length > 0 && (
                    <Card className="@container/card">
                        <CardHeader className="pb-2">
                            <CardDescription>Payment Method Breakdown</CardDescription>
                        </CardHeader>
                        <div className="px-6 pb-4 space-y-3">
                            {Object.entries(data.method_breakdown).map(([key, item]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{key}</span>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold tabular-nums">
                                            {formatNumber(item.count)} txns
                                        </span>
                                        <span className="text-muted-foreground text-xs ml-2">
                                            ({formatCurrency(item.value, data.currency)})
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}

