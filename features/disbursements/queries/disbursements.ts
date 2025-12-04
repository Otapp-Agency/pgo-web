import { DisbursementSchema, PaginatedDisbursementResponse } from '@/lib/definitions';
import { z } from 'zod';
import { PAGINATION, QUERY_CACHE } from '@/lib/config/constants';

/**
 * Query keys factory for disbursements
 * Safe to import in both client and server components
 */
export const disbursementsKeys = {
    all: ['disbursements'] as const,
    lists: () => [...disbursementsKeys.all, 'list'] as const,
    list: (params?: DisbursementListParams) =>
        params ? [...disbursementsKeys.lists(), params] as const : [...disbursementsKeys.lists()] as const,
    details: () => [...disbursementsKeys.all, 'detail'] as const,
    detail: (id: string) => [...disbursementsKeys.details(), id] as const,
};

export interface DisbursementListParams {
    start_date?: string;
    end_date?: string;
    status?: string;
    merchant_id?: string;
    pgo_id?: string;
    amount_min?: string;
    amount_max?: string;
    search?: string;
    page?: number;
    per_page?: number;
    source_transaction_id?: string;
    sort?: string[];
}

/**
 * Normalize params object to ensure consistent query keys
 * Removes undefined/null/empty values and ensures consistent structure
 * Exported for use in server-side prefetch to ensure cache key matching
 */
export function normalizeDisbursementParams(params: DisbursementListParams): DisbursementListParams {
    const normalized: DisbursementListParams = {
        page: params.page ?? PAGINATION.DEFAULT_PAGE,
        per_page: params.per_page ?? PAGINATION.DEFAULT_PAGE_SIZE,
    };

    // Add other params only if they have values
    if (params.start_date) normalized.start_date = params.start_date;
    if (params.end_date) normalized.end_date = params.end_date;
    if (params.status) normalized.status = params.status;
    if (params.merchant_id) normalized.merchant_id = params.merchant_id;
    if (params.pgo_id) normalized.pgo_id = params.pgo_id;
    if (params.amount_min) normalized.amount_min = params.amount_min;
    if (params.amount_max) normalized.amount_max = params.amount_max;
    if (params.search) normalized.search = params.search;
    if (params.source_transaction_id) normalized.source_transaction_id = params.source_transaction_id;
    if (params.sort && params.sort.length > 0) normalized.sort = params.sort;

    return normalized;
}

/**
 * Normalizes a disbursement item by ensuring nullable string fields default to empty strings.
 * This ensures consistent types and prevents null/undefined values from causing issues.
 */
function normalizeDisbursementItem(item: Record<string, unknown>): Record<string, unknown> {
    return {
        ...item,
        internalTransactionId: (item.internalTransactionId as string | undefined) ?? '',
        externalTransactionId: (item.externalTransactionId as string | undefined) ?? '',
        merchantTransactionId: (item.merchantTransactionId as string | undefined) ?? '',
        pspTransactionId: (item.pspTransactionId as string | undefined) ?? '',
        customerIdentifier: (item.customerIdentifier as string | undefined) ?? '',
        paymentMethod: (item.paymentMethod as string | undefined) ?? '',
        customerName: (item.customerName as string | undefined) ?? '',
        errorCode: (item.errorCode as string | undefined) ?? '',
        errorMessage: (item.errorMessage as string | undefined) ?? '',
        description: (item.description as string | undefined) ?? '',
        merchantName: (item.merchantName as string | undefined) ?? '',
        submerchantId: (item.submerchantId as string | undefined) ?? '',
        submerchantUid: (item.submerchantUid as string | undefined) ?? '',
        submerchantName: (item.submerchantName as string | undefined) ?? '',
    };
}

/**
 * Client-side query options for paginated disbursements list
 * Returns paginated response with metadata (pageNumber, pageSize, totalElements, totalPages, etc.)
 * Uses 1-based pagination
 * 
 * Supports query parameters for filtering:
 * - start_date, end_date, status, merchant_id, pgo_id
 * - amount_min, amount_max, search
 * - page, per_page, source_transaction_id
 */
export function disbursementsListQueryOptions(
    params: DisbursementListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE }
) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizeDisbursementParams(params);

    // Ensure page and per_page have defaults (1-based pagination)
    const page = normalizedParams.page ?? PAGINATION.DEFAULT_PAGE;
    const per_page = normalizedParams.per_page ?? PAGINATION.DEFAULT_PAGE_SIZE;

    // Check if we should use search endpoint (when search term is provided)
    const useSearchEndpoint = !!normalizedParams.search && normalizedParams.search.trim().length > 0;

    // Query key uses normalized params to ensure consistent caching
    const queryKey = disbursementsKeys.list(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<PaginatedDisbursementResponse> => {
            // Use absolute URL - construct it based on environment
            let fullUrl: string;
            let requestOptions: RequestInit;

            if (typeof window !== 'undefined') {
                // Client-side: use window.location.origin
                if (useSearchEndpoint) {
                    // Use search endpoint with POST
                    fullUrl = `${window.location.origin}/api/disbursements/search?page=${page}&per_page=${per_page}`;

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
                        } else if (key === 'search' && value !== undefined && value !== null && value !== '') {
                            // Map 'search' to 'search_term' for API compatibility
                            queryParams.set('search_term', value.toString());
                        } else if (key !== 'page' && key !== 'per_page' && value !== undefined && value !== null && value !== '') {
                            queryParams.set(key, value.toString());
                        }
                    });

                    fullUrl = `${window.location.origin}/api/disbursements?${queryParams.toString()}`;
                    requestOptions = {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                }
            } else {
                // Server-side: this shouldn't happen if prefetch worked
                // But if it does, return empty paginated response
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
                    errorData.error || errorData.message || 'Failed to fetch disbursements'
                );
            }

            const responseData = await response.json();

            // Handle both array response (legacy) and paginated response
            let paginatedResponse: PaginatedDisbursementResponse;

            if (Array.isArray(responseData)) {
                // Legacy format: just an array
                // Transform to paginated format
                const transformedData = responseData.map((item: Record<string, unknown>) =>
                    normalizeDisbursementItem(item)
                );

                const parsed = z.array(DisbursementSchema).parse(transformedData);

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
                const transformedData = (responseData.data || []).map((item: Record<string, unknown>) =>
                    normalizeDisbursementItem(item)
                );

                const parsed = z.array(DisbursementSchema).parse(transformedData);

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
        placeholderData: (previousData: PaginatedDisbursementResponse | undefined) => previousData, // Keep previous data while fetching new page
    };
}

/**
 * Response type for disbursement action mutations
 */
export interface DisbursementActionResponse {
    message: string;
    data?: unknown;
}

/**
 * Retry a failed disbursement
 * @param disbursementId - The disbursement ID (uid or numeric id) to retry
 */
export async function retryDisbursement(disbursementId: string): Promise<DisbursementActionResponse> {
    const response = await fetch(`/api/disbursements/${disbursementId}/retry`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: response.statusText || 'Failed to retry disbursement',
        }));
        throw new Error(errorData.error || errorData.message || 'Failed to retry disbursement');
    }

    const data = await response.json();
    return data;
}

/**
 * Manually complete a pending/processing disbursement
 * @param disbursementId - The disbursement ID to complete
 * @param params - Optional completion parameters (reason)
 */
export async function completeDisbursement(
    disbursementId: string,
    params?: { reason?: string }
): Promise<DisbursementActionResponse> {
    const response = await fetch(`/api/disbursements/${disbursementId}/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: response.statusText || 'Failed to complete disbursement',
        }));
        throw new Error(errorData.error || errorData.message || 'Failed to complete disbursement');
    }

    const data = await response.json();
    return data;
}

/**
 * Cancel a pending/processing disbursement
 * @param disbursementId - The disbursement ID to cancel
 * @param params - Optional cancellation parameters (reason)
 */
export async function cancelDisbursement(
    disbursementId: string,
    params?: { reason?: string }
): Promise<DisbursementActionResponse> {
    const response = await fetch(`/api/disbursements/${disbursementId}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: response.statusText || 'Failed to cancel disbursement',
        }));
        throw new Error(errorData.error || errorData.message || 'Failed to cancel disbursement');
    }

    const data = await response.json();
    return data;
}
