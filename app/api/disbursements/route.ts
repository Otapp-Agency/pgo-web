import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { PAGINATION } from '@/lib/config/constants';
import { buildEndpointUrl } from '@/lib/config/endpoints';

export async function GET(request: NextRequest) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Extract query parameters from the request
        const searchParams = request.nextUrl.searchParams;

        // Extract filter values
        const statusFilter = searchParams.get('status');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const amountMin = searchParams.get('amount_min');
        const amountMax = searchParams.get('amount_max');
        const searchTerm = searchParams.get('search_term');
        const page = searchParams.get('page');
        const perPage = searchParams.get('per_page');

        // Count how many filter types are active
        const hasStatusFilter = !!statusFilter;
        const hasDateFilter = !!(startDate || endDate);
        const hasAmountFilter = !!(amountMin || amountMax);
        const hasSearchTerm = !!searchTerm;

        // Calculate number of active filter types
        const activeFilterTypes = [hasStatusFilter, hasDateFilter, hasAmountFilter, hasSearchTerm].filter(Boolean).length;

        // If multiple filter types or search term, use POST search endpoint
        if (activeFilterTypes > 1 || hasSearchTerm) {
            return handleSearchRequest(session.token, {
                status: statusFilter,
                startDate,
                endDate,
                amountMin,
                amountMax,
                searchTerm,
                page,
                perPage,
            });
        }

        // Single filter type - use specific endpoint
        let url: string;
        const queryParams = new URLSearchParams();

        // Add pagination
        if (page) {
            const pageNum = parseInt(page, 10);
            queryParams.set('page', Math.max(0, pageNum - 1).toString());
        }
        if (perPage) {
            queryParams.set('size', perPage);
        }

        if (hasStatusFilter && statusFilter) {
            // Use status-specific endpoint
            if (statusFilter.toUpperCase() === 'PENDING') {
                url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.pending}`;
            } else if (statusFilter.toUpperCase() === 'FAILED') {
                url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.failed}`;
            } else {
                url = `${API_CONFIG.baseURL}${buildEndpointUrl.disbursementsByStatus(statusFilter.toUpperCase())}`;
            }
        } else if (hasDateFilter) {
            // Use date-range endpoint
            url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.byDateRange}`;
            if (startDate) {
                queryParams.set('startDate', `${startDate}T00:00:00`);
            }
            if (endDate) {
                queryParams.set('endDate', `${endDate}T23:59:59`);
            }
        } else if (hasAmountFilter) {
            // Use amount-range endpoint
            url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.byAmountRange}`;
            if (amountMin) {
                queryParams.set('minAmount', amountMin);
            }
            if (amountMax) {
                queryParams.set('maxAmount', amountMax);
            }
        } else {
            // No filters - use list endpoint
            url = `${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.list}`;
        }

        const queryString = queryParams.toString();
        const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`;

        console.log('[Disbursements API] Fetching:', fullUrl);

        // Fetch from backend API
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to fetch disbursements',
            }));

            console.error('[Disbursements API] Error:', response.status, errorData);
            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch disbursements' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return formatPaginatedResponse(data, searchParams);

    } catch (error) {
        console.error('Error fetching disbursements:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Handle search request with multiple filters using POST /search endpoint
 */
async function handleSearchRequest(
    token: string,
    params: {
        status: string | null;
        startDate: string | null;
        endDate: string | null;
        amountMin: string | null;
        amountMax: string | null;
        searchTerm: string | null;
        page: string | null;
        perPage: string | null;
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
        searchCriteria.createdFrom = `${params.startDate}T00:00:00`;
    }
    if (params.endDate) {
        searchCriteria.createdTo = `${params.endDate}T23:59:59`;
    }
    if (params.amountMin) {
        searchCriteria.minAmount = params.amountMin;
    }
    if (params.amountMax) {
        searchCriteria.maxAmount = params.amountMax;
    }

    // Add pagination
    if (params.page) {
        const pageNum = parseInt(params.page, 10);
        searchCriteria.page = Math.max(0, pageNum - 1);
    }
    if (params.perPage) {
        searchCriteria.size = parseInt(params.perPage, 10);
    }

    console.log('[Disbursements API] POST Search:', url);
    console.log('[Disbursements API] Criteria:', JSON.stringify(searchCriteria, null, 2).substring(0, 500));

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
        const errorData = await response.json().catch(() => ({
            message: response.statusText || 'Failed to search disbursements',
        }));

        console.error('[Disbursements API] Search Error:', response.status, errorData);
        return NextResponse.json(
            { error: errorData.message || errorData.error || 'Failed to search disbursements' },
            { status: response.status }
        );
    }

    const data = await response.json();

    // Create mock searchParams for response formatting
    const mockSearchParams = new URLSearchParams();
    if (params.page) mockSearchParams.set('page', params.page);
    if (params.perPage) mockSearchParams.set('per_page', params.perPage);

    return formatPaginatedResponse(data, mockSearchParams);
}

/**
 * Format the backend response into a consistent paginated structure
 */
function formatPaginatedResponse(data: unknown, searchParams: URLSearchParams) {
    const requestedPage = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE), 10);
    const requestedPerPage = parseInt(searchParams.get('per_page') || String(PAGINATION.DEFAULT_PAGE_SIZE), 10);

    const typedData = data as Record<string, unknown>;

    // Return the full paginated response structure
    if (typedData.data && typeof typedData.data === 'object' && !Array.isArray(typedData.data)) {
        // Backend wrapped paginated response in data field
        const innerData = typedData.data as Record<string, unknown>;
        // Convert backend 0-based to frontend 1-based
        if (innerData.pageNumber !== undefined) {
            innerData.pageNumber = (innerData.pageNumber as number) + 1;
            innerData.first = innerData.pageNumber === 1;
        }
        return NextResponse.json(innerData);
    } else if (typedData.data && Array.isArray(typedData.data)) {
        // Backend returned { data: Disbursement[], ...metadata }
        const backendPageNumber = (typedData.pageNumber as number) ?? 0;
        const totalElements = (typedData.totalElements as number) ?? typedData.data.length;
        const pageSize = (typedData.pageSize as number) ?? requestedPerPage;

        const paginatedResponse = {
            data: typedData.data,
            pageNumber: backendPageNumber + 1,
            pageSize: pageSize,
            totalElements: totalElements,
            totalPages: (typedData.totalPages as number) ?? Math.ceil(totalElements / pageSize),
            last: (typedData.last as boolean) ?? false,
            first: backendPageNumber === 0,
        };
        return NextResponse.json(paginatedResponse);
    } else if (Array.isArray(data)) {
        // Backend returned just an array (legacy format)
        const paginatedResponse = {
            data: data,
            pageNumber: requestedPage,
            pageSize: requestedPerPage,
            totalElements: data.length,
            totalPages: 1,
            last: true,
            first: requestedPage === 1,
        };
        return NextResponse.json(paginatedResponse);
    } else {
        // Backend returned paginated structure directly
        if (typedData.pageNumber !== undefined) {
            typedData.pageNumber = (typedData.pageNumber as number) + 1;
            typedData.first = typedData.pageNumber === 1;
        }
        return NextResponse.json(typedData);
    }
}
