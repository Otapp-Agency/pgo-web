import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../init';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';
import { CanUpdateResponseSchema } from '@/lib/definitions';

/**
 * Helper to convert date to LocalDateTime format for backend
 * Backend expects: 2025-12-01T00:00:00
 */
const toStartDateTime = (date: string) => `${date}T00:00:00`;
const toEndDateTime = (date: string) => `${date}T23:59:59`;

export const transactionsRouter = createTRPCRouter({
    /**
     * List transactions with pagination and filtering
     */
    list: protectedProcedure
        .input(
            z.object({
                page: z.string().optional(),
                per_page: z.string().optional(),
                status: z.string().optional(),
                start_date: z.string().optional(),
                end_date: z.string().optional(),
                amount_min: z.string().optional(),
                amount_max: z.string().optional(),
                search: z.string().optional(),
                sort: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;

            // Build query parameters for the backend
            const queryParams = new URLSearchParams();

            // Pagination - convert to backend format
            if (input.page) {
                const pageNum = parseInt(input.page, 10);
                queryParams.set('page', Math.max(0, pageNum - 1).toString());
            }
            if (input.per_page) {
                queryParams.set('size', input.per_page);
            }
            if (input.sort) {
                queryParams.set('sort', input.sort);
            }
            if (input.search) {
                queryParams.set('search', input.search);
            }

            // Determine which endpoint to use based on active filters
            let endpoint = API_ENDPOINTS.transactions.list;

            // Priority: status > date-range > amount-range > default list
            if (input.status) {
                // Use status-specific endpoint
                if (input.status === 'PENDING') {
                    endpoint = API_ENDPOINTS.transactions.pending;
                } else if (input.status === 'FAILED') {
                    endpoint = API_ENDPOINTS.transactions.failed;
                } else {
                    // Use the generic status endpoint
                    endpoint = API_ENDPOINTS.transactions.byStatus.replace('{status}', input.status);
                }

                // Add date range params if present
                if (input.start_date) queryParams.set('startDate', toStartDateTime(input.start_date));
                if (input.end_date) queryParams.set('endDate', toEndDateTime(input.end_date));
                if (input.amount_min) queryParams.set('minAmount', input.amount_min);
                if (input.amount_max) queryParams.set('maxAmount', input.amount_max);

            } else if (input.start_date || input.end_date) {
                // Use date-range endpoint
                endpoint = API_ENDPOINTS.transactions.byDateRange;
                if (input.start_date) queryParams.set('startDate', toStartDateTime(input.start_date));
                if (input.end_date) queryParams.set('endDate', toEndDateTime(input.end_date));
                if (input.amount_min) queryParams.set('minAmount', input.amount_min);
                if (input.amount_max) queryParams.set('maxAmount', input.amount_max);

            } else if (input.amount_min || input.amount_max) {
                // Use amount-range endpoint
                endpoint = API_ENDPOINTS.transactions.byAmountRange;
                if (input.amount_min) queryParams.set('minAmount', input.amount_min);
                if (input.amount_max) queryParams.set('maxAmount', input.amount_max);
            }

            // Build the URL with query parameters
            const queryString = queryParams.toString();
            const url = `${API_CONFIG.baseURL}${endpoint}${queryString ? `?${queryString}` : ''}`;

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
                    message: response.statusText || 'Failed to fetch transactions',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch transactions',
                });
            }

            const data = await response.json();

            // Handle response format from backend
            if (data.data && Array.isArray(data.data)) {
                // Backend uses 0-based pagination, convert to 1-based for frontend
                const backendPageNumber = data.pageNumber ?? 0;
                const requestedPerPage = parseInt(input.per_page || '15', 10);

                return {
                    data: data.data,
                    pageNumber: backendPageNumber + 1, // Convert to 1-based
                    pageSize: data.pageSize ?? requestedPerPage,
                    totalElements: data.totalElements ?? data.data.length,
                    totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? data.data.length) / (data.pageSize ?? requestedPerPage)),
                    last: data.last ?? false,
                    first: backendPageNumber === 0,
                };
            } else if (Array.isArray(data)) {
                // Backend returned just an array (legacy format)
                const requestedPage = parseInt(input.page || '1', 10);
                const requestedPerPage = parseInt(input.per_page || '15', 10);

                return {
                    data: data,
                    pageNumber: requestedPage,
                    pageSize: requestedPerPage,
                    totalElements: data.length,
                    totalPages: 1,
                    last: true,
                    first: requestedPage === 1,
                };
            } else {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Unexpected response format from backend',
                });
            }
        }),

    /**
     * Get transaction by UID
     */
    getByUid: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: uid } = input;

            if (!uid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            // Build the URL with transaction UID
            const endpoint = API_ENDPOINTS.transactions.getByUid.replace('{uid}', uid);
            const url = `${API_CONFIG.baseURL}${endpoint}`;

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
                    message: response.statusText || 'Failed to fetch transaction',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch transaction',
                });
            }

            const data = await response.json();

            // Normalize the transaction data (handle wrapped responses)
            const transactionData = data.data || data;

            return transactionData;
        }),

    /**
     * Search transactions using advanced criteria
     */
    search: protectedProcedure
        .input(
            z.object({
                // Search criteria
                searchCriteria: z.record(z.string(), z.unknown()).optional(),
                // Pagination
                page: z.string().optional(),
                per_page: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { searchCriteria = {}, page, per_page } = input;

            // Build the URL for search endpoint
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.search}`;

            // Build request body with pagination if provided
            const requestBody: Record<string, unknown> = { ...searchCriteria };

            // Add pagination to request body if provided
            if (page) {
                const pageNum = parseInt(page, 10);
                requestBody.page = Math.max(0, pageNum - 1); // Backend uses 0-based
            }
            if (per_page) {
                requestBody.size = parseInt(per_page, 10);
            }

            // Fetch from backend API
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to search transactions',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to search transactions',
                });
            }

            const data = await response.json();

            // Handle response format - backend returns paginated response
            if (data.data && Array.isArray(data.data)) {
                const backendPageNumber = data.pageNumber ?? 0;
                const requestedPerPage = parseInt(per_page || '15', 10);

                return {
                    data: data.data,
                    pageNumber: backendPageNumber + 1, // Convert to 1-based
                    pageSize: data.pageSize ?? requestedPerPage,
                    totalElements: data.totalElements ?? data.data.length,
                    totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? data.data.length) / (data.pageSize ?? requestedPerPage)),
                    last: data.last ?? false,
                    first: backendPageNumber === 0,
                };
            } else if (Array.isArray(data)) {
                // Backend returned just an array (legacy format)
                const requestedPage = parseInt(page || '1', 10);
                const requestedPerPage = parseInt(per_page || '15', 10);

                return {
                    data: data,
                    pageNumber: requestedPage,
                    pageSize: requestedPerPage,
                    totalElements: data.length,
                    totalPages: 1,
                    last: true,
                    first: requestedPage === 1,
                };
            } else {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Unexpected response format from backend',
                });
            }
        }),

    /**
     * Get transaction statistics
     */
    stats: protectedProcedure
        .input(
            z.object({
                start_date: z.string(),
                end_date: z.string(),
                merchantId: z.string().optional(),
                gatewayId: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { start_date, end_date, merchantId, gatewayId } = input;

            // Validate required parameters
            if (!start_date || !end_date) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'start_date and end_date are required',
                });
            }

            // Build backend API URL
            const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.dailyStats}`);
            url.searchParams.set('startDate', toStartDateTime(start_date));
            url.searchParams.set('endDate', toEndDateTime(end_date));

            // Optional filters
            if (merchantId) {
                url.searchParams.set('merchantId', merchantId);
            }
            if (gatewayId) {
                url.searchParams.set('gatewayId', gatewayId);
            }

            // Fetch from backend API
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch volume stats',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch volume stats',
                });
            }

            const data = await response.json();

            // Return the response data
            return data;
        }),

    /**
     * Export transactions
     * Note: This returns a blob, which tRPC handles differently
     */
    export: protectedProcedure
        .input(
            z.object({
                format: z.enum(['csv', 'excel']),
                searchCriteria: z.record(z.string(), z.unknown()).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { format, searchCriteria = {} } = input;

            // Map format to backend endpoint
            const FORMAT_ENDPOINT_MAP: Record<'csv' | 'excel', string> = {
                csv: API_ENDPOINTS.transactions.exportCsv,
                excel: API_ENDPOINTS.transactions.exportExcel,
            };

            // Build search criteria for backend
            const backendCriteria: Record<string, unknown> = {};

            // Map frontend filter names to backend search criteria
            if (searchCriteria.searchTerm) {
                backendCriteria.searchTerm = searchCriteria.searchTerm;
            }
            if (searchCriteria.search) {
                backendCriteria.searchTerm = searchCriteria.search;
            }
            if (searchCriteria.status) {
                backendCriteria.status = searchCriteria.status;
            }
            if (searchCriteria.statuses && Array.isArray(searchCriteria.statuses)) {
                backendCriteria.statuses = searchCriteria.statuses;
            }

            // Date range - convert to LocalDateTime format if needed
            if (searchCriteria.start_date || searchCriteria.createdFrom) {
                const startDate = (searchCriteria.createdFrom || searchCriteria.start_date) as string;
                backendCriteria.createdFrom = startDate.includes('T')
                    ? startDate
                    : `${startDate}T00:00:00`;
            }
            if (searchCriteria.end_date || searchCriteria.createdTo) {
                const endDate = (searchCriteria.createdTo || searchCriteria.end_date) as string;
                backendCriteria.createdTo = endDate.includes('T')
                    ? endDate
                    : `${endDate}T23:59:59`;
            }

            // Amount range
            if (searchCriteria.amount_min || searchCriteria.minAmount) {
                backendCriteria.minAmount = searchCriteria.minAmount || searchCriteria.amount_min;
            }
            if (searchCriteria.amount_max || searchCriteria.maxAmount) {
                backendCriteria.maxAmount = searchCriteria.maxAmount || searchCriteria.amount_max;
            }

            // Sorting
            if (searchCriteria.sortBy) {
                backendCriteria.sortBy = searchCriteria.sortBy;
            }
            if (searchCriteria.sortDirection) {
                backendCriteria.sortDirection = searchCriteria.sortDirection;
            }
            // Handle sort array format from frontend (e.g., ["field,asc"])
            if (searchCriteria.sort && Array.isArray(searchCriteria.sort) && searchCriteria.sort.length > 0) {
                const [sortBy, sortDirection] = (searchCriteria.sort[0] as string).split(',');
                if (sortBy) backendCriteria.sortBy = sortBy;
                if (sortDirection) backendCriteria.sortDirection = sortDirection.toUpperCase();
            }

            // Pass through any other valid search criteria fields
            const passthroughFields = [
                'internalTransactionId',
                'externalTransactionId',
                'merchantTransactionId',
                'merchantId',
                'merchantName',
                'errorCode',
                'responseCode',
                'paymentGatewayCode',
                'paymentGatewayName',
                'paymentChannelType',
                'provider',
                'paymentMethod',
                'payCode',
                'currency',
                'currencies',
                'customerName',
                'customerEmail',
                'customerPhone',
                'statusUpdatedFrom',
                'statusUpdatedTo',
                'accountNumber',
                'ipAddress',
                'deviceId',
                'includeProduction',
                'includeTest',
                'includeDisbursements',
                'includeAuditTrail',
            ];

            passthroughFields.forEach((field) => {
                if (searchCriteria[field] !== undefined && searchCriteria[field] !== null && searchCriteria[field] !== '') {
                    backendCriteria[field] = searchCriteria[field];
                }
            });

            // Build the backend URL
            const backendEndpoint = FORMAT_ENDPOINT_MAP[format];
            const url = `${API_CONFIG.baseURL}${backendEndpoint}`;

            // Fetch from backend API using POST
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(backendCriteria),
                cache: 'no-store',
            });

            if (!response.ok) {
                // Try to parse error response as JSON, fallback to text
                const errorData = await response.json().catch(async () => {
                    const text = await response.text().catch(() => '');
                    return { message: text || response.statusText || 'Failed to export transactions' };
                });

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to export transactions',
                });
            }

            // Get the file content as blob
            const blob = await response.blob();

            // Convert blob to base64 for tRPC transport
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            // Map format to Content-Type
            const FORMAT_CONTENT_TYPE_MAP: Record<'csv' | 'excel', string> = {
                csv: 'text/csv',
                excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };

            // Map format to file extension
            const FORMAT_EXTENSION_MAP: Record<'csv' | 'excel', string> = {
                csv: 'csv',
                excel: 'xlsx',
            };

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `transactions-${timestamp}.${FORMAT_EXTENSION_MAP[format]}`;

            return {
                data: base64,
                contentType: FORMAT_CONTENT_TYPE_MAP[format],
                filename,
            };
        }),

    /**
     * Retry a failed transaction
     */
    retry: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: transactionUid } = input;

            if (!transactionUid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            // Build the URL for retry endpoint with reason as query param
            const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.retry.replace('{uid}', transactionUid)}`);
            // Add reason as query parameter (may be required by backend)
            url.searchParams.set('reason', 'Manual retry');

            // Call backend API to retry transaction
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to retry transaction',
                });
            }

            return {
                message: data.message || 'Transaction retry initiated successfully',
                data: data.data || data,
            };
        }),

    /**
     * Cancel a pending/processing transaction
     */
    cancel: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: transactionUid, reason = 'Manual cancellation' } = input;

            if (!transactionUid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            // Build the URL for cancel endpoint with reason as query param
            const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.cancel.replace('{uid}', transactionUid)}`);
            // Add reason as query parameter (required by backend)
            url.searchParams.set('reason', reason);

            // Call backend API to cancel transaction
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to cancel transaction',
                });
            }

            return {
                message: data.message || 'Transaction cancelled successfully',
                data: data.data || data,
            };
        }),

    /**
     * Manually complete a pending/processing transaction
     */
    complete: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: transactionUid, reason = 'Manual completion' } = input;

            if (!transactionUid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            // Build the URL for complete endpoint with reason as query param
            const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.complete.replace('{uid}', transactionUid)}`);
            // Add reason as query parameter (required by backend)
            url.searchParams.set('reason', reason);

            // Call backend API to complete transaction
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to complete transaction',
                });
            }

            return {
                message: data.message || 'Transaction completed successfully',
                data: data.data || data,
            };
        }),

    /**
     * Refund a successful transaction
     */
    refund: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                refundAmount: z.string(),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: transactionUid, refundAmount, reason = 'Manual refund' } = input;

            if (!transactionUid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            if (!refundAmount) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Refund amount is required',
                });
            }

            // Build the URL for refund endpoint with query params
            const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.refund.replace('{uid}', transactionUid)}`);
            // Add required query parameters
            url.searchParams.set('refundAmount', refundAmount);
            url.searchParams.set('reason', reason);

            // Call backend API to refund transaction
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: data.message || data.error || 'Failed to refund transaction',
                });
            }

            return {
                message: data.message || 'Transaction refunded successfully',
                data: data.data || data,
            };
        }),

    /**
     * Check if a transaction can be updated
     */
    canUpdate: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: transactionUid } = input;

            if (!transactionUid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            // Build the URL for can-update endpoint
            const endpoint = buildEndpointUrl.transactionCanUpdate(transactionUid);
            const url = `${API_CONFIG.baseURL}${endpoint}`;

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
                    message: response.statusText || 'Failed to check if transaction can be updated',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to check if transaction can be updated',
                });
            }

            const data = await response.json();

            // Handle wrapped responses
            // Backend returns { status, statusCode, message, data: boolean }
            // Transform boolean to CanUpdateResponse format
            const canUpdateData = typeof data?.data === 'boolean'
                ? { canUpdate: data.data }
                : (data?.data || data);

            // Validate and parse the response
            const parsed = CanUpdateResponseSchema.parse(canUpdateData);

            return parsed;
        }),

    /**
     * Get processing history for a transaction
     */
    processingHistory: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: transactionUid } = input;

            if (!transactionUid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            // Build the URL for processing history endpoint
            const endpoint = buildEndpointUrl.transactionProcessingHistory(transactionUid);
            const url = `${API_CONFIG.baseURL}${endpoint}`;

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
                    message: response.statusText || 'Failed to fetch processing history',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch processing history',
                });
            }

            const data = await response.json();

            // Handle both array and wrapped responses
            const historyData = Array.isArray(data) ? data : (data?.data || []);

            // Transform string array into structured objects for the UI
            const transformedHistory = historyData.map((entry: unknown, index: number) => {
                const uniqueId = index + 1;

                if (typeof entry === 'string') {
                    // Try to parse as JSON first
                    try {
                        const parsed = JSON.parse(entry);
                        if (typeof parsed === 'object' && parsed !== null) {
                            const parsedId = parsed.id;
                            const numericId = typeof parsedId === 'number' ? parsedId :
                                (typeof parsedId === 'string' && /^\d+$/.test(parsedId) ? parseInt(parsedId, 10) : uniqueId);
                            return {
                                id: numericId,
                                status: parsed.status || 'INFO',
                                message: parsed.message || entry,
                                timestamp: parsed.timestamp || new Date().toISOString(),
                                ...parsed,
                            };
                        }
                    } catch {
                        // Not JSON, treat as plain text message
                    }

                    // Plain string - convert to object
                    return {
                        id: uniqueId,
                        status: 'INFO',
                        message: entry,
                        timestamp: new Date().toISOString(),
                    };
                }

                // Already an object - ensure it has required fields
                if (typeof entry === 'object' && entry !== null) {
                    const obj = entry as Record<string, unknown>;
                    const objId = obj.id;
                    const numericId = typeof objId === 'number' ? objId :
                        (typeof objId === 'string' && /^\d+$/.test(objId) ? parseInt(objId, 10) : uniqueId);
                    return {
                        id: numericId,
                        status: 'INFO',
                        timestamp: new Date().toISOString(),
                        ...obj,
                    };
                }

                // Fallback
                return {
                    id: uniqueId,
                    status: 'INFO',
                    message: String(entry),
                    timestamp: new Date().toISOString(),
                };
            });

            return transformedHistory;
        }),

    /**
     * Get audit trail for a transaction
     */
    auditTrail: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const { token } = ctx;
            const { id: transactionUid } = input;

            if (!transactionUid?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Transaction UID is required',
                });
            }

            // Build the URL for audit trail endpoint
            const endpoint = buildEndpointUrl.transactionAuditTrail(transactionUid);
            const url = `${API_CONFIG.baseURL}${endpoint}`;

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
                    message: response.statusText || 'Failed to fetch audit trail',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch audit trail',
                });
            }

            const data = await response.json();

            // Handle both array and wrapped responses
            const auditTrailData = Array.isArray(data) ? data : (data?.data || []);

            // First pass: Find the first valid timestamp to use as base for synthetic timestamps
            let foundBaseTimestamp: number | null = null;
            for (const entry of auditTrailData) {
                if (typeof entry === 'string') {
                    try {
                        const parsed = JSON.parse(entry);
                        if (typeof parsed === 'object' && parsed !== null && parsed.timestamp) {
                            const ts = new Date(parsed.timestamp).getTime();
                            if (!isNaN(ts)) {
                                foundBaseTimestamp = ts;
                                break;
                            }
                        }
                    } catch {
                        // Not JSON or invalid, continue
                    }
                } else if (typeof entry === 'object' && entry !== null) {
                    const obj = entry as Record<string, unknown>;
                    if (obj.timestamp) {
                        const ts = new Date(obj.timestamp as string).getTime();
                        if (!isNaN(ts)) {
                            foundBaseTimestamp = ts;
                            break;
                        }
                    }
                }
            }
            const baseTimestamp = foundBaseTimestamp ?? Date.now();

            // Transform string array into structured objects for the UI
            const transformedAuditTrail = auditTrailData.map((entry: unknown, index: number) => {
                const uniqueId = index + 1;
                const syntheticTimestamp = new Date(baseTimestamp + (index * 1000)).toISOString();

                if (typeof entry === 'string') {
                    // Try to parse as JSON first
                    try {
                        const parsed = JSON.parse(entry);
                        if (typeof parsed === 'object' && parsed !== null) {
                            const parsedId = parsed.id;
                            const numericId = typeof parsedId === 'number' ? parsedId :
                                (typeof parsedId === 'string' && /^\d+$/.test(parsedId) ? parseInt(parsedId, 10) : uniqueId);
                            const timestamp = parsed.timestamp && !isNaN(new Date(parsed.timestamp).getTime())
                                ? parsed.timestamp
                                : syntheticTimestamp;
                            return {
                                id: numericId,
                                action: parsed.action || 'CHANGE',
                                timestamp,
                                ...parsed,
                            };
                        }
                    } catch {
                        // Not JSON, treat as plain text message
                    }

                    // Plain string - convert to object
                    // Try to extract action from string format "ACTION: details"
                    const colonIndex = entry.indexOf(':');
                    if (colonIndex > 0 && colonIndex < 50) {
                        const action = entry.substring(0, colonIndex).trim().toUpperCase();
                        const details = entry.substring(colonIndex + 1).trim();
                        return {
                            id: uniqueId,
                            action: action || 'CHANGE',
                            reason: details,
                            timestamp: syntheticTimestamp,
                        };
                    }

                    return {
                        id: uniqueId,
                        action: 'CHANGE',
                        reason: entry,
                        timestamp: syntheticTimestamp,
                    };
                }

                // Already an object - ensure it has required fields
                if (typeof entry === 'object' && entry !== null) {
                    const obj = entry as Record<string, unknown>;
                    const objId = obj.id;
                    const numericId = typeof objId === 'number' ? objId :
                        (typeof objId === 'string' && /^\d+$/.test(objId) ? parseInt(objId, 10) : uniqueId);
                    const timestamp = obj.timestamp && typeof obj.timestamp === 'string' && !isNaN(new Date(obj.timestamp).getTime())
                        ? obj.timestamp
                        : syntheticTimestamp;
                    return {
                        id: numericId,
                        action: 'CHANGE',
                        timestamp,
                        ...obj,
                    };
                }

                // Fallback
                return {
                    id: uniqueId,
                    action: 'CHANGE',
                    reason: String(entry),
                    timestamp: syntheticTimestamp,
                };
            });

            return transformedAuditTrail;
        }),
});
