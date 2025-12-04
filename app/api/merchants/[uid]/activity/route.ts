import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * GET /api/merchants/[uid]/activity - Get merchant activity summary
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { uid } = await params;

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.activity.replace('{uid}', uid)}`;

        // Fetch activity summary via backend API
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
                message: response.statusText || 'Failed to fetch merchant activity',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch merchant activity' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform response to frontend format
        const activity = data.data || data;
        const transformedActivity = {
            totalTransactions: activity.totalTransactions ?? 0,
            successfulTransactions: activity.successfulTransactions ?? 0,
            failedTransactions: activity.failedTransactions ?? 0,
            pendingTransactions: activity.pendingTransactions ?? 0,
            totalDisbursements: activity.totalDisbursements ?? 0,
            lastTransactionAt: activity.lastTransactionAt || null,
        };

        return NextResponse.json(transformedActivity);
    } catch (error) {
        console.error('Error fetching merchant activity:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

