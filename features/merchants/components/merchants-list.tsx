'use client';

import { useEffect, useMemo } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { MerchantsTable } from './merchants-table';
import { NewMerchantDrawer } from './new-merchant-drawer';
import type { MerchantListParams } from '@/features/merchants/types';
import { useMerchantsTableStore } from '@/lib/stores/merchants-table-store';
import { useTRPC } from '@/lib/trpc/client';
import type { PaginatedMerchantResponse } from '@/lib/definitions';

export default function MerchantsList() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { pagination, sorting, columnFilters, setPagination, setSorting, setColumnFilters } = useMerchantsTableStore();

    // Reset to first page when sorting or filtering changes
    useEffect(() => {
        const currentPagination = useMerchantsTableStore.getState().pagination;
        setPagination({ ...currentPagination, pageIndex: 0 });
    }, [sorting, columnFilters, setPagination]);

    // Use pageIndex directly (0-based) - backend uses 0-based pagination
    const page = pagination.pageIndex;
    const per_page = pagination.pageSize;

    // Convert sorting state to sort parameter format (e.g., ["name,asc", "code,desc"])
    const sortParams = useMemo(() => {
        return sorting.map(sort => {
            const direction = sort.desc ? 'desc' : 'asc';
            return `${sort.id},${direction}`;
        });
    }, [sorting]);

    // Convert column filters to query parameters
    const filterParams = useMemo(() => {
        const params: { status?: string; merchantType?: string; kyc_verified?: boolean } = {};

        columnFilters.forEach(filter => {
            if (filter.id === 'status' && Array.isArray(filter.value)) {
                // For status filter, use first value or join multiple values
                const statusValues = filter.value as string[];
                if (statusValues.length > 0) {
                    // Backend might expect single value or comma-separated
                    params.status = statusValues.join(',');
                }
            } else if (filter.id === 'merchant_type' && Array.isArray(filter.value)) {
                // For merchant type filter, join multiple values with comma
                const typeValues = filter.value as string[];
                if (typeValues.length > 0) {
                    params.merchantType = typeValues.join(',');
                }
            } else if (filter.id === 'kyc_verified' && Array.isArray(filter.value)) {
                // For KYC filter, convert boolean strings to actual boolean
                const kycValues = filter.value as string[];
                if (kycValues.length > 0) {
                    // Convert string to boolean - use first value
                    params.kyc_verified = kycValues[0] === 'true';
                }
            }
        });

        return params;
    }, [columnFilters]);

    // Memoize queryParams to prevent unnecessary re-renders and ensure stable reference
    const queryParams: MerchantListParams = useMemo(() => ({
        page,
        per_page,
        ...(sortParams.length > 0 && { sort: sortParams }),
        ...filterParams,
    }), [page, per_page, sortParams, filterParams]);

    // Build tRPC query params
    const trpcQueryParams = useMemo(() => {
        const params: Record<string, string | undefined> = {
            page: page.toString(),
            per_page: per_page.toString(),
        };
        if (queryParams.search) params.search = queryParams.search;
        if (queryParams.status) params.status = queryParams.status;
        if (queryParams.merchantType) params.merchantType = queryParams.merchantType;
        if (queryParams.kyc_verified !== undefined) params.kyc_verified = queryParams.kyc_verified.toString();
        if (queryParams.sort && queryParams.sort.length > 0) {
            params.sort = queryParams.sort.join(',');
        }
        return params;
    }, [queryParams, page, per_page]);

    // Use tRPC query with Suspense
    const queryResult = useSuspenseQuery(
        trpc.merchants.list.queryOptions(trpcQueryParams)
    );
    
    // Type assertion needed because tRPC types may not be fully inferred in this context
    const data = queryResult.data as PaginatedMerchantResponse | undefined;

    // Dynamically prefetch the next 2 pages when page changes
    useEffect(() => {
        if (!data) return;

        const currentPage = data.pageNumber;
        const totalPages = data.totalPages;

        // Prefetch next 2 pages if they exist (0-based pagination)
        const pagesToPrefetch: number[] = [];
        for (let i = 1; i <= 2; i++) {
            const nextPage = currentPage + i;
            // Use < instead of <= for 0-based pagination (pages 0 to totalPages-1)
            if (nextPage < totalPages) {
                pagesToPrefetch.push(nextPage);
            }
        }

        // Prefetch all next pages in parallel with error handling
        if (pagesToPrefetch.length > 0) {
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams: Record<string, string | undefined> = {
                    ...trpcQueryParams,
                    page: nextPage.toString(),
                };

                // Only prefetch if not already in cache
                const queryKey = trpc.merchants.list.queryKey(nextPageParams);
                const cachedData = queryClient.getQueryData(queryKey);

                if (!cachedData) {
                    // Cancel any existing prefetch for this page using query cancellation
                    queryClient.cancelQueries({ queryKey });

                    // Prefetch the next page with error handling
                    queryClient.prefetchQuery(trpc.merchants.list.queryOptions(nextPageParams))
                        .catch((error) => {
                            // Only log if not cancelled (cancelled queries are expected during cleanup)
                            if (error.name !== 'AbortError' && !error.message?.includes('cancel')) {
                                console.error(`Failed to prefetch merchants page ${nextPage}:`, error);
                            }
                        });
                }
            });
        }

        // Cleanup function to cancel pending prefetches when component unmounts or dependencies change
        return () => {
            // Cancel all pending prefetch queries for next pages
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams: Record<string, string | undefined> = {
                    ...trpcQueryParams,
                    page: nextPage.toString(),
                };
                const queryKey = trpc.merchants.list.queryKey(nextPageParams);
                queryClient.cancelQueries({ queryKey });
            });
        };
    }, [trpcQueryParams, data, queryClient, trpc]);

    // Extract merchants and pagination metadata
    const merchants = (data as PaginatedMerchantResponse | undefined)?.data ?? [];
    const paginationMeta = data ? {
        pageNumber: (data as unknown as PaginatedMerchantResponse).pageNumber ?? pagination.pageIndex,
        pageSize: (data as unknown as PaginatedMerchantResponse).pageSize ?? per_page,
        totalElements: (data as unknown as PaginatedMerchantResponse).totalElements ?? 0,
        totalPages: (data as unknown as PaginatedMerchantResponse).totalPages ?? 0,
        last: (data as unknown as PaginatedMerchantResponse).last ?? true,
        first: (data as unknown as PaginatedMerchantResponse).first ?? true,
    } : {
        pageNumber: pagination.pageIndex,
        pageSize: per_page,
        totalElements: 0,
        totalPages: 0,
        last: true,
        first: true,
    };

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Merchants</h1>
                    <p className="text-muted-foreground">
                        Manage merchants and their configurations.
                    </p>
                </div>
                <NewMerchantDrawer />
            </div>
            <MerchantsTable
                data={merchants}
                paginationMeta={paginationMeta}
            />
        </div>
    )
}

