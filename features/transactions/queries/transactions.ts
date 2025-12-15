import { TransactionSchema, Transaction, ProcessingHistoryEntry, AuditTrailEntry, CanUpdateResponse } from '@/lib/definitions';
import { z } from 'zod';
import { PAGINATION, QUERY_CACHE } from '@/lib/config/constants';
import { useQuery } from '@tanstack/react-query';

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
    detail: (id: string) => [...transactionsKeys.details(), id] as const,
    processingHistory: (id: string) => [...transactionsKeys.detail(id), 'processing-history'] as const,
    auditTrail: (id: string) => [...transactionsKeys.detail(id), 'audit-trail'] as const,
    canUpdate: (id: string) => [...transactionsKeys.detail(id), 'can-update'] as const,
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
 * Client-side query options for paginated transactions list
 * Returns paginated response with metadata (pageNumber, pageSize, totalElements, totalPages, etc.)
 * Uses 1-based pagination
 */
export function transactionsListQueryOptions(
    params: TransactionListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE }
) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizeTransactionParams(params);

    // Ensure page and per_page have defaults (1-based pagination)
    const page = normalizedParams.page ?? PAGINATION.DEFAULT_PAGE;
    const per_page = normalizedParams.per_page ?? PAGINATION.DEFAULT_PAGE_SIZE;

    // Check if we should use search endpoint (when search term is provided)
    const useSearchEndpoint = !!normalizedParams.search && normalizedParams.search.trim().length > 0;

    // Query key uses normalized params to ensure consistent caching
    const queryKey = transactionsKeys.list(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<PaginatedTransactionResponse> => {
            // Use absolute URL - construct it based on environment
            let fullUrl: string;
            let requestOptions: RequestInit;

            if (typeof window !== 'undefined') {
                // Client-side: use window.location.origin
                if (useSearchEndpoint) {
                    // Use search endpoint with POST
                    fullUrl = `${window.location.origin}/api/transactions/search?page=${page}&per_page=${per_page}`;

                    // Build search criteria from filters
                    const searchCriteria: Record<string, unknown> = {
                        searchTerm: normalizedParams.search,
                    };

                    // Add other filters to search criteria if present
                    if (normalizedParams.status) {
                        searchCriteria.status = normalizedParams.status;
                    }
                    if (normalizedParams.start_date) {
                        searchCriteria.createdFrom = `${normalizedParams.start_date}T00:00:00`;
                    }
                    if (normalizedParams.end_date) {
                        searchCriteria.createdTo = `${normalizedParams.end_date}T23:59:59`;
                    }
                    if (normalizedParams.amount_min) {
                        searchCriteria.minAmount = normalizedParams.amount_min;
                    }
                    if (normalizedParams.amount_max) {
                        searchCriteria.maxAmount = normalizedParams.amount_max;
                    }
                    if (normalizedParams.sort && normalizedParams.sort.length > 0) {
                        // Parse sort array to extract sortBy and sortDirection
                        const firstSort = normalizedParams.sort[0];
                        const [sortBy, sortDirection] = firstSort.split(',');
                        if (sortBy) searchCriteria.sortBy = sortBy;
                        if (sortDirection) searchCriteria.sortDirection = sortDirection.toUpperCase();
                    }

                    requestOptions = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(searchCriteria),
                    };
                } else {
                    // Use regular list endpoint with GET
                    const queryParams = new URLSearchParams();
                    queryParams.set('page', page.toString());
                    queryParams.set('per_page', per_page.toString());

                    Object.entries(normalizedParams).forEach(([key, value]) => {
                        // Skip page and per_page as they're already set
                        if (key === 'sort' && Array.isArray(value) && value.length > 0) {
                            // Handle multiple sort parameters - backend expects semicolon-separated
                            queryParams.set('sort', value.join(';'));
                        } else if (key !== 'page' && key !== 'per_page' && value !== undefined && value !== null && value !== '') {
                            queryParams.set(key, value.toString());
                        }
                    });

                    fullUrl = `${window.location.origin}/api/transactions?${queryParams.toString()}`;
                    requestOptions = {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                }
            } else {
                // Server-side: this shouldn't happen if prefetch worked
                console.warn('QueryFn executed on server - prefetch may have failed');
                return {
                    data: [],
                    pageNumber: page,
                    pageSize: per_page,
                    totalElements: 0,
                    totalPages: 0,
                    last: true,
                    first: true,
                };
            }

            const response = await fetch(fullUrl, requestOptions);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to fetch transactions'
                );
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
                // Paginated response format (already transformed by API route)
                const parsed = z.array(TransactionSchema).parse(responseData.data || []);

                paginatedResponse = {
                    data: parsed,
                    pageNumber: responseData.pageNumber ?? page,
                    pageSize: responseData.pageSize ?? per_page,
                    totalElements: responseData.totalElements ?? parsed.length,
                    totalPages: responseData.totalPages ?? Math.ceil((responseData.totalElements ?? parsed.length) / (responseData.pageSize ?? per_page)),
                    last: responseData.last ?? false,
                    first: responseData.first ?? (page === 1),
                };
            }

            return paginatedResponse;
        },
        staleTime: QUERY_CACHE.STALE_TIME_LIST,
        placeholderData: (previousData: PaginatedTransactionResponse | undefined) => previousData,
    };
}

/**
 * Client-side query options for single transaction detail
 */
export function transactionDetailQueryOptions(transactionId: string) {
    const url = `/api/transactions/${transactionId}`;

    return {
        queryKey: transactionsKeys.detail(transactionId),
        queryFn: async (): Promise<Transaction> => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('transactionDetailQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch transaction'
                );
            }

            const responseData = await response.json();
            return TransactionSchema.parse(responseData);
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };
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

