import { getSession } from "@/lib/auth/services/auth.service";
import { API_CONFIG, API_ENDPOINTS } from "@/lib/config/api";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/transactions/stats
 * Get transaction volume statistics
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
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Validate required parameters
        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'start_date and end_date are required' },
                { status: 400 }
            );
        }

        // Helper to convert date to LocalDateTime format for backend
        // Backend expects: 2025-12-01T00:00:00
        const toStartDateTime = (date: string) => `${date}T00:00:00`;
        const toEndDateTime = (date: string) => `${date}T23:59:59`;

        // Build backend API URL
        const url = new URL(`${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.dailyStats}`);
        url.searchParams.set('startDate', toStartDateTime(startDate));
        url.searchParams.set('endDate', toEndDateTime(endDate));

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

            console.error('[Transactions Stats API] Error:', response.status, errorData);
            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch volume stats' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Return the response data
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Transactions Stats API] Error fetching volume stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}