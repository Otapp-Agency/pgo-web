import { DashboardStatsSchema, type DashboardStats, type DashboardStatsParams } from '../types';
import { QUERY_CACHE } from '@/lib/config/constants';

// Re-export types for convenience
export type { DashboardStats, DashboardStatsParams } from '../types';

/**
 * Query keys factory for dashboard
 * Safe to import in both client and server components
 */
export const dashboardKeys = {
    all: ['dashboard'] as const,
    stats: () => [...dashboardKeys.all, 'stats'] as const,
    statsWithParams: (params?: DashboardStatsParams) =>
        params ? [...dashboardKeys.stats(), params] as const : [...dashboardKeys.stats()] as const,
};

/**
 * Normalize params object to ensure consistent query keys
 * Removes undefined/null/empty values and ensures consistent structure
 */
export function normalizeDashboardParams(
    params?: DashboardStatsParams
): DashboardStatsParams {
    if (!params) {
        return {};
    }

    const normalized: DashboardStatsParams = {};

    // Add params only if they have values
    if (params.period) normalized.period = params.period;
    if (params.start_date) normalized.start_date = params.start_date;
    if (params.end_date) normalized.end_date = params.end_date;
    if (params.merchant_id) normalized.merchant_id = params.merchant_id;

    return normalized;
}

/**
 * Client-side query options for dashboard stats
 */
export function dashboardStatsQueryOptions(params?: DashboardStatsParams) {
    // Normalize params to ensure consistent query keys
    const normalizedParams = normalizeDashboardParams(params);

    // Build query string from params
    const queryParams = new URLSearchParams();

    if (normalizedParams.period) {
        queryParams.set('period', normalizedParams.period);
    }
    if (normalizedParams.start_date) {
        queryParams.set('start_date', normalizedParams.start_date);
    }
    if (normalizedParams.end_date) {
        queryParams.set('end_date', normalizedParams.end_date);
    }
    if (normalizedParams.merchant_id) {
        queryParams.set('merchant_id', normalizedParams.merchant_id);
    }

    const queryString = queryParams.toString();
    const url = `/api/dashboard/stats${queryString ? `?${queryString}` : ''}`;

    // Query key uses normalized params to ensure consistent caching
    const queryKey = dashboardKeys.statsWithParams(
        Object.keys(normalizedParams).length > 0 ? normalizedParams : undefined
    );

    return {
        queryKey,
        queryFn: async (): Promise<DashboardStats> => {
            // Use absolute URL - construct it based on environment
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                // Client-side: use window.location.origin
                fullUrl = `${window.location.origin}${url}`;
            } else {
                // Server-side: this shouldn't happen if prefetch worked
                console.warn('QueryFn executed on server - prefetch may have failed');
                throw new Error('dashboardStatsQueryOptions should only be used client-side');
            }

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to fetch dashboard stats'
                );
            }

            const responseData = await response.json();
            
            // Parse and validate the response
            try {
                return DashboardStatsSchema.parse(responseData);
            } catch (error) {
                // Log the actual response for debugging
                console.error('Failed to parse dashboard stats response:', {
                    error,
                    responseData,
                });
                throw new Error(
                    `Invalid dashboard stats response format: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        },
        staleTime: QUERY_CACHE.STALE_TIME_LIST, // Dashboard stats can refresh more often
    };
}

