import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../init';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { PaymentGatewaySchema, PaymentGatewayDetailSchema, PaginatedPaymentGatewayResponse } from '@/lib/definitions';

/**
 * Helper function to transform gateway data from backend format to frontend format
 */
function transformGateway(gateway: {
    id: string;
    uid?: string;
    name: string;
    code: string;
    productionApiBaseUrl?: string | null;
    sandboxApiBaseUrl?: string | null;
    supportedMethods?: string[] | string | unknown;
    activeStatus?: string;
    isActive?: boolean;
    active?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
}) {
    // Convert activeStatus string ('Active'/'Inactive') to boolean
    let isActive = true;
    if (gateway.activeStatus !== undefined) {
        isActive = gateway.activeStatus === 'Active' || gateway.activeStatus === 'ACTIVE' || gateway.activeStatus === 'active';
    } else if (gateway.isActive !== undefined) {
        isActive = gateway.isActive;
    } else if (gateway.active !== undefined) {
        isActive = gateway.active;
    }

    // Ensure supportedMethods is an array
    // Handle case where backend returns JSON string instead of array
    // OR array of JSON strings (e.g., ['["MNO"]', '["CARD"]'])
    let supportedMethods: string[] = [];

    // Check all possible field names the backend might use
    const rawSupportedMethods = gateway.supportedMethods ??
        (gateway as unknown as { supported_methods?: string[] }).supported_methods ??
        (gateway as unknown as { supportedMethods?: string[] }).supportedMethods;

    if (Array.isArray(rawSupportedMethods)) {
        // Backend might return array of JSON strings like ['["MNO"]', '["CARD"]']
        // OR array of strings like ['MNO', 'CARD']
        const flattened: string[] = [];

        for (const item of rawSupportedMethods) {
            if (typeof item === 'string') {
                // Check if it's a JSON string representation of an array
                const trimmed = item.trim();
                if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
                    (trimmed.startsWith('"[') && trimmed.endsWith(']"'))) {
                    try {
                        // Parse the JSON string
                        let toParse = trimmed;
                        if (trimmed.startsWith('"[') && trimmed.endsWith(']"')) {
                            toParse = trimmed.slice(1, -1);
                        }
                        const parsed = JSON.parse(toParse);
                        if (Array.isArray(parsed)) {
                            // Flatten the parsed array
                            flattened.push(...parsed.filter((m): m is string => typeof m === 'string'));
                        } else {
                            // Not an array after parsing, treat as single method
                            flattened.push(item);
                        }
                    } catch {
                        // JSON parsing failed, treat as single method
                        flattened.push(item);
                    }
                } else {
                    // Not a JSON string, treat as a regular method name
                    flattened.push(item);
                }
            } else if (typeof item === 'object' && item !== null) {
                // Handle nested objects/arrays
                flattened.push(String(item));
            }
        }

        supportedMethods = flattened;
    } else if (typeof rawSupportedMethods === 'string') {
        // Try to parse as JSON string (e.g., "[\"MNO\"]" or '["MNO"]')
        // First, check if it's already a valid JSON array string
        const trimmed = rawSupportedMethods.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
            (trimmed.startsWith('"[') && trimmed.endsWith(']"'))) {
            try {
                // Remove outer quotes if double-stringified
                let toParse = trimmed;
                if (trimmed.startsWith('"[') && trimmed.endsWith(']"')) {
                    toParse = trimmed.slice(1, -1);
                }
                const parsed = JSON.parse(toParse);
                if (Array.isArray(parsed)) {
                    supportedMethods = parsed.filter((m): m is string => typeof m === 'string');
                } else {
                    // If parsed value is not an array, treat the whole string as a single method
                    supportedMethods = [rawSupportedMethods];
                }
            } catch {
                // If JSON parsing fails, try to extract array-like content
                // Handle cases like: ["MNO" "CARD"] (missing commas)
                const match = trimmed.match(/\[(.*?)\]/);
                if (match) {
                    const content = match[1];
                    // Split by quotes and filter out empty strings
                    const items = content.match(/"([^"]+)"/g)?.map(s => s.slice(1, -1)) || [];
                    if (items.length > 0) {
                        supportedMethods = items;
                    } else {
                        supportedMethods = [rawSupportedMethods];
                    }
                } else {
                    // If no array structure found, treat the whole string as a single method
                    supportedMethods = [rawSupportedMethods];
                }
            }
        } else {
            // Not a JSON array string, treat as single method
            supportedMethods = [rawSupportedMethods];
        }
    } else if (rawSupportedMethods) {
        // Fallback: convert to string and wrap in array
        supportedMethods = [String(rawSupportedMethods)];
    }

    return {
        id: gateway.id,
        uid: gateway.uid ?? gateway.id,
        name: gateway.name,
        code: gateway.code,
        api_base_url_production: gateway.productionApiBaseUrl ?? null,
        api_base_url_sandbox: gateway.sandboxApiBaseUrl ?? null,
        supported_methods: supportedMethods,
        is_active: isActive,
        created_at: gateway.createdAt ?? null,
        updated_at: gateway.updatedAt ?? null,
    };
}

export const gatewaysRouter = createTRPCRouter({
    /**
     * List all payment gateways
     * FR-PGO-002: Get All Payment Gateways
     */
    list: protectedProcedure
        .input(
            z.object({
                is_active: z.string().optional(),
                search: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;

            // Build query parameters
            const queryParams = new URLSearchParams();
            const allowedParams = ['is_active', 'search'] as const;

            allowedParams.forEach((param) => {
                const value = input[param];
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.set(param, value);
                }
            });

            // Build the URL with query parameters
            const queryString = queryParams.toString();
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.list}${queryString ? `?${queryString}` : ''}`;

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
                    message: response.statusText || 'Failed to fetch payment gateways',
                }));

                if (response.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: errorData.message || errorData.error || 'Unauthorized',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch payment gateways',
                });
            }

            const data = await response.json();

            // Backend API returns: { data: PaymentGateway[], ... } or array
            // Transform to exclude credentials field
            if (data.data && Array.isArray(data.data)) {
                const transformedData = data.data.map(transformGateway);
                const parsed = z.array(PaymentGatewaySchema).parse(transformedData);

                const listResponse: PaginatedPaymentGatewayResponse = {
                    data: parsed,
                    pageNumber: data.pageNumber ?? 0,
                    pageSize: data.pageSize ?? 15,
                    totalElements: data.totalElements ?? transformedData.length,
                    totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedData.length) / (data.pageSize ?? 15)),
                    last: data.last ?? true,
                    first: data.first ?? (data.pageNumber === 0),
                };

                return listResponse;
            } else if (Array.isArray(data)) {
                // Backend returned just an array (legacy format)
                const transformedData = data.map(transformGateway);
                const parsed = z.array(PaymentGatewaySchema).parse(transformedData);

                const listResponse: PaginatedPaymentGatewayResponse = {
                    data: parsed,
                    pageNumber: 0,
                    pageSize: transformedData.length,
                    totalElements: transformedData.length,
                    totalPages: 1,
                    last: true,
                    first: true,
                };

                return listResponse;
            } else {
                // Fallback: return error
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Unexpected response format from backend',
                });
            }
        }),

    /**
     * Create a new payment gateway
     * FR-PGO-001: Create Payment Gateway Configuration
     */
    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1, 'name is required'),
                code: z.string().min(1, 'code is required'),
                api_base_url_production: z.string().optional(),
                api_base_url_sandbox: z.string().optional(),
                credentials: z
                    .record(z.string(), z.string().optional())
                    .refine((val) => Object.keys(val).length > 0, {
                        message: 'credentials is required and must be an object',
                    }),
                supported_methods: z.array(z.string()).min(1, 'supported_methods is required and must be a non-empty array'),
                is_active: z.boolean().optional().default(true),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;

            // Transform request body to backend format (camelCase)
            // Backend expects: productionApiBaseUrl, sandboxApiBaseUrl, active (not isActive)
            const backendBody: Record<string, unknown> = {
                name: input.name.trim(),
                code: input.code.trim(),
                productionApiBaseUrl: input.api_base_url_production || '',
                sandboxApiBaseUrl: input.api_base_url_sandbox || '',
                supportedMethods: input.supported_methods,
                active: input.is_active ?? true,
            };

            // Add credentials if provided
            if (input.credentials && Object.keys(input.credentials).length > 0) {
                backendBody.credentials = input.credentials;
            }

            // Build the URL
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.create}`;

            // Create payment gateway via backend API
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(backendBody),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: data.message || data.error || 'Unauthorized',
                    });
                }

                if (response.status === 400) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: data.message || data.error || 'Validation failed',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to create payment gateway',
                });
            }

            // Transform response to frontend format (exclude credentials)
            const gateway = data.payment_gateway || data.data || data;
            const transformedGateway = gateway
                ? {
                    id: gateway.id,
                    uid: gateway.uid ?? gateway.id,
                    name: gateway.name,
                    code: gateway.code,
                    api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
                    api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
                    supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
                    is_active: gateway.isActive ?? gateway.is_active ?? true,
                    created_at: gateway.createdAt ?? gateway.created_at ?? null,
                }
                : null;

            const parsed = transformedGateway ? PaymentGatewaySchema.parse(transformedGateway) : null;

            return {
                message: data.message || 'Payment Gateway created successfully',
                payment_gateway: parsed,
            };
        }),

    /**
     * Get payment gateway details by ID
     * FR-PGO-002: Get Payment Gateway Details
     * Returns gateway WITH decrypted credentials for editing
     */
    getById: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, 'id is required'),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: gatewayUid } = input;

            // Build the URL with gateway ID
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.getById.replace('{id}', gatewayUid)}`;

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
                    message: response.statusText || 'Failed to fetch payment gateway',
                }));

                if (response.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: errorData.message || errorData.error || 'Unauthorized',
                    });
                }

                if (response.status === 404) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: errorData.message || errorData.error || 'Payment gateway not found',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch payment gateway',
                });
            }

            const data = await response.json();

            // Transform backend response to frontend format (include decrypted credentials)
            const gateway = data.payment_gateway || data.data || data;
            const transformedGateway = {
                id: gateway.id,
                uid: gateway.uid ?? gateway.id,
                name: gateway.name,
                code: gateway.code,
                api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
                api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
                credentials: gateway.credentials ?? {},
                supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
                is_active: gateway.isActive ?? gateway.is_active ?? true,
                created_at: gateway.createdAt ?? gateway.created_at ?? null,
                updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
            };

            const parsed = PaymentGatewayDetailSchema.parse(transformedGateway);

            return parsed;
        }),

    /**
     * Update payment gateway configuration
     * FR-PGO-002: Update Payment Gateway Configuration
     * Supports partial updates
     */
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, 'id is required'),
                name: z.string().optional(),
                api_base_url_production: z.string().optional(),
                api_base_url_sandbox: z.string().optional(),
                credentials: z.record(z.string(), z.string().optional()).optional(),
                supported_methods: z.array(z.string()).optional(),
                is_active: z.boolean().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: gatewayUid, ...updateFields } = input;

            // Validate that at least one field is provided for update
            const hasUpdateFields =
                updateFields.name !== undefined ||
                updateFields.api_base_url_production !== undefined ||
                updateFields.api_base_url_sandbox !== undefined ||
                updateFields.credentials !== undefined ||
                updateFields.supported_methods !== undefined ||
                updateFields.is_active !== undefined;

            if (!hasUpdateFields) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'At least one field must be provided for update',
                });
            }

            // Transform request body to backend format (camelCase)
            const backendBody: Record<string, unknown> = {};

            if (updateFields.name !== undefined) {
                backendBody.name = typeof updateFields.name === 'string' ? updateFields.name.trim() : updateFields.name;
            }
            if (updateFields.api_base_url_production !== undefined) {
                backendBody.apiBaseUrlProduction = updateFields.api_base_url_production;
            }
            if (updateFields.api_base_url_sandbox !== undefined) {
                backendBody.apiBaseUrlSandbox = updateFields.api_base_url_sandbox;
            }
            if (updateFields.credentials !== undefined) {
                backendBody.credentials = updateFields.credentials;
            }
            if (updateFields.supported_methods !== undefined) {
                backendBody.supportedMethods = updateFields.supported_methods;
            }
            if (updateFields.is_active !== undefined) {
                backendBody.isActive = updateFields.is_active;
            }

            // Build the URL
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.update.replace('{uid}', gatewayUid)}`;

            // Update payment gateway via backend API
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(backendBody),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: data.message || data.error || 'Unauthorized',
                    });
                }

                if (response.status === 400) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: data.message || data.error || 'Validation failed',
                    });
                }

                if (response.status === 404) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: data.message || data.error || 'Payment gateway not found',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to update payment gateway',
                });
            }

            // Transform response to frontend format (exclude credentials)
            const gateway = data.payment_gateway || data.data || data;
            const transformedGateway = gateway
                ? {
                    id: gateway.id,
                    uid: gateway.uid ?? gateway.id,
                    name: gateway.name,
                    code: gateway.code,
                    api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
                    api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
                    supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
                    is_active: gateway.isActive ?? gateway.is_active ?? true,
                    created_at: gateway.createdAt ?? gateway.created_at ?? null,
                    updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
                }
                : null;

            const parsed = transformedGateway ? PaymentGatewaySchema.parse(transformedGateway) : null;

            return {
                message: data.message || 'Payment Gateway updated successfully',
                payment_gateway: parsed,
            };
        }),

    /**
     * Activate a payment gateway
     * FR-PGO-003: Enable/Disable Payment Gateway
     */
    activate: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, 'id is required'),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: uid } = input;

            // Build the URL using the activate endpoint (backend expects uid)
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.activate.replace('{uid}', uid)}`;

            // Activate payment gateway via backend API
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: data.message || data.error || 'Unauthorized',
                    });
                }

                if (response.status === 404) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: data.message || data.error || 'Payment gateway not found',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to activate payment gateway',
                });
            }

            // Transform response to frontend format
            const gateway = data.payment_gateway || data.data || data;
            const transformedGateway = gateway
                ? {
                    id: gateway.id,
                    uid: gateway.uid ?? gateway.id,
                    name: gateway.name,
                    code: gateway.code,
                    api_base_url_production: gateway.productionApiBaseUrl ?? gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
                    api_base_url_sandbox: gateway.sandboxApiBaseUrl ?? gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
                    supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
                    is_active: gateway.isActive ?? gateway.is_active ?? gateway.active ?? true,
                    created_at: gateway.createdAt ?? gateway.created_at ?? null,
                    updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
                }
                : null;

            const parsed = transformedGateway ? PaymentGatewaySchema.parse(transformedGateway) : null;

            return {
                message: data.message || 'Payment Gateway activated successfully',
                payment_gateway: parsed,
            };
        }),

    /**
     * Deactivate a payment gateway
     * FR-PGO-003: Enable/Disable Payment Gateway
     */
    deactivate: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, 'id is required'),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: uid } = input;

            // Build the URL using the deactivate endpoint (backend expects uid)
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.deactivate.replace('{uid}', uid)}`;

            // Deactivate payment gateway via backend API
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: data.message || data.error || 'Unauthorized',
                    });
                }

                if (response.status === 404) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: data.message || data.error || 'Payment gateway not found',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to deactivate payment gateway',
                });
            }

            // Transform response to frontend format
            const gateway = data.payment_gateway || data.data || data;
            const transformedGateway = gateway
                ? {
                    id: gateway.id,
                    uid: gateway.uid ?? gateway.id,
                    name: gateway.name,
                    code: gateway.code,
                    api_base_url_production: gateway.productionApiBaseUrl ?? gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
                    api_base_url_sandbox: gateway.sandboxApiBaseUrl ?? gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
                    supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
                    is_active: gateway.isActive ?? gateway.is_active ?? gateway.active ?? false,
                    created_at: gateway.createdAt ?? gateway.created_at ?? null,
                    updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
                }
                : null;

            const parsed = transformedGateway ? PaymentGatewaySchema.parse(transformedGateway) : null;

            return {
                message: data.message || 'Payment Gateway deactivated successfully',
                payment_gateway: parsed,
            };
        }),

    /**
     * Update payment gateway status (enable/disable)
     * FR-PGO-003: Enable/Disable Payment Gateway
     */
    updateStatus: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, 'id is required'),
                is_active: z.boolean(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: gatewayUid, is_active } = input;

            // Transform request body to backend format
            const backendBody = {
                isActive: is_active,
            };

            // Build the URL
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.status.replace('{uid}', gatewayUid)}`;

            // Update payment gateway status via backend API
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(backendBody),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: data.message || data.error || 'Unauthorized',
                    });
                }

                if (response.status === 400) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: data.message || data.error || 'Validation failed',
                    });
                }

                if (response.status === 404) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: data.message || data.error || 'Payment gateway not found',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to update payment gateway status',
                });
            }

            // Transform response to frontend format (exclude credentials)
            const gateway = data.payment_gateway || data.data || data;
            const transformedGateway = gateway
                ? {
                    id: gateway.id,
                    uid: gateway.uid ?? gateway.id,
                    name: gateway.name,
                    code: gateway.code,
                    api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
                    api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
                    supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
                    is_active: gateway.isActive ?? gateway.is_active ?? true,
                    created_at: gateway.createdAt ?? gateway.created_at ?? null,
                    updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
                }
                : null;

            const parsed = transformedGateway ? PaymentGatewaySchema.parse(transformedGateway) : null;

            return {
                message: data.message || 'Payment Gateway status updated successfully',
                payment_gateway: parsed,
            };
        }),
});