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
import type { MonthlyTransactionSummaryParams, MonthlyTransactionSummary, Merchant } from '@/lib/definitions';
import { useTRPC } from '@/lib/trpc/client';

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
 * Fetch monthly transaction summary from API
 */
async function fetchMonthlySummary(params: MonthlyTransactionSummaryParams): Promise<MonthlyTransactionSummary> {
    const queryParams = new URLSearchParams();
    queryParams.set('year', params.year.toString());
    if (params.month) {
        queryParams.set('month', params.month.toString());
    }
    if (params.merchant_id) {
        queryParams.set('merchant_id', params.merchant_id);
    }
    if (params.pgo_id) {
        queryParams.set('pgo_id', params.pgo_id);
    }

    const url = `/api/reports/transactions/monthly?${queryParams.toString()}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            message: response.statusText || 'Failed to fetch monthly transaction summary',
        }));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch monthly transaction summary');
    }

    const data = await response.json();
    return data as MonthlyTransactionSummary;
}

export function MonthlySummarySection() {
    const [isOpen, setIsOpen] = useState(true);
    const currentPeriod = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

    // Filter state
    const [selectedYear, setSelectedYear] = useState(currentPeriod.year.toString());
    const [selectedMonth, setSelectedMonth] = useState(currentPeriod.month.toString());
    const [selectedMerchant, setSelectedMerchant] = useState<string>('all');

    const yearOptions = useMemo(() => getYearOptions(), []);

    const trpc = useTRPC();

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

    // Fetch monthly summary using React Query
    const {
        data: summaryData,
        isLoading: isSummaryLoading,
        isFetching: isSummaryFetching,
    } = useQuery<MonthlyTransactionSummary, Error>({
        queryKey: ['monthly-transaction-summary', queryParams],
        queryFn: () => fetchMonthlySummary(queryParams),
    });

    // Fetch merchants for filter dropdown
    const { data: merchantsData, isLoading: isMerchantsLoading } = useQuery(
        trpc.merchants.list.queryOptions({ page: '0', per_page: '100' })
    );

    const merchants: Merchant[] = merchantsData?.data ?? [];

    // Format the report period for display
    const reportPeriodDisplay = summaryData?.report_period
        ? summaryData.report_period
        : `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

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
                            {merchants.map((merchant: Merchant) => (
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
                    isLoading={isSummaryLoading || isSummaryFetching}
                />
            </CollapsibleContent>
        </Collapsible>
    );
}
