'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconChevronDown, IconChevronUp, IconCalendar } from '@tabler/icons-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MonthlySummaryCards } from './monthly-summary-cards';
import {
    transactionStatsQueryOptions,
    getCurrentPeriod,
} from '@/features/transactions/queries/reports';
import { merchantsListQueryOptions } from '@/features/merchants/queries/merchants';
import type { MonthlyTransactionSummaryParams } from '@/lib/definitions';

const MONTHS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

/**
 * Generate year options (current year and 5 years back)
 */
function getYearOptions(): { value: string; label: string }[] {
    const currentYear = new Date().getFullYear();
    const years: { value: string; label: string }[] = [];
    for (let i = 0; i <= 5; i++) {
        const year = currentYear - i;
        years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
}

/**
 * Transform daily stats response to MonthlyTransactionSummary format
 * Handles different possible response structures from the stats API
 */
function transformStatsToSummary(
    statsData: any,
    year: number,
    month: number
): import('@/lib/definitions').MonthlyTransactionSummary | undefined {
    if (!statsData) return undefined;

    // Handle API response wrapper (if data is nested)
    const data = statsData.data || statsData;

    // If data is an array (daily stats), aggregate it
    if (Array.isArray(data)) {
        // Aggregate daily stats into monthly summary
        let totalTransactions = 0;
        let totalValue = 0;
        const statusBreakdown: Record<string, { count: number; value: number }> = {};
        const pgoBreakdown: Record<string, { count: number; value: number }> = {};
        const methodBreakdown: Record<string, { count: number; value: number }> = {};
        let currency = 'USD'; // Default currency

        data.forEach((day: any) => {
            // Aggregate totals
            totalTransactions += day.totalTransactions || day.count || day.transactionCount || 0;
            totalValue += day.totalValue || day.amount || day.value || 0;

            // Extract currency if available
            if (day.currency) currency = day.currency;

            // Aggregate status breakdown
            if (day.statusBreakdown || day.status_breakdown) {
                const breakdown = day.statusBreakdown || day.status_breakdown;
                Object.entries(breakdown).forEach(([status, item]: [string, any]) => {
                    if (!statusBreakdown[status]) {
                        statusBreakdown[status] = { count: 0, value: 0 };
                    }
                    statusBreakdown[status].count += item.count || 0;
                    statusBreakdown[status].value += item.value || item.amount || 0;
                });
            }

            // Aggregate PGO breakdown
            if (day.pgoBreakdown || day.pgo_breakdown || day.gatewayBreakdown || day.gateway_breakdown) {
                const breakdown = day.pgoBreakdown || day.pgo_breakdown || day.gatewayBreakdown || day.gateway_breakdown;
                Object.entries(breakdown).forEach(([pgo, item]: [string, any]) => {
                    if (!pgoBreakdown[pgo]) {
                        pgoBreakdown[pgo] = { count: 0, value: 0 };
                    }
                    pgoBreakdown[pgo].count += item.count || 0;
                    pgoBreakdown[pgo].value += item.value || item.amount || 0;
                });
            }

            // Aggregate method breakdown
            if (day.methodBreakdown || day.method_breakdown || day.paymentMethodBreakdown || day.payment_method_breakdown) {
                const breakdown = day.methodBreakdown || day.method_breakdown || day.paymentMethodBreakdown || day.payment_method_breakdown;
                Object.entries(breakdown).forEach(([method, item]: [string, any]) => {
                    if (!methodBreakdown[method]) {
                        methodBreakdown[method] = { count: 0, value: 0 };
                    }
                    methodBreakdown[method].count += item.count || 0;
                    methodBreakdown[method].value += item.value || item.amount || 0;
                });
            }
        });

        return {
            report_period: `${year}-${month.toString().padStart(2, '0')}`,
            total_transactions: totalTransactions,
            total_value: totalValue,
            currency: currency,
            status_breakdown: statusBreakdown,
            pgo_breakdown: pgoBreakdown,
            method_breakdown: methodBreakdown,
        };
    }

    // If data is already in summary format, return it
    if (data.total_transactions !== undefined || data.totalTransactions !== undefined) {
        return {
            report_period: data.report_period || `${year}-${month.toString().padStart(2, '0')}`,
            total_transactions: data.total_transactions || data.totalTransactions || 0,
            total_value: data.total_value || data.totalValue || 0,
            currency: data.currency || 'USD',
            status_breakdown: data.status_breakdown || data.statusBreakdown || {},
            pgo_breakdown: data.pgo_breakdown || data.pgoBreakdown || data.gateway_breakdown || data.gatewayBreakdown || {},
            method_breakdown: data.method_breakdown || data.methodBreakdown || data.payment_method_breakdown || data.paymentMethodBreakdown || {},
        };
    }

    // If structure is unknown, return undefined
    return undefined;
}

export function MonthlySummarySection() {
    const [isOpen, setIsOpen] = useState(true);
    const currentPeriod = getCurrentPeriod();

    // Filter state
    const [selectedYear, setSelectedYear] = useState(currentPeriod.year.toString());
    const [selectedMonth, setSelectedMonth] = useState(currentPeriod.month.toString());
    const [selectedMerchant, setSelectedMerchant] = useState<string>('all');

    const yearOptions = useMemo(() => getYearOptions(), []);

    // Build query params
    const queryParams: MonthlyTransactionSummaryParams = useMemo(() => {
        const params: MonthlyTransactionSummaryParams = {
            year: parseInt(selectedYear, 10),
            month: parseInt(selectedMonth, 10),
        };
        if (selectedMerchant && selectedMerchant !== 'all') {
            params.merchant_id = selectedMerchant;
        }
        return params;
    }, [selectedYear, selectedMonth, selectedMerchant]);

    // Fetch transaction stats (daily stats)
    const {
        data: statsData,
        isLoading: isStatsLoading,
        isFetching: isStatsFetching,
    } = useQuery(transactionStatsQueryOptions(queryParams));

    // Fetch merchants for filter dropdown
    const { data: merchantsData, isLoading: isMerchantsLoading } = useQuery(
        merchantsListQueryOptions({ page: 0, per_page: 100 })
    );

    const merchants = merchantsData?.data ?? [];

    // Format the report period for display
    const reportPeriodDisplay = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

    // Transform stats data to match MonthlyTransactionSummary format if needed
    // The stats API returns daily stats, so we may need to aggregate or transform
    const summaryData = statsData ? transformStatsToSummary(statsData, parseInt(selectedYear, 10), parseInt(selectedMonth, 10)) : undefined;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="px-4 lg:px-6">
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto">
                            {isOpen ? (
                                <IconChevronUp className="size-5" />
                            ) : (
                                <IconChevronDown className="size-5" />
                            )}
                        </Button>
                    </CollapsibleTrigger>
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <IconCalendar className="size-5" />
                            Monthly Summary
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Report Period: {reportPeriodDisplay}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    {/* Year Selector */}
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]" size="sm">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Month Selector */}
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[130px]" size="sm">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Merchant Filter */}
                    <Select
                        value={selectedMerchant}
                        onValueChange={setSelectedMerchant}
                        disabled={isMerchantsLoading}
                    >
                        <SelectTrigger className="w-[180px]" size="sm">
                            <SelectValue placeholder="All Merchants" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Merchants</SelectItem>
                            {merchants.map((merchant) => (
                                <SelectItem key={merchant.id} value={merchant.id}>
                                    {merchant.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <CollapsibleContent className="pb-4">
                <MonthlySummaryCards
                    data={summaryData}
                    isLoading={isStatsLoading || isStatsFetching}
                />
            </CollapsibleContent>
        </Collapsible>
    );
}

