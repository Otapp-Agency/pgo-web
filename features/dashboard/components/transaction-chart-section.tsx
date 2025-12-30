'use client';

import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';

interface TransactionChartData {
    date: string;
    value: number;
}


interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload: {
            date: string;
            value: number;
        };
    }>;
    label?: string;
    currency?: string;
}

const CustomTooltip = ({ active, payload, currency = 'TZS' }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const formattedValue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(data.value);

        return (
            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                <div className="text-sm text-muted-foreground mb-1">{data.date}</div>
                <div className="flex items-center gap-2">
                    <div className="text-base font-bold">{formattedValue}</div>
                </div>
            </div>
        );
    }
    return null;
};

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for chart display (e.g., "Jan 1", "Feb 15")
 */
function formatDateForChart(dateString: string): string {
    try {
        const date = new Date(dateString);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
    } catch {
        return dateString;
    }
}

interface Transaction {
    amount?: string | number;
    createdAt?: string;
    currency?: string;
    [key: string]: unknown;
}

interface TransactionListResponse {
    data?: Transaction[];
    [key: string]: unknown;
}

/**
 * Transform transaction list to daily aggregated chart data
 */
function transformTransactionsToChartData(
    transactionsResponse: unknown,
    startDate: Date,
    endDate: Date
): TransactionChartData[] {
    // Extract transaction array from response
    let transactions: Transaction[] = [];

    if (Array.isArray(transactionsResponse)) {
        transactions = transactionsResponse as Transaction[];
    } else if (transactionsResponse && typeof transactionsResponse === 'object') {
        const response = transactionsResponse as TransactionListResponse;
        if (Array.isArray(response.data)) {
            transactions = response.data;
        }
    }

    // Create a map to aggregate transactions by date (YYYY-MM-DD)
    const dailyTotals = new Map<string, number>();

    // Process each transaction
    transactions.forEach((tx) => {
        if (!tx.createdAt) return;

        try {
            const txDate = new Date(tx.createdAt);
            const dateKey = formatDateToISO(txDate);

            // Only include transactions within the date range (inclusive on both ends)
            // Normalize dates to start of day for comparison
            const txDateStart = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
            const startDateStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDateStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

            if (txDateStart >= startDateStart && txDateStart <= endDateStart) {
                // Parse amount (can be string or number)
                let amount = 0;
                if (typeof tx.amount === 'number') {
                    amount = tx.amount;
                } else if (typeof tx.amount === 'string') {
                    amount = parseFloat(tx.amount) || 0;
                }

                // Add to daily total
                const currentTotal = dailyTotals.get(dateKey) || 0;
                dailyTotals.set(dateKey, currentTotal + amount);
            }
        } catch {
            // Skip invalid dates
        }
    });

    // Generate chart data for the entire date range (including days with no transactions)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const chartData: TransactionChartData[] = [];

    for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateKey = formatDateToISO(currentDate);
        const value = dailyTotals.get(dateKey) || 0;

        chartData.push({
            date: formatDateForChart(dateKey),
            value,
        });
    }

    return chartData;
}

export function TransactionChartSection() {
    const trpc = useTRPC();

    // Calculate default date range (last 30 days)
    const endDate = React.useMemo(() => new Date(), []);
    const startDate = React.useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
    }, []);

    const startDateStr = formatDateToISO(startDate);
    const endDateStr = formatDateToISO(endDate);

    // Fetch transaction list (using list instead of stats because stats API endpoint is not working)
    // Using large per_page to get all transactions in the date range
    const queryResult = useSuspenseQuery(
        trpc.transactions.list.queryOptions({
            start_date: startDateStr,
            end_date: endDateStr,
            per_page: '1000', // Large page size to get all transactions
        })
    );

    const transactionsData = queryResult.data;

    // Transform transactions to daily aggregated chart data
    const chartData = React.useMemo(
        () => transformTransactionsToChartData(transactionsData?.data || [], startDate, endDate),
        [transactionsData, startDate, endDate]
    );

    // Commented out: stats endpoint (API endpoint is not working)
    // const queryResult = useSuspenseQuery(
    //   trpc.transactions.stats.queryOptions({
    //     start_date: startDateStr,
    //     end_date: endDateStr,
    //   })
    // );
    // const statsData = queryResult.data;

    // Calculate metrics
    const currentBalance = React.useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

    const todaysSales = React.useMemo(() => {
        if (chartData.length === 0) return 0;
        return chartData[chartData.length - 1]?.value || 0;
    }, [chartData]);

    const highValue = React.useMemo(() => {
        return Math.max(...chartData.map((d) => d.value), 0);
    }, [chartData]);

    const lowValue = React.useMemo(() => {
        const values = chartData.map((d) => d.value).filter((v) => v > 0);
        return values.length > 0 ? Math.min(...values) : 0;
    }, [chartData]);

    // Calculate percentage change (compare last day to previous day average)
    const pnlPercentage = React.useMemo(() => {
        if (chartData.length < 2) return 0;
        const lastValue = chartData[chartData.length - 1]?.value || 0;
        const previousValues = chartData.slice(0, -1).map((d) => d.value);
        const previousAverage =
            previousValues.reduce((sum, v) => sum + v, 0) / previousValues.length || 0;
        if (previousAverage === 0) return 0;
        return ((lastValue - previousAverage) / previousAverage) * 100;
    }, [chartData]);

    // Currency (default to TZS)
    const currency = 'TZS';

    // Chart configuration
    const chartConfig = {
        value: {
            label: 'Transaction Value',
            color: 'var(--primary)',
        },
    } satisfies ChartConfig;

    // Format currency helper
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="px-4 lg:px-6">
            <Card className="w-full">
                <CardContent className="flex flex-col items-stretch gap-5 pt-6">
                    {/* Header */}
                    <div className="mb-5">
                        <h1 className="text-base text-muted-foreground font-medium mb-1">Transaction Volume</h1>
                        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-3.5">
                            <span className="text-4xl font-bold">{formatCurrency(currentBalance)}</span>
                            <div className="flex items-center gap-1 text-emerald-600">
                                <TrendingUp className="w-4 h-4" />
                                <span className="font-medium">
                                    {pnlPercentage >= 0 ? '+' : ''}
                                    {pnlPercentage.toFixed(1)}%
                                </span>
                                <span className="text-muted-foreground font-normal">Last 30 days</span>
                            </div>
                        </div>
                    </div>

                    <div className="grow">
                        {/* Stats Row */}
                        <div className="flex items-center justify-between flex-wrap gap-2.5 text-sm mb-2.5">
                            {/* Today's Sales */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Today&apos;s Transactions:</span>
                                    <span className="font-semibold">{formatCurrency(todaysSales)}</span>
                                    {pnlPercentage !== 0 && (
                                        <div
                                            className={`flex items-center gap-1 ${pnlPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                                        >
                                            <TrendingUp className="w-3 h-3" />
                                            <span>
                                                ({pnlPercentage >= 0 ? '+' : ''}
                                                {pnlPercentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center gap-6 text-muted-foreground">
                                <span>
                                    High:{' '}
                                    <span className="text-sky-600 font-medium">{formatCurrency(highValue)}</span>
                                </span>
                                <span>
                                    Low:{' '}
                                    <span className="text-yellow-600 font-medium">{formatCurrency(lowValue)}</span>
                                </span>
                                <span>
                                    Change:{' '}
                                    <span
                                        className={`font-medium ${pnlPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                                    >
                                        {pnlPercentage >= 0 ? '+' : ''}
                                        {pnlPercentage.toFixed(1)}%
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* Chart */}
                        <ChartContainer
                            config={chartConfig}
                            className="h-96 w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
                        >
                            <ComposedChart
                                data={chartData}
                                margin={{
                                    top: 20,
                                    right: 10,
                                    left: 5,
                                    bottom: 20,
                                }}
                            >
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={chartConfig.value.color} stopOpacity={0.1} />
                                        <stop offset="100%" stopColor={chartConfig.value.color} stopOpacity={0} />
                                    </linearGradient>
                                    <pattern
                                        id="dotGrid"
                                        x="0"
                                        y="0"
                                        width="20"
                                        height="20"
                                        patternUnits="userSpaceOnUse"
                                    >
                                        <circle cx="10" cy="10" r="1" fill="var(--input)" fillOpacity="0.3" />
                                    </pattern>
                                    <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.8)" />
                                    </filter>
                                    <filter id="lineShadow" x="-100%" y="-100%" width="300%" height="300%">
                                        <feDropShadow
                                            dx="4"
                                            dy="6"
                                            stdDeviation="25"
                                            floodColor="rgba(59, 130, 246, 0.9)"
                                        />
                                    </filter>
                                </defs>

                                <rect
                                    x="0"
                                    y="0"
                                    width="100%"
                                    height="100%"
                                    fill="url(#dotGrid)"
                                    style={{ pointerEvents: 'none' }}
                                />

                                <CartesianGrid
                                    strokeDasharray="4 8"
                                    stroke="var(--input)"
                                    strokeOpacity={1}
                                    horizontal={true}
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    tickMargin={15}
                                    interval="preserveStartEnd"
                                    tickCount={Math.min(6, chartData.length)}
                                />

                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    tickFormatter={(value) => {
                                        // Format as abbreviated currency (e.g., "1.5K", "2M")
                                        if (value >= 1000000) {
                                            return `${(value / 1000000).toFixed(1)}M`;
                                        }
                                        if (value >= 1000) {
                                            return `${(value / 1000).toFixed(1)}K`;
                                        }
                                        return value.toString();
                                    }}
                                    tickMargin={15}
                                />

                                <ChartTooltip
                                    content={<CustomTooltip currency={currency} />}
                                    cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted-foreground)', strokeOpacity: 0.5 }}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={chartConfig.value.color}
                                    strokeWidth={2}
                                    filter="url(#lineShadow)"
                                    dot={false}
                                    activeDot={{
                                        r: 6,
                                        fill: chartConfig.value.color,
                                        stroke: 'white',
                                        strokeWidth: 2,
                                        filter: 'url(#dotShadow)',
                                    }}
                                />
                            </ComposedChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

