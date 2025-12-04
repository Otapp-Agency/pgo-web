import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';
import { CanUpdateResponseSchema } from '@/lib/definitions';

/**
 * GET /api/disbursements/[id]/can-update
 * Check if a disbursement can be updated
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

        const { id: disbursementId } = await params;

        if (!disbursementId?.trim()) {
            return NextResponse.json(
                { error: 'Disbursement ID is required' },
                { status: 400 }
            );
        }

        // Build the URL for can-update endpoint
        const endpoint = buildEndpointUrl.disbursementCanUpdate(disbursementId);
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        console.log('[Disbursements Can Update API] Checking:', url);

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
                message: response.statusText || 'Failed to check if disbursement can be updated',
            }));

            console.error('[Disbursements Can Update API] Error:', {
                status: response.status,
                errorData,
            });

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to check if disbursement can be updated' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Handle wrapped responses
        const canUpdateData = data.data || data;

        // Validate and parse the response
        const parsed = CanUpdateResponseSchema.parse(canUpdateData);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('[Disbursements Can Update API] Error:', error);

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

