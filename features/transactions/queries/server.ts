import 'server-only';
import { transactionsKeys, normalizeTransactionParams, type TransactionListParams, type PaginatedTransactionResponse } from './transactions';
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

/**
 * Server-side function to fetch paginated transactions list
 * Uses getSession() for authentication
 * This function is server-only and should not be imported in client components
 */
async function fetchTransactionsListServer(
    params: TransactionListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE }
): Promise<PaginatedTransactionResponse> {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    // Build query string with pagination params
    // Backend API uses 'size' instead of 'per_page' and 0-based pagination
    const page = params.page ?? PAGINATION.DEFAULT_PAGE;
    const per_page = params.per_page ?? PAGINATION.DEFAULT_PAGE_SIZE;
    const queryParams = new URLSearchParams();

    // Convert 1-based to 0-based for backend
    queryParams.set('page', (page - 1).toString());
    queryParams.set('size', per_page.toString());

    // Add other filter params if present
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (key !== 'page' && key !== 'per_page' && value !== undefined && value !== null && value !== '') {
                if (key === 'sort' && Array.isArray(value)) {
                    queryParams.set('sort', value.join(','));
                } else {
                    queryParams.set(key, value.toString());
                }
            }
        });
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.list}?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch transactions';

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

    // Handle both array response (legacy) and paginated response
    let paginatedResponse: PaginatedTransactionResponse;

    if (Array.isArray(responseData)) {
        // Legacy format: just an array
        const parsed = z.array(TransactionSchema).parse(responseData);

        paginatedResponse = {
            data: parsed,
            pageNumber: page,
            pageSize: per_page,
            totalElements: parsed.length,
            totalPages: Math.ceil(parsed.length / per_page),
            last: true,
            first: page === 1,
        };
    } else {
        // Paginated response format
        const transactionsData = responseData.data || [];
        const parsed = z.array(TransactionSchema).parse(transactionsData);

        // Backend uses 0-based, convert to 1-based
        const backendPageNumber = responseData.pageNumber ?? 0;

        paginatedResponse = {
            data: parsed,
            pageNumber: backendPageNumber + 1,
            pageSize: responseData.pageSize ?? per_page,
            totalElements: responseData.totalElements ?? parsed.length,
            totalPages: responseData.totalPages ?? Math.ceil((responseData.totalElements ?? parsed.length) / (responseData.pageSize ?? per_page)),
            last: responseData.last ?? false,
            first: backendPageNumber === 0,
        };
    }

    return paginatedResponse;
}

/**
 * Server-side function to fetch single transaction details
 */
async function fetchTransactionDetailServer(transactionUid: string) {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.getByUid.replace('{uid}', transactionUid)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch transaction';

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
    return TransactionSchema.parse(responseData.data || responseData);
}

/**
 * Prefetch first page of transactions list on the server
 * This will populate the TanStack Query cache with the initial page
 * Client-side will dynamically prefetch the next pages based on current page
 */
export async function prefetchTransactionsList() {
    const queryClient = getQueryClient();

    // Prefetch only the first page on server (1-based pagination)
    const params: TransactionListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE };

    // Normalize params to ensure query key matches client-side queries
    const normalizedParams = normalizeTransactionParams(params);

    const queryOptions = {
        queryKey: transactionsKeys.list(normalizedParams),
        queryFn: () => fetchTransactionsListServer(normalizedParams),
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
export async function prefetchTransactionDetail(transactionId: string) {
    const queryClient = getQueryClient();

    const queryOptions = {
        queryKey: transactionsKeys.detail(transactionId),
        queryFn: () => fetchTransactionDetailServer(transactionId),
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };

    await queryClient.prefetchQuery(queryOptions);
}

/**
 * Server-side function to fetch monthly transaction summary
 * Uses getSession() for authentication
 */
async function fetchMonthlyTransactionSummaryServer(
    params: MonthlyTransactionSummaryParams
): Promise<MonthlyTransactionSummary> {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    // Build query string with params
    const queryParams = new URLSearchParams();
    queryParams.set('year', params.year.toString());

    if (params.month !== undefined) {
        queryParams.set('month', params.month.toString());
    }
    if (params.merchant_id) {
        queryParams.set('merchant_id', params.merchant_id);
    }
    if (params.pgo_id) {
        queryParams.set('pgo_id', params.pgo_id);
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.reports.transactionsMonthly}?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch monthly transaction summary';

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

    // Parse and validate response data
    // Handle if data is wrapped in a data property
    const summaryData = responseData.data || responseData;
    return MonthlyTransactionSummarySchema.parse(summaryData);
}

/**
 * Prefetch monthly transaction summary for current period
 * This will populate the TanStack Query cache with the current month's data
 */
export async function prefetchMonthlyTransactionSummary(
    params?: MonthlyTransactionSummaryParams
) {
    const queryClient = getQueryClient();

    // Use provided params or default to current period
    const reportParams = params || getCurrentPeriod();
    const normalizedParams = normalizeReportParams(reportParams);

    const queryOptions = {
        queryKey: reportsKeys.transactionsMonthlyWithParams(normalizedParams),
        queryFn: () => fetchMonthlyTransactionSummaryServer(normalizedParams),
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData<MonthlyTransactionSummary>(
        reportsKeys.transactionsMonthlyWithParams(normalizedParams)
    );
    if (!cachedData) {
        console.warn('Warning: Prefetched monthly transaction summary not found in cache');
    }
}
