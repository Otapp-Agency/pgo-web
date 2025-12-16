import {
    MonthlyTransactionSummarySchema,
    MonthlyTransactionSummary,
    MonthlyTransactionSummaryParams,
} from '@/lib/definitions';
import { QUERY_CACHE } from '@/lib/config/constants';

/**
 * Query keys factory for transaction reports
 * Safe to import in both client and server components
 */
export const reportsKeys = {
    all: ['reports'] as const,
    transactionsMonthly: () => [...reportsKeys.all, 'transactions', 'monthly'] as const,
    transactionsMonthlyWithParams: (params: MonthlyTransactionSummaryParams) =>
        [...reportsKeys.transactionsMonthly(), params] as const,
    transactionsStats: () => [...reportsKeys.all, 'transactions', 'stats'] as const,
    transactionsStatsWithParams: (params: { start_date: string; end_date: string; merchantId?: string; gatewayId?: string }) =>
        [...reportsKeys.transactionsStats(), params] as const,
};

/**
 * Get current year and month for default params
 */
export function getCurrentPeriod(): { year: number; month: number } {
    const now = new Date();
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1, // 1-12
    };
}

/**
 * Normalize params object to ensure consistent query keys
 * Removes undefined/null values and ensures consistent structure
 */
export function normalizeReportParams(
    params: MonthlyTransactionSummaryParams
): MonthlyTransactionSummaryParams {
    const normalized: MonthlyTransactionSummaryParams = {
        year: params.year,
    };

    // Add optional params only if they have values
    if (params.month !== undefined && params.month !== null) {
        normalized.month = params.month;
    }
    if (params.merchant_id) normalized.merchant_id = params.merchant_id;
    if (params.pgo_id) normalized.pgo_id = params.pgo_id;

    return normalized;
}

/**
 * Client-side query options for monthly transaction summary
 */
export function monthlyTransactionSummaryQueryOptions(params: MonthlyTransactionSummaryParams) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizeReportParams(params);

    // Build query string from params
    const queryParams = new URLSearchParams();
    queryParams.set('year', normalizedParams.year.toString());

    if (normalizedParams.month !== undefined) {
        queryParams.set('month', normalizedParams.month.toString());
    }
    if (normalizedParams.merchant_id) {
        queryParams.set('merchant_id', normalizedParams.merchant_id);
    }
    if (normalizedParams.pgo_id) {
        queryParams.set('pgo_id', normalizedParams.pgo_id);
    }

    const url = `/api/reports/transactions/monthly?${queryParams.toString()}`;

    // Query key uses normalized params to ensure consistent caching
    const queryKey = reportsKeys.transactionsMonthlyWithParams(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<MonthlyTransactionSummary> => {
            // Use absolute URL - construct it based on environment
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                // Client-side: use window.location.origin
                fullUrl = `${window.location.origin}${url}`;
            } else {
                // Server-side: this shouldn't happen if prefetch worked
                console.warn('QueryFn executed on server - prefetch may have failed');
                throw new Error('monthlyTransactionSummaryQueryOptions should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to fetch monthly transaction summary'
                );
            }

            const responseData = await response.json();
            return MonthlyTransactionSummarySchema.parse(responseData);
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL, // Reports can be cached longer
    };
}

/**
 * Helper function to convert year/month to start_date/end_date format
 * @param year - Year (e.g., 2024)
 * @param month - Month (1-12), if not provided, uses the entire year
 * @returns Object with start_date and end_date in YYYY-MM-DD format
 */
export function convertYearMonthToDateRange(year: number, month?: number): { start_date: string; end_date: string } {
    if (month !== undefined && month !== null) {
        // Specific month: get first and last day of the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of the month

        const start_date = startDate.toISOString().split('T')[0];
        const end_date = endDate.toISOString().split('T')[0];

        return { start_date, end_date };
    } else {
        // Entire year: January 1 to December 31
        const start_date = `${year}-01-01`;
        const end_date = `${year}-12-31`;

        return { start_date, end_date };
    }
}

/**
 * Client-side query options for transaction stats (daily stats)
 * Converts year/month params to start_date/end_date for the stats API
 */
export function transactionStatsQueryOptions(params: MonthlyTransactionSummaryParams) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizeReportParams(params);

    // Convert year/month to start_date/end_date
    const { start_date, end_date } = convertYearMonthToDateRange(
        normalizedParams.year,
        normalizedParams.month
    );

    // Map merchant_id to merchantId and pgo_id to gatewayId
    const merchantId = normalizedParams.merchant_id;
    const gatewayId = normalizedParams.pgo_id;

    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.set('start_date', start_date);
    queryParams.set('end_date', end_date);
    if (merchantId) {
        queryParams.set('merchantId', merchantId);
    }
    if (gatewayId) {
        queryParams.set('gatewayId', gatewayId);
    }

    const url = `/api/transactions/stats?${queryParams.toString()}`;

    // Query key uses normalized params to ensure consistent caching
    const queryKey = reportsKeys.transactionsStatsWithParams({
        start_date,
        end_date,
        merchantId,
        gatewayId,
    });

    return {
        queryKey,
        queryFn: async () => {
            // Use absolute URL - construct it based on environment
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                // Client-side: use window.location.origin
                fullUrl = `${window.location.origin}${url}`;
            } else {
                // Server-side: this shouldn't happen if prefetch worked
                console.warn('QueryFn executed on server - prefetch may have failed');
                throw new Error('transactionStatsQueryOptions should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to fetch transaction stats'
                );
            }

            const responseData = await response.json();
            return responseData;
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL, // Stats can be cached longer
    };
}

// /**
//  * Helper function to convert year/month to start_date/end_date format
//  * @param year - Year (e.g., 2024)
//  * @param month - Month (1-12), if not provided, uses the entire year
//  * @returns Object with start_date and end_date in YYYY-MM-DD format
//  */
// function convertYearMonthToDateRange(year: number, month?: number): { start_date: string; end_date: string } {
//     if (month !== undefined && month !== null) {
//         // Specific month: get first and last day of the month
//         const startDate = new Date(year, month - 1, 1);
//         const endDate = new Date(year, month, 0); // Last day of the month

//         const start_date = startDate.toISOString().split('T')[0];
//         const end_date = endDate.toISOString().split('T')[0];

//         return { start_date, end_date };
//     } else {
//         // Entire year: January 1 to December 31
//         const start_date = `${year}-01-01`;
//         const end_date = `${year}-12-31`;

//         return { start_date, end_date };
//     }
// }

// /**
//  * Prefetch monthly transaction volume statistics for current period
//  * This will populate the TanStack Query cache with the current month's volume stats
//  * Uses the volume stats API endpoint with date range converted from year/month params
//  */
// export async function prefetchMonthlyTransactionStats(
//     params?: MonthlyTransactionStatsParams
// ) {
//     const queryClient = getQueryClient();

//     // Use provided params or default to current period
//     const reportParams = params || getCurrentPeriod();
//     const normalizedParams = normalizeReportParams(reportParams);

//     // Convert year/month to start_date/end_date for volume stats API
//     const { start_date, end_date } = convertYearMonthToDateRange(
//         normalizedParams.year,
//         normalizedParams.month
//     );

//     const queryOptions = {
//         queryKey: reportsKeys.transactionsMonthlyWithParams(normalizedParams),
//         queryFn: () => getTransactionStats(start_date, end_date,),
//         staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
//     };

//     // Ensure prefetch completes before continuing
//     await queryClient.prefetchQuery(queryOptions);

//     // Verify the data is in the cache
//     const cachedData = queryClient.getQueryData(
//         reportsKeys.transactionsMonthlyWithParams(normalizedParams)
//     );
//     if (!cachedData) {
//         console.warn('Warning: Prefetched monthly transaction volume stats not found in cache');
//     }
// }