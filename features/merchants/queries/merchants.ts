import { MerchantSchema, PaginatedMerchantResponse, BankAccountSchema, BankAccount, MerchantStatusUpdateRequest, CreateMerchantRequest, CreateBankAccountRequest } from '@/lib/definitions';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Query keys factory for merchants
 * Safe to import in both client and server components
 */
export const merchantsKeys = {
    all: ['merchants'] as const,
    lists: () => [...merchantsKeys.all, 'list'] as const,
    list: (params?: MerchantListParams) =>
        params ? [...merchantsKeys.lists(), params] as const : [...merchantsKeys.lists()] as const,
    details: () => [...merchantsKeys.all, 'detail'] as const,
    detail: (id: string) => [...merchantsKeys.details(), id] as const,
};

export interface MerchantListParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    merchantType?: string;
    kyc_verified?: boolean;
    sort?: string[];
}

/**
 * Normalize params object to ensure consistent query keys
 * Removes undefined/null/empty values and ensures consistent structure
 * Exported for use in server-side prefetch to ensure cache key matching
 */
export function normalizeMerchantParams(params: MerchantListParams): MerchantListParams {
    const normalized: MerchantListParams = {
        page: params.page ?? 0,
        per_page: params.per_page ?? 15,
    };

    // Add other params only if they have values
    if (params.search) normalized.search = params.search;
    if (params.status) normalized.status = params.status;
    if (params.merchantType) normalized.merchantType = params.merchantType;
    if (params.kyc_verified !== undefined) normalized.kyc_verified = params.kyc_verified;
    if (params.sort && params.sort.length > 0) normalized.sort = params.sort;

    return normalized;
}

/**
 * Client-side query options for paginated merchants list
 * Returns paginated response with metadata (pageNumber, pageSize, totalElements, totalPages, etc.)
 * 
 * Supports query parameters for filtering:
 * - search (code/name), status (active/inactive), type, kyc_verified
 * - page, per_page
 */
export function merchantsListQueryOptions(
    params: MerchantListParams = { page: 0, per_page: 15 }
) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizeMerchantParams(params);

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

    const url = `/api/merchants?${queryParams.toString()}`;

    // Query key uses normalized params to ensure consistent caching
    // Same params with different object references will now match
    const queryKey = merchantsKeys.list(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<PaginatedMerchantResponse> => {
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
                    errorData.error || errorData.message || 'Failed to fetch merchants'
                );
            }

            const responseData = await response.json();

            // Handle both array response (legacy) and paginated response
            let paginatedResponse: PaginatedMerchantResponse;

            if (Array.isArray(responseData)) {
                // Legacy format: just an array
                // Transform to paginated format
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
                // Paginated response format (already transformed by API route)
                const parsed = z.array(MerchantSchema).parse(responseData.data || []);

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
        },
        staleTime: 30 * 1000, // 30 seconds
        placeholderData: (previousData: PaginatedMerchantResponse | undefined) => previousData, // Keep previous data while fetching new page
    };
}

/**
 * Client-side query options for single merchant detail
 */
export function merchantDetailQueryOptions(merchantId: string) {
    const url = `/api/merchants/${merchantId}`;

    return {
        queryKey: merchantsKeys.detail(merchantId),
        queryFn: async () => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('merchantDetailQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch merchant'
                );
            }

            const responseData = await response.json();
            return MerchantSchema.parse(responseData);
        },
        staleTime: 60 * 1000, // 60 seconds
    };
}

/**
 * Hook to delete a merchant
 */
export function useDeleteMerchant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (uid: string) => {
            const url = `/api/merchants/${uid}`;
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useDeleteMerchant should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to delete merchant'
                );
            }

            const responseData = await response.json();
            return responseData;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: merchantsKeys.lists() });
            toast.success(data.message || 'Merchant deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete merchant');
        },
    });
}

/**
 * Hook to update a merchant's status
 */
export function useUpdateMerchantStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ uid, status, reason }: { uid: string } & MerchantStatusUpdateRequest) => {
            const url = `/api/merchants/${uid}/status`;
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useUpdateMerchantStatus should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status, reason }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to update merchant status'
                );
            }

            const responseData = await response.json();
            return responseData;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: merchantsKeys.lists() });
            toast.success(data.message || 'Merchant status updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update merchant status');
        },
    });
}

/**
 * Query keys for bank accounts
 */
export const bankAccountsKeys = {
    all: ['bank-accounts'] as const,
    list: (merchantUid: string) => [...bankAccountsKeys.all, 'list', merchantUid] as const,
};

/**
 * Hook to fetch merchant bank accounts
 */
export function useMerchantBankAccounts(merchantUid: string) {
    const url = `/api/merchants/${merchantUid}/bank-accounts`;

    return useQuery({
        queryKey: bankAccountsKeys.list(merchantUid),
        queryFn: async (): Promise<BankAccount[]> => {
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useMerchantBankAccounts should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch bank accounts'
                );
            }

            const responseData = await response.json();
            const bankAccounts = responseData.data || [];
            return z.array(BankAccountSchema).parse(bankAccounts);
        },
        staleTime: 60 * 1000, // 60 seconds
        enabled: !!merchantUid,
    });
}

/**
 * Hook to create or update a merchant bank account
 */
export function useCreateUpdateBankAccount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ merchantUid, bankAccount }: { merchantUid: string; bankAccount: CreateBankAccountRequest }) => {
            const url = `/api/merchants/${merchantUid}/bank-accounts`;
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useCreateUpdateBankAccount should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bankAccount),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to save bank account'
                );
            }

            const responseData = await response.json();
            return { ...responseData, merchantUid };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: bankAccountsKeys.list(data.merchantUid) });
            toast.success(data.message || 'Bank account saved successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to save bank account');
        },
    });
}

/**
 * Hook to deactivate a merchant bank account
 */
export function useDeactivateBankAccount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ merchantUid, bankAccountUid }: { merchantUid: string; bankAccountUid: string }) => {
            const url = `/api/merchants/${merchantUid}/bank-accounts/${bankAccountUid}`;
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useDeactivateBankAccount should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to deactivate bank account'
                );
            }

            const responseData = await response.json();
            return { ...responseData, merchantUid };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: bankAccountsKeys.list(data.merchantUid) });
            toast.success(data.message || 'Bank account deactivated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to deactivate bank account');
        },
    });
}

/**
 * Hook to create a new merchant
 */
export function useCreateMerchant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (merchantData: CreateMerchantRequest) => {
            const url = `/api/merchants`;
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('useCreateMerchant should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(merchantData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to create merchant'
                );
            }

            const responseData = await response.json();
            return responseData;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: merchantsKeys.lists() });
            toast.success(data.message || 'Merchant created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create merchant');
        },
    });
}

