import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * POST /api/transactions/[id]/cancel
 * Cancel a pending/processing transaction
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

        const { id: transactionId } = await params;

        // Parse request body (may contain reason)
        const body = await request.json().catch(() => ({}));

        // Build the URL for cancel endpoint with reason as query param
        const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.cancel.replace('{id}', transactionId)}`);
        // Add reason as query parameter (required by backend)
        url.searchParams.set('reason', body.reason || 'Manual cancellation');

        // Call backend API to cancel transaction
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Cancel transaction error:', {
                status: response.status,
                data,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to cancel transaction' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: data.message || 'Transaction cancelled successfully',
            data: data.data || data,
        });
    } catch (error) {
        console.error('Error cancelling transaction:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

