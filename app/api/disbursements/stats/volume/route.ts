import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { DisbursementStatsResponseSchema } from '@/lib/definitions';

/**
 * GET /api/disbursements/stats/volume
 * Get disbursement volume statistics
 */
export async function GET(request: NextRequest) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Extract query parameters
        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Validate required parameters
        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate and endDate are required' },
                { status: 400 }
            );
        }

        // Build backend API URL
        const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.disbursements.volumeStats}`);
        url.searchParams.set('startDate', startDate);
        url.searchParams.set('endDate', endDate);

        // Optional filters
        const merchantId = searchParams.get('merchantId');
        const gatewayId = searchParams.get('gatewayId');
        if (merchantId) {
            url.searchParams.set('merchantId', merchantId);
        }
        if (gatewayId) {
            url.searchParams.set('gatewayId', gatewayId);
        }

        // Fetch from backend API
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to fetch volume stats',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch volume stats' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Validate and parse the response
        const parsed = DisbursementStatsResponseSchema.parse(data);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('Error fetching disbursement volume stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

