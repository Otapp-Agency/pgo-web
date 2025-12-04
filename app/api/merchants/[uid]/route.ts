import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * DELETE /api/merchants/[uid] - Delete a merchant
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { uid } = await params;

        // Build the URL using the delete endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.delete.replace('{uid}', uid)}`;

        // Delete merchant via backend API
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend delete merchant error:', {
                status: response.status,
                data,
                uid,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to delete merchant' },
                { status: response.status }
            );
        }

        return NextResponse.json(
            {
                message: data.message || 'Merchant deleted successfully',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting merchant:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/merchants/[uid] - Get merchant by UID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { uid } = await params;

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.getByUid.replace('{uid}', uid)}`;

        // Fetch merchant via backend API
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
                message: response.statusText || 'Failed to fetch merchant',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch merchant' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform response to frontend format
        const merchant = data.data || data;
        const transformedMerchant = {
            id: merchant.id,
            uid: merchant.uid,
            code: merchant.code,
            name: merchant.name,
            type: merchant.type ?? null,
            status: merchant.status ?? merchant.activeStatus ?? 'ACTIVE',
            kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
            email: merchant.email ?? null,
            contact_info: merchant.contactInfo ?? merchant.contact_info ?? null,
            description: merchant.description ?? null,
            created_at: merchant.createdAt ?? merchant.created_at ?? null,
            updated_at: merchant.updatedAt ?? merchant.updated_at ?? null,
        };

        return NextResponse.json(transformedMerchant);
    } catch (error) {
        console.error('Error fetching merchant:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

