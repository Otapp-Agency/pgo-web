import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';

/**
 * POST /api/disbursements/[id]/complete
 * Manually complete a pending/processing disbursement
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
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

        const { id: disbursementId } = await params;

        if (!disbursementId?.trim()) {
            return NextResponse.json(
                { error: 'Disbursement ID is required' },
                { status: 400 }
            );
        }

        // Parse request body for reason
        const body = await request.json().catch(() => ({}));
        const reason = body.reason || 'Manual completion';

        // Build the URL for complete endpoint
        const endpoint = buildEndpointUrl.completeDisbursement(disbursementId);
        const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);
        // Add reason as query parameter
        url.searchParams.set('reason', reason);

        console.log('[Disbursements Complete API] Completing:', url.toString());

        // Call backend API to complete disbursement
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('[Disbursements Complete API] Error:', {
                status: response.status,
                data,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to complete disbursement' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: data.message || 'Disbursement completed successfully',
            data: data.data || data,
        });
    } catch (error) {
        console.error('[Disbursements Complete API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

