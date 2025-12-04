import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * Get start and end date for a given month
 * Returns dates in LocalDateTime format required by the backend (YYYY-MM-DDTHH:mm:ss)
 */
function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
    // Start of month: first day at 00:00:00
    const startDate = new Date(year, month - 1, 1);

    // End of month: last day at 23:59:59
    const endDate = new Date(year, month, 0); // Day 0 of next month = last day of current month

    // Format as LocalDateTime (YYYY-MM-DDTHH:mm:ss)
    const formatDateTime = (date: Date, isEndOfDay: boolean = false) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const time = isEndOfDay ? '23:59:59' : '00:00:00';
        return `${yyyy}-${mm}-${dd}T${time}`;
    };

    return {
        startDate: formatDateTime(startDate, false),
        endDate: formatDateTime(endDate, true),
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

        // Required parameter
        const year = searchParams.get('year');
        if (!year) {
            return NextResponse.json(
                { error: 'year parameter is required' },
                { status: 400 }
            );
        }

        // Optional month parameter (defaults to current month)
        const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();

        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);

        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return NextResponse.json(
                { error: 'Invalid year or month parameter' },
                { status: 400 }
            );
        }

        // Calculate date range for the month
        const { startDate, endDate } = getMonthDateRange(
            yearNum,
            monthNum
        );

        // Build query parameters for the daily stats endpoint
        const queryParams = new URLSearchParams();
        queryParams.set('startDate', startDate);
        queryParams.set('endDate', endDate);

        // Build the URL using the daily stats endpoint
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.transactions.dailyStats}?${queryString}`;

        console.log('[Monthly Transaction Stats] Fetching:', url);
        console.log('[Monthly Transaction Stats] Date range:', { startDate, endDate });

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
                message: response.statusText || 'Failed to fetch monthly transaction summary',
            }));

            console.error('[Monthly Transaction Stats] Error:', response.status, errorData);
            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch monthly transaction summary' },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[Monthly Transaction Stats] Response:', JSON.stringify(data, null, 2).substring(0, 500));

        // Handle response format - backend returns ResponseWrapperListTransactionSummaryDto
        // which contains a list of TransactionSummaryDto
        const summaryList = data.data || data;

        // If it's an array of daily summaries, aggregate them into a monthly summary
        if (Array.isArray(summaryList) && summaryList.length > 0) {
            // Aggregate the daily stats into a single monthly summary
            const aggregated = aggregateDailyStats(summaryList, year, month);
            return NextResponse.json(aggregated);
        } else if (Array.isArray(summaryList) && summaryList.length === 0) {
            // No data for this period - return empty summary matching expected schema
            return NextResponse.json({
                report_period: `${year}-${month.toString().padStart(2, '0')}`,
                total_transactions: 0,
                total_value: 0,
                currency: 'TZS',
                status_breakdown: {},
                pgo_breakdown: {},
                method_breakdown: {},
            });
        } else {
            // Single summary object - transform to match expected schema
            const single = summaryList as DailyTransactionStat;
            const transformed = aggregateDailyStats([single], year, month);
            return NextResponse.json(transformed);
        }
    } catch (error) {
        console.error('[Monthly Transaction Stats] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

interface DailyTransactionStat {
    totalTransactions?: string | number;
    successfulTransactions?: string | number;
    failedTransactions?: string | number;
    pendingTransactions?: string | number;
    cancelledTransactions?: string | number;
    refundedTransactions?: string | number;
    totalAmount?: string | number;
    successfulAmount?: string | number;
    failedAmount?: string | number;
    pendingAmount?: string | number;
    refundedAmount?: string | number;
    primaryCurrency?: string;
    gatewayCounts?: string; // JSON string
    gatewayAmounts?: string; // JSON string
    currencyBreakdown?: string; // JSON string
}

/**
 * Aggregate daily transaction summaries into a monthly summary
 */
function aggregateDailyStats(dailyStats: DailyTransactionStat[], year: string, month: string) {
    const parseNumber = (val: string | number | undefined | null): number => {
        if (val === undefined || val === null) return 0;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? 0 : num;
    };

    // Sum up all daily stats
    let totalTransactions = 0;
    let successfulTransactions = 0;
    let failedTransactions = 0;
    let pendingTransactions = 0;
    let cancelledTransactions = 0;
    let refundedTransactions = 0;
    let totalAmount = 0;
    let successfulAmount = 0;
    let failedAmount = 0;
    let pendingAmount = 0;
    let refundedAmount = 0;
    let primaryCurrency = 'TZS';

    for (const day of dailyStats) {
        totalTransactions += parseNumber(day.totalTransactions);
        successfulTransactions += parseNumber(day.successfulTransactions);
        failedTransactions += parseNumber(day.failedTransactions);
        pendingTransactions += parseNumber(day.pendingTransactions);
        cancelledTransactions += parseNumber(day.cancelledTransactions);
        refundedTransactions += parseNumber(day.refundedTransactions);
        totalAmount += parseNumber(day.totalAmount);
        successfulAmount += parseNumber(day.successfulAmount);
        failedAmount += parseNumber(day.failedAmount);
        pendingAmount += parseNumber(day.pendingAmount);
        refundedAmount += parseNumber(day.refundedAmount);

        // Use the first non-empty currency
        if (day.primaryCurrency && primaryCurrency === 'TZS') {
            primaryCurrency = day.primaryCurrency;
        }
    }

    // Build status breakdown
    const statusBreakdown: Record<string, { count: number; value: number }> = {};
    if (successfulTransactions > 0) {
        statusBreakdown['SUCCESS'] = {
            count: successfulTransactions,
            value: successfulAmount,
        };
    }
    if (failedTransactions > 0) {
        statusBreakdown['FAILED'] = {
            count: failedTransactions,
            value: failedAmount,
        };
    }
    if (pendingTransactions > 0) {
        statusBreakdown['PENDING'] = {
            count: pendingTransactions,
            value: pendingAmount,
        };
    }
    if (cancelledTransactions > 0) {
        statusBreakdown['CANCELLED'] = {
            count: cancelledTransactions,
            value: 0, // Cancelled transactions typically have 0 value
        };
    }
    if (refundedTransactions > 0) {
        statusBreakdown['REFUNDED'] = {
            count: refundedTransactions,
            value: refundedAmount,
        };
    }

    // Aggregate gateway breakdowns
    const pgoBreakdown: Record<string, { count: number; value: number }> = {};
    for (const day of dailyStats) {
        if (day.gatewayCounts && day.gatewayAmounts) {
            try {
                const gatewayCounts = typeof day.gatewayCounts === 'string'
                    ? JSON.parse(day.gatewayCounts)
                    : day.gatewayCounts;
                const gatewayAmounts = typeof day.gatewayAmounts === 'string'
                    ? JSON.parse(day.gatewayAmounts)
                    : day.gatewayAmounts;

                for (const [gateway, count] of Object.entries(gatewayCounts)) {
                    const countNum = parseNumber(count as string | number);
                    const amountNum = parseNumber((gatewayAmounts as Record<string, unknown>)[gateway] as string | number);

                    if (!pgoBreakdown[gateway]) {
                        pgoBreakdown[gateway] = { count: 0, value: 0 };
                    }
                    pgoBreakdown[gateway].count += countNum;
                    pgoBreakdown[gateway].value += amountNum;
                }
            } catch (e) {
                console.warn('[Monthly Transaction Stats] Failed to parse gateway breakdown:', e);
            }
        }
    }

    // Method breakdown (empty for now - can be populated if backend provides payment method data)
    const methodBreakdown: Record<string, { count: number; value: number }> = {};

    return {
        report_period: `${year}-${month.toString().padStart(2, '0')}`,
        total_transactions: totalTransactions,
        total_value: totalAmount, // Number, not string
        currency: primaryCurrency,
        status_breakdown: statusBreakdown,
        pgo_breakdown: pgoBreakdown,
        method_breakdown: methodBreakdown,
    };
}
