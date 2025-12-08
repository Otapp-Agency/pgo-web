import { z } from 'zod';

/**
 * Recent Activity Item Schema (simplified from API response)
 */
const RecentActivityItemSchema = z.object({
    uid: z.string(),
    createdAt: z.string(),
    amount: z.string(),
    currency: z.string(),
    id: z.number(),
    status: z.string(),
});

/**
 * Recent Activity Schema
 */
const RecentActivitySchema = z.object({
    transactions: z.array(RecentActivityItemSchema).optional(),
    disbursements: z.array(RecentActivityItemSchema).optional(),
}).optional();

/**
 * Raw API Response Schema (FR-REP-004)
 * GET /api/v1/dashboard/stats
 * Matches the actual API response structure
 */
const DashboardStatsApiResponseSchema = z.object({
    overview: z.object({
        transactions: z.object({
            total: z.number(),
            successful: z.number(),
            failed: z.number(),
            pending: z.number(),
            amountsByCurrency: z.record(z.string(), z.string()),
            successfulAmountsByCurrency: z.record(z.string(), z.string()).optional(),
        }),
        disbursements: z.object({
            total: z.number(),
            successful: z.number(),
            failed: z.number(),
            pending: z.number(),
            amountsByCurrency: z.record(z.string(), z.string()),
            successfulAmountsByCurrency: z.record(z.string(), z.string()).optional(),
        }),
    }),
    breakdowns: z.object({
        byCurrency: z.record(z.string(), z.object({
            transactionCount: z.number(),
            transactionAmount: z.string(),
            disbursementCount: z.number(),
            disbursementAmount: z.string(),
        })).optional(),
    }).optional(),
    recentActivity: RecentActivitySchema,
}).passthrough(); // Allow additional fields like context, trends

export type DashboardStatsApiResponse = z.infer<typeof DashboardStatsApiResponseSchema>;

/**
 * Transform API response to flat DashboardStats format
 */
function transformApiResponse(apiResponse: DashboardStatsApiResponse): {
    total_transactions_count: number;
    total_transactions_value: number;
    successful_transactions_count: number;
    successful_transactions_value: number;
    failed_transactions_count: number;
    failed_transactions_value: number;
    total_disbursements_count: number;
    total_disbursements_value: number;
    successful_disbursements_count: number;
    successful_disbursements_value: number;
    currency: string;
    recentActivity?: {
        transactions?: Array<{
            uid: string;
            createdAt: string;
            amount: string;
            currency: string;
            id: number;
            status: string;
        }>;
        disbursements?: Array<{
            uid: string;
            createdAt: string;
            amount: string;
            currency: string;
            id: number;
            status: string;
        }>;
    };
} {
    const { overview } = apiResponse;

    // Extract currency from amountsByCurrency (default to TZS if not found)
    const transactionCurrencies = Object.keys(overview.transactions.amountsByCurrency || {});
    const disbursementCurrencies = Object.keys(overview.disbursements.amountsByCurrency || {});
    const currency = transactionCurrencies[0] || disbursementCurrencies[0] || 'TZS';

    // Parse amounts (they come as strings from API)
    const totalTransactionsValue = parseFloat(overview.transactions.amountsByCurrency[currency] || '0');
    const successfulTransactionsValue = parseFloat(
        overview.transactions.successfulAmountsByCurrency?.[currency] || '0'
    );
    const failedTransactionsValue = totalTransactionsValue - successfulTransactionsValue;

    const totalDisbursementsValue = parseFloat(overview.disbursements.amountsByCurrency[currency] || '0');
    const successfulDisbursementsValue = parseFloat(
        overview.disbursements.successfulAmountsByCurrency?.[currency] || '0'
    );

    // Parse and preserve recent activity
    let recentActivity: {
        transactions?: Array<{
            uid: string;
            createdAt: string;
            amount: string;
            currency: string;
            id: number;
            status: string;
        }>;
        disbursements?: Array<{
            uid: string;
            createdAt: string;
            amount: string;
            currency: string;
            id: number;
            status: string;
        }>;
    } | undefined;

    if (apiResponse.recentActivity) {
        try {
            const parsed = RecentActivitySchema.parse(apiResponse.recentActivity);
            recentActivity = {
                transactions: parsed?.transactions,
                disbursements: parsed?.disbursements,
            };
        } catch (error) {
            console.warn('Failed to parse recent activity:', error);
        }
    }

    return {
        total_transactions_count: overview.transactions.total || 0,
        total_transactions_value: totalTransactionsValue,
        successful_transactions_count: overview.transactions.successful || 0,
        successful_transactions_value: successfulTransactionsValue,
        failed_transactions_count: overview.transactions.failed || 0,
        failed_transactions_value: failedTransactionsValue,
        total_disbursements_count: overview.disbursements.total || 0,
        total_disbursements_value: totalDisbursementsValue,
        successful_disbursements_count: overview.disbursements.successful || 0,
        successful_disbursements_value: successfulDisbursementsValue,
        currency,
        recentActivity,
    };
}

/**
 * Dashboard Stats Schema (FR-REP-004)
 * Transforms the nested API response to flat format
 */
export const DashboardStatsSchema = z.preprocess(
    (data) => {
        // Handle undefined/null values
        if (!data || typeof data !== 'object') {
            return {
                total_transactions_count: 0,
                total_transactions_value: 0,
                successful_transactions_count: 0,
                successful_transactions_value: 0,
                failed_transactions_count: 0,
                failed_transactions_value: 0,
                total_disbursements_count: 0,
                total_disbursements_value: 0,
                successful_disbursements_count: 0,
                successful_disbursements_value: 0,
                currency: 'TZS',
            };
        }

        // Check if data is already in flat format (backward compatibility)
        if ('total_transactions_count' in data) {
            // Preserve recentActivity if it exists
            const result: {
                total_transactions_count: number;
                total_transactions_value: number;
                successful_transactions_count: number;
                successful_transactions_value: number;
                failed_transactions_count: number;
                failed_transactions_value: number;
                total_disbursements_count: number;
                total_disbursements_value: number;
                successful_disbursements_count: number;
                successful_disbursements_value: number;
                currency: string;
                recentActivity?: {
                    transactions?: Array<{
                        uid: string;
                        createdAt: string;
                        amount: string;
                        currency: string;
                        id: number;
                        status: string;
                    }>;
                    disbursements?: Array<{
                        uid: string;
                        createdAt: string;
                        amount: string;
                        currency: string;
                        id: number;
                        status: string;
                    }>;
                };
            } = {
                total_transactions_count: (data as Record<string, unknown>).total_transactions_count as number ?? 0,
                total_transactions_value: (data as Record<string, unknown>).total_transactions_value as number | undefined ?? 0,
                successful_transactions_count: (data as Record<string, unknown>).successful_transactions_count as number ?? 0,
                successful_transactions_value: (data as Record<string, unknown>).successful_transactions_value as number | undefined ?? 0,
                failed_transactions_count: (data as Record<string, unknown>).failed_transactions_count as number ?? 0,
                failed_transactions_value: (data as Record<string, unknown>).failed_transactions_value as number ?? 0,
                total_disbursements_count: (data as Record<string, unknown>).total_disbursements_count as number ?? 0,
                total_disbursements_value: (data as Record<string, unknown>).total_disbursements_value as number ?? 0,
                successful_disbursements_count: (data as Record<string, unknown>).successful_disbursements_count as number ?? 0,
                successful_disbursements_value: (data as Record<string, unknown>).successful_disbursements_value as number ?? 0,
                currency: (data as Record<string, unknown>).currency as string ?? 'TZS',
            };

            // Preserve recentActivity if present
            if ('recentActivity' in data && data.recentActivity) {
                try {
                    const parsed = RecentActivitySchema.parse(data.recentActivity);
                    if (parsed) {
                        result.recentActivity = {
                            transactions: parsed.transactions,
                            disbursements: parsed.disbursements,
                        };
                    }
                } catch (error) {
                    console.warn('Failed to parse recent activity in flat format:', error);
                }
            }

            return result;
        }

        // Transform nested API response to flat format
        try {
            const parsed = DashboardStatsApiResponseSchema.parse(data);
            return transformApiResponse(parsed);
        } catch (error) {
            console.error('Failed to parse dashboard stats API response:', error);
            // Return defaults if parsing fails
            return {
                total_transactions_count: 0,
                total_transactions_value: 0,
                successful_transactions_count: 0,
                successful_transactions_value: 0,
                failed_transactions_count: 0,
                failed_transactions_value: 0,
                total_disbursements_count: 0,
                total_disbursements_value: 0,
                successful_disbursements_count: 0,
                successful_disbursements_value: 0,
                currency: 'TZS',
            };
        }
    },
    z.object({
        total_transactions_count: z.number(),
        total_transactions_value: z.number(),
        successful_transactions_count: z.number(),
        successful_transactions_value: z.number(),
        failed_transactions_count: z.number(),
        failed_transactions_value: z.number(),
        total_disbursements_count: z.number(),
        total_disbursements_value: z.number(),
        successful_disbursements_count: z.number(),
        successful_disbursements_value: z.number(),
        currency: z.string(),
        recentActivity: z.object({
            transactions: z.array(RecentActivityItemSchema).optional(),
            disbursements: z.array(RecentActivityItemSchema).optional(),
        }).optional(),
    })
);

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

/**
 * Recent Activity Item Type
 */
export type RecentActivityItem = z.infer<typeof RecentActivityItemSchema>;

/**
 * Query params for dashboard stats
 */
export interface DashboardStatsParams {
    period?: 'today' | 'this_week' | 'this_month' | 'custom_date_range';
    start_date?: string;
    end_date?: string;
    merchant_id?: string;
}



