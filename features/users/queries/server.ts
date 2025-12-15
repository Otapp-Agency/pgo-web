import 'server-only';
import { usersKeys, normalizeUserParams, type UserListParams } from './users';
import { UserSchema, PaginatedUserResponse } from '@/lib/definitions';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { getSession } from '@/lib/auth/services/auth.service';
import { z } from 'zod';
import { PAGINATION, QUERY_CACHE } from '@/lib/config/constants';

// Re-export from server-query-client for consistent usage
export { getQueryClient, HydrateClient } from '@/lib/server-query-client';
import { getQueryClient } from '@/lib/server-query-client';

/**
 * Server-side function to fetch paginated users list
 * Uses getSession() for authentication
 * This function is server-only and should not be imported in client components
 */
async function fetchUsersListServer(
    params: UserListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE }
): Promise<PaginatedUserResponse> {
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
                queryParams.set(key, value.toString());
            }
        });
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.users.list}?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store', // Ensure fresh data on each request
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch users';

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
    let paginatedResponse: PaginatedUserResponse;

    if (Array.isArray(responseData)) {
        // Legacy format: just an array
        const parsed = z.array(UserSchema).parse(responseData);

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
        // Paginated response format: { data, meta: { total, per_page, current_page, last_page, from, to } }
        const usersData = responseData.data || [];
        const meta = responseData.meta || {};
        const parsed = z.array(UserSchema).parse(usersData);

        // Backend uses 0-based, convert to 1-based
        const backendPageNumber = responseData.pageNumber ?? meta.current_page ?? 0;

        paginatedResponse = {
            data: parsed,
            pageNumber: backendPageNumber + 1,
            pageSize: meta.per_page ?? per_page,
            totalElements: meta.total ?? parsed.length,
            totalPages: meta.last_page ?? Math.ceil((meta.total ?? parsed.length) / (meta.per_page ?? per_page)),
            last: (backendPageNumber + 1) === (meta.last_page ?? 1),
            first: backendPageNumber === 0,
        };
    }

    return paginatedResponse;
}

/**
 * Server-side function to fetch single user details
 */
async function fetchUserDetailServer(userUid: string) {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.users.getByUid.replace('{uid}', userUid)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch user';

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
    return UserSchema.parse(responseData);
}

/**
 * Prefetch first page of users list on the server
 * This will populate the TanStack Query cache with the initial page
 * Client-side will dynamically prefetch the next 2 pages based on current page
 */
export async function prefetchUsersList() {
    const queryClient = getQueryClient();

    // Prefetch only the first page on server (1-based pagination)
    // Client-side will handle dynamic prefetching of next pages
    const params: UserListParams = { page: PAGINATION.DEFAULT_PAGE, per_page: PAGINATION.DEFAULT_PAGE_SIZE };

    // Normalize params to ensure query key matches client-side queries
    const normalizedParams = normalizeUserParams(params);

    const queryOptions = {
        queryKey: usersKeys.list(normalizedParams),
        queryFn: () => fetchUsersListServer(normalizedParams),
        staleTime: QUERY_CACHE.STALE_TIME_LIST,
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData<PaginatedUserResponse>(usersKeys.list(normalizedParams));
    if (!cachedData) {
        console.warn('Warning: Prefetched users data not found in cache');
    }
}

/**
 * Prefetch a single user detail
 */
export async function prefetchUserDetail(userId: string) {
    const queryClient = getQueryClient();

    const queryOptions = {
        queryKey: usersKeys.detail(userId),
        queryFn: () => fetchUserDetailServer(userId),
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };

    await queryClient.prefetchQuery(queryOptions);
}
