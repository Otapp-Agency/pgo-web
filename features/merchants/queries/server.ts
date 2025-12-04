import 'server-only';
import { merchantsKeys, normalizeMerchantParams, type MerchantListParams } from './merchants';
import { MerchantSchema, PaginatedMerchantResponse } from '@/lib/definitions';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { getSession } from '@/lib/auth/services/auth.service';
import { z } from 'zod';
import { getQueryClient } from '@/lib/server-query-client';

// Re-export getQueryClient and HydrateClient from trpc/server.tsx
// This ensures we use the same query client instance
export { getQueryClient, HydrateClient } from '@/lib/server-query-client';

/**
 * Server-side function to fetch paginated merchants list
 * Uses getSession() for authentication
 * This function is server-only and should not be imported in client components
 */
async function fetchMerchantsListServer(
    params: MerchantListParams = { page: 0, per_page: 15 }
): Promise<PaginatedMerchantResponse> {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    // Build query string with pagination params
    // Backend API uses 'size' instead of 'per_page' and 0-based pagination
    const page = params.page ?? 0;
    const per_page = params.per_page ?? 15;
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    queryParams.set('size', per_page.toString());

    // Add other filter params if present
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (key !== 'page' && key !== 'per_page' && value !== undefined && value !== null && value !== '') {
                queryParams.set(key, value.toString());
            }
        });
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.list}?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store', // Ensure fresh data on each request
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch merchants';

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
    let paginatedResponse: PaginatedMerchantResponse;

    if (Array.isArray(responseData)) {
        // Legacy format: just an array
        const parsed = z.array(MerchantSchema).parse(responseData);

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
        // Paginated response format: { data, meta: { total, per_page, current_page, last_page, from, to } }
        // Backend returns 1-based pagination (current_page: 1 = first page), frontend expects 0-based (pageNumber: 0 = first page)
        const merchantsData = responseData.data || [];
        const meta = responseData.meta || {};
        const parsed = z.array(MerchantSchema).parse(merchantsData);

        // Convert 1-based backend pagination to 0-based frontend pagination
        const backendCurrentPage = meta.current_page;
        const backendLastPage = meta.last_page;
        const frontendPageNumber = backendCurrentPage !== undefined ? backendCurrentPage - 1 : page;
        const calculatedTotalPages = Math.ceil((meta.total ?? parsed.length) / (meta.per_page ?? per_page));
        const totalPages = backendLastPage ?? calculatedTotalPages;

        paginatedResponse = {
            data: parsed,
            pageNumber: frontendPageNumber,
            pageSize: meta.per_page ?? per_page,
            totalElements: meta.total ?? parsed.length,
            totalPages: totalPages,
            // Check if meta exists and has values before comparing (fixes undefined === undefined bug)
            // If meta is missing, calculate last based on frontend page number
            last: backendCurrentPage !== undefined && backendLastPage !== undefined 
                ? backendCurrentPage === backendLastPage 
                : frontendPageNumber >= totalPages - 1,
            first: backendCurrentPage === 1 || (backendCurrentPage === undefined && page === 0),
        };
    }

    return paginatedResponse;
}

/**
 * Server-side function to fetch single merchant details by UID
 */
async function fetchMerchantDetailServer(uid: string) {
    const session = await getSession();

    if (!session?.token) {
        throw new Error('Unauthorized: No session token available');
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.getByUid.replace('{uid}', uid)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Failed to fetch merchant';

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
    const merchant = responseData.data || responseData;
    
    // Transform backend response to frontend format
    const transformedMerchant = {
        id: merchant.id?.toString() || merchant.id,
        uid: merchant.uid,
        code: merchant.code,
        name: merchant.name,
        business_name: merchant.businessName || merchant.business_name,
        business_registration_number: merchant.businessRegistrationNumber || merchant.business_registration_number,
        business_address: merchant.businessAddress || merchant.business_address,
        business_city: merchant.businessCity || merchant.business_city,
        business_state: merchant.businessState || merchant.business_state,
        business_postal_code: merchant.businessPostalCode || merchant.business_postal_code,
        business_country: merchant.businessCountry || merchant.business_country,
        contact_email: merchant.contactEmail || merchant.contact_email,
        contact_phone: merchant.contactPhone || merchant.contact_phone,
        website_url: merchant.websiteUrl || merchant.website_url,
        merchant_type: merchant.merchantType || merchant.merchant_type,
        status: merchant.status,
        status_reason: merchant.statusReason || merchant.status_reason,
        merchant_role: merchant.merchantRole || merchant.merchant_role,
        kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
        kyc_status: merchant.kycStatus || merchant.kyc_status,
        kyc_notes: merchant.kycNotes || merchant.kyc_notes,
        kyc_verified_at: merchant.kycVerifiedAt || merchant.kyc_verified_at,
        kyc_verified_by: merchant.kycVerifiedBy || merchant.kyc_verified_by,
        single_transaction_limit: merchant.singleTransactionLimit?.toString() || merchant.single_transaction_limit,
        daily_transaction_limit: merchant.dailyTransactionLimit?.toString() || merchant.daily_transaction_limit,
        monthly_transaction_limit: merchant.monthlyTransactionLimit?.toString() || merchant.monthly_transaction_limit,
        parent_merchant_uid: merchant.parentMerchantUid || merchant.parent_merchant_uid,
        parent_merchant_name: merchant.parentMerchantName || merchant.parent_merchant_name,
        created_at: merchant.createdAt || merchant.created_at,
        updated_at: merchant.updatedAt || merchant.updated_at,
    };
    
    return MerchantSchema.parse(transformedMerchant);
}

/**
 * Prefetch merchant detail on the server
 */
export async function prefetchMerchantDetail(uid: string) {
    const queryClient = getQueryClient();
    // Import merchantDetailKeys dynamically to avoid circular dependencies
    const merchantsModule = await import('./merchants');
    const merchantDetailKeys = merchantsModule.merchantDetailKeys || {
        detail: (id: string) => ['merchant-detail', id] as const,
    };

    const queryOptions = {
        queryKey: merchantDetailKeys.detail(uid),
        queryFn: () => fetchMerchantDetailServer(uid),
        staleTime: 60 * 1000, // 60 seconds
    };

    await queryClient.prefetchQuery(queryOptions);
}

/**
 * Prefetch first page of merchants list on the server
 * This will populate the TanStack Query cache with the initial page
 * Client-side will dynamically prefetch the next 2 pages based on current page
 */
export async function prefetchMerchantsList() {
    const queryClient = getQueryClient();

    // Prefetch only the first page on server (0-based pagination)
    // Client-side will handle dynamic prefetching of next pages
    const params: MerchantListParams = { page: 0, per_page: 15 };

    // Normalize params to ensure query key matches client-side queries
    const normalizedParams = normalizeMerchantParams(params);

    const queryOptions = {
        queryKey: merchantsKeys.list(normalizedParams),
        queryFn: () => fetchMerchantsListServer(normalizedParams),
        staleTime: 30 * 1000, // 30 seconds
    };

    // Ensure prefetch completes before continuing
    await queryClient.prefetchQuery(queryOptions);

    // Verify the data is in the cache
    const cachedData = queryClient.getQueryData<PaginatedMerchantResponse>(merchantsKeys.list(normalizedParams));
    if (!cachedData) {
        console.warn('Warning: Prefetched merchants data not found in cache');
    }
}

