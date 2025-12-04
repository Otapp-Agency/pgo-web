import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * PATCH /api/merchants/[uid]/parent - Update merchant parent
 */
export async function PATCH(
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
        const body = await request.json();

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.updateParent.replace('{uid}', uid)}`;

        // Update parent merchant via backend API
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                parentMerchantUid: body.parentMerchantUid || null,
            }),
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                { error: responseData.message || responseData.error || 'Failed to update merchant parent' },
                { status: response.status }
            );
        }

        // Transform response to frontend format
        const merchant = responseData.data || responseData;
        const transformedMerchant = merchant && merchant.id ? {
            id: merchant.id?.toString() || merchant.id,
            uid: merchant.uid,
            code: merchant.code,
            name: merchant.name,
            merchant_type: merchant.merchantType || merchant.merchant_type,
            status: merchant.status,
            kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
            contact_email: merchant.contactEmail || merchant.contact_email,
            parent_merchant_uid: merchant.parentMerchantUid || merchant.parent_merchant_uid,
            parent_merchant_name: merchant.parentMerchantName || merchant.parent_merchant_name,
            created_at: merchant.createdAt || merchant.created_at,
            updated_at: merchant.updatedAt || merchant.updated_at,
        } : null;

        return NextResponse.json({
            message: responseData.message || 'Merchant parent updated successfully',
            merchant: transformedMerchant,
        });
    } catch (error) {
        console.error('Error updating merchant parent:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

