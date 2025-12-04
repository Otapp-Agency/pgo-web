import 'server-only';
import { paymentGatewaysKeys, normalizePaymentGatewayParams, type PaymentGatewayListParams } from './payment-gateways';
import { PaymentGatewaySchema, PaginatedPaymentGatewayResponse } from '@/lib/definitions';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { getSession } from '@/lib/auth/services/auth.service';
import { z } from 'zod';
import { getQueryClient } from '@/lib/server-query-client';

// Re-export getQueryClient and HydrateClient from trpc/server.tsx
// This ensures we use the same query client instance
export { getQueryClient, HydrateClient } from '@/lib/server-query-client';

/**
 * Server-side function to fetch paginated payment gateways list
 * Uses getSession() for authentication
 * This function is server-only and should not be imported in client components
 */
async function fetchPaymentGatewaysListServer(
    params: PaymentGatewayListParams = { page: 0, per_page: 15 }
): Promise<PaginatedPaymentGatewayResponse> {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    // Build query string with pagination params
    const page = params.page ?? 0;
    const per_page = params.per_page ?? 15;
    const queryParams = new URLSearchParams();

    // Add other filter params if present
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (key !== 'page' && key !== 'per_page' && value !== undefined && value !== null && value !== '') {
                queryParams.set(key, value.toString());
            }
        });
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.list}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store', // Ensure fresh data on each request
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch payment gateways';

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

    console.log('Payment gateways response data:', responseData);

    // Handle both array response (legacy) and paginated response
    let paginatedResponse: PaginatedPaymentGatewayResponse;

    if (Array.isArray(responseData)) {
        // Legacy format: just an array
        const parsed = z.array(PaymentGatewaySchema).parse(responseData);

        paginatedResponse = {
            data: parsed,
            pageNumber: page,
            pageSize: per_page,
            totalElements: parsed.length,
            totalPages: Math.ceil(parsed.length / per_page),
            last: true,
            first: page === 0,
        };
    } else {
        // Paginated response format
        const gatewaysData = responseData.data || [];
        const parsed = z.array(PaymentGatewaySchema).parse(gatewaysData);

        paginatedResponse = {
            data: parsed,
            pageNumber: responseData.pageNumber ?? page,
            pageSize: responseData.pageSize ?? per_page,
            totalElements: responseData.totalElements ?? parsed.length,
            totalPages: responseData.totalPages ?? Math.ceil((responseData.totalElements ?? parsed.length) / (responseData.pageSize ?? per_page)),
            last: responseData.last ?? false,
            first: responseData.first ?? (page === 0),
        };
    }

    return paginatedResponse;
}

/**
 * Server-side function to fetch single payment gateway details
 */
async function fetchPaymentGatewayDetailServer(paymentGatewayId: string) {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.getById.replace('{id}', paymentGatewayId)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch payment gateway';

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
    return PaymentGatewaySchema.parse(responseData);
}

/**
 * Prefetch first page of payment gateways list on the server
 * This will populate the TanStack Query cache with the initial page
 * Client-side will dynamically prefetch the next 2 pages based on current page
 */
export async function prefetchPaymentGatewaysList() {
    const queryClient = getQueryClient();

    // Prefetch only the first page on server (0-based pagination)
    // Client-side will handle dynamic prefetching of next pages
    const params: PaymentGatewayListParams = { page: 0, per_page: 15 };

    // Normalize params to ensure query key matches client-side queries
    const normalizedParams = normalizePaymentGatewayParams(params);

    const queryOptions = {
        queryKey: paymentGatewaysKeys.list(normalizedParams),
        queryFn: () => fetchPaymentGatewaysListServer(normalizedParams),
        staleTime: 30 * 1000, // 30 seconds
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData<PaginatedPaymentGatewayResponse>(paymentGatewaysKeys.list(normalizedParams));
    if (!cachedData) {
        console.warn('Warning: Prefetched payment gateways data not found in cache');
    }
}










