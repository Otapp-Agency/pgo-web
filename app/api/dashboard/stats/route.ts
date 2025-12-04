import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * Transform the nested API response to the expected flat structure
 */
function transformDashboardStatsResponse(apiResponse: any) {
    const overview = apiResponse.overview || {};
    const transactions = overview.transactions || {};
    const disbursements = overview.disbursements || {};
    const breakdowns = apiResponse.breakdowns || {};
    const byCurrency = breakdowns.byCurrency || {};

    // Get currency from amountsByCurrency (default to TZS)
    const currency = transactions.amountsByCurrency 
        ? Object.keys(transactions.amountsByCurrency)[0] || 'TZS'
        : disbursements.amountsByCurrency
        ? Object.keys(disbursements.amountsByCurrency)[0] || 'TZS'
        : 'TZS';

    // Parse amounts from strings to numbers
    const parseAmount = (amount: string | number | undefined): number => {
        if (typeof amount === 'number') return amount;
        if (typeof amount === 'string') {
            const parsed = parseFloat(amount);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    // Get transaction amounts
    const transactionAmounts = transactions.amountsByCurrency || {};
    const successfulTransactionAmounts = transactions.successfulAmountsByCurrency || {};
    const totalTransactionAmount = parseAmount(transactionAmounts[currency]);
    const successfulTransactionAmount = parseAmount(successfulTransactionAmounts[currency]);
    const failedTransactionAmount = totalTransactionAmount - successfulTransactionAmount;

    // Get disbursement amounts
    const disbursementAmounts = disbursements.amountsByCurrency || {};
    const successfulDisbursementAmounts = disbursements.successfulAmountsByCurrency || {};

    return {
        total_transactions_count: transactions.total || 0,
        total_transactions_value: totalTransactionAmount,
        successful_transactions_count: transactions.successful || 0,
        successful_transactions_value: successfulTransactionAmount,
        failed_transactions_count: transactions.failed || 0,
        failed_transactions_value: failedTransactionAmount,
        total_disbursements_count: disbursements.total || 0,
        total_disbursements_value: parseAmount(disbursementAmounts[currency]),
        successful_disbursements_count: disbursements.successful || 0,
        successful_disbursements_value: parseAmount(successfulDisbursementAmounts[currency]),
        currency: currency,
        // Preserve recentActivity from API response
        recentActivity: apiResponse.recentActivity || undefined,
    };
}

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

        // Extract query parameters from the request
        const searchParams = request.nextUrl.searchParams;
        const queryParams = new URLSearchParams();

        // Add all query parameters if they exist
        const allowedParams = [
            'period',
            'start_date',
            'end_date',
            'merchant_id',
        ];

        allowedParams.forEach((param) => {
            const value = searchParams.get(param);
            if (value) {
                queryParams.set(param, value);
            }
        });

        // Build the URL with query parameters
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.dashboard.stats}${queryString ? `?${queryString}` : ''}`;

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
                message: response.statusText || 'Failed to fetch dashboard stats',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch dashboard stats' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Handle response format from backend
        // Backend API returns nested structure with overview, breakdowns, recentActivity, etc.
        // Transform it to the expected flat structure while preserving recentActivity
        let statsData;
        
        if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
            // Response wrapped in { data: {...} }
            // Transform the nested structure
            statsData = transformDashboardStatsResponse(data.data);
        } else if (typeof data === 'object' && !Array.isArray(data)) {
            // Transform the nested API response to the expected format
            statsData = transformDashboardStatsResponse(data);
        } else {
            // Log the actual response structure for debugging
            console.error('Unexpected response format from dashboard stats API:', JSON.stringify(data, null, 2));
            return NextResponse.json(
                { error: 'Unexpected response format from backend', details: 'Response does not contain expected dashboard stats structure' },
                { status: 500 }
            );
        }

        // Log for debugging if needed (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
            console.log('Dashboard stats response:', JSON.stringify(statsData, null, 2));
        }

        return NextResponse.json(statsData);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}



