import { z } from 'zod';
import { protectedProcedure, createTRPCRouter } from '../init';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';
import {
  DisbursementSchema,
  ProcessingHistoryEntrySchema,
  AuditTrailEntrySchema,
  CanUpdateResponseSchema,
  DisbursementStatsResponseSchema,
  MonthlyDisbursementSummarySchema,
  PaymentGatewaySchema,
  PaginatedPaymentGatewayResponse,
} from '@/lib/definitions';

// Helper function to normalize disbursement fields
function normalizeFieldDefaults(item: Record<string, unknown>) {
  return {
    ...item,
    pspDisbursementId: item.pspDisbursementId ?? '',
    merchantDisbursementId: item.merchantDisbursementId ?? '',
    sourceTransactionId: item.sourceTransactionId ?? '',
    disbursementChannel: item.disbursementChannel ?? '',
    recipientAccount: item.recipientAccount ?? '',
    recipientName: item.recipientName ?? '',
    description: item.description ?? '',
    responseCode: item.responseCode ?? '',
    responseMessage: item.responseMessage ?? '',
    errorCode: item.errorCode ?? '',
    errorMessage: item.errorMessage ?? '',
  };
}

// Helper function to handle search requests
async function handleSearchRequest(
  token: string,
  params: {
    status?: string;
    startDate?: string;
    endDate?: string;
    amountMin?: string;
    amountMax?: string;
    searchTerm?: string;
    merchantId?: string;
    gatewayId?: string;
    transactionId?: string;
    page: number;
    perPage: number;
    sort?: string[];
  }
) {
  const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.search}`;

  // Build search criteria
  const searchCriteria: Record<string, unknown> = {};

  if (params.searchTerm) {
    searchCriteria.searchTerm = params.searchTerm;
  }
  if (params.status) {
    searchCriteria.status = params.status.toUpperCase();
  }
  if (params.startDate) {
    searchCriteria.createdFrom = params.startDate.includes('T')
      ? params.startDate
      : `${params.startDate}T00:00:00`;
  }
  if (params.endDate) {
    searchCriteria.createdTo = params.endDate.includes('T')
      ? params.endDate
      : `${params.endDate}T23:59:59`;
  }
  if (params.amountMin) {
    searchCriteria.minAmount = params.amountMin;
  }
  if (params.amountMax) {
    searchCriteria.maxAmount = params.amountMax;
  }
  if (params.merchantId) {
    searchCriteria.merchantId = params.merchantId;
  }
  if (params.gatewayId) {
    searchCriteria.gatewayId = params.gatewayId;
  }
  if (params.transactionId) {
    searchCriteria.transactionId = params.transactionId;
  }

  // Add pagination (backend uses 0-based)
  searchCriteria.page = Math.max(0, params.page - 1);
  searchCriteria.size = params.perPage;

  // Add sorting if provided
  if (params.sort && params.sort.length > 0) {
    // Parse sort format "field,asc" or "field,desc"
    const firstSort = params.sort[0];
    if (firstSort.includes(',')) {
      const [sortBy, sortDirection] = firstSort.split(',');
      searchCriteria.sortBy = sortBy;
      searchCriteria.sortDirection = sortDirection.toUpperCase();
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(searchCriteria),
    cache: 'no-store',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to search disbursements';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(`${errorMessage} (Status: ${response.status})`);
  }

  const data = await response.json();

  const disbursementsData = data.data || [];
  const transformedData = disbursementsData.map((item: Record<string, unknown>) => normalizeFieldDefaults(item));
  const parsed = z.array(DisbursementSchema).parse(transformedData);

  // Convert backend 0-based pageNumber to frontend 1-based
  const backendPageNumber = data.pageNumber ?? (params.page - 1);
  const frontendPageNumber = backendPageNumber + 1;

  return {
    data: parsed,
    pageNumber: frontendPageNumber,
    pageSize: data.pageSize ?? params.perPage,
    totalElements: data.totalElements ?? parsed.length,
    totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? parsed.length) / (data.pageSize ?? params.perPage)),
    last: data.last ?? false,
    first: data.first ?? (backendPageNumber === 0),
  };
}

export const disbursementsRouter = createTRPCRouter({
  // Get disbursements list with pagination and filters
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      per_page: z.number().min(1).max(100).default(10),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      status: z.string().optional(),
      merchant_id: z.string().optional(),
      pgo_id: z.string().optional(),
      amount_min: z.string().optional(),
      amount_max: z.string().optional(),
      search: z.string().optional(),
      source_transaction_id: z.string().optional(),
      sort: z.array(z.string()).optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Count how many filter types are active
      const hasStatusFilter = !!input.status;
      const hasDateFilter = !!(input.start_date || input.end_date);
      const hasAmountFilter = !!(input.amount_min || input.amount_max);
      const hasSearchTerm = !!input.search;
      const hasOtherFilters = !!(input.merchant_id || input.pgo_id || input.source_transaction_id);

      const activeFilterTypes = [hasStatusFilter, hasDateFilter, hasAmountFilter, hasSearchTerm, hasOtherFilters].filter(Boolean).length;

      // If multiple filter types or search term, use POST search endpoint
      if (activeFilterTypes > 1 || hasSearchTerm) {
        if (!ctx.token) {
          throw new Error('Unauthorized: No token available');
        }
        return await handleSearchRequest(ctx.token, {
          status: input.status,
          startDate: input.start_date,
          endDate: input.end_date,
          amountMin: input.amount_min,
          amountMax: input.amount_max,
          searchTerm: input.search,
          merchantId: input.merchant_id,
          gatewayId: input.pgo_id,
          transactionId: input.source_transaction_id,
          page: input.page,
          perPage: input.per_page,
          sort: input.sort,
        });
      }

      // Single filter type - use specific endpoint
      let url: string;
      const queryParams = new URLSearchParams();

      // Add pagination (backend uses 0-based, frontend uses 1-based)
      queryParams.set('page', (input.page - 1).toString());
      queryParams.set('size', input.per_page.toString());

      if (hasStatusFilter && input.status) {
        // Use status-specific endpoint
        if (input.status.toUpperCase() === 'PENDING') {
          url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.pending}`;
        } else if (input.status.toUpperCase() === 'FAILED') {
          url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.failed}`;
        } else {
          url = `${API_CONFIG.baseURL}${buildEndpointUrl.disbursementsByStatus(input.status.toUpperCase())}`;
        }
      } else if (hasDateFilter) {
        // Use date-range endpoint
        url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.byDateRange}`;
        if (input.start_date) {
          queryParams.set('startDate', input.start_date.includes('T') ? input.start_date : `${input.start_date}T00:00:00`);
        }
        if (input.end_date) {
          queryParams.set('endDate', input.end_date.includes('T') ? input.end_date : `${input.end_date}T23:59:59`);
        }
      } else if (hasAmountFilter) {
        // Use amount-range endpoint
        url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.byAmountRange}`;
        if (input.amount_min) {
          queryParams.set('minAmount', input.amount_min);
        }
        if (input.amount_max) {
          queryParams.set('maxAmount', input.amount_max);
        }
      } else {
        // No filters - use list endpoint
        url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.list}`;
      }

      // Add sorting if provided
      if (input.sort && input.sort.length > 0) {
        queryParams.set('sort', input.sort.join(';'));
      }

      const fullUrl = `${url}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      // To display the response body, you need to await and parse it (for example, as JSON or text).
      // For easy debugging, you can clone the response and parse without consuming the original stream.
      try {
        const debugClone = response.clone();
        const bodyText = await debugClone.text();
        console.log('Disbursement Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: bodyText,
        });
      } catch (e) {
        console.log('Disbursement Response: Unable to display body', e);
      }

      if (!response.ok) {
        let errorMessage = 'Failed to fetch disbursements';

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
        }

        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const responseData = await response.json();

      // Handle both array response (legacy) and paginated response
      if (Array.isArray(responseData)) {
        const transformedData = responseData.map((item: Record<string, unknown>) => normalizeFieldDefaults(item));
        const parsed = z.array(DisbursementSchema).parse(transformedData);

        return {
          data: parsed,
          pageNumber: input.page,
          pageSize: input.per_page,
          totalElements: parsed.length,
          totalPages: Math.ceil(parsed.length / input.per_page),
          last: true,
          first: input.page === 1,
        };
      } else {
        const disbursementsData = responseData.data || [];
        const transformedData = disbursementsData.map((item: Record<string, unknown>) => normalizeFieldDefaults(item));
        const parsed = z.array(DisbursementSchema).parse(transformedData);

        // Convert backend 0-based pageNumber to frontend 1-based
        const backendPageNumber = responseData.pageNumber ?? (input.page - 1);
        const frontendPageNumber = backendPageNumber + 1;

        return {
          data: parsed,
          pageNumber: frontendPageNumber,
          pageSize: responseData.pageSize ?? input.per_page,
          totalElements: responseData.totalElements ?? parsed.length,
          totalPages: responseData.totalPages ?? Math.ceil((responseData.totalElements ?? parsed.length) / (responseData.pageSize ?? input.per_page)),
          last: responseData.last ?? false,
          first: responseData.first ?? (backendPageNumber === 0),
        };
      }
    }),

  // Get single disbursement by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {

      // Try to determine if it's a UID (typically UUID format) or numeric ID
      const isUid = input.id.includes('-') || input.id.length > 20;

      let url: string;
      if (isUid) {
        const endpoint = buildEndpointUrl.disbursementByUid(input.id);
        url = `${API_CONFIG.baseURL}${endpoint}`;
      } else {
        const endpoint = buildEndpointUrl.disbursementById(input.id);
        url = `${API_CONFIG.baseURL}${endpoint}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch disbursement';

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

      const data = await response.json();
      const disbursementData = data.data || data;

      // Normalize nullable string fields
      function normalizeFieldDefaults(item: Record<string, unknown>) {
        return {
          ...item,
          pspDisbursementId: item.pspDisbursementId ?? '',
          merchantDisbursementId: item.merchantDisbursementId ?? '',
          sourceTransactionId: item.sourceTransactionId ?? '',
          disbursementChannel: item.disbursementChannel ?? '',
          recipientAccount: item.recipientAccount ?? '',
          recipientName: item.recipientName ?? '',
          description: item.description ?? '',
          responseCode: item.responseCode ?? '',
          responseMessage: item.responseMessage ?? '',
          errorCode: item.errorCode ?? '',
          errorMessage: item.errorMessage ?? '',
        };
      }

      const normalizedData = normalizeFieldDefaults(disbursementData);
      return DisbursementSchema.parse(normalizedData);
    }),

  // Search disbursements with advanced criteria
  search: protectedProcedure
    .input(z.object({
      searchTerm: z.string().optional(),
      status: z.string().optional(),
      statuses: z.array(z.string()).optional(),
      createdFrom: z.string().optional(),
      createdTo: z.string().optional(),
      minAmount: z.string().optional(),
      maxAmount: z.string().optional(),
      merchantId: z.string().optional(),
      gatewayId: z.string().optional(),
      page: z.number().min(0).default(0),
      size: z.number().min(1).max(100).default(15),
      sortBy: z.string().optional(),
      sortDirection: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.search}`;

      const searchCriteria: Record<string, unknown> = {};
      if (input.searchTerm) searchCriteria.searchTerm = input.searchTerm;
      if (input.status) searchCriteria.status = input.status.toUpperCase();
      if (input.statuses) searchCriteria.statuses = input.statuses;
      if (input.createdFrom) {
        searchCriteria.createdFrom = input.createdFrom.includes('T')
          ? input.createdFrom
          : `${input.createdFrom}T00:00:00`;
      }
      if (input.createdTo) {
        searchCriteria.createdTo = input.createdTo.includes('T')
          ? input.createdTo
          : `${input.createdTo}T23:59:59`;
      }
      if (input.minAmount) searchCriteria.minAmount = input.minAmount;
      if (input.maxAmount) searchCriteria.maxAmount = input.maxAmount;
      if (input.merchantId) searchCriteria.merchantId = input.merchantId;
      if (input.gatewayId) searchCriteria.gatewayId = input.gatewayId;
      if (input.sortBy) searchCriteria.sortBy = input.sortBy;
      if (input.sortDirection) searchCriteria.sortDirection = input.sortDirection.toUpperCase();

      searchCriteria.page = input.page;
      searchCriteria.size = input.size;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        body: JSON.stringify(searchCriteria),
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to search disbursements';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();

      function normalizeFieldDefaults(item: Record<string, unknown>) {
        return {
          ...item,
          pspDisbursementId: item.pspDisbursementId ?? '',
          merchantDisbursementId: item.merchantDisbursementId ?? '',
          sourceTransactionId: item.sourceTransactionId ?? '',
          disbursementChannel: item.disbursementChannel ?? '',
          recipientAccount: item.recipientAccount ?? '',
          recipientName: item.recipientName ?? '',
          description: item.description ?? '',
          responseCode: item.responseCode ?? '',
          responseMessage: item.responseMessage ?? '',
          errorCode: item.errorCode ?? '',
          errorMessage: item.errorMessage ?? '',
        };
      }

      const disbursementsData = data.data || [];
      const transformedData = disbursementsData.map((item: Record<string, unknown>) => normalizeFieldDefaults(item));
      const parsed = z.array(DisbursementSchema).parse(transformedData);

      return {
        data: parsed,
        pageNumber: (data.pageNumber ?? input.page) + 1, // Convert to 1-based
        pageSize: data.pageSize ?? input.size,
        totalElements: data.totalElements ?? parsed.length,
        totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? parsed.length) / (data.pageSize ?? input.size)),
        last: data.last ?? false,
        first: (data.pageNumber ?? input.page) === 0,
      };
    }),

  // Retry a failed disbursement
  retry: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const endpoint = buildEndpointUrl.retryDisbursement(input.id);
      const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);
      if (input.reason) {
        url.searchParams.set('reason', input.reason);
      } else {
        url.searchParams.set('reason', 'Manual retry');
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to retry disbursement';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      return {
        message: data.message || 'Disbursement retry initiated successfully',
        data: data.data || data,
      };
    }),

  // Complete a disbursement
  complete: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const endpoint = buildEndpointUrl.completeDisbursement(input.id);
      const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);
      url.searchParams.set('reason', input.reason || 'Manual completion');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to complete disbursement';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      return {
        message: data.message || 'Disbursement completed successfully',
        data: data.data || data,
      };
    }),

  // Cancel a disbursement
  cancel: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const endpoint = buildEndpointUrl.cancelDisbursement(input.id);
      const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);
      url.searchParams.set('reason', input.reason || 'Manual cancellation');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to cancel disbursement';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      return {
        message: data.message || 'Disbursement cancelled successfully',
        data: data.data || data,
      };
    }),

  // Get processing history
  processingHistory: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const endpoint = buildEndpointUrl.disbursementProcessingHistory(input.id);
      const url = `${API_CONFIG.baseURL}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch processing history';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      const historyData = Array.isArray(data) ? data : (data.data || []);

      // Transform string array into structured objects
      const transformedHistory = historyData.map((entry: unknown, index: number) => {
        // Use numeric index as ID (schema expects number or undefined)
        const numericId = typeof index === 'number' ? index : undefined;

        if (typeof entry === 'string') {
          try {
            const parsed = JSON.parse(entry);
            if (typeof parsed === 'object' && parsed !== null) {
              return {
                id: typeof parsed.id === 'number' ? parsed.id : numericId,
                status: parsed.status || 'INFO',
                message: parsed.message || entry,
                timestamp: parsed.timestamp || new Date().toISOString(),
                errorCode: parsed.errorCode || null,
                errorMessage: parsed.errorMessage || null,
                retryCount: typeof parsed.retryCount === 'number' ? parsed.retryCount : null,
                attemptNumber: typeof parsed.attemptNumber === 'number' ? parsed.attemptNumber : null,
                processingTime: typeof parsed.processingTime === 'number' ? parsed.processingTime : null,
                metadata: parsed.metadata || null,
              };
            }
          } catch {
            // Not JSON, treat as plain text message
          }

          // Plain string - convert to ProcessingHistoryEntry
          return {
            id: numericId,
            status: 'INFO',
            message: entry,
            timestamp: new Date().toISOString(),
            errorCode: null,
            errorMessage: null,
            retryCount: null,
            attemptNumber: null,
            processingTime: null,
            metadata: null,
          };
        }

        if (typeof entry === 'object' && entry !== null) {
          const obj = entry as Record<string, unknown>;
          return {
            id: typeof obj.id === 'number' ? obj.id : numericId,
            status: (obj.status as string) || 'INFO',
            message: (obj.message as string) || null,
            timestamp: (obj.timestamp as string) || new Date().toISOString(),
            errorCode: (obj.errorCode as string) || null,
            errorMessage: (obj.errorMessage as string) || null,
            retryCount: typeof obj.retryCount === 'number' ? obj.retryCount : null,
            attemptNumber: typeof obj.attemptNumber === 'number' ? obj.attemptNumber : null,
            processingTime: typeof obj.processingTime === 'number' ? obj.processingTime : null,
            metadata: (obj.metadata as Record<string, unknown>) || null,
          };
        }

        // Fallback for any other type
        return {
          id: numericId,
          status: 'INFO',
          message: String(entry),
          timestamp: new Date().toISOString(),
          errorCode: null,
          errorMessage: null,
          retryCount: null,
          attemptNumber: null,
          processingTime: null,
          metadata: null,
        };
      });

      return z.array(ProcessingHistoryEntrySchema).parse(transformedHistory);
    }),

  // Get audit trail
  auditTrail: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const endpoint = buildEndpointUrl.disbursementAuditTrail(input.id);
      const url = `${API_CONFIG.baseURL}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch audit trail';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      const auditTrailData = Array.isArray(data) ? data : (data.data || []);

      // Transform string array into structured objects
      const transformedAuditTrail = auditTrailData.map((entry: unknown, index: number) => {
        // Use numeric index as ID (schema expects number or undefined)
        const numericId = typeof index === 'number' ? index : undefined;

        if (typeof entry === 'string') {
          try {
            const parsed = JSON.parse(entry);
            if (typeof parsed === 'object' && parsed !== null) {
              return {
                id: typeof parsed.id === 'number' ? parsed.id : numericId,
                action: parsed.action || 'CHANGE',
                timestamp: parsed.timestamp || new Date().toISOString(),
                performedBy: parsed.performedBy || null,
                performedByUid: parsed.performedByUid || null,
                oldValue: parsed.oldValue || null,
                newValue: parsed.newValue || null,
                field: parsed.field || null,
                reason: parsed.reason || null,
                ipAddress: parsed.ipAddress || null,
                userAgent: parsed.userAgent || null,
                metadata: parsed.metadata || null,
              };
            }
          } catch {
            // Not JSON, treat as plain text
          }

          const colonIndex = entry.indexOf(':');
          if (colonIndex > 0 && colonIndex < 30) {
            const action = entry.substring(0, colonIndex).trim().toUpperCase();
            const details = entry.substring(colonIndex + 1).trim();
            return {
              id: numericId,
              action: action || 'CHANGE',
              reason: details,
              timestamp: new Date().toISOString(),
              performedBy: null,
              performedByUid: null,
              oldValue: null,
              newValue: null,
              field: null,
              ipAddress: null,
              userAgent: null,
              metadata: null,
            };
          }

          return {
            id: numericId,
            action: 'CHANGE',
            reason: entry,
            timestamp: new Date().toISOString(),
            performedBy: null,
            performedByUid: null,
            oldValue: null,
            newValue: null,
            field: null,
            ipAddress: null,
            userAgent: null,
            metadata: null,
          };
        }

        if (typeof entry === 'object' && entry !== null) {
          const obj = entry as Record<string, unknown>;
          return {
            id: typeof obj.id === 'number' ? obj.id : numericId,
            action: (obj.action as string) || 'CHANGE',
            timestamp: (obj.timestamp as string) || new Date().toISOString(),
            performedBy: (obj.performedBy as string) || null,
            performedByUid: (obj.performedByUid as string) || null,
            oldValue: (obj.oldValue as string) || null,
            newValue: (obj.newValue as string) || null,
            field: (obj.field as string) || null,
            reason: (obj.reason as string) || null,
            ipAddress: (obj.ipAddress as string) || null,
            userAgent: (obj.userAgent as string) || null,
            metadata: (obj.metadata as Record<string, string>) || null,
          };
        }

        return {
          id: numericId,
          action: 'CHANGE',
          reason: String(entry),
          timestamp: new Date().toISOString(),
          performedBy: null,
          performedByUid: null,
          oldValue: null,
          newValue: null,
          field: null,
          ipAddress: null,
          userAgent: null,
          metadata: null,
        };
      });

      return z.array(AuditTrailEntrySchema).parse(transformedAuditTrail);
    }),

  // Check if disbursement can be updated
  canUpdate: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const endpoint = buildEndpointUrl.disbursementCanUpdate(input.id);
      const url = `${API_CONFIG.baseURL}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to check if disbursement can be updated';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      const canUpdateData = data.data || data;
      return CanUpdateResponseSchema.parse(canUpdateData);
    }),

  // Export disbursements
  export: protectedProcedure
    .input(z.object({
      format: z.enum(['csv', 'excel']),
      searchTerm: z.string().optional(),
      status: z.string().optional(),
      statuses: z.array(z.string()).optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      createdFrom: z.string().optional(),
      createdTo: z.string().optional(),
      amount_min: z.string().optional(),
      amount_max: z.string().optional(),
      minAmount: z.string().optional(),
      maxAmount: z.string().optional(),
      sortBy: z.string().optional(),
      sortDirection: z.string().optional(),
      sort: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const formatEndpointMap: Record<'csv' | 'excel', string> = {
        csv: API_ENDPOINTS.disbursements.exportCsv,
        excel: API_ENDPOINTS.disbursements.exportExcel,
      };

      const url = `${API_CONFIG.baseURL}${formatEndpointMap[input.format]}`;

      const searchCriteria: Record<string, unknown> = {};
      if (input.searchTerm) searchCriteria.searchTerm = input.searchTerm;
      if (input.status) searchCriteria.status = input.status;
      if (input.statuses) searchCriteria.statuses = input.statuses;

      const startDate = input.createdFrom || input.start_date;
      if (startDate) {
        searchCriteria.createdFrom = startDate.includes('T')
          ? startDate
          : `${startDate}T00:00:00`;
      }

      const endDate = input.createdTo || input.end_date;
      if (endDate) {
        searchCriteria.createdTo = endDate.includes('T')
          ? endDate
          : `${endDate}T23:59:59`;
      }

      const minAmount = input.minAmount || input.amount_min;
      const maxAmount = input.maxAmount || input.amount_max;
      if (minAmount) searchCriteria.minAmount = minAmount;
      if (maxAmount) searchCriteria.maxAmount = maxAmount;

      if (input.sortBy) searchCriteria.sortBy = input.sortBy;
      if (input.sortDirection) searchCriteria.sortDirection = input.sortDirection.toUpperCase();
      if (input.sort && input.sort.length > 0) {
        const [sortBy, sortDirection] = input.sort[0].split(',');
        if (sortBy) searchCriteria.sortBy = sortBy;
        if (sortDirection) searchCriteria.sortDirection = sortDirection.toUpperCase();
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        body: JSON.stringify(searchCriteria),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to export disbursements';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      const contentTypeMap: Record<'csv' | 'excel', string> = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      const extensionMap: Record<'csv' | 'excel', string> = {
        csv: 'csv',
        excel: 'xlsx',
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `disbursements-${timestamp}.${extensionMap[input.format]}`;

      return {
        data: base64,
        contentType: contentTypeMap[input.format],
        filename,
      };
    }),

  // Get volume statistics
  volumeStats: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      merchantId: z.string().optional(),
      gatewayId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.volumeStats}`);
      url.searchParams.set('startDate', input.startDate);
      url.searchParams.set('endDate', input.endDate);
      if (input.merchantId) url.searchParams.set('merchantId', input.merchantId);
      if (input.gatewayId) url.searchParams.set('gatewayId', input.gatewayId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch volume stats';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      return DisbursementStatsResponseSchema.parse(data);
    }),

  // Get status statistics
  statusStats: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      merchantId: z.string().optional(),
      gatewayId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.statusStats}`);
      url.searchParams.set('startDate', input.startDate);
      url.searchParams.set('endDate', input.endDate);
      if (input.merchantId) url.searchParams.set('merchantId', input.merchantId);
      if (input.gatewayId) url.searchParams.set('gatewayId', input.gatewayId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch status stats';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      return DisbursementStatsResponseSchema.parse(data);
    }),

  // Get gateway statistics
  gatewayStats: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      merchantId: z.string().optional(),
      gatewayId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.gatewayStats}`);
      url.searchParams.set('startDate', input.startDate);
      url.searchParams.set('endDate', input.endDate);
      if (input.merchantId) url.searchParams.set('merchantId', input.merchantId);
      if (input.gatewayId) url.searchParams.set('gatewayId', input.gatewayId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch gateway stats';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      return DisbursementStatsResponseSchema.parse(data);
    }),

  // Get monthly summary
  monthlySummary: protectedProcedure
    .input(z.object({
      year: z.number(),
      month: z.number().optional(),
      merchant_id: z.string().optional(),
      pgo_id: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.reports.disbursementsMonthly}`);
      url.searchParams.set('year', input.year.toString());
      if (input.month) url.searchParams.set('month', input.month.toString());
      if (input.merchant_id) url.searchParams.set('merchant_id', input.merchant_id);
      if (input.pgo_id) url.searchParams.set('pgo_id', input.pgo_id);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch monthly disbursement summary';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      const summaryData = data.data || data;
      return MonthlyDisbursementSummarySchema.parse(summaryData);
    }),

  // Get all payment gateways
  // FR-PGO-002: Get All Payment Gateways
  listPaymentGateways: protectedProcedure
    .input(z.object({
      is_active: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const queryParams = new URLSearchParams();

      // Add all query parameters if they exist
      if (input?.is_active) {
        queryParams.set('is_active', input.is_active);
      }
      if (input?.search) {
        queryParams.set('search', input.search);
      }

      // Build the URL with query parameters
      const queryString = queryParams.toString();
      const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.list}${queryString ? `?${queryString}` : ''}`;

      // Fetch from backend API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText || 'Failed to fetch payment gateways',
        }));

        throw new Error(errorData.message || errorData.error || 'Failed to fetch payment gateways');
      }

      const data = await response.json();

      // Backend API returns: { data: PaymentGateway[], ... } or array
      // Transform to exclude credentials field
      if (data.data && Array.isArray(data.data)) {
        const transformedData = data.data.map((gateway: {
          id: string;
          uid?: string;
          name: string;
          code: string;
          productionApiBaseUrl?: string | null;
          sandboxApiBaseUrl?: string | null;
          supportedMethods?: string[];
          activeStatus?: string;
          isActive?: boolean;
          active?: boolean;
          createdAt?: string | null;
          updatedAt?: string | null;
        }) => {
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
          let supportedMethods: string[] = [];
          if (Array.isArray(gateway.supportedMethods)) {
            supportedMethods = gateway.supportedMethods;
          } else if (gateway.supportedMethods) {
            supportedMethods = [String(gateway.supportedMethods)];
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
        });

        const listResponse: PaginatedPaymentGatewayResponse = {
          data: transformedData.map((item: {
            id: string;
            uid: string;
            name: string;
            code: string;
            api_base_url_production: string | null;
            api_base_url_sandbox: string | null;
            supported_methods: string[];
            is_active: boolean;
            created_at: string | null;
            updated_at: string | null;
          }) => PaymentGatewaySchema.parse(item)),
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
        const transformedData = data.map((gateway: {
          id: string;
          uid?: string;
          name: string;
          code: string;
          productionApiBaseUrl?: string | null;
          sandboxApiBaseUrl?: string | null;
          supportedMethods?: string[];
          activeStatus?: string;
          isActive?: boolean;
          active?: boolean;
          createdAt?: string | null;
          updatedAt?: string | null;
        }) => {
          // Convert activeStatus string ('Active'/'Inactive') to boolean
          let isActive = true;
          if (gateway.activeStatus !== undefined) {
            isActive = gateway.activeStatus === 'Active' || gateway.activeStatus === 'ACTIVE';
          } else if (gateway.isActive !== undefined) {
            isActive = gateway.isActive;
          } else if (gateway.active !== undefined) {
            isActive = gateway.active;
          }

          return {
            id: gateway.id,
            uid: gateway.uid ?? gateway.id,
            name: gateway.name,
            code: gateway.code,
            api_base_url_production: gateway.productionApiBaseUrl ?? null,
            api_base_url_sandbox: gateway.sandboxApiBaseUrl ?? null,
            supported_methods: Array.isArray(gateway.supportedMethods)
              ? gateway.supportedMethods.filter((m): m is string => typeof m === 'string')
              : [],
            is_active: isActive,
            created_at: gateway.createdAt ?? null,
            updated_at: gateway.updatedAt ?? null,
          };
        });

        const listResponse: PaginatedPaymentGatewayResponse = {
          data: transformedData.map((item: {
            id: string;
            uid: string;
            name: string;
            code: string;
            api_base_url_production: string | null;
            api_base_url_sandbox: string | null;
            supported_methods: string[];
            is_active: boolean;
            created_at: string | null;
            updated_at: string | null;
          }) => PaymentGatewaySchema.parse(item)),
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
        throw new Error('Unexpected response format from backend');
      }
    }),

  // Create a new payment gateway
  // FR-PGO-001: Create Payment Gateway Configuration
  createPaymentGateway: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      api_base_url_production: z.string().optional(),
      api_base_url_sandbox: z.string().optional(),
      credentials: z.record(z.string(), z.string().optional()),
      supported_methods: z.array(z.string()).min(1),
      is_active: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
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

      // Add credentials if provided (backend may accept this even if not in swagger)
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
          'Authorization': `Bearer ${ctx.token}`,
        },
        body: JSON.stringify(backendBody),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create payment gateway');
      }

      // Transform response to frontend format (exclude credentials)
      const gateway = data.payment_gateway || data.data || data;
      const transformedGateway = gateway ? {
        id: gateway.id,
        uid: gateway.uid ?? gateway.id,
        name: gateway.name,
        code: gateway.code,
        api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
        api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
        supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
        is_active: gateway.isActive ?? gateway.is_active ?? true,
        created_at: gateway.createdAt ?? gateway.created_at ?? null,
      } : null;

      return {
        message: data.message || 'Payment Gateway created successfully',
        payment_gateway: transformedGateway ? PaymentGatewaySchema.parse(transformedGateway) : null,
      };
    }),
});