import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../init';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { DashboardStatsSchema } from '@/features/dashboard/types';

/**
 * Transform the nested API response to the expected flat structure
 */
function transformDashboardStatsResponse(apiResponse: unknown) {
    type ApiResponse = {
        overview?: {
            transactions?: {
                total?: number;
                successful?: number;
                failed?: number;
                amountsByCurrency?: Record<string, string | number>;
                successfulAmountsByCurrency?: Record<string, string | number>;
            };
            disbursements?: {
                total?: number;
                successful?: number;
                failed?: number;
                amountsByCurrency?: Record<string, string | number>;
                successfulAmountsByCurrency?: Record<string, string | number>;
            };
        };
        breakdowns?: {
            byCurrency?: Record<string, unknown>;
        };
        recentActivity?: unknown;
    };

    const response = apiResponse as ApiResponse;
    const overview = response.overview || {};
    const transactions = overview.transactions || {};
    const disbursements = overview.disbursements || {};

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
        recentActivity: response.recentActivity || undefined,
    };
}

export const dashboardRouter = createTRPCRouter({
    /**
     * Get dashboard stats with optional filtering
     */
    stats: protectedProcedure
        .input(
            z.object({
                period: z.enum(['today', 'this_week', 'this_month', 'custom_date_range']).optional(),
                start_date: z.string().optional(),
                end_date: z.string().optional(),
                merchant_id: z.string().optional(),
            }).optional()
        )
        .query(async ({ input, ctx }) => {
            const { token } = ctx;

            // Build query string with params
            const queryParams = new URLSearchParams();

            if (input?.period) {
                queryParams.set('period', input.period);
            }
            if (input?.start_date) {
                queryParams.set('start_date', input.start_date);
            }
            if (input?.end_date) {
                queryParams.set('end_date', input.end_date);
            }
            if (input?.merchant_id) {
                queryParams.set('merchant_id', input.merchant_id);
            }

            const queryString = queryParams.toString();
            const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.dashboard.stats}${queryString ? `?${queryString}` : ''}`;

            // Fetch from backend API
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText || 'Failed to fetch dashboard stats',
                }));

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: errorData.message || errorData.error || 'Failed to fetch dashboard stats',
                });
            }

            const responseData = await response.json();

            // Handle if data is wrapped in a data property
            let rawData;
            if (responseData.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
                rawData = responseData.data;
            } else if (typeof responseData === 'object' && !Array.isArray(responseData)) {
                rawData = responseData;
            } else {
                console.error('Unexpected response format from dashboard stats API:', JSON.stringify(responseData, null, 2));
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Unexpected response format from backend API',
                });
            }

            // Transform the nested API response to the expected flat structure
            const statsData = transformDashboardStatsResponse(rawData);

            // Parse and validate the response
            try {
                return DashboardStatsSchema.parse(statsData);
            } catch (error) {
                // Log the actual response for debugging
                console.error('Failed to parse dashboard stats response:', {
                    error,
                    rawData,
                    transformedData: statsData,
                });
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Invalid dashboard stats response format: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
            }
        }),
});
