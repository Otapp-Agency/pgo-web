import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * Type definition for merchant lookup API response
 */
interface MerchantLookupApiResponse {
    id?: string | number;
    uid?: string;
    name?: string;
    code?: string;
    status?: string | null;
}

/**
 * GET /api/merchants/lookup - Lookup merchants for autocomplete/search
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const uid = searchParams.get('uid') || '';
        const id = searchParams.get('id') || '';
        const page = searchParams.get('page') || '0';
        const size = searchParams.get('size') || '50';

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (q) queryParams.set('q', q);
        if (uid) queryParams.set('uid', uid);
        if (id) queryParams.set('id', id);
        queryParams.set('page', page);
        queryParams.set('size', size);

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.lookup}?${queryParams.toString()}`;

        // Fetch merchants via backend API
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
                message: response.statusText || 'Failed to lookup merchants',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to lookup merchants' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform response to frontend format
        const merchants = data.data || [];
        const transformedMerchants = merchants.map((merchant: MerchantLookupApiResponse) => ({
            id: merchant.id?.toString() || merchant.id,
            uid: merchant.uid,
            name: merchant.name,
            code: merchant.code,
            status: merchant.status || null,
        }));

        return NextResponse.json({
            data: transformedMerchants,
            meta: {
                pageNumber: data.meta?.pageNumber ?? parseInt(page),
                pageSize: data.meta?.pageSize ?? parseInt(size),
                totalElements: data.meta?.totalElements ?? transformedMerchants.length,
                totalPages: data.meta?.totalPages ?? Math.ceil((data.meta?.totalElements ?? transformedMerchants.length) / parseInt(size)),
                last: data.meta?.last ?? true,
            },
        });
    } catch (error) {
        console.error('Error looking up merchants:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

