import { AuditLogSchema, PaginatedUserResponse } from '@/lib/definitions';
import { z } from 'zod';

/**
 * Query keys factory for audit logs
 * Safe to import in both client and server components
 */
export const auditLogsKeys = {
    all: ['audit-logs'] as const,
    lists: () => [...auditLogsKeys.all, 'list'] as const,
    list: (params?: AuditLogListParams) =>
        params ? [...auditLogsKeys.lists(), params] as const : [...auditLogsKeys.lists()] as const,
    details: () => [...auditLogsKeys.all, 'detail'] as const,
    detail: (id: string) => [...auditLogsKeys.details(), id] as const,
};

export interface AuditLogListParams {
    page?: number;
    per_page?: number;
    search?: string;
    userUid?: string;
    eventType?: string;
    merchantUid?: string;
    search_term?: string;
    startDate?: string;
    endDate?: string;
    sort?: string[];
}

/**
 * Normalize params object to ensure consistent query keys
 * Removes undefined/null/empty values and ensures consistent structure
 * Exported for use in server-side prefetch to ensure cache key matching
 */
export function normalizeAuditLogParams(params: AuditLogListParams): AuditLogListParams {
    const normalized: AuditLogListParams = {
        page: params.page ?? 0,
        per_page: params.per_page || 15,
    };
    // Add other params only if they have values
    if (params.search) normalized.search = params.search;
    if (params.userUid) normalized.userUid = params.userUid;
    if (params.eventType) normalized.eventType = params.eventType;
    if (params.merchantUid) normalized.merchantUid = params.merchantUid;
    if (params.search_term) normalized.search_term = params.search_term;
    if (params.startDate) normalized.startDate = params.startDate;
    if (params.endDate) normalized.endDate = params.endDate;
    if (params.sort && params.sort.length > 0) normalized.sort = params.sort;

    return normalized;
}

/**
 * Client-side query options for paginated merchants list
 * Returns paginated response with metadata (pageNumber, pageSize, totalElements, totalPages, etc.)
 * 
 * Supports query parameters for filtering:
 * - search (code/name), user_id, action_type, search_term, start_date, end_date
 * - page, per_page
 */
export function auditLogsListQueryOptions(
    params: AuditLogListParams = { page: 0, per_page: 15 }
) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizeAuditLogParams(params);

    // Ensure page and per_page have defaults (0-based pagination)
    const page = normalizedParams.page ?? 0;
    const per_page = normalizedParams.per_page ?? 15;

    // Build query string from normalizedParams to match cache key
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    queryParams.set('per_page', per_page.toString());

    Object.entries(normalizedParams).forEach(([key, value]) => {
        // Skip page and per_page as they're already set
        if (key === 'sort' && Array.isArray(value) && value.length > 0) {
            // Handle sort as comma-separated string
            queryParams.set('sort', value.join(','));
        } else if (key !== 'page' && key !== 'per_page' && value !== undefined && value !== null && value !== '') {
            queryParams.set(key, value.toString());
        }
    });

    const url = `/api/logs?${queryParams.toString()}`;

    // Query key uses normalized params to ensure consistent caching
    // Same params with different object references will now match
    const queryKey = auditLogsKeys.list(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<PaginatedUserResponse> => {
            // Use absolute URL - construct it based on environment
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                // Client-side: use window.location.origin
                fullUrl = `${window.location.origin}${url}`;
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

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to fetch audit logs'
                );
            }

            const responseData = await response.json();

            // Handle both array response (legacy) and paginated response
            let paginatedResponse: PaginatedUserResponse;

            if (Array.isArray(responseData)) {
                // Legacy format: just an array
                // Transform to paginated format

                paginatedResponse = {
                    data: responseData,
                    pageNumber: page,
                    pageSize: per_page,
                    totalElements: responseData.length,
                    totalPages: Math.ceil(responseData.length / per_page),
                    last: true,
                    first: page === 0,
                };
            } else {
                // Paginated response format (already transformed by API route)
                const parsed = z.array(AuditLogSchema).parse(responseData.data || []);

                paginatedResponse = {
                    data: responseData.data,
                    pageNumber: responseData.pageNumber ?? page,
                    pageSize: responseData.pageSize ?? per_page,
                    totalElements: responseData.totalElements ?? parsed.length,
                    totalPages: responseData.totalPages ?? Math.ceil((responseData.totalElements ?? parsed.length) / (responseData.pageSize ?? per_page)),
                    last: responseData.last ?? false,
                    first: responseData.first ?? (page === 0),
                };
            }

            return paginatedResponse;
        },
        staleTime: 30 * 1000, // 30 seconds
        placeholderData: (previousData: PaginatedUserResponse | undefined) => previousData, // Keep previous data while fetching new page
    };
}

/**
 * Client-side query options for single audit log detail
 */
export function auditLogDetailQueryOptions(auditLogId: string | number) {
    const url = `/api/logs/${auditLogId}`;

    return {
        queryKey: auditLogsKeys.detail(String(auditLogId)),
        queryFn: async () => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('auditLogDetailQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch audit log'
                );
            }

            const responseData = await response.json();
            return AuditLogSchema.parse(responseData);
        },
        staleTime: 60 * 1000, // 60 seconds
    };
}

