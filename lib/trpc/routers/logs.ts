import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../init';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

export const logsRouter = createTRPCRouter({
    /**
     * List audit logs with pagination and filtering
     */
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
});

