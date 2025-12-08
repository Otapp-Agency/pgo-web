'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RolesTable } from './roles-table';
import { rolesListQueryOptions, type RoleListParams } from '../queries/roles';
import { useRolesTableStore } from '@/lib/stores/roles-table-store';
import { PAGINATION } from '@/lib/config/constants';

export default function RolesList() {
    const queryClient = useQueryClient();
    const { pagination, sorting, columnFilters, setPagination, setSorting, setColumnFilters } = useRolesTableStore();

    // Reset to first page when sorting or filtering changes
    useEffect(() => {
        const currentPagination = useRolesTableStore.getState().pagination;
        setPagination({ ...currentPagination, pageIndex: 0 }); // 0-based for TanStack React Table
    }, [sorting, columnFilters, setPagination]);

    // Convert 0-based pageIndex to 1-based page number for API
    const page = pagination.pageIndex + 1;
    const per_page = pagination.pageSize;

    // Convert sorting state to sort parameter format (e.g., ["name,asc", "displayName,desc"])
    const sortParams = useMemo(() => {
        return sorting.map(sort => {
            const direction = sort.desc ? 'desc' : 'asc';
            return `${sort.id},${direction}`;
        });
    }, [sorting]);

    // Convert column filters to query parameters
    const filterParams = useMemo(() => {
        const params: { search?: string } = {};

        columnFilters.forEach(filter => {
            if (filter.id === 'name' && typeof filter.value === 'string') {
                params.search = filter.value;
            }
        });

        return params;
    }, [columnFilters]);

    // Memoize queryParams to prevent unnecessary re-renders and ensure stable reference
    const queryParams: RoleListParams = useMemo(() => ({
        page,
        per_page,
        ...(sortParams.length > 0 && { sort: sortParams }),
        ...filterParams,
    }), [page, per_page, sortParams, filterParams]);

    const { data, isLoading, isFetching } = useQuery(rolesListQueryOptions(queryParams));

    // Dynamically prefetch the next pages when page changes
    useEffect(() => {
        if (!data) return;

        const currentPage = data.pageNumber;
        const totalPages = data.totalPages;

        // Prefetch next pages if they exist (1-based pagination)
        const pagesToPrefetch: number[] = [];
        for (let i = 1; i <= PAGINATION.PREFETCH_PAGES_AHEAD; i++) {
            const nextPage = currentPage + i;
            if (nextPage <= totalPages) {
                pagesToPrefetch.push(nextPage);
            }
        }

        // Prefetch all next pages in parallel with error handling
        if (pagesToPrefetch.length > 0) {
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams: RoleListParams = {
                    ...queryParams,
                    page: nextPage,
                };

                // Only prefetch if not already in cache
                const cachedData = queryClient.getQueryData(
                    rolesListQueryOptions(nextPageParams).queryKey
                );

                if (!cachedData) {
                    // Cancel any existing prefetch for this page using query cancellation
                    const queryKey = rolesListQueryOptions(nextPageParams).queryKey;
                    queryClient.cancelQueries({ queryKey });

                    // Prefetch the next page with error handling
                    queryClient.prefetchQuery(rolesListQueryOptions(nextPageParams))
                        .catch((error) => {
                            // Only log if not cancelled (cancelled queries are expected during cleanup)
                            if (error.name !== 'AbortError' && !error.message?.includes('cancel')) {
                                console.error(`Failed to prefetch roles page ${nextPage}:`, error);
                            }
                        });
                }
            });
        }

        // Cleanup function to cancel pending prefetches when component unmounts or dependencies change
        return () => {
            // Cancel all pending prefetch queries for next pages
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams: RoleListParams = {
                    ...queryParams,
                    page: nextPage,
                };
                const queryKey = rolesListQueryOptions(nextPageParams).queryKey;
                queryClient.cancelQueries({ queryKey });
            });
        };
    }, [queryParams, data, queryClient]);

    // Extract roles and pagination metadata
    const roles = data?.data ?? [];
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
                <h1 className="text-2xl font-semibold">Roles</h1>
            </div>
            <RolesTable
                data={roles}
                paginationMeta={paginationMeta}
                isLoading={isLoading || isFetching}
            />
        </div>
    )
}

