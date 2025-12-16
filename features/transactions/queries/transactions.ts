import { TransactionSchema, Transaction, ProcessingHistoryEntry, AuditTrailEntry, CanUpdateResponse } from '@/lib/definitions';
import { PAGINATION, QUERY_CACHE } from '@/lib/config/constants';
import { useQuery } from '@tanstack/react-query';
import axios from "axios";

/**
 * Prefetches the transactions list from the internal API, aligning with the filters/structure used in app/api/transactions/route.ts.
 * All arguments are optional. Arguments with undefined/null/empty will be ignored in query string.
 */
export async function getTransactionsList(
    page?: number,
    per_page?: number,
    status?: string,
    start_date?: string,
    end_date?: string,
    amount_min?: number,
    amount_max?: number,
    search?: string,
    sort?: string[]
) {
    // Construct query params as in route.ts
    const queryParams = new URLSearchParams();

    // Always set page and per_page if provided (default to 1 and 15)
    queryParams.set('page', (page ?? 1).toString());
    queryParams.set('per_page', (per_page ?? 15).toString());

    // Only set if provided
    if (status) queryParams.set('status', status);
    if (start_date) queryParams.set('start_date', start_date);
    if (end_date) queryParams.set('end_date', end_date);
    if (typeof amount_min === 'number') queryParams.set('amount_min', amount_min.toString());
    if (typeof amount_max === 'number') queryParams.set('amount_max', amount_max.toString());
    if (search) queryParams.set('search', search);
    if (sort && Array.isArray(sort) && sort.length > 0) {
        // Join multiple sort fields with semicolon, matches backend and client usage
        queryParams.set('sort', sort.join(';'));
    }

    // Build full API URL (using the canonical /api/transactions endpoint, NOT /search)
    const url = `${process.env.NEXT_PUBLIC_URL}/api/transactions?${queryParams.toString()}`;

    // Use axios to fetch the data
    const res = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
        }
    });

    return res.data;
};



export async function getTransactionDetail(transactionUid: string) {
    console.log('transactionUid', transactionUid);
    const url = `${process.env.NEXT_PUBLIC_URL}/api/transactions/${transactionUid}`;
    const res = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
    console.log('res', res.data);
    return res.data;
};

export async function getTransactionProcessingHistory(transactionUid: string) {
    const url = `${process.env.NEXT_PUBLIC_URL}/api/transactions/${transactionUid}/processing-history`;
    const res = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
    return res.data;
};

export async function getTransactionAuditTrail(transactionUid: string) {
    const url = `${process.env.NEXT_PUBLIC_URL}/api/transactions/${transactionUid}/audit-trail`;
    const res = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
    return res.data;
};

export async function getTransactionCanUpdate(transactionUid: string) {
    const url = `${process.env.NEXT_PUBLIC_URL}/api/transactions/${transactionUid}/can-update`;
    const res = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
    return res.data;
};

/**
 * Fetches transaction volume statistics from the internal API.
 * @param start_date - Start date in YYYY-MM-DD format (required)
 * @param end_date - End date in YYYY-MM-DD format (required)
 * @param merchantId - Optional merchant ID filter
 * @param gatewayId - Optional gateway ID filter
 */
export async function getTransactionStats(
    start_date: string,
    end_date: string,
    merchantId?: string,
    gatewayId?: string
) {
    const queryParams = new URLSearchParams();
    queryParams.set('start_date', start_date);
    queryParams.set('end_date', end_date);

    // Add optional filters
    if (merchantId) {
        queryParams.set('merchantId', merchantId);
    }
    if (gatewayId) {
        queryParams.set('gatewayId', gatewayId);
    }

    const url = `${process.env.NEXT_PUBLIC_URL}/api/transactions/stats?${queryParams.toString()}`;
    const res = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
    return res.data;
};


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
 * Paginated response type for transactions
 */
export interface PaginatedTransactionResponse {
    data: Transaction[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
}

/**
 * Query keys factory for transactions
 * Safe to import in both client and server components
 */
export const transactionsKeys = {
    all: ['transactions'] as const,
    lists: () => [...transactionsKeys.all, 'list'] as const,
    list: (params?: TransactionListParams) =>
        params ? [...transactionsKeys.lists(), params] as const : [...transactionsKeys.lists()] as const,
    details: () => [...transactionsKeys.all, 'detail'] as const,
    detail: (uid: string) => [...transactionsKeys.details(), uid] as const,
    processingHistory: (uid: string) => [...transactionsKeys.detail(uid), 'processing-history'] as const,
    auditTrail: (uid: string) => [...transactionsKeys.detail(uid), 'audit-trail'] as const,
    canUpdate: (uid: string) => [...transactionsKeys.detail(uid), 'can-update'] as const,
};

export interface TransactionListParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    merchant_id?: string;
    pgo_id?: string;
    start_date?: string;
    end_date?: string;
    amount_min?: string;
    amount_max?: string;
    sort?: string[];
}

/**
 * Normalize params object to ensure consistent query keys
 * Removes undefined/null/empty values and ensures consistent structure
 * Exported for use in server-side prefetch to ensure cache key matching
 */
export function normalizeTransactionParams(params: TransactionListParams): TransactionListParams {
    const normalized: TransactionListParams = {
        page: params.page ?? PAGINATION.DEFAULT_PAGE,
        per_page: params.per_page ?? PAGINATION.DEFAULT_PAGE_SIZE,
    };

    // Add other params only if they have values
    if (params.search) normalized.search = params.search;
    if (params.status) normalized.status = params.status;
    if (params.merchant_id) normalized.merchant_id = params.merchant_id;
    if (params.pgo_id) normalized.pgo_id = params.pgo_id;
    if (params.start_date) normalized.start_date = params.start_date;
    if (params.end_date) normalized.end_date = params.end_date;
    if (params.amount_min) normalized.amount_min = params.amount_min;
    if (params.amount_max) normalized.amount_max = params.amount_max;
    if (params.sort && params.sort.length > 0) normalized.sort = params.sort;

    return normalized;
}


/**
 * Response type for transaction action mutations
 */
export interface TransactionActionResponse {
    message: string;
    data?: unknown;
}

/**
 * Retry a failed transaction
 * @param transactionId - The transaction ID (uid) to retry
 */
export async function retryTransaction(transactionId: string): Promise<TransactionActionResponse> {
    const response = await fetch(`/api/transactions/${transactionId}/retry`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: response.statusText || 'Failed to retry transaction',
        }));
        throw new Error(errorData.error || errorData.message || 'Failed to retry transaction');
    }

    const data = await response.json();
    return data;
}

/**
 * Refund a successful transaction
 * @param transactionId - The transaction ID (uid) to refund
 * @param params - Refund parameters (refundAmount required, reason optional)
 */
export async function refundTransaction(
    transactionId: string,
    params: { refundAmount: string; reason?: string }
): Promise<TransactionActionResponse> {
    const response = await fetch(`/api/transactions/${transactionId}/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: response.statusText || 'Failed to refund transaction',
        }));
        throw new Error(errorData.error || errorData.message || 'Failed to refund transaction');
    }

    const data = await response.json();
    return data;
}

/**
 * Manually complete a pending/processing transaction
 * @param transactionId - The transaction ID to complete
 * @param params - Optional completion parameters (reason)
 */
export async function completeTransaction(
    transactionId: string,
    params?: { reason?: string }
): Promise<TransactionActionResponse> {
    const response = await fetch(`/api/transactions/${transactionId}/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: response.statusText || 'Failed to complete transaction',
        }));
        throw new Error(errorData.error || errorData.message || 'Failed to complete transaction');
    }

    const data = await response.json();
    return data;
}

/**
 * Cancel a pending/processing transaction
 * @param transactionId - The transaction ID (uid) to cancel
 * @param params - Optional cancellation parameters (reason)
 */
export async function cancelTransaction(
    transactionId: string,
    params?: { reason?: string }
): Promise<TransactionActionResponse> {
    const response = await fetch(`/api/transactions/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: response.statusText || 'Failed to cancel transaction',
        }));
        throw new Error(errorData.error || errorData.message || 'Failed to cancel transaction');
    }

    const data = await response.json();
    return data;
}

/**
 * Client-side query options for processing history
 */
export function processingHistoryQueryOptions(transactionId: string) {
    const url = `/api/transactions/${transactionId}/processing-history`;

    return {
        queryKey: transactionsKeys.processingHistory(transactionId),
        queryFn: async (): Promise<ProcessingHistoryEntry[]> => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('processingHistoryQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch processing history'
                );
            }

            // API route transforms data to match ProcessingHistoryEntry format
            const responseData = await response.json();
            return responseData as ProcessingHistoryEntry[];
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
        enabled: !!transactionId,
    };
}

/**
 * Hook to fetch processing history
 */
export function useProcessingHistory(transactionId: string) {
    return useQuery(processingHistoryQueryOptions(transactionId));
}

/**
 * Client-side query options for audit trail
 */
export function auditTrailQueryOptions(transactionId: string) {
    const url = `/api/transactions/${transactionId}/audit-trail`;

    return {
        queryKey: transactionsKeys.auditTrail(transactionId),
        queryFn: async (): Promise<AuditTrailEntry[]> => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('auditTrailQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch audit trail'
                );
            }

            // API route transforms data to match AuditTrailEntry format
            const responseData = await response.json();
            return responseData as AuditTrailEntry[];
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
        enabled: !!transactionId,
    };
}

/**
 * Hook to fetch audit trail
 */
export function useAuditTrail(transactionId: string) {
    return useQuery(auditTrailQueryOptions(transactionId));
}

/**
 * Client-side query options for can-update check
 */
export function canUpdateQueryOptions(transactionId: string) {
    const url = `/api/transactions/${transactionId}/can-update`;

    return {
        queryKey: transactionsKeys.canUpdate(transactionId),
        queryFn: async (): Promise<CanUpdateResponse> => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('canUpdateQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to check if transaction can be updated'
                );
            }

            const responseData = await response.json();
            return responseData as CanUpdateResponse;
        },
        staleTime: 30 * 1000, // 30 seconds - shorter stale time since this can change
        enabled: !!transactionId,
    };
}

/**
 * Hook to check if transaction can be updated
 */
export function useCanUpdate(transactionId: string) {
    return useQuery(canUpdateQueryOptions(transactionId));
}

