import 'server-only';
import { dashboardKeys, normalizeDashboardParams, type DashboardStatsParams } from './dashboard';
import { DashboardStatsSchema, type DashboardStats } from '../types';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { getSession } from '@/lib/auth/services/auth.service';
import { QUERY_CACHE } from '@/lib/config/constants';

// Re-export from server-query-client for consistent usage
export { getQueryClient, HydrateClient } from '@/lib/server-query-client';
import { getQueryClient } from '@/lib/server-query-client';

/**
 * Transform the nested API response to the expected flat structure
 */
function transformDashboardStatsResponse(apiResponse: unknown) {
    type ApiResponse = {
        overview?: {
            transactions?: {
                total?: number;
                successful?: number;
                failed?: number;
                amountsByCurrency?: Record<string, string>;
                successfulAmountsByCurrency?: Record<string, string>;
            };
            disbursements?: {
                total?: number;
                successful?: number;
                failed?: number;
                amountsByCurrency?: Record<string, string>;
                successfulAmountsByCurrency?: Record<string, string>;
            };
        };
        breakdowns?: {
            byCurrency?: Record<string, unknown>;
        };
        recentActivity?: unknown;
    };

    const response = apiResponse as ApiResponse;
    const overview = response.overview || {};
    const transactions = overview.transactions || {};
    const disbursements = overview.disbursements || {};

    // Get currency from amountsByCurrency (default to TZS)
    const currency = transactions.amountsByCurrency
        ? Object.keys(transactions.amountsByCurrency)[0] || 'TZS'
        : disbursements.amountsByCurrency
            ? Object.keys(disbursements.amountsByCurrency)[0] || 'TZS'
            : 'TZS';

    // Parse amounts from strings to numbers
    const parseAmount = (amount: string | number | undefined): number => {
        if (typeof amount === 'number') return amount;
        if (typeof amount === 'string') {
            const parsed = parseFloat(amount);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    // Get transaction amounts
    const transactionAmounts = transactions.amountsByCurrency || {};
    const successfulTransactionAmounts = transactions.successfulAmountsByCurrency || {};
    const totalTransactionAmount = parseAmount(transactionAmounts[currency]);
    const successfulTransactionAmount = parseAmount(successfulTransactionAmounts[currency]);
    const failedTransactionAmount = totalTransactionAmount - successfulTransactionAmount;

    // Get disbursement amounts
    const disbursementAmounts = disbursements.amountsByCurrency || {};
    const successfulDisbursementAmounts = disbursements.successfulAmountsByCurrency || {};

    return {
        total_transactions_count: transactions.total || 0,
        total_transactions_value: totalTransactionAmount,
        successful_transactions_count: transactions.successful || 0,
        successful_transactions_value: successfulTransactionAmount,
        failed_transactions_count: transactions.failed || 0,
        failed_transactions_value: failedTransactionAmount,
        total_disbursements_count: disbursements.total || 0,
        total_disbursements_value: parseAmount(disbursementAmounts[currency]),
        successful_disbursements_count: disbursements.successful || 0,
        successful_disbursements_value: parseAmount(successfulDisbursementAmounts[currency]),
        currency: currency,
        // Preserve recentActivity from API response
        recentActivity: response.recentActivity || undefined,
    };
}

/**
 * Server-side function to fetch dashboard stats
 * Uses getSession() for authentication
 * This function is server-only and should not be imported in client components
 */
async function fetchDashboardStatsServer(
    params?: DashboardStatsParams
): Promise<DashboardStats> {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    // Build query string with params
    const queryParams = new URLSearchParams();

    if (params?.period) {
        queryParams.set('period', params.period);
    }
    if (params?.start_date) {
        queryParams.set('start_date', params.start_date);
    }
    if (params?.end_date) {
        queryParams.set('end_date', params.end_date);
    }
    if (params?.merchant_id) {
        queryParams.set('merchant_id', params.merchant_id);
    }

    const queryString = queryParams.toString();
    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.dashboard.stats}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch dashboard stats';

        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 401) {
            throw new Error(`Unauthorized: ${errorMessage}`);
        } else if (response.status === 403) {
            throw new Error(`Forbidden: ${errorMessage}`);
        } else if (response.status === 404) {
            throw new Error(`Not Found: ${errorMessage}`);
        }

        throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    const responseData = await response.json();

    // Handle if data is wrapped in a data property
    let rawData;
    if (responseData.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
        rawData = responseData.data;
    } else if (typeof responseData === 'object' && !Array.isArray(responseData)) {
        rawData = responseData;
    } else {
        console.error('Unexpected response format from dashboard stats API:', JSON.stringify(responseData, null, 2));
        throw new Error('Unexpected response format from backend API');
    }

    // Transform the nested API response to the expected flat structure
    const statsData = transformDashboardStatsResponse(rawData);

    // Parse and validate the response
    try {
        return DashboardStatsSchema.parse(statsData);
    } catch (error) {
        // Log the actual response for debugging
        console.error('Failed to parse dashboard stats response:', {
            error,
            rawData,
            transformedData: statsData,
        });
        throw new Error(
            `Invalid dashboard stats response format: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Prefetch dashboard stats for the server-side render
 * This will populate the TanStack Query cache with the initial data
 */
export async function prefetchDashboardStats(params?: DashboardStatsParams) {
    const queryClient = getQueryClient();

    // Normalize params to ensure query key matches client-side queries
    const normalizedParams = normalizeDashboardParams(params);

    const queryOptions = {
        queryKey: dashboardKeys.statsWithParams(
            Object.keys(normalizedParams).length > 0 ? normalizedParams : undefined
        ),
        queryFn: () => fetchDashboardStatsServer(normalizedParams),
        staleTime: QUERY_CACHE.STALE_TIME_LIST,
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData<DashboardStats>(
        dashboardKeys.statsWithParams(
            Object.keys(normalizedParams).length > 0 ? normalizedParams : undefined
        )
    );
    if (!cachedData) {
        console.warn('Warning: Prefetched dashboard stats data not found in cache');
    }
}



