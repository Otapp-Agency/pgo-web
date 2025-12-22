import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../init';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { PAGINATION } from '@/lib/config/constants';
import { RoleSchema } from '@/features/roles/types';

/**
 * Helper to transform user data from backend format to frontend format
 */
function transformUser(user: {
    id: string;
    username: string;
    email: string;
    roles?: string[] | string;
    active?: boolean;
    locked?: boolean;
    associatedMerchantId?: string | null;
    lastLoginAt?: string | null;
    createdAt?: string | null;
    firstName?: string | null;
    lastName?: string | null;
}) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : user.roles || '',
        is_active: user.active ?? false,
        is_locked: user.locked ?? false,
        associated_merchant_id: user.associatedMerchantId ?? null,
        last_login_at: user.lastLoginAt ?? null,
        created_at: user.createdAt ?? null,
        first_name: user.firstName ?? null,
        last_name: user.lastName ?? null,
    };
}

export const usersRouter = createTRPCRouter({
    /**
     * List users with pagination and filtering
     */
    list: protectedProcedure
        .input(
            z.object({
                page: z.string().optional(),
                per_page: z.string().optional(),
                search: z.string().optional(),
                role: z.string().optional(),
                status: z.string().optional(),
                associated_merchant_id: z.string().optional(),
                sort: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;

            const queryParams = new URLSearchParams();

            // Add all query parameters if they exist
            const allowedParams = [
                'page',
                'per_page',
                'search',
                'role',
                'status',
                'associated_merchant_id',
                'sort',
            ];

            allowedParams.forEach((param) => {
                const value = input[param as keyof typeof input];
                if (value) {
                    // Backend API uses 'size' instead of 'per_page'
                    if (param === 'per_page') {
                        queryParams.set('size', value);
                    } else if (param === 'page') {
                        // Frontend uses 1-based pagination, backend uses 0-based
                        const pageNum = parseInt(value, 10);
                        queryParams.set('page', Math.max(0, pageNum - 1).toString());
                    } else if (param === 'sort') {
                        queryParams.set('sort', value);
                    } else {
                        queryParams.set(param, value);
                    }
                }
            });

            // Build the URL with query parameters
            const queryString = queryParams.toString();
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.users.list}${queryString ? `?${queryString}` : ''}`;

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
                    message: response.statusText || 'Failed to fetch users',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch users',
                });
            }

            const data = await response.json();

            // Parse page from request (1-based) for response
            const requestedPage = parseInt(input.page || String(PAGINATION.DEFAULT_PAGE), 10);
            const requestedPerPage = parseInt(input.per_page || String(PAGINATION.DEFAULT_PAGE_SIZE), 10);

            // Backend API returns: { status, statusCode, message, data: User[], pageNumber, pageSize, totalElements, totalPages, last }
            if (data.data && Array.isArray(data.data)) {
                // Transform field names from backend format to frontend format
                const transformedData = data.data.map(transformUser);

                // Backend uses 0-based pagination, convert to 1-based for frontend
                const backendPageNumber = data.pageNumber ?? 0;

                return {
                    data: transformedData,
                    pageNumber: backendPageNumber + 1, // Convert to 1-based
                    pageSize: data.pageSize ?? requestedPerPage,
                    totalElements: data.totalElements ?? transformedData.length,
                    totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedData.length) / (data.pageSize ?? requestedPerPage)),
                    last: data.last ?? false,
                    first: backendPageNumber === 0,
                };
            } else if (Array.isArray(data)) {
                // Backend returned just an array (legacy format)
                const transformedData = data.map(transformUser);

                return {
                    data: transformedData,
                    pageNumber: requestedPage,
                    pageSize: requestedPerPage,
                    totalElements: transformedData.length,
                    totalPages: 1,
                    last: true,
                    first: requestedPage === 1,
                };
            } else {
                // Fallback: return error
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Unexpected response format from backend',
                });
            }
        }),

    /**
     * Create a new user
     */
    create: protectedProcedure
        .input(
            z.object({
                username: z.string().min(1, 'username is required'),
                email: z.string().email('email must be a valid email address'),
                password: z.string().min(1, 'password is required'),
                password_confirmation: z.string().min(1, 'password_confirmation is required'),
                user_type: z.string().min(1, 'user_type is required'),
                first_name: z.string().optional(),
                last_name: z.string().optional(),
                role: z.string().optional(),
                is_active: z.boolean().optional(),
                associated_merchant_id: z.string().nullable().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;

            // Password match validation
            if (input.password !== input.password_confirmation) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'password and password_confirmation must match',
                });
            }

            // Trim string fields
            const username = input.username.trim();
            const email = input.email.trim();
            const userType = input.user_type.trim();

            // Backend uses camelCase field names
            const backendBody: Record<string, unknown> = {
                username,
                email,
                password: input.password,
                passwordConfirmation: input.password_confirmation,
                userType,
                active: input.is_active ?? true,
            };

            // Only include firstName if provided
            if (input.first_name) {
                backendBody.firstName = input.first_name.trim();
            }

            // Only include lastName if provided
            if (input.last_name) {
                backendBody.lastName = input.last_name.trim();
            }

            // Only include roleNames if role is defined
            if (input.role !== undefined && input.role !== null && input.role !== '') {
                backendBody.roleNames = [input.role];
            }

            // Use null-coalescing for associated_merchant_id to preserve empty strings
            backendBody.associatedMerchantId = input.associated_merchant_id ?? null;

            // Build the URL
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.users.create}`;

            // Create user via backend API
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
                console.error('Backend create user error:', {
                    status: response.status,
                    data,
                    sentBody: backendBody,
                });
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to create user',
                });
            }

            // Transform response to frontend format
            const user = data.data || data;
            const transformedUser = user ? transformUser(user) : null;

            return {
                message: data.message || 'User created successfully',
                user: transformedUser,
            };
        }),

    /**
     * Get user by UID
     */
    getByUid: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, 'User UID is required'),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;

            // Build the URL with user UID
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.users.getByUid.replace('{uid}', input.id)}`;

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
                    message: response.statusText || 'Failed to fetch user',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch user',
                });
            }

            const data = await response.json();

            // Return the user data (backend format, can be transformed if needed)
            return data;
        }),

    /**
     * Reset user password (Admin only)
     */
    resetPassword: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, 'User UID is required'),
                password: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token, session } = ctx;

            // Check admin privileges
            const isAdmin = session?.roles?.some(
                role => role === 'Super Administrator' || role === 'Administrator'
            );

            if (!isAdmin) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Forbidden - Admin access required',
                });
            }

            // Build the URL for reset password endpoint
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.users.resetPassword.replace('{uid}', input.id)}`;

            // Prepare body (optional - may contain new password or let backend generate one)
            const body: Record<string, unknown> = {};
            if (input.password) {
                body.password = input.password;
            }

            // Call backend API to reset password
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                console.error('Reset password error:', {
                    status: response.status,
                    data,
                });
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to reset password',
                });
            }

            return {
                message: data.message || 'Password reset successfully',
                temporaryPassword: data.temporaryPassword ?? null,
            };
        }),

    /**
     * Roles: List roles with pagination and filtering
     */
    roles: {
        list: protectedProcedure
            .input(
                z.object({
                    page: z.string().optional(),
                    per_page: z.string().optional(),
                    search: z.string().optional(),
                    sort: z.string().optional(),
                })
            )
            .query(async ({ input, ctx }) => {
                const { token } = ctx;

                const queryParams = new URLSearchParams();

                // Add all query parameters if they exist
                const allowedParams = ['page', 'per_page', 'search', 'sort'];

                allowedParams.forEach((param) => {
                    const value = input[param as keyof typeof input];
                    if (value) {
                        // Backend API uses 'size' instead of 'per_page'
                        if (param === 'per_page') {
                            queryParams.set('size', value);
                        } else if (param === 'page') {
                            // Frontend uses 1-based pagination, backend uses 0-based
                            const pageNum = parseInt(value, 10);
                            queryParams.set('page', Math.max(0, pageNum - 1).toString());
                        } else if (param === 'sort') {
                            queryParams.set('sort', value);
                        } else {
                            queryParams.set(param, value);
                        }
                    }
                });

                // Build the URL with query parameters
                const queryString = queryParams.toString();
                const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.roles.list}${queryString ? `?${queryString}` : ''}`;

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
                        message: response.statusText || 'Failed to fetch roles',
                    }));

                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: errorData.message || errorData.error || 'Failed to fetch roles',
                    });
                }

                const data = await response.json();

                // Parse page from request (1-based) for response
                const requestedPage = parseInt(input.page || String(PAGINATION.DEFAULT_PAGE), 10);
                const requestedPerPage = parseInt(input.per_page || String(PAGINATION.DEFAULT_PAGE_SIZE), 10);

                // Backend API returns: { status, statusCode, message, data: Role[], pageNumber, pageSize, totalElements, totalPages, last }
                if (data.data && Array.isArray(data.data)) {
                    // Validate and parse roles data
                    const parsedData = z.array(RoleSchema).parse(data.data);

                    // Backend uses 0-based pagination, convert to 1-based for frontend
                    const backendPageNumber = data.pageNumber ?? 0;

                    return {
                        data: parsedData,
                        pageNumber: backendPageNumber + 1, // Convert to 1-based
                        pageSize: data.pageSize ?? requestedPerPage,
                        totalElements: data.totalElements ?? parsedData.length,
                        totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? parsedData.length) / (data.pageSize ?? requestedPerPage)),
                        last: data.last ?? false,
                        first: backendPageNumber === 0,
                    };
                } else if (Array.isArray(data)) {
                    // Handle legacy format: just an array
                    const parsedData = z.array(RoleSchema).parse(data);

                    return {
                        data: parsedData,
                        pageNumber: requestedPage,
                        pageSize: requestedPerPage,
                        totalElements: parsedData.length,
                        totalPages: Math.ceil(parsedData.length / requestedPerPage),
                        last: true,
                        first: requestedPage === 1,
                    };
                } else {
                    // Fallback: empty response
                    return {
                        data: [],
                        pageNumber: requestedPage,
                        pageSize: requestedPerPage,
                        totalElements: 0,
                        totalPages: 0,
                        last: true,
                        first: true,
                    };
                }
            }),

        /**
         * Get all roles (no pagination)
         */
        all: protectedProcedure
            .query(async ({ ctx }) => {
                const { token } = ctx;

                // Build the URL for the all roles endpoint
                const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.roles.all}`;

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
                        message: response.statusText || 'Failed to fetch roles',
                    }));

                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: errorData.message || errorData.error || 'Failed to fetch roles',
                    });
                }

                const data = await response.json();

                // Backend API returns: { status, statusCode, message, data: Role[] }
                if (data.data && Array.isArray(data.data)) {
                    // Validate and parse roles data
                    const parsedData = z.array(RoleSchema).parse(data.data);
                    return parsedData;
                } else if (Array.isArray(data)) {
                    // Handle legacy format: just an array
                    const parsedData = z.array(RoleSchema).parse(data);
                    return parsedData;
                } else {
                    // Fallback: empty array
                    return [];
                }
            }),
    },

    /**
     * Logs: List audit logs with pagination and filtering
     */
    logs: {
        list: protectedProcedure
            .input(
                z.object({
                    page: z.string().optional(),
                    per_page: z.string().optional(),
                    user_id: z.string().optional(),
                    action_type: z.string().optional(),
                    start_date: z.string().optional(),
                    end_date: z.string().optional(),
                    merchant_id: z.string().optional(),
                    event: z.string().optional(),
                    search_term: z.string().optional(),
                    sort: z.string().optional(),
                })
            )
            .query(async ({ input, ctx }) => {
                const { token } = ctx;

                const queryParams = new URLSearchParams();

                // Handle pagination (frontend uses 0-based, backend also uses 0-based)
                const pageValue = input.page;
                if (pageValue) {
                    const pageNum = parseInt(pageValue, 10);
                    queryParams.set('page', Math.max(0, pageNum).toString());
                }

                const perPageValue = input.per_page;
                if (perPageValue) {
                    queryParams.set('size', perPageValue);
                }

                // Map frontend params to backend camelCase format
                const paramMapping: Record<string, string> = {
                    'user_id': 'userUid',
                    'action_type': 'eventType',
                    'start_date': 'startDate',
                    'end_date': 'endDate',
                    'merchant_id': 'merchantUid',
                };

                // Handle mapped parameters
                Object.entries(paramMapping).forEach(([frontendParam, backendParam]) => {
                    const value = input[frontendParam as keyof typeof input];
                    if (value) {
                        queryParams.set(backendParam, value);
                    }
                });

                // Handle other parameters that don't need mapping
                const otherParams = ['event', 'search_term', 'sort'];
                otherParams.forEach((param) => {
                    const value = input[param as keyof typeof input];
                    if (value) {
                        if (param === 'sort') {
                            queryParams.set('sort', value);
                        } else {
                            queryParams.set(param, value);
                        }
                    }
                });

                // Build the URL with query parameters
                const queryString = queryParams.toString();
                const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.logs.auditLogs}${queryString ? `?${queryString}` : ''}`;

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
                        message: response.statusText || 'Failed to fetch audit logs',
                    }));

                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: errorData.message || errorData.error || 'Failed to fetch audit logs',
                    });
                }

                const data = await response.json();

                // Handle response format from backend
                // Backend API returns: { status, statusCode, message, data: AuditLog[], pageNumber, pageSize, totalElements, totalPages, last }
                if (data.data && Array.isArray(data.data)) {
                    // Backend uses 0-based pagination, frontend also uses 0-based
                    const backendPageNumber = data.pageNumber ?? 0;
                    const perPage = parseInt(input.per_page || '15', 10);

                    return {
                        data: data.data,
                        pageNumber: backendPageNumber, // Keep 0-based
                        pageSize: data.pageSize ?? perPage,
                        totalElements: data.totalElements ?? data.data.length,
                        totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? data.data.length) / (data.pageSize ?? perPage)),
                        last: data.last ?? false,
                        first: data.first ?? (backendPageNumber === 0),
                    };
                } else if (Array.isArray(data) && data.length > 0) {
                    // Backend returned just an array (legacy format)
                    const perPage = parseInt(input.per_page || '15', 10);
                    const page = parseInt(input.page || '0', 10);

                    return {
                        data: data,
                        pageNumber: page,
                        pageSize: perPage,
                        totalElements: data.length,
                        totalPages: 1,
                        last: true,
                        first: page === 0,
                    };
                } else {
                    // Fallback: return error
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Unexpected response format from backend',
                    });
                }
            }),
    },
});
