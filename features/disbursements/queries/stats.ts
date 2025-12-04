import { DisbursementStatsResponse, DisbursementStatsParams } from '@/lib/definitions';
import { QUERY_CACHE } from '@/lib/config/constants';
import { useQuery } from '@tanstack/react-query';

/**
 * Query keys factory for disbursement statistics
 * Safe to import in both client and server components
 */
export const disbursementStatsKeys = {
    all: ['disbursements', 'stats'] as const,
    volume: (params: DisbursementStatsParams) => [...disbursementStatsKeys.all, 'volume', params] as const,
    status: (params: DisbursementStatsParams) => [...disbursementStatsKeys.all, 'status', params] as const,
    gateway: (params: DisbursementStatsParams) => [...disbursementStatsKeys.all, 'gateway', params] as const,
};

/**
 * Normalize params object to ensure consistent query keys
 */
function normalizeStatsParams(params: DisbursementStatsParams): DisbursementStatsParams {
    const normalized: DisbursementStatsParams = {
        startDate: params.startDate,
        endDate: params.endDate,
    };

    if (params.merchantId) {
        normalized.merchantId = params.merchantId;
    }
    if (params.gatewayId) {
        normalized.gatewayId = params.gatewayId;
    }

    return normalized;
}

/**
 * Client-side query options for disbursement volume statistics
 */
export function disbursementVolumeStatsQueryOptions(params: DisbursementStatsParams) {
    const normalizedParams = normalizeStatsParams(params);

    const queryKey = disbursementStatsKeys.volume(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<DisbursementStatsResponse> => {
            const queryParams = new URLSearchParams();
            queryParams.set('startDate', normalizedParams.startDate);
            queryParams.set('endDate', normalizedParams.endDate);
            if (normalizedParams.merchantId) {
                queryParams.set('merchantId', normalizedParams.merchantId);
            }
            if (normalizedParams.gatewayId) {
                queryParams.set('gatewayId', normalizedParams.gatewayId);
            }

            const url = `/api/disbursements/stats/volume?${queryParams.toString()}`;

            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('disbursementVolumeStatsQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch volume stats'
                );
            }

            return response.json();
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };
}

/**
 * Client-side query options for disbursement status statistics
 */
export function disbursementStatusStatsQueryOptions(params: DisbursementStatsParams) {
    const normalizedParams = normalizeStatsParams(params);

    const queryKey = disbursementStatsKeys.status(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<DisbursementStatsResponse> => {
            const queryParams = new URLSearchParams();
            queryParams.set('startDate', normalizedParams.startDate);
            queryParams.set('endDate', normalizedParams.endDate);
            if (normalizedParams.merchantId) {
                queryParams.set('merchantId', normalizedParams.merchantId);
            }
            if (normalizedParams.gatewayId) {
                queryParams.set('gatewayId', normalizedParams.gatewayId);
            }

            const url = `/api/disbursements/stats/status?${queryParams.toString()}`;

            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('disbursementStatusStatsQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch status stats'
                );
            }

            return response.json();
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };
}

/**
 * Client-side query options for disbursement gateway statistics
 */
export function disbursementGatewayStatsQueryOptions(params: DisbursementStatsParams) {
    const normalizedParams = normalizeStatsParams(params);

    const queryKey = disbursementStatsKeys.gateway(normalizedParams);

    return {
        queryKey,
        queryFn: async (): Promise<DisbursementStatsResponse> => {
            const queryParams = new URLSearchParams();
            queryParams.set('startDate', normalizedParams.startDate);
            queryParams.set('endDate', normalizedParams.endDate);
            if (normalizedParams.merchantId) {
                queryParams.set('merchantId', normalizedParams.merchantId);
            }
            if (normalizedParams.gatewayId) {
                queryParams.set('gatewayId', normalizedParams.gatewayId);
            }

            const url = `/api/disbursements/stats/gateway?${queryParams.toString()}`;

            let fullUrl: string;
            if (typeof window !== 'undefined') {
                fullUrl = `${window.location.origin}${url}`;
            } else {
                throw new Error('disbursementGatewayStatsQueryOptions should only be used client-side');
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
                    errorData.error || errorData.message || 'Failed to fetch gateway stats'
                );
            }

            return response.json();
        },
        staleTime: QUERY_CACHE.STALE_TIME_DETAIL,
    };
}

/**
 * Hook to fetch disbursement volume statistics
 */
export function useDisbursementVolumeStats(params: DisbursementStatsParams) {
    return useQuery(disbursementVolumeStatsQueryOptions(params));
}

/**
 * Hook to fetch disbursement status statistics
 */
export function useDisbursementStatusStats(params: DisbursementStatsParams) {
    return useQuery(disbursementStatusStatsQueryOptions(params));
}

/**
 * Hook to fetch disbursement gateway statistics
 */
export function useDisbursementGatewayStats(params: DisbursementStatsParams) {
    return useQuery(disbursementGatewayStatsQueryOptions(params));
}

