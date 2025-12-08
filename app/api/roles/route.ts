import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { PAGINATION } from '@/lib/config/constants';
import { RoleSchema } from '@/features/roles/types';
import { z } from 'zod';

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

        // Add all query parameters if they exist
        const allowedParams = [
            'page',
            'per_page',
            'search',
            'sort',
        ];

        allowedParams.forEach((param) => {
            const value = searchParams.get(param);
            if (value) {
                // Backend API uses 'size' instead of 'per_page'
                if (param === 'per_page') {
                    queryParams.set('size', value);
                } else if (param === 'page') {
                    // Frontend uses 1-based pagination, backend uses 0-based
                    // Convert: page 1 -> 0, page 2 -> 1, etc.
                    const pageNum = parseInt(value, 10);
                    queryParams.set('page', Math.max(0, pageNum - 1).toString());
                } else if (param === 'sort') {
                    // Sort parameter is passed as comma-separated string (e.g., "name,asc,displayName,desc")
                    // Backend expects it in the same format
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
                'Authorization': `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to fetch roles',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch roles' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Parse page from request (1-based) for response
        const requestedPage = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE), 10);
        const requestedPerPage = parseInt(searchParams.get('per_page') || String(PAGINATION.DEFAULT_PAGE_SIZE), 10);

        // Backend API returns: { status, statusCode, message, data: Role[], pageNumber, pageSize, totalElements, totalPages, last }
        // We need: { data: Role[], pageNumber, pageSize, totalElements, totalPages, last, first }
        if (data.data && Array.isArray(data.data)) {
            // Validate and parse roles data
            const parsedData = z.array(RoleSchema).parse(data.data);

            // Backend uses 0-based pagination, convert to 1-based for frontend
            const backendPageNumber = data.pageNumber ?? 0;

            const paginatedResponse = {
                data: parsedData,
                pageNumber: backendPageNumber + 1, // Convert to 1-based
                pageSize: data.pageSize ?? requestedPerPage,
                totalElements: data.totalElements ?? parsedData.length,
                totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? parsedData.length) / (data.pageSize ?? requestedPerPage)),
                last: data.last ?? false,
                first: backendPageNumber === 0,
            };

            return NextResponse.json(paginatedResponse);
        } else if (Array.isArray(data)) {
            // Handle legacy format: just an array
            const parsedData = z.array(RoleSchema).parse(data);

            const paginatedResponse = {
                data: parsedData,
                pageNumber: requestedPage,
                pageSize: requestedPerPage,
                totalElements: parsedData.length,
                totalPages: Math.ceil(parsedData.length / requestedPerPage),
                last: true,
                first: requestedPage === 1,
            };

            return NextResponse.json(paginatedResponse);
        } else {
            // Fallback: empty response
            return NextResponse.json({
                data: [],
                pageNumber: requestedPage,
                pageSize: requestedPerPage,
                totalElements: 0,
                totalPages: 0,
                last: true,
                first: true,
            });
        }
    } catch (error) {
        console.error('Error fetching roles:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data format', details: error.errors },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
