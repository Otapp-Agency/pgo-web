import { PaymentGatewaySchema, PaginatedPaymentGatewayResponse } from '@/lib/definitions';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Query keys factory for payment gateways
 * Safe to import in both client and server components
 */
export const paymentGatewaysKeys = {
    all: ['payment-gateways'] as const,
    lists: () => [...paymentGatewaysKeys.all, 'list'] as const,
    list: (params?: PaymentGatewayListParams) =>
        params ? [...paymentGatewaysKeys.lists(), params] as const : [...paymentGatewaysKeys.lists()] as const,
    details: () => [...paymentGatewaysKeys.all, 'detail'] as const,
    detail: (id: string) => [...paymentGatewaysKeys.details(), id] as const,
    available: () => [...paymentGatewaysKeys.all, 'available'] as const,
};

export interface PaymentGatewayListParams {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
    sort?: string[];
}

/**
 * Normalize params object to ensure consistent query keys
 * Removes undefined/null/empty values and ensures consistent structure
 * Exported for use in server-side prefetch to ensure cache key matching
 */
export function normalizePaymentGatewayParams(params: PaymentGatewayListParams): PaymentGatewayListParams {
    const normalized: PaymentGatewayListParams = {
        page: params.page ?? 0,
        per_page: params.per_page ?? 15,
    };

    // Add other params only if they have values
    if (params.search) normalized.search = params.search;
    if (params.is_active !== undefined) normalized.is_active = params.is_active;
    if (params.sort && params.sort.length > 0) normalized.sort = params.sort;

    return normalized;
}

/**
 * Client-side query options for paginated payment gateways list
 * Returns paginated response with metadata (pageNumber, pageSize, totalElements, totalPages, etc.)
 * 
 * Supports query parameters for filtering:
 * - search (name/code), is_active (boolean)
 * - page, per_page
 */
export function paymentGatewaysListQueryOptions(
    params: PaymentGatewayListParams = { page: 0, per_page: 15 }
) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizePaymentGatewayParams(params);

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

    const url = `/api/payment-gateways?${queryParams.toString()}`;

    // Query key uses normalized params to ensure consistent caching
    // Same params with different object references will now match
    const queryKey = paymentGatewaysKeys.list(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<PaginatedPaymentGatewayResponse> => {
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
                    errorData.error || errorData.message || 'Failed to fetch payment gateways'
                );
            }

            const responseData = await response.json();

            console.log('Payment gateways response data:', responseData);

            // Handle both array response (legacy) and paginated response
            let paginatedResponse: PaginatedPaymentGatewayResponse;

            if (Array.isArray(responseData)) {
                // Legacy format: just an array
                // Transform to paginated format
                try {
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
                } catch (error) {
                    console.error('Zod validation error for array response:', error);
                    console.error('Response data:', responseData);
                    throw error;
                }
            } else {
                // Paginated response format (already transformed by API route)
                try {
                    // Check if responseData has the expected structure
                    if (!responseData || typeof responseData !== 'object') {
                        throw new Error('Invalid response format: response is not an object');
                    }

                    const dataArray = responseData.data;
                    if (!Array.isArray(dataArray)) {
                        console.error('Response data.data is not an array:', dataArray);
                        throw new Error('Invalid response format: data is not an array');
                    }

                    // Parse each item individually to see which one fails
                    const parsed = dataArray.map((item, index) => {
                        try {
                            return PaymentGatewaySchema.parse(item);
                        } catch (parseError) {
                            console.error(`Validation error for item ${index}:`, parseError);
                            console.error('Item data:', item);
                            throw parseError;
                        }
                    });

                    paginatedResponse = {
                        data: parsed,
                        pageNumber: responseData.pageNumber ?? page,
                        pageSize: responseData.pageSize ?? per_page,
                        totalElements: responseData.totalElements ?? parsed.length,
                        totalPages: responseData.totalPages ?? Math.ceil((responseData.totalElements ?? parsed.length) / (responseData.pageSize ?? per_page)),
                        last: responseData.last ?? false,
                        first: responseData.first ?? (page === 0),
                    };
                } catch (error) {
                    console.error('Zod validation error for paginated response:', error);
                    console.error('Response data:', responseData);
                    console.error('Response data.data:', responseData.data);
                    throw error;
                }
            }

            return paginatedResponse;
        },
        staleTime: 30 * 1000, // 30 seconds
        placeholderData: (previousData: PaginatedPaymentGatewayResponse | undefined) => previousData, // Keep previous data while fetching new page
    };
}

/**
 * Client-side query options for single payment gateway detail
 */
export function paymentGatewayDetailQueryOptions(paymentGatewayId: string) {
    const url = `/api/payment-gateways/${paymentGatewayId}`;

    return {
        queryKey: paymentGatewaysKeys.detail(paymentGatewayId),
        queryFn: async () => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('paymentGatewayDetailQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch payment gateway'
                );
            }

            const responseData = await response.json();
            return PaymentGatewaySchema.parse(responseData);
        },
        staleTime: 60 * 1000, // 60 seconds
    };
}

/**
 * Client-side query options for available payment gateways
 */
export function availablePaymentGatewaysQueryOptions() {
    const url = `/api/available-payment-gateways`;

    return {
        queryKey: paymentGatewaysKeys.available(),
        queryFn: async () => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('availablePaymentGatewaysQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch available payment gateways'
                );
            }

            const responseData = await response.json();
            return z.array(PaymentGatewaySchema).parse(responseData.data || []);
        },
        staleTime: 60 * 1000, // 60 seconds
    };
}

/**
 * Create Payment Gateway Schema for form validation
 */
export const CreatePaymentGatewaySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required').regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, and underscores only'),
    api_base_url_production: z.string().min(1, 'Production API URL is required').url('Invalid production URL'),
    api_base_url_sandbox: z.string().min(1, 'Sandbox API URL is required').url('Invalid sandbox URL'),
    credentials: z.object({
        api_key: z.string().min(1, 'API key is required'),
        secret_key: z.string().min(1, 'Secret key is required'),
        merchant_id: z.string().optional(),
    }).passthrough(), // Allow additional PSP-specific credentials
    supported_methods: z.array(z.enum(['MNO', 'CARD', 'BANK_TRANSFER'])).min(1, 'At least one payment method is required'),
    is_active: z.boolean(),
});

export type CreatePaymentGatewayInput = z.infer<typeof CreatePaymentGatewaySchema>;

/**
 * API request body type
 */
export interface CreatePaymentGatewayRequest {
    name: string;
    code: string;
    api_base_url_production?: string;
    api_base_url_sandbox?: string;
    credentials: Record<string, string>;
    supported_methods: string[];
    is_active: boolean;
}

/**
 * Hook to create a new payment gateway
 */
export function useCreatePaymentGateway() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePaymentGatewayInput) => {
            const url = '/api/payment-gateways';
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useCreatePaymentGateway should only be used client-side');
            }

            // Transform credentials to ensure all values are strings
            const credentials: Record<string, string> = {};
            Object.entries(data.credentials).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    credentials[key] = String(value);
                }
            });

            const requestBody: CreatePaymentGatewayRequest = {
                name: data.name,
                code: data.code,
                api_base_url_production: data.api_base_url_production,
                api_base_url_sandbox: data.api_base_url_sandbox,
                credentials,
                supported_methods: data.supported_methods,
                is_active: data.is_active,
            };

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to create payment gateway'
                );
            }

            const responseData = await response.json();
            return responseData;
        },
        onSuccess: (data) => {
            // Invalidate payment gateways list to refetch
            queryClient.invalidateQueries({ queryKey: paymentGatewaysKeys.lists() });
            toast.success(data.message || 'Payment Gateway created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create payment gateway');
        },
    });
}

/**
 * Hook to activate a payment gateway
 * @param uid - The payment gateway's uid (used as id in the API path)
 */
export function useActivatePaymentGateway() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (uid: string) => {
            // Use uid as the path parameter (API route expects 'id' but we pass uid)
            const url = `/api/payment-gateways/${uid}/activate`;
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useActivatePaymentGateway should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to activate payment gateway'
                );
            }

            const responseData = await response.json();
            return responseData;
        },
        onSuccess: (data) => {
            // Invalidate payment gateways list to refetch
            queryClient.invalidateQueries({ queryKey: paymentGatewaysKeys.lists() });
            queryClient.invalidateQueries({ queryKey: paymentGatewaysKeys.available() });
            toast.success(data.message || 'Payment Gateway activated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to activate payment gateway');
        },
    });
}

/**
 * Hook to deactivate a payment gateway
 * @param uid - The payment gateway's uid (used as id in the API path)
 */
export function useDeactivatePaymentGateway() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (uid: string) => {
            // Use uid as the path parameter (API route expects 'id' but we pass uid)
            const url = `/api/payment-gateways/${uid}/deactivate`;
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useDeactivatePaymentGateway should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to deactivate payment gateway'
                );
            }

            const responseData = await response.json();
            return responseData;
        },
        onSuccess: (data) => {
            // Invalidate payment gateways list to refetch
            queryClient.invalidateQueries({ queryKey: paymentGatewaysKeys.lists() });
            queryClient.invalidateQueries({ queryKey: paymentGatewaysKeys.available() });
            toast.success(data.message || 'Payment Gateway deactivated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to deactivate payment gateway');
        },
    });
}


