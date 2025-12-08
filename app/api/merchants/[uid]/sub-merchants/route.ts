import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * Type definition for sub-merchant API response
 */
interface SubMerchantApiResponse {
    id?: string | number;
    uid?: string;
    code?: string;
    name?: string;
    merchantType?: string;
    merchant_type?: string;
    status?: string;
    kycVerified?: boolean;
    kyc_verified?: boolean;
    contactEmail?: string;
    contact_email?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
}

/**
 * GET /api/merchants/[uid]/sub-merchants - Get sub-merchants for a merchant
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
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.subMerchants.replace('{uid}', uid)}?page=${page}&size=${per_page}`;

        // Fetch sub-merchants via backend API
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
                message: response.statusText || 'Failed to fetch sub-merchants',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch sub-merchants' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform response to frontend format
        const subMerchants = data.data || [];
        const transformedSubMerchants = subMerchants.map((merchant: SubMerchantApiResponse) => ({
            id: merchant.id?.toString() || merchant.id,
            uid: merchant.uid,
            code: merchant.code,
            name: merchant.name,
            merchant_type: merchant.merchantType || merchant.merchant_type,
            status: merchant.status,
            kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
            contact_email: merchant.contactEmail || merchant.contact_email,
            created_at: merchant.createdAt || merchant.created_at,
            updated_at: merchant.updatedAt || merchant.updated_at,
        }));

        return NextResponse.json({
            data: transformedSubMerchants,
            pageNumber: data.pageNumber ?? parseInt(page),
            pageSize: data.pageSize ?? parseInt(per_page),
            totalElements: data.totalElements ?? transformedSubMerchants.length,
            totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedSubMerchants.length) / parseInt(per_page)),
            last: data.last ?? true,
            first: data.first ?? (parseInt(page) === 0),
        });
    } catch (error) {
        console.error('Error fetching sub-merchants:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

