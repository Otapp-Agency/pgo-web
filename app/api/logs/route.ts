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
        const queryParams = new URLSearchParams();

        // Query Parameters mapping: frontend snake_case -> backend camelCase
        // Backend expects: eventType, event, userUid, merchantUid, startDate, endDate

        // Handle pagination (frontend uses 0-based, backend also uses 0-based)
        const pageValue = searchParams.get('page');
        if (pageValue) {
            const pageNum = parseInt(pageValue, 10);
            queryParams.set('page', Math.max(0, pageNum).toString());
        }

        const perPageValue = searchParams.get('per_page');
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
            const value = searchParams.get(frontendParam);
            if (value) {
                queryParams.set(backendParam, value);
            }
        });

        // Handle other parameters that don't need mapping
        const otherParams = ['event', 'search_term', 'sort'];
        otherParams.forEach((param) => {
            const value = searchParams.get(param);
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
                'Authorization': `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to fetch audit logs',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch audit logs' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Handle response format from backend
        // Backend API returns: { status, statusCode, message, data: AuditLog[], pageNumber, pageSize, totalElements, totalPages, last }
        if (data.data && Array.isArray(data.data)) {
            // Backend uses 0-based pagination, frontend also uses 0-based
            const backendPageNumber = data.pageNumber ?? 0;
            const page = parseInt(searchParams.get('page') || '0', 10);
            const perPage = parseInt(searchParams.get('per_page') || '15', 10);

            const paginatedResponse = {
                data: data.data,
                pageNumber: backendPageNumber, // Keep 0-based
                pageSize: data.pageSize ?? perPage,
                totalElements: data.totalElements ?? data.data.length,
                totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? data.data.length) / (data.pageSize ?? perPage)),
                last: data.last ?? false,
                first: data.first ?? (backendPageNumber === 0),
            };

            return NextResponse.json(paginatedResponse);
        } else if (Array.isArray(data) && data.length > 0) {
            // Backend returned just an array (legacy format)
            const page = parseInt(searchParams.get('page') || '0', 10);
            const perPage = parseInt(searchParams.get('per_page') || '15', 10);

            const paginatedResponse = {
                data: data,
                pageNumber: page,
                pageSize: perPage,
                totalElements: data.length,
                totalPages: 1,
                last: true,
                first: page === 0,
            };

            return NextResponse.json(paginatedResponse);
        } else {
            // Fallback: return error
            console.error('Unexpected response format:', data);
            return NextResponse.json(
                { error: 'Unexpected response format from backend' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

