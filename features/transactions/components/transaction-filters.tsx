'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X, Search } from 'lucide-react';
import { IconChevronDown, IconFilter, IconFilterOff } from '@tabler/icons-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTransactionsTableStore, hasActiveFilters } from '@/lib/stores/transactions-table-store';

// Predefined status options
const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SUCCESS', label: 'Success' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'REFUNDED', label: 'Refunded' },
    { value: 'TIMEOUT', label: 'Timeout' },
    { value: 'ERROR', label: 'Error' },
];

export function TransactionFilters() {
    const {
        filters,
        setStatus,
        setDateRange,
        setAmountRange,
        setSearch,
        clearFilters,
    } = useTransactionsTableStore();

    // Local state for search input (debounced)
    const [searchTerm, setSearchTerm] = React.useState(filters.search || '');
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Local state for date range picker
    const [dateRange, setLocalDateRange] = React.useState<DateRange | undefined>(() => {
        if (filters.startDate || filters.endDate) {
            return {
                from: filters.startDate ? new Date(filters.startDate) : undefined,
                to: filters.endDate ? new Date(filters.endDate) : undefined,
            };
        }
        return undefined;
    });

    // Local state for amount inputs
    const [amountMin, setAmountMin] = React.useState(filters.amountMin || '');
    const [amountMax, setAmountMax] = React.useState(filters.amountMax || '');

    // Debounced search update
    const handleSearchChange = React.useCallback((value: string) => {
        setSearchTerm(value);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce the API call
        searchTimeoutRef.current = setTimeout(() => {
            setSearch(value.trim() || null);
        }, 500);
    }, [setSearch]);

    // Debounced amount filter update
    const amountTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleAmountChange = React.useCallback((min: string, max: string) => {
        setAmountMin(min);
        setAmountMax(max);

        // Clear existing timeout
        if (amountTimeoutRef.current) {
            clearTimeout(amountTimeoutRef.current);
        }

        // Debounce the API call
        amountTimeoutRef.current = setTimeout(() => {
            setAmountRange(min || null, max || null);
        }, 500);
    }, [setAmountRange]);

    // Handle date range selection
    const handleDateRangeSelect = React.useCallback((range: DateRange | undefined) => {
        setLocalDateRange(range);
        
        // Update store with ISO date strings
        const startDate = range?.from ? format(range.from, 'yyyy-MM-dd') : null;
        const endDate = range?.to ? format(range.to, 'yyyy-MM-dd') : null;
        setDateRange(startDate, endDate);
    }, [setDateRange]);

    // Handle status change
    const handleStatusChange = React.useCallback((value: string) => {
        setStatus(value === 'all' ? null : value);
    }, [setStatus]);

    // Handle clear filters
    const handleClearFilters = React.useCallback(() => {
        setSearchTerm('');
        setLocalDateRange(undefined);
        setAmountMin('');
        setAmountMax('');
        clearFilters();
    }, [clearFilters]);

    // Clear timeouts on unmount
    React.useEffect(() => {
        return () => {
            if (amountTimeoutRef.current) {
                clearTimeout(amountTimeoutRef.current);
            }
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const isFiltersActive = hasActiveFilters(filters);

    // Count active filters
    const activeFilterCount = React.useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.status) count++;
        if (filters.startDate || filters.endDate) count++;
        if (filters.amountMin || filters.amountMax) count++;
        return count;
    }, [filters]);

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-9"
                />
                {searchTerm && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        onClick={() => handleSearchChange('')}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Status Filter */}
            <Select
                value={filters.status || 'all'}
                onValueChange={handleStatusChange}
            >
                <SelectTrigger className="w-[140px]" size="sm">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                            {status.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            'justify-start text-left font-normal min-w-[200px]',
                            !dateRange?.from && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {format(dateRange.from, 'MMM d')} -{' '}
                                    {format(dateRange.to, 'MMM d, yyyy')}
                                </>
                            ) : (
                                format(dateRange.from, 'MMM d, yyyy')
                            )
                        ) : (
                            'Date Range'
                        )}
                        {(filters.startDate || filters.endDate) && (
                            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                                1
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={handleDateRangeSelect}
                        numberOfMonths={2}
                    />
                    {dateRange?.from && (
                        <div className="p-3 border-t">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => handleDateRangeSelect(undefined)}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear dates
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {/* Amount Range Filter */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            'justify-start text-left font-normal',
                            !(amountMin || amountMax) && 'text-muted-foreground'
                        )}
                    >
                        <IconFilter className="mr-2 h-4 w-4" />
                        {amountMin || amountMax ? (
                            <>
                                {amountMin && amountMax
                                    ? `${amountMin} - ${amountMax}`
                                    : amountMin
                                    ? `Min: ${amountMin}`
                                    : `Max: ${amountMax}`}
                            </>
                        ) : (
                            'Amount Range'
                        )}
                        {(filters.amountMin || filters.amountMax) && (
                            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                                1
                            </Badge>
                        )}
                        <IconChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Amount Range</h4>
                            <p className="text-sm text-muted-foreground">
                                Filter transactions by amount
                            </p>
                        </div>
                        <div className="grid gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="amount-min">Minimum Amount</Label>
                                <Input
                                    id="amount-min"
                                    type="number"
                                    placeholder="0.00"
                                    value={amountMin}
                                    onChange={(e) => handleAmountChange(e.target.value, amountMax)}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="amount-max">Maximum Amount</Label>
                                <Input
                                    id="amount-max"
                                    type="number"
                                    placeholder="0.00"
                                    value={amountMax}
                                    onChange={(e) => handleAmountChange(amountMin, e.target.value)}
                                />
                            </div>
                        </div>
                        {(amountMin || amountMax) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAmountChange('', '')}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear amount filter
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Clear All Filters */}
            {isFiltersActive && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-muted-foreground"
                >
                    <IconFilterOff className="mr-2 h-4 w-4" />
                    Clear filters
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            )}
        </div>
    );
}

