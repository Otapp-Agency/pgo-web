import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * POST /api/transactions/search
 * Search transactions using the search endpoint with advanced criteria
 */
export async function POST(request: NextRequest) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body - contains search criteria
        const searchCriteria = await request.json().catch(() => ({}));

        // Extract pagination from query params (if provided)
        const searchParams = request.nextUrl.searchParams;
        const page = searchParams.get('page');
        const perPage = searchParams.get('per_page');

        // Build the URL for search endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.search}`;

        // Build request body with pagination if provided
        const requestBody: Record<string, unknown> = { ...searchCriteria };
        
        // Add pagination to request body if provided
        if (page) {
            const pageNum = parseInt(page, 10);
            requestBody.page = Math.max(0, pageNum - 1); // Backend uses 0-based
        }
        if (perPage) {
            requestBody.size = parseInt(perPage, 10);
        }

        console.log('[Transactions Search API] Searching:', url);
        console.log('[Transactions Search API] Criteria:', JSON.stringify(requestBody, null, 2).substring(0, 500));

        // Fetch from backend API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(requestBody),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to search transactions',
            }));

            console.error('[Transactions Search API] Error:', response.status, errorData);
            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to search transactions' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Debug: Log response
        if (data.data && Array.isArray(data.data)) {
            console.log('[Transactions Search API] Received:', data.data.length, 'transactions');
        }

        // Handle response format - backend returns paginated response
        if (data.data && Array.isArray(data.data)) {
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
            console.error('[Transactions Search API] Unexpected response format:', data);
            return NextResponse.json(
                { error: 'Unexpected response format from backend' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[Transactions Search API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}











