'use client';

import {
    IconReceipt,
    IconCash,
    IconCheck,
    IconX,
    IconClock,
    IconTrendingUp,
    IconTrendingDown,
    IconActivity,
    IconRefresh,
    IconChartBar
} from '@tabler/icons-react';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryCardsSkeleton } from '@/components/ui/page-skeleton';
import { Badge } from '@/components/ui/badge';
import type { DisbursementStatsItem } from '@/lib/definitions';

interface StatsCardsProps {
    volumeData: DisbursementStatsItem | undefined;
    statusData: DisbursementStatsItem | undefined;
    gatewayData: DisbursementStatsItem | undefined;
    isLoading: boolean;
}

/**
 * Format number with thousand separators
 */
function formatNumber(value: string | undefined): string {
    if (!value) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format currency value
 */
function formatCurrency(value: string | undefined, currency: string | undefined): string {
    if (!value || !currency) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
}

/**
 * Format percentage
 */
function formatPercentage(value: string | undefined): string {
    if (!value) return '0%';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `${num.toFixed(2)}%`;
}

/**
 * Parse JSON string safely
 */
function parseJsonString<T>(jsonString: string | undefined): T | null {
    if (!jsonString) return null;
    try {
        return JSON.parse(jsonString) as T;
    } catch {
        return null;
    }
}

export function StatsCards({ volumeData, statusData, gatewayData, isLoading }: StatsCardsProps) {
    // Use volume data as primary source
    const primaryData = volumeData || statusData || gatewayData;

    if (isLoading) {
        return <SummaryCardsSkeleton cardCount={4} columns={4} />;
    }

    if (!primaryData) {
        return (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
                No statistics data available for this period
            </div>
        );
    }

    const currency = primaryData.primaryCurrency || 'TZS';
    const successRate = parseFloat(primaryData.successRate || '0');
    const failureRate = parseFloat(primaryData.failureRate || '0');
    const growthRate = parseFloat(primaryData.growthRate || '0');

    // Parse gateway data
    const gatewayCounts = parseJsonString<Record<string, string>>(primaryData.gatewayCounts);
    const gatewayAmounts = parseJsonString<Record<string, string>>(primaryData.gatewayAmounts);
    const gatewaySuccessRates = parseJsonString<Record<string, string>>(primaryData.gatewaySuccessRates);

    return (
        <div className="space-y-4">
            {/* Volume Overview - 4 cards grid */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @3xl/main:grid-cols-4">
                {/* Total Disbursements */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2">
                            <IconReceipt className="size-4" />
                            Total Disbursements
                        </CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatNumber(primaryData.totalDisbursements)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* Total Amount */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2">
                            <IconCash className="size-4" />
                            Total Amount
                        </CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatCurrency(primaryData.totalAmount, currency)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* Success Rate */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2">
                            <IconCheck className="size-4" />
                            Success Rate
                        </CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatPercentage(primaryData.successRate)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* Average Amount */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2">
                            <IconChartBar className="size-4" />
                            Average Amount
                        </CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatCurrency(primaryData.averageAmount, currency)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Status Distribution and Gateway Performance - 2 columns */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2">
                {/* Status Distribution */}
                <Card className="@container/card">
                    <CardHeader className="pb-2">
                        <CardDescription>Status Distribution</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <IconCheck className="size-4" />
                                <span className="text-sm font-medium">Successful</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-semibold tabular-nums">
                                    {formatNumber(primaryData.successfulDisbursements)}
                                </span>
                                <span className="text-muted-foreground text-xs ml-2">
                                    ({formatCurrency(primaryData.successfulAmount, currency)})
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <IconX className="size-4" />
                                <span className="text-sm font-medium">Failed</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-semibold tabular-nums">
                                    {formatNumber(primaryData.failedDisbursements)}
                                </span>
                                <span className="text-muted-foreground text-xs ml-2">
                                    ({formatCurrency(primaryData.failedAmount, currency)})
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <IconClock className="size-4" />
                                <span className="text-sm font-medium">Pending</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-semibold tabular-nums">
                                    {formatNumber(primaryData.pendingDisbursements)}
                                </span>
                                <span className="text-muted-foreground text-xs ml-2">
                                    ({formatCurrency(primaryData.pendingAmount, currency)})
                                </span>
                            </div>
                        </div>
                        {primaryData.cancelledDisbursements && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <IconX className="size-4" />
                                    <span className="text-sm font-medium">Cancelled</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-semibold tabular-nums">
                                        {formatNumber(primaryData.cancelledDisbursements)}
                                    </span>
                                    <span className="text-muted-foreground text-xs ml-2">
                                        ({formatCurrency(primaryData.cancelledAmount, currency)})
                                    </span>
                                </div>
                            </div>
                        )}
                        {primaryData.processingDisbursements && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <IconActivity className="size-4" />
                                    <span className="text-sm font-medium">Processing</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-semibold tabular-nums">
                                        {formatNumber(primaryData.processingDisbursements)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Gateway Performance */}
                {gatewayCounts && Object.keys(gatewayCounts).length > 0 && (
                    <Card className="@container/card">
                        <CardHeader className="pb-2">
                            <CardDescription>Gateway Performance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.keys(gatewayCounts).map((gateway) => {
                                const count = gatewayCounts[gateway];
                                const amount = gatewayAmounts?.[gateway];
                                const successRate = gatewaySuccessRates?.[gateway];
                                return (
                                    <div key={gateway} className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{gateway}</span>
                                            {successRate && (
                                                <span className="text-xs text-muted-foreground">
                                                    {formatPercentage(successRate)} success
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold tabular-nums">
                                                {formatNumber(count)}
                                            </span>
                                            {amount && (
                                                <span className="text-muted-foreground text-xs ml-2 block">
                                                    {formatCurrency(amount, currency)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Time Patterns and Performance Metrics - 2 columns */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2">
                {/* Time Patterns */}
                <Card className="@container/card">
                    <CardHeader className="pb-2">
                        <CardDescription>Time Patterns</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {primaryData.peakHour && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Peak Hour</span>
                                <span className="text-sm font-semibold">{primaryData.peakHour}</span>
                            </div>
                        )}
                        {primaryData.peakDay && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Peak Day</span>
                                <span className="text-sm font-semibold">{primaryData.peakDay}</span>
                            </div>
                        )}
                        {primaryData.growthRate && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Growth Rate</span>
                                <div className="flex items-center gap-1">
                                    {growthRate >= 0 ? (
                                        <IconTrendingUp className="size-4 text-emerald-600" />
                                    ) : (
                                        <IconTrendingDown className="size-4 text-red-600" />
                                    )}
                                    <span className={`text-sm font-semibold ${growthRate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatPercentage(primaryData.growthRate)}
                                    </span>
                                </div>
                            </div>
                        )}
                        {primaryData.trend && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Trend</span>
                                <Badge variant="outline">{primaryData.trend}</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card className="@container/card">
                    <CardHeader className="pb-2">
                        <CardDescription>Performance Metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {primaryData.averageProcessingTime && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Avg Processing Time</span>
                                <span className="text-sm font-semibold">{primaryData.averageProcessingTime}</span>
                            </div>
                        )}
                        {primaryData.retriedDisbursements && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IconRefresh className="size-4" />
                                    <span className="text-sm text-muted-foreground">Retried</span>
                                </div>
                                <span className="text-sm font-semibold tabular-nums">
                                    {formatNumber(primaryData.retriedDisbursements)}
                                </span>
                            </div>
                        )}
                        {primaryData.averageRetryAttempts && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Avg Retry Attempts</span>
                                <span className="text-sm font-semibold">{primaryData.averageRetryAttempts}</span>
                            </div>
                        )}
                        {primaryData.failureRate && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Failure Rate</span>
                                <span className="text-sm font-semibold text-red-600">
                                    {formatPercentage(primaryData.failureRate)}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

