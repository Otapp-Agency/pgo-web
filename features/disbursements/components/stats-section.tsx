'use client';

import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { IconChevronDown, IconChevronUp, IconChartBar, IconCalendar } from '@tabler/icons-react';
import { DateRange } from 'react-day-picker';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StatsCards } from './stats-cards';
import {
    disbursementVolumeStatsQueryOptions,
    disbursementStatusStatsQueryOptions,
    disbursementGatewayStatsQueryOptions,
} from '@/features/disbursements/queries/stats';
import type { DisbursementStatsParams } from '@/lib/definitions';
import { cn } from '@/lib/utils';

type PresetOption = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';

/**
 * Get date range for preset options
 */
function getPresetDateRange(preset: PresetOption): { startDate: Date; endDate: Date } {
    const now = new Date();
    switch (preset) {
        case 'today':
            return {
                startDate: startOfDay(now),
                endDate: endOfDay(now),
            };
        case 'last7days':
            return {
                startDate: startOfDay(subDays(now, 6)),
                endDate: endOfDay(now),
            };
        case 'last30days':
            return {
                startDate: startOfDay(subDays(now, 29)),
                endDate: endOfDay(now),
            };
        case 'thisMonth':
            return {
                startDate: startOfMonth(now),
                endDate: endOfMonth(now),
            };
        default:
            return {
                startDate: startOfDay(subDays(now, 29)),
                endDate: endOfDay(now),
            };
    }
}

/**
 * Format date to ISO string for API
 */
function formatDateForAPI(date: Date): string {
    return date.toISOString();
}

export function StatsSection() {
    const [isOpen, setIsOpen] = useState(true);
    const [preset, setPreset] = useState<PresetOption>('last30days');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const range = getPresetDateRange('last30days');
        return {
            from: range.startDate,
            to: range.endDate,
        };
    });

    // Update date range when preset changes
    const handlePresetChange = (newPreset: PresetOption) => {
        setPreset(newPreset);
        if (newPreset !== 'custom') {
            const range = getPresetDateRange(newPreset);
            setDateRange({
                from: range.startDate,
                to: range.endDate,
            });
        }
    };

    // Build query params from date range
    const queryParams: DisbursementStatsParams | null = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) {
            return null;
        }

        return {
            startDate: formatDateForAPI(dateRange.from),
            endDate: formatDateForAPI(dateRange.to),
        };
    }, [dateRange]);

    // Default params for disabled queries (won't be used since enabled is false)
    const defaultParams: DisbursementStatsParams = {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
    };

    // Fetch all three endpoints in parallel
    // Always provide 3 queries to satisfy TypeScript tuple type requirement
    const queries = useQueries({
        queries: [
            {
                ...disbursementVolumeStatsQueryOptions(queryParams || defaultParams),
                enabled: !!queryParams,
            },
            {
                ...disbursementStatusStatsQueryOptions(queryParams || defaultParams),
                enabled: !!queryParams,
            },
            {
                ...disbursementGatewayStatsQueryOptions(queryParams || defaultParams),
                enabled: !!queryParams,
            },
        ],
    });

    const [volumeQuery, statusQuery, gatewayQuery] = queries;

    // Extract data from queries
    const volumeData = volumeQuery.data?.data?.[0];
    const statusData = statusQuery.data?.data?.[0];
    const gatewayData = gatewayQuery.data?.data?.[0];

    const isLoading = volumeQuery.isLoading || statusQuery.isLoading || gatewayQuery.isLoading;
    const isFetching = volumeQuery.isFetching || statusQuery.isFetching || gatewayQuery.isFetching;

    // Format date range for display
    const dateRangeDisplay = dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
        : 'Select date range';

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
                            <IconChartBar className="size-5" />
                            Statistics
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Period: {dateRangeDisplay}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    {/* Preset Selector */}
                    <Select value={preset} onValueChange={(value) => handlePresetChange(value as PresetOption)}>
                        <SelectTrigger className="w-[140px]" size="sm">
                            <SelectValue placeholder="Preset" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="last7days">Last 7 Days</SelectItem>
                            <SelectItem value="last30days">Last 30 Days</SelectItem>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Custom Date Range Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    'w-[240px] justify-start text-left font-normal',
                                    !dateRange && 'text-muted-foreground'
                                )}
                            >
                                <IconCalendar className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, 'LLL dd, y')} -{' '}
                                            {format(dateRange.to, 'LLL dd, y')}
                                        </>
                                    ) : (
                                        format(dateRange.from, 'LLL dd, y')
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range) => {
                                    setDateRange(range);
                                    if (range?.from && range?.to) {
                                        setPreset('custom');
                                    }
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <CollapsibleContent className="pb-4">
                <StatsCards
                    volumeData={volumeData}
                    statusData={statusData}
                    gatewayData={gatewayData}
                    isLoading={isLoading || isFetching}
                />
            </CollapsibleContent>
        </Collapsible>
    );
}

