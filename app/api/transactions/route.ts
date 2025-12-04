import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

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
        
        // Get filter values
        const page = searchParams.get('page');
        const perPage = searchParams.get('per_page');
        const status = searchParams.get('status');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const amountMin = searchParams.get('amount_min');
        const amountMax = searchParams.get('amount_max');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort');

        // Build query parameters for the backend
        const queryParams = new URLSearchParams();

        // Pagination - convert to backend format
        if (page) {
            const pageNum = parseInt(page, 10);
            queryParams.set('page', Math.max(0, pageNum - 1).toString());
        }
        if (perPage) {
            queryParams.set('size', perPage);
        }
        if (sort) {
            queryParams.set('sort', sort);
        }
        if (search) {
            queryParams.set('search', search);
        }

        // Determine which endpoint to use based on active filters
        let endpoint = API_ENDPOINTS.transactions.list;

        // Priority: status > date-range > amount-range > default list
        // Use specific endpoints that support filtering
        
        // Helper to convert date to LocalDateTime format for backend
        // Backend expects: 2025-12-01T00:00:00
        const toStartDateTime = (date: string) => `${date}T00:00:00`;
        const toEndDateTime = (date: string) => `${date}T23:59:59`;
        
        if (status) {
            // Use status-specific endpoint
            if (status === 'PENDING') {
                endpoint = API_ENDPOINTS.transactions.pending;
            } else if (status === 'FAILED') {
                endpoint = API_ENDPOINTS.transactions.failed;
            } else {
                // Use the generic status endpoint
                endpoint = API_ENDPOINTS.transactions.byStatus.replace('{status}', status);
            }
            
            // Add date range params if present (backend might support them)
            if (startDate) queryParams.set('startDate', toStartDateTime(startDate));
            if (endDate) queryParams.set('endDate', toEndDateTime(endDate));
            if (amountMin) queryParams.set('minAmount', amountMin);
            if (amountMax) queryParams.set('maxAmount', amountMax);
            
        } else if (startDate || endDate) {
            // Use date-range endpoint
            endpoint = API_ENDPOINTS.transactions.byDateRange;
            if (startDate) queryParams.set('startDate', toStartDateTime(startDate));
            if (endDate) queryParams.set('endDate', toEndDateTime(endDate));
            if (amountMin) queryParams.set('minAmount', amountMin);
            if (amountMax) queryParams.set('maxAmount', amountMax);
            
        } else if (amountMin || amountMax) {
            // Use amount-range endpoint
            endpoint = API_ENDPOINTS.transactions.byAmountRange;
            if (amountMin) queryParams.set('minAmount', amountMin);
            if (amountMax) queryParams.set('maxAmount', amountMax);
        }

        // Build the URL with query parameters
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.baseURL}${endpoint}${queryString ? `?${queryString}` : ''}`;

        // Debug: Log the URL being called
        console.log('[Transactions API] Endpoint:', endpoint);
        console.log('[Transactions API] Fetching:', url);
        console.log('[Transactions API] Query params:', Object.fromEntries(queryParams.entries()));

        // Fetch from backend API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to fetch transactions',
            }));

            console.error('[Transactions API] Error:', response.status, errorData);
            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch transactions' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Debug: Log response data count and sample
        if (data.data && Array.isArray(data.data)) {
            const statuses = data.data.map((t: { status?: string }) => t.status);
            const uniqueStatuses = [...new Set(statuses)];
            console.log('[Transactions API] Received:', data.data.length, 'transactions');
            console.log('[Transactions API] Statuses in response:', uniqueStatuses);
        }

        // Handle response format from backend
        // Backend API returns: { status, statusCode, message, data: Transaction[], pageNumber, pageSize, totalElements, totalPages, last }
        if (data.data && Array.isArray(data.data)) {
            // Backend uses 0-based pagination, convert to 1-based for frontend
            const backendPageNumber = data.pageNumber ?? 0;
            const requestedPage = parseInt(searchParams.get('page') || '1', 10);
            const requestedPerPage = parseInt(searchParams.get('per_page') || '15', 10);

            const paginatedResponse = {
                data: data.data,
                pageNumber: backendPageNumber + 1, // Convert to 1-based
                pageSize: data.pageSize ?? requestedPerPage,
                totalElements: data.totalElements ?? data.data.length,
                totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? data.data.length) / (data.pageSize ?? requestedPerPage)),
                last: data.last ?? false,
                first: backendPageNumber === 0,
            };

            return NextResponse.json(paginatedResponse);
        } else if (Array.isArray(data)) {
            // Backend returned just an array (legacy format)
            const requestedPage = parseInt(searchParams.get('page') || '1', 10);
            const requestedPerPage = parseInt(searchParams.get('per_page') || '15', 10);

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
            // Fallback: return error
            console.error('[Transactions API] Unexpected response format:', data);
            return NextResponse.json(
                { error: 'Unexpected response format from backend' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[Transactions API] Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
