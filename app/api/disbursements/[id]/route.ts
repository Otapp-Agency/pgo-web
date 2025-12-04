import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';
import { DisbursementSchema } from '@/lib/definitions';

/**
 * GET /api/disbursements/[id]
 * Get a single disbursement by ID or UID
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

        // Try to determine if it's a UID (typically UUID format) or numeric ID
        // UUIDs are typically 36 characters with dashes, numeric IDs are shorter
        const isUid = disbursementId.includes('-') || disbursementId.length > 20;

        let url: string;
        if (isUid) {
            // Use UID endpoint
            const endpoint = buildEndpointUrl.disbursementByUid(disbursementId);
            url = `${API_CONFIG.baseURL}${endpoint}`;
        } else {
            // Use numeric ID endpoint
            const endpoint = buildEndpointUrl.disbursementById(disbursementId);
            url = `${API_CONFIG.baseURL}${endpoint}`;
        }

        console.log('[Disbursements Detail API] Fetching:', url);

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
                message: response.statusText || 'Failed to fetch disbursement',
            }));

            console.error('[Disbursements Detail API] Error:', {
                status: response.status,
                errorData,
            });

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch disbursement' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Normalize the disbursement data (handle wrapped responses)
        const disbursementData = data.data || data;

        // Normalize nullable string fields
        const normalizedData = {
            ...disbursementData,
            pspDisbursementId: disbursementData.pspDisbursementId ?? '',
            merchantDisbursementId: disbursementData.merchantDisbursementId ?? '',
            sourceTransactionId: disbursementData.sourceTransactionId ?? '',
            disbursementChannel: disbursementData.disbursementChannel ?? '',
            recipientAccount: disbursementData.recipientAccount ?? '',
            recipientName: disbursementData.recipientName ?? '',
            description: disbursementData.description ?? '',
            responseCode: disbursementData.responseCode ?? '',
            responseMessage: disbursementData.responseMessage ?? '',
            errorCode: disbursementData.errorCode ?? '',
            errorMessage: disbursementData.errorMessage ?? '',
        };

        // Validate and parse the response
        const parsed = DisbursementSchema.parse(normalizedData);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('[Disbursements Detail API] Error:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid disbursement data format', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

