import 'server-only';

import { transactionsKeys, normalizeTransactionParams, type TransactionListParams, type PaginatedTransactionResponse, getTransactionsList, getTransactionDetail, getTransactionStats } from './transactions';
import { reportsKeys, normalizeReportParams, getCurrentPeriod } from './reports';
import {
    TransactionSchema,
    MonthlyTransactionSummarySchema,
    type MonthlyTransactionSummary,
    type MonthlyTransactionSummaryParams,
} from '@/lib/definitions';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { getSession } from '@/lib/auth/services/auth.service';
import { z } from 'zod';
import { PAGINATION, QUERY_CACHE } from '@/lib/config/constants';

// Re-export from server-query-client for consistent usage
export { getQueryClient, HydrateClient } from '@/lib/server-query-client';
import { getQueryClient } from '@/lib/server-query-client';

export async function prefetchTransactionsListServer() {
    const queryClient = getQueryClient();

    // Prefetch only the first page on server (1-based pagination)
    const params: TransactionListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE };

    // Normalize params to ensure query key matches client-side queries
    const normalizedParams = normalizeTransactionParams(params);

    const queryOptions = {
        queryKey: transactionsKeys.list(normalizedParams),
        queryFn: () => getTransactionsList(normalizedParams.page, normalizedParams.per_page, normalizedParams.status, normalizedParams.start_date, normalizedParams.end_date, normalizedParams.amount_min ? Number(normalizedParams.amount_min) : undefined, normalizedParams.amount_max ? Number(normalizedParams.amount_max) : undefined, normalizedParams.search, normalizedParams.sort),
        staleTime: QUERY_CACHE.STALE_TIME_LIST,
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData<PaginatedTransactionResponse>(transactionsKeys.list(normalizedParams));
    if (!cachedData) {
        console.warn('Warning: Prefetched transactions data not found in cache');
    }
}

/**
 * Prefetch a single transaction detail
 */
export async function prefetchTransactionDetail(transactionUid: string) {
    const queryClient = getQueryClient();

    const queryOptions = {
        queryKey: transactionsKeys.detail(transactionUid),
        queryFn: () => getTransactionDetail(transactionUid),
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };

    await queryClient.prefetchQuery(queryOptions);
}


/**
 * Helper function to convert year/month to start_date/end_date format
 * @param year - Year (e.g., 2024)
 * @param month - Month (1-12), if not provided, uses the entire year
 * @returns Object with start_date and end_date in YYYY-MM-DD format
 */
function convertYearMonthToDateRange(year: number, month?: number): { start_date: string; end_date: string } {
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
 * Prefetch monthly transaction volume statistics for current period
 * This will populate the TanStack Query cache with the current month's volume stats
 * Uses the volume stats API endpoint with date range converted from year/month params
 */
export async function prefetchMonthlyTransactionStats(
    params?: MonthlyTransactionSummaryParams
) {
    const queryClient = getQueryClient();

    // Use provided params or default to current period
    const reportParams = params || getCurrentPeriod();
    const normalizedParams = normalizeReportParams(reportParams);

    // Convert year/month to start_date/end_date for volume stats API
    const { start_date, end_date } = convertYearMonthToDateRange(
        normalizedParams.year,
        normalizedParams.month
    );

    // Map merchant_id to merchantId and pgo_id to gatewayId
    // Note: pgo_id maps to gatewayId in the volume stats API
    const merchantId = normalizedParams.merchant_id;
    const gatewayId = normalizedParams.pgo_id;

    const queryOptions = {
        queryKey: reportsKeys.transactionsMonthlyWithParams(normalizedParams),
        queryFn: () => getTransactionStats(start_date, end_date, merchantId, gatewayId),
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData(
        reportsKeys.transactionsMonthlyWithParams(normalizedParams)
    );
    if (!cachedData) {
        console.warn('Warning: Prefetched monthly transaction volume stats not found in cache');
    }
}
