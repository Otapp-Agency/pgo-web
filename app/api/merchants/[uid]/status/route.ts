import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * PATCH /api/merchants/[uid]/status - Update merchant status
 * Transitions a merchant between lifecycle statuses (ACTIVE, SUSPENDED, INACTIVE)
 * 
 * Request body:
 * {
 *   "status": "SUSPENDED" | "ACTIVE" | "INACTIVE",
 *   "reason": "Reason for status change"
 * }
 */
export async function PATCH(
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

        // Parse request body
        const body = await request.json();

        // Validate required fields
        if (!body.status) {
            return NextResponse.json(
                { error: 'Status is required' },
                { status: 400 }
            );
        }

        const validStatuses = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];
        if (!validStatuses.includes(body.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Build the URL using the updateStatus endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.updateStatus.replace('{uid}', uid)}`;

        // Update merchant status via backend API
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                status: body.status,
                reason: body.reason || '',
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend update merchant status error:', {
                status: response.status,
                data,
                uid,
                requestBody: body,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to update merchant status' },
                { status: response.status }
            );
        }

        // Transform response to frontend format
        const merchant = data.merchant || data.data || data;
        const transformedMerchant = merchant && merchant.id ? {
            id: merchant.id,
            uid: merchant.uid,
            code: merchant.code,
            name: merchant.name,
            type: merchant.type ?? null,
            status: merchant.status ?? merchant.activeStatus ?? body.status,
            kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
            email: merchant.email ?? null,
            contact_info: merchant.contactInfo ?? merchant.contact_info ?? null,
            description: merchant.description ?? null,
            created_at: merchant.createdAt ?? merchant.created_at ?? null,
            updated_at: merchant.updatedAt ?? merchant.updated_at ?? null,
        } : null;

        return NextResponse.json(
            {
                message: data.message || `Merchant status updated to ${body.status} successfully`,
                merchant: transformedMerchant,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error updating merchant status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

