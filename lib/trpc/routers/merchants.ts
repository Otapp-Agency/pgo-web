import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../init';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import {
    CreateMerchantRequestSchema,
    CreateBankAccountRequestSchema,
} from '@/lib/definitions';

/**
 * Helper function to transform merchant data from backend format to frontend format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMerchant(merchant: any) {
    // Normalize status to uppercase (ACTIVE, SUSPENDED, INACTIVE)
    let normalizedStatus = merchant.status || merchant.activeStatus || '';
    if (!normalizedStatus && merchant.active !== undefined) {
        normalizedStatus = merchant.active ? 'ACTIVE' : 'INACTIVE';
    }
    // Ensure uppercase
    normalizedStatus = normalizedStatus.toUpperCase();

    return {
        id: merchant.id?.toString() || merchant.id,
        uid: merchant.uid,
        code: merchant.code,
        name: merchant.name,
        business_name: merchant.businessName ?? merchant.business_name ?? null,
        business_registration_number: merchant.businessRegistrationNumber ?? merchant.business_registration_number ?? null,
        business_address: merchant.businessAddress ?? merchant.business_address ?? null,
        business_city: merchant.businessCity ?? merchant.business_city ?? null,
        business_state: merchant.businessState ?? merchant.business_state ?? null,
        business_postal_code: merchant.businessPostalCode ?? merchant.business_postal_code ?? null,
        business_country: merchant.businessCountry ?? merchant.business_country ?? null,
        contact_email: merchant.contactEmail ?? merchant.contact_email ?? null,
        contact_phone: merchant.contactPhone ?? merchant.contact_phone ?? null,
        website_url: merchant.websiteUrl ?? merchant.website_url ?? null,
        merchant_type: merchant.merchantType ?? merchant.merchant_type ?? null,
        status: normalizedStatus || 'ACTIVE',
        status_reason: merchant.statusReason ?? merchant.status_reason ?? null,
        merchant_role: merchant.merchantRole ?? merchant.merchant_role ?? null,
        kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
        kyc_status: merchant.kycStatus ?? merchant.kyc_status ?? null,
        kyc_notes: merchant.kycNotes ?? merchant.kyc_notes ?? null,
        kyc_verified_at: merchant.kycVerifiedAt ?? merchant.kyc_verified_at ?? null,
        kyc_verified_by: merchant.kycVerifiedBy ?? merchant.kyc_verified_by ?? null,
        single_transaction_limit: merchant.singleTransactionLimit?.toString() ?? merchant.single_transaction_limit ?? null,
        daily_transaction_limit: merchant.dailyTransactionLimit?.toString() ?? merchant.daily_transaction_limit ?? null,
        monthly_transaction_limit: merchant.monthlyTransactionLimit?.toString() ?? merchant.monthly_transaction_limit ?? null,
        parent_merchant_uid: merchant.parentMerchantUid ?? merchant.parent_merchant_uid ?? null,
        parent_merchant_name: merchant.parentMerchantName ?? merchant.parent_merchant_name ?? null,
        created_at: merchant.createdAt ?? merchant.created_at ?? null,
        updated_at: merchant.updatedAt ?? merchant.updated_at ?? null,
    };
}

/**
 * Helper function to transform bank account data from backend format to frontend format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBankAccount(account: any) {
    return {
        id: account.id ?? account.uid ?? '',
        uid: account.uid ?? account.id ?? '',
        bank_name: account.bankName ?? account.bank_name ?? '',
        account_name: account.accountName ?? account.account_name ?? '',
        account_number: account.accountNumber ?? account.account_number ?? '',
        bank_code: account.bankCode ?? account.bank_code ?? null,
        branch_code: account.branchCode ?? account.branch_code ?? null,
        account_type: account.accountType ?? account.account_type ?? null,
        swift_code: account.swiftCode ?? account.swift_code ?? null,
        iban: account.iban ?? null,
        bank_address: account.bankAddress ?? account.bank_address ?? null,
        currency: account.currency ?? 'USD',
        status: account.status ?? (account.isActive !== undefined ? (account.isActive ? 'ACTIVE' : 'INACTIVE') : null),
        is_active: (account.status === 'ACTIVE' || account.isActive) ?? account.is_active ?? account.active ?? true,
        primary: account.primary ?? account.isPrimary ?? account.is_primary ?? false,
        is_primary: account.primary ?? account.isPrimary ?? account.is_primary ?? false,
        notes: account.notes ?? null,
        created_at: account.createdAt ?? account.created_at ?? null,
        updated_at: account.updatedAt ?? account.updated_at ?? null,
    };
}

export const merchantsRouter = createTRPCRouter({
    /**
     * List all merchants with pagination and filtering
     */
    list: protectedProcedure
        .input(
            z.object({
                page: z.string().optional(),
                per_page: z.string().optional(),
                search: z.string().optional(),
                status: z.string().optional(),
                merchantType: z.string().optional(),
                kyc_verified: z.string().optional(),
                sort: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;

            // Build query parameters
            const queryParams = new URLSearchParams();
            const allowedParams = [
                'page',
                'per_page',
                'search',
                'status',
                'merchantType',
                'kyc_verified',
                'sort',
            ] as const;

            allowedParams.forEach((param) => {
                const value = input[param];
                if (value !== null && value !== undefined && value !== '') {
                    // Backend API uses 'size' instead of 'per_page'
                    if (param === 'per_page') {
                        queryParams.set('size', value);
                    } else {
                        queryParams.set(param, value);
                    }
                }
            });

            // Build the URL with query parameters
            const queryString = queryParams.toString();
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.list}${queryString ? `?${queryString}` : ''}`;

            // Fetch from backend API
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch merchants',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch merchants',
                });
            }

            const data = await response.json();

            // Transform response
            if (data.data && Array.isArray(data.data)) {
                const transformedData = data.data.map(transformMerchant);
                const backendPageNumber = data.pageNumber ?? parseInt(input.page || '0', 10);

                return {
                    data: transformedData,
                    pageNumber: backendPageNumber,
                    pageSize: data.pageSize ?? parseInt(input.per_page || '15'),
                    totalElements: data.totalElements ?? transformedData.length,
                    totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedData.length) / (data.pageSize ?? parseInt(input.per_page || '15'))),
                    last: data.last ?? false,
                    first: backendPageNumber === 0,
                };
            } else if (Array.isArray(data)) {
                // Legacy format
                const page = parseInt(input.page || '0', 10);
                const perPage = parseInt(input.per_page || '15', 10);
                const transformedData = data.map(transformMerchant);

                return {
                    data: transformedData,
                    pageNumber: page,
                    pageSize: perPage,
                    totalElements: transformedData.length,
                    totalPages: 1,
                    last: true,
                    first: page === 0,
                };
            } else {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Unexpected response format from backend',
                });
            }
        }),

    /**
     * Get merchant by UID
     */
    getByUid: protectedProcedure
        .input(z.object({ uid: z.string() }))
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.getByUid.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch merchant',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch merchant',
                });
            }

            const data = await response.json();
            const merchant = data.data || data;

            return transformMerchant(merchant);
        }),

    /**
     * Create a new merchant
     */
    create: protectedProcedure
        .input(CreateMerchantRequestSchema)
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.create}`;

            console.log('Creating merchant with payload:', JSON.stringify(input, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(input),
            });

            const data = await response.json().catch((parseError) => {
                console.error('Failed to parse response JSON:', parseError);
                return {};
            });

            console.log('Merchant creation response status:', response.status);
            console.log('Merchant creation response data:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error('Merchant creation failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data,
                });

                // Use appropriate error code based on status
                // TRPC error codes: PARSE_ERROR, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, METHOD_NOT_SUPPORTED, TIMEOUT, CONFLICT, PRECONDITION_FAILED, PAYLOAD_TOO_LARGE, UNPROCESSABLE_CONTENT, INTERNAL_SERVER_ERROR
                let errorCode: 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR' = 'INTERNAL_SERVER_ERROR';
                if (response.status >= 400 && response.status < 500) {
                    if (response.status === 401) {
                        errorCode = 'BAD_REQUEST';
                    } else if (response.status === 403) {
                        errorCode = 'BAD_REQUEST';
                    } else if (response.status === 404) {
                        errorCode = 'BAD_REQUEST';
                    } else {
                        errorCode = 'BAD_REQUEST';
                    }
                }

                throw new TRPCError({
                    code: errorCode,
                    message: data.message || data.error || 'Failed to create merchant',
                });
            }

            // Transform response
            const merchant = data.data || data;
            const transformedMerchant = merchant && merchant.id ? {
                id: merchant.id,
                uid: merchant.uid,
                code: merchant.code || merchant.merchantCode,
                name: merchant.name || merchant.merchantName,
                type: merchant.type || merchant.merchantType || null,
                status: merchant.status ?? 'ACTIVE',
                kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
                email: merchant.email || merchant.contactEmail || null,
                contact_info: merchant.contactInfo ?? merchant.contact_info ?? merchant.contactPhone ?? null,
                description: merchant.description ?? null,
                created_at: merchant.createdAt ?? merchant.created_at ?? null,
                updated_at: merchant.updatedAt ?? merchant.updated_at ?? null,
            } : null;

            return {
                message: data.message || 'Merchant created successfully',
                merchant: transformedMerchant,
            };
        }),

    /**
     * Delete a merchant
     */
    delete: protectedProcedure
        .input(z.object({ uid: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.delete.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to delete merchant',
                });
            }

            return {
                message: data.message || 'Merchant deleted successfully',
            };
        }),

    /**
     * Lookup merchants for autocomplete/search
     */
    lookup: protectedProcedure
        .input(
            z.object({
                q: z.string().optional(),
                uid: z.string().optional(),
                id: z.string().optional(),
                page: z.string().optional(),
                size: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;

            const queryParams = new URLSearchParams();
            if (input.q) queryParams.set('q', input.q);
            if (input.uid) queryParams.set('uid', input.uid);
            if (input.id) queryParams.set('id', input.id);
            queryParams.set('page', input.page || '0');
            queryParams.set('size', input.size || '50');

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.lookup}?${queryParams.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to lookup merchants',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to lookup merchants',
                });
            }

            const data = await response.json();
            const merchants = data.data || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformedMerchants = merchants.map((merchant: any) => ({
                id: merchant.id?.toString() || merchant.id,
                uid: merchant.uid,
                name: merchant.name,
                code: merchant.code,
                status: merchant.status || null,
            }));

            return {
                data: transformedMerchants,
                meta: {
                    pageNumber: data.meta?.pageNumber ?? parseInt(input.page || '0', 10),
                    pageSize: data.meta?.pageSize ?? parseInt(input.size || '50', 10),
                    totalElements: data.meta?.totalElements ?? transformedMerchants.length,
                    totalPages: data.meta?.totalPages ?? Math.ceil((data.meta?.totalElements ?? transformedMerchants.length) / parseInt(input.size || '50', 10)),
                    last: data.meta?.last ?? true,
                },
            };
        }),

    /**
     * Get merchant activity summary
     */
    activity: protectedProcedure
        .input(z.object({ uid: z.string() }))
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.activity.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch merchant activity',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch merchant activity',
                });
            }

            const data = await response.json();
            const activity = data.data || data;

            return {
                totalTransactions: activity.totalTransactions ?? 0,
                successfulTransactions: activity.successfulTransactions ?? 0,
                failedTransactions: activity.failedTransactions ?? 0,
                pendingTransactions: activity.pendingTransactions ?? 0,
                totalDisbursements: activity.totalDisbursements ?? 0,
                lastTransactionAt: activity.lastTransactionAt || null,
            };
        }),

    /**
     * Get merchant API keys
     */
    getApiKeys: protectedProcedure
        .input(
            z.object({
                uid: z.string(),
                page: z.string().optional(),
                per_page: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, page = '0', per_page = '15' } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.getApiKeys.replace('{uid}', uid)}?page=${page}&size=${per_page}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch API keys',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch API keys',
                });
            }

            const data = await response.json();
            const apiKeys = data.data || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformedApiKeys = apiKeys.map((key: any) => ({
                apiKey: key.apiKey,
                secretKey: key.secretKey || null,
                expiresAt: key.expiresAt || null,
                status: key.status || 'ACTIVE',
            }));

            return {
                data: transformedApiKeys,
                pageNumber: data.pageNumber ?? parseInt(page, 10),
                pageSize: data.pageSize ?? parseInt(per_page, 10),
                totalElements: data.totalElements ?? transformedApiKeys.length,
                totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedApiKeys.length) / parseInt(per_page, 10)),
                last: data.last ?? true,
                first: data.first ?? (parseInt(page, 10) === 0),
            };
        }),

    /**
     * Create a new API key
     */
    createApiKey: protectedProcedure
        .input(
            z.object({
                uid: z.string(),

                body: z.record(z.string(), z.any()).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, body = {} } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.createApiKey.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: responseData.message || responseData.error || 'Failed to create API key',
                });
            }

            const apiKey = responseData.data || responseData;
            const transformedApiKey = {
                apiKey: apiKey.apiKey,
                secretKey: apiKey.secretKey || null,
                expiresAt: apiKey.expiresAt || null,
                status: apiKey.status || 'ACTIVE',
            };

            return {
                message: responseData.message || 'API key created successfully',
                data: transformedApiKey,
            };
        }),

    /**
     * Revoke an API key
     */
    revokeApiKey: protectedProcedure
        .input(
            z.object({
                uid: z.string(),
                apiKey: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, apiKey } = input;

            const encodedApiKey = encodeURIComponent(apiKey);
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.revokeApiKey.replace('{uid}', uid).replace('{apiKey}', encodedApiKey)}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: responseData.message || responseData.error || 'Failed to revoke API key',
                });
            }

            return {
                message: responseData.message || 'API key revoked successfully',
                success: responseData.data ?? true,
            };
        }),

    /**
     * Get sub-merchants for a merchant
     */
    getSubMerchants: protectedProcedure
        .input(
            z.object({
                uid: z.string(),
                page: z.string().optional(),
                per_page: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, page = '0', per_page = '15' } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.subMerchants.replace('{uid}', uid)}?page=${page}&size=${per_page}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch sub-merchants',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch sub-merchants',
                });
            }

            const data = await response.json();
            const subMerchants = data.data || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformedSubMerchants = subMerchants.map((merchant: any) => ({
                id: merchant.id?.toString() || merchant.id,
                uid: merchant.uid,
                code: merchant.code,
                name: merchant.name,
                merchant_type: merchant.merchantType || merchant.merchant_type,
                status: merchant.status,
                kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
                contact_email: merchant.contactEmail || merchant.contact_email,
                created_at: merchant.createdAt || merchant.created_at,
                updated_at: merchant.updatedAt || merchant.updated_at,
            }));

            return {
                data: transformedSubMerchants,
                pageNumber: data.pageNumber ?? parseInt(page, 10),
                pageSize: data.pageSize ?? parseInt(per_page, 10),
                totalElements: data.totalElements ?? transformedSubMerchants.length,
                totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedSubMerchants.length) / parseInt(per_page, 10)),
                last: data.last ?? true,
                first: data.first ?? (parseInt(page, 10) === 0),
            };
        }),

    /**
     * Update merchant status
     */
    updateStatus: protectedProcedure
        .input(
            z.object({
                uid: z.string(),
                status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, status, reason = '' } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.updateStatus.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status,
                    reason,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to update merchant status',
                });
            }

            const merchant = data.merchant || data.data || data;
            const transformedMerchant = merchant && merchant.id ? {
                id: merchant.id,
                uid: merchant.uid,
                code: merchant.code,
                name: merchant.name,
                type: merchant.type ?? null,
                status: merchant.status ?? merchant.activeStatus ?? status,
                kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
                email: merchant.email ?? null,
                contact_info: merchant.contactInfo ?? merchant.contact_info ?? null,
                description: merchant.description ?? null,
                created_at: merchant.createdAt ?? merchant.created_at ?? null,
                updated_at: merchant.updatedAt ?? merchant.updated_at ?? null,
            } : null;

            return {
                message: data.message || `Merchant status updated to ${status} successfully`,
                merchant: transformedMerchant,
            };
        }),

    /**
     * Update merchant parent
     */
    updateParent: protectedProcedure
        .input(
            z.object({
                uid: z.string(),
                parentMerchantUid: z.string().nullable().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, parentMerchantUid } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.updateParent.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    parentMerchantUid: parentMerchantUid || null,
                }),
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: responseData.message || responseData.error || 'Failed to update merchant parent',
                });
            }

            const merchant = responseData.data || responseData;
            const transformedMerchant = merchant && merchant.id ? {
                id: merchant.id?.toString() || merchant.id,
                uid: merchant.uid,
                code: merchant.code,
                name: merchant.name,
                merchant_type: merchant.merchantType || merchant.merchant_type,
                status: merchant.status,
                kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
                contact_email: merchant.contactEmail || merchant.contact_email,
                parent_merchant_uid: merchant.parentMerchantUid || merchant.parent_merchant_uid,
                parent_merchant_name: merchant.parentMerchantName || merchant.parent_merchant_name,
                created_at: merchant.createdAt || merchant.created_at,
                updated_at: merchant.updatedAt || merchant.updated_at,
            } : null;

            return {
                message: responseData.message || 'Merchant parent updated successfully',
                merchant: transformedMerchant,
            };
        }),

    /**
     * Get merchant bank accounts
     */
    getBankAccounts: protectedProcedure
        .input(z.object({ uid: z.string() }))
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.bankAccounts.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch bank accounts',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch bank accounts',
                });
            }

            const data = await response.json();
            const bankAccountsRaw = Array.isArray(data) ? data : (data.data || []);

            const bankAccounts = bankAccountsRaw.map(transformBankAccount);

            return {
                data: bankAccounts,
                total: bankAccounts.length,
            };
        }),

    /**
     * Create or update merchant bank account
     */
    createBankAccount: protectedProcedure
        .input(
            z.object({
                uid: z.string(),
                bankAccount: CreateBankAccountRequestSchema,
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, bankAccount } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.bankAccounts.replace('{uid}', uid)}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(bankAccount),
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to save bank account',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to save bank account',
                });
            }

            const data = await response.json();
            const bankAccountsRaw = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);

            const transformedBankAccounts = bankAccountsRaw.map(transformBankAccount);

            return {
                message: data.message || 'Bank account saved successfully',
                data: transformedBankAccounts.length > 0 ? transformedBankAccounts[0] : null,
            };
        }),

    /**
     * Deactivate a bank account
     */
    deactivateBankAccount: protectedProcedure
        .input(
            z.object({
                uid: z.string(),
                bankAccountUid: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { uid, bankAccountUid } = input;

            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.deactivateBankAccount
                .replace('{uid}', uid)
                .replace('{bankAccountUid}', bankAccountUid)}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to deactivate bank account',
                });
            }

            return {
                message: data.message || 'Bank account deactivated successfully',
            };
        }),
});
