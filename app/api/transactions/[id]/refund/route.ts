import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * POST /api/transactions/[id]/refund
 * Refund a successful transaction
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

        // Parse request body (contains refundAmount and reason)
        const body = await request.json().catch(() => ({}));

        // Validate refundAmount is provided
        if (!body.refundAmount) {
            return NextResponse.json(
                { error: 'Refund amount is required' },
                { status: 400 }
            );
        }

        // Build the URL for refund endpoint with query params
        const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.refund.replace('{id}', transactionId)}`);
        // Add required query parameters
        url.searchParams.set('refundAmount', body.refundAmount);
        url.searchParams.set('reason', body.reason || 'Manual refund');

        console.log('[Refund API] Calling:', url.toString());

        // Call backend API to refund transaction
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Refund transaction error:', {
                status: response.status,
                data,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to refund transaction' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: data.message || 'Transaction refunded successfully',
            data: data.data || data,
        });
    } catch (error) {
        console.error('Error refunding transaction:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

