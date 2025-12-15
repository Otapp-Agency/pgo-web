import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';
import { CanUpdateResponseSchema } from '@/lib/definitions';

/**
 * GET /api/transactions/[id]/can-update
 * Check if a transaction can be updated
 */
export async function GET(
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

        if (!transactionId?.trim()) {
            return NextResponse.json(
                { error: 'Transaction ID is required' },
                { status: 400 }
            );
        }

        // CRITICAL: Backend /admin/v1/transactions/{id}/can-update endpoint ONLY accepts numeric Long IDs (integer($int64))
        // Validate that the ID is numeric (all digits)
        const isNumericId = /^\d+$/.test(transactionId);

        if (!isNumericId) {
            return NextResponse.json(
                {
                    error: 'Invalid transaction ID format. The can-update endpoint requires a numeric ID (database ID), not a UID or merchant transaction ID.',
                    details: `Received: "${transactionId}". Expected: numeric ID (e.g., "12345")`
                },
                { status: 400 }
            );
        }

        // Build the URL for can-update endpoint
        const endpoint = buildEndpointUrl.transactionCanUpdate(transactionId);
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        console.log('[Transactions Can Update API] Checking:', url);

        // Fetch from backend API
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
                message: response.statusText || 'Failed to check if transaction can be updated',
            }));

            console.error('[Transactions Can Update API] Error:', {
                status: response.status,
                errorData,
            });

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to check if transaction can be updated' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Handle wrapped responses
        // Backend returns { status, statusCode, message, data: boolean }
        // Transform boolean to CanUpdateResponse format
        // Use optional chaining to safely handle null or non-object responses
        const canUpdateData = typeof data?.data === 'boolean'
            ? { canUpdate: data.data }
            : (data?.data || data);

        // Validate and parse the response
        const parsed = CanUpdateResponseSchema.parse(canUpdateData);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('[Transactions Can Update API] Error:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid can-update response format', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

