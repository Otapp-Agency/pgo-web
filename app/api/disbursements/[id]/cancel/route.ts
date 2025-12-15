import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';

/**
 * POST /api/disbursements/[id]/cancel
 * Cancel a pending/processing disbursement
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

        const { id: disbursementUid } = await params;

        if (!disbursementUid?.trim()) {
            return NextResponse.json(
                { error: 'Disbursement UID is required' },
                { status: 400 }
            );
        }

        // Parse request body for reason
        const body = await request.json().catch(() => ({}));
        const reason = body.reason || 'Manual cancellation';

        // Build the URL for cancel endpoint
        const endpoint = buildEndpointUrl.cancelDisbursement(disbursementUid);
        const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);
        // Add reason as query parameter
        url.searchParams.set('reason', reason);

        console.log('[Disbursements Cancel API] Cancelling:', url.toString());

        // Call backend API to cancel disbursement
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('[Disbursements Cancel API] Error:', {
                status: response.status,
                data,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to cancel disbursement' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: data.message || 'Disbursement cancelled successfully',
            data: data.data || data,
        });
    } catch (error) {
        console.error('[Disbursements Cancel API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

