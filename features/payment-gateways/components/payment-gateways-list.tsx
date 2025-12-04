'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentGatewaysTable } from './payment-gateways-table';
import { NewPaymentGatewayDrawer } from './new-payment-gateway-drawer';
import { paymentGatewaysListQueryOptions, type PaymentGatewayListParams } from '@/features/payment-gateways/queries/payment-gateways';
import { usePaymentGatewaysTableStore } from '@/lib/stores/payment-gateways-table-store';

export default function PaymentGatewaysList() {
    const queryClient = useQueryClient();
    const { pagination, sorting, columnFilters, setPagination } = usePaymentGatewaysTableStore();

    // Reset to first page when sorting or filtering changes
    useEffect(() => {
        const currentPagination = usePaymentGatewaysTableStore.getState().pagination;
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
        const params: { is_active?: boolean } = {};

        columnFilters.forEach(filter => {
            if (filter.id === 'is_active' && Array.isArray(filter.value)) {
                // For is_active filter, convert boolean strings to actual boolean
                const activeValues = filter.value as string[];
                if (activeValues.length > 0) {
                    // Convert string to boolean - use first value
                    params.is_active = activeValues[0] === 'true';
                }
            }
        });

        return params;
    }, [columnFilters]);

    // Memoize queryParams to prevent unnecessary re-renders and ensure stable reference
    const queryParams: PaymentGatewayListParams = useMemo(() => ({
        page,
        per_page,
        ...(sortParams.length > 0 && { sort: sortParams }),
        ...filterParams,
    }), [page, per_page, sortParams, filterParams]);

    const { data, isLoading, isFetching, error } = useQuery(paymentGatewaysListQueryOptions(queryParams));

    if (error) {
        console.error('Payment gateways query error:', error);
    }

    console.log('Payment gateways query state:', {
        hasData: !!data,
        dataLength: data?.data?.length,
        isLoading,
        isFetching,
        error: error?.message
    });

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
                const nextPageParams: PaymentGatewayListParams = {
                    ...queryParams,
                    page: nextPage,
                };


                // Only prefetch if not already in cache
                const cachedData = queryClient.getQueryData(
                    paymentGatewaysListQueryOptions(nextPageParams).queryKey
                );

                if (!cachedData) {
                    // Cancel any existing prefetch for this page using query cancellation
                    const queryKey = paymentGatewaysListQueryOptions(nextPageParams).queryKey;
                    queryClient.cancelQueries({ queryKey });

                    // Prefetch the next page with error handling
                    queryClient.prefetchQuery(paymentGatewaysListQueryOptions(nextPageParams))
                        .catch((error) => {
                            // Only log if not cancelled (cancelled queries are expected during cleanup)
                            if (error.name !== 'AbortError' && !error.message?.includes('cancel')) {
                                console.error(`Failed to prefetch payment gateways page ${nextPage}:`, error);
                            }
                        });
                }
            });
        }

        // Cleanup function to cancel pending prefetches when component unmounts or dependencies change
        return () => {
            // Cancel all pending prefetch queries for next pages
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams: PaymentGatewayListParams = {
                    ...queryParams,
                    page: nextPage,
                };
                const queryKey = paymentGatewaysListQueryOptions(nextPageParams).queryKey;
                queryClient.cancelQueries({ queryKey });
            });
        };
    }, [queryParams, data, queryClient]);

    // Extract payment gateways and pagination metadata
    const paymentGateways = data?.data ?? [];
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
                <h1 className="text-2xl font-semibold">Payment Gateways</h1>
                <NewPaymentGatewayDrawer />
            </div>
            <PaymentGatewaysTable
                data={paymentGateways}
                paginationMeta={paginationMeta}
                isLoading={isLoading || isFetching}
            />
        </div>
    )
}


