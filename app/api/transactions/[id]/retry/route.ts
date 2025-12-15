import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * POST /api/transactions/[id]/retry
 * Retry a failed transaction
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

        const { id: transactionUid } = await params;

        if (!transactionUid?.trim()) {
            return NextResponse.json(
                { error: 'Transaction UID is required' },
                { status: 400 }
            );
        }

        // Build the URL for retry endpoint with reason as query param
        const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.retry.replace('{uid}', transactionUid)}`);
        // Add reason as query parameter (may be required by backend)
        url.searchParams.set('reason', 'Manual retry');

        // Call backend API to retry transaction
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Retry transaction error:', {
                status: response.status,
                data,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to retry transaction' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: data.message || 'Transaction retry initiated successfully',
            data: data.data || data,
        });
    } catch (error) {
        console.error('Error retrying transaction:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

