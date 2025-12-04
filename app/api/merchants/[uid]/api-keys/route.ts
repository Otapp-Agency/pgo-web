import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * GET /api/merchants/[uid]/api-keys - Get merchant API keys
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { uid } = await params;
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') || '0';
        const per_page = searchParams.get('per_page') || '15';

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.getApiKeys.replace('{uid}', uid)}?page=${page}&size=${per_page}`;

        // Fetch API keys via backend API
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
                message: response.statusText || 'Failed to fetch API keys',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch API keys' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform response to frontend format
        const apiKeys = data.data || [];
        const transformedApiKeys = apiKeys.map((key: any) => ({
            apiKey: key.apiKey,
            secretKey: key.secretKey || null, // Only present at creation time
            expiresAt: key.expiresAt || null,
            status: key.status || 'ACTIVE',
        }));

        return NextResponse.json({
            data: transformedApiKeys,
            pageNumber: data.pageNumber ?? parseInt(page),
            pageSize: data.pageSize ?? parseInt(per_page),
            totalElements: data.totalElements ?? transformedApiKeys.length,
            totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedApiKeys.length) / parseInt(per_page)),
            last: data.last ?? true,
            first: data.first ?? (parseInt(page) === 0),
        });
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/merchants/[uid]/api-keys - Create a new API key
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { uid } = await params;
        const body = await request.json().catch(() => ({}));

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.createApiKey.replace('{uid}', uid)}`;

        // Create API key via backend API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(body),
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                { error: responseData.message || responseData.error || 'Failed to create API key' },
                { status: response.status }
            );
        }

        // Transform response to frontend format
        const apiKey = responseData.data || responseData;
        const transformedApiKey = {
            apiKey: apiKey.apiKey,
            secretKey: apiKey.secretKey || null,
            expiresAt: apiKey.expiresAt || null,
            status: apiKey.status || 'ACTIVE',
        };

        return NextResponse.json({
            message: responseData.message || 'API key created successfully',
            data: transformedApiKey,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating API key:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

