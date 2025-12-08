import 'server-only';
import { rolesKeys, normalizeRoleParams, type RoleListParams } from './roles';
import { RoleSchema, PaginatedRoleResponse } from '../types';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { getSession } from '@/lib/auth/services/auth.service';
import { z } from 'zod';
import { PAGINATION, QUERY_CACHE } from '@/lib/config/constants';

// Re-export from server-query-client for consistent usage
export { getQueryClient, HydrateClient } from '@/lib/server-query-client';
import { getQueryClient } from '@/lib/server-query-client';

/**
 * Server-side function to fetch paginated roles list
 * Uses getSession() for authentication
 * This function is server-only and should not be imported in client components
 */
async function fetchRolesListServer(
    params: RoleListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE }
): Promise<PaginatedRoleResponse> {
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
    if (params.search) {
        queryParams.set('search', params.search);
    }
    if (params.sort && params.sort.length > 0) {
        queryParams.set('sort', params.sort.join(','));
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.roles.list}?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store', // Ensure fresh data on each request
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch roles';

        // Try to extract error message from response
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
        }

        // Map HTTP status codes to appropriate errors
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
    let paginatedResponse: PaginatedRoleResponse;

    if (Array.isArray(responseData)) {
        // Legacy format: just an array
        const parsed = z.array(RoleSchema).parse(responseData);

        paginatedResponse = {
            data: parsed,
            pageNumber: page,
            pageSize: per_page,
            totalElements: parsed.length,
            totalPages: Math.ceil(parsed.length / per_page),
            last: true,
            first: page === 1,
        };
    } else if (responseData.data && Array.isArray(responseData.data)) {
        // Paginated response format from backend
        const parsed = z.array(RoleSchema).parse(responseData.data);

        // Backend uses 0-based, convert to 1-based
        const backendPageNumber = responseData.pageNumber ?? (page - 1);

        paginatedResponse = {
            data: parsed,
            pageNumber: backendPageNumber + 1,
            pageSize: responseData.pageSize ?? per_page,
            totalElements: responseData.totalElements ?? parsed.length,
            totalPages: responseData.totalPages ?? Math.ceil((responseData.totalElements ?? parsed.length) / (responseData.pageSize ?? per_page)),
            last: responseData.last ?? false,
            first: backendPageNumber === 0,
        };
    } else {
        // Fallback: empty response
        paginatedResponse = {
            data: [],
            pageNumber: page,
            pageSize: per_page,
            totalElements: 0,
            totalPages: 0,
            last: true,
            first: page === 1,
        };
    }

    return paginatedResponse;
}

/**
 * Prefetch first page of roles list on the server
 * This will populate the TanStack Query cache with the initial page
 * Client-side will dynamically prefetch the next 2 pages based on current page
 */
export async function prefetchRolesList() {
    const queryClient = getQueryClient();

    // Prefetch only the first page on server (1-based pagination)
    // Client-side will handle dynamic prefetching of next pages
    const params: RoleListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE };

    // Normalize params to ensure query key matches client-side queries
    const normalizedParams = normalizeRoleParams(params);

    const queryOptions = {
        queryKey: rolesKeys.list(normalizedParams),
        queryFn: () => fetchRolesListServer(normalizedParams),
        staleTime: QUERY_CACHE.STALE_TIME_LIST,
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData<PaginatedRoleResponse>(rolesKeys.list(normalizedParams));
    if (!cachedData) {
        console.warn('Warning: Prefetched roles data not found in cache');
    }
}

