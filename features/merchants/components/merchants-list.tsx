'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MerchantsTable } from './merchants-table';
import { NewMerchantDrawer } from './new-merchant-drawer';
import { merchantsListQueryOptions, type MerchantListParams } from '@/features/merchants/queries/merchants';
import { useMerchantsTableStore } from '@/lib/stores/merchants-table-store';

export default function MerchantsList() {
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

    const { data, isLoading, isFetching } = useQuery(merchantsListQueryOptions(queryParams));

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
                const nextPageParams: MerchantListParams = {
                    ...queryParams,
                    page: nextPage,
                };

                // Only prefetch if not already in cache
                const cachedData = queryClient.getQueryData(
                    merchantsListQueryOptions(nextPageParams).queryKey
                );

                if (!cachedData) {
                    // Cancel any existing prefetch for this page using query cancellation
                    const queryKey = merchantsListQueryOptions(nextPageParams).queryKey;
                    queryClient.cancelQueries({ queryKey });

                    // Prefetch the next page with error handling
                    queryClient.prefetchQuery(merchantsListQueryOptions(nextPageParams))
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
                const nextPageParams: MerchantListParams = {
                    ...queryParams,
                    page: nextPage,
                };
                const queryKey = merchantsListQueryOptions(nextPageParams).queryKey;
                queryClient.cancelQueries({ queryKey });
            });
        };
    }, [queryParams, data, queryClient]);

    // Extract merchants and pagination metadata
    const merchants = data?.data ?? [];
    const paginationMeta = data ? {
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        last: data.last,
        first: data.first,
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
                isLoading={isLoading || isFetching}
            />
        </div>
    )
}

