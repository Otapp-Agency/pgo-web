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

        // Transform response to frontend format - match server-side transformation
        const merchant = data.data || data;
        const transformedMerchant = {
            id: merchant.id?.toString() || merchant.id,
            uid: merchant.uid,
            code: merchant.code,
            name: merchant.name,
            business_name: merchant.businessName || merchant.business_name,
            business_registration_number: merchant.businessRegistrationNumber || merchant.business_registration_number,
            business_address: merchant.businessAddress || merchant.business_address,
            business_city: merchant.businessCity || merchant.business_city,
            business_state: merchant.businessState || merchant.business_state,
            business_postal_code: merchant.businessPostalCode || merchant.business_postal_code,
            business_country: merchant.businessCountry || merchant.business_country,
            contact_email: merchant.contactEmail || merchant.contact_email,
            contact_phone: merchant.contactPhone || merchant.contact_phone,
            website_url: merchant.websiteUrl || merchant.website_url,
            merchant_type: merchant.merchantType || merchant.merchant_type,
            status: merchant.status,
            status_reason: merchant.statusReason || merchant.status_reason,
            merchant_role: merchant.merchantRole || merchant.merchant_role,
            kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
            kyc_status: merchant.kycStatus || merchant.kyc_status,
            kyc_notes: merchant.kycNotes || merchant.kyc_notes,
            kyc_verified_at: merchant.kycVerifiedAt || merchant.kyc_verified_at,
            kyc_verified_by: merchant.kycVerifiedBy || merchant.kyc_verified_by,
            single_transaction_limit: merchant.singleTransactionLimit?.toString() || merchant.single_transaction_limit,
            daily_transaction_limit: merchant.dailyTransactionLimit?.toString() || merchant.daily_transaction_limit,
            monthly_transaction_limit: merchant.monthlyTransactionLimit?.toString() || merchant.monthly_transaction_limit,
            parent_merchant_uid: merchant.parentMerchantUid || merchant.parent_merchant_uid,
            parent_merchant_name: merchant.parentMerchantName || merchant.parent_merchant_name,
            created_at: merchant.createdAt || merchant.created_at,
            updated_at: merchant.updatedAt || merchant.updated_at,
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

