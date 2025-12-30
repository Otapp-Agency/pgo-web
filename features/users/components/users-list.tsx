'use client';

import { useEffect, useMemo } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { UsersTable } from './users-table';
import { NewUserDrawer } from './new-user-drawer';
import { useUsersTableStore } from '@/lib/stores/users-table-store';
import { useTRPC } from '@/lib/trpc/client';
import type { PaginatedUserResponse } from '@/lib/definitions';

export default function UsersList() {
    const queryClient = useQueryClient();
    const { pagination, sorting, columnFilters, setPagination } = useUsersTableStore();
    const trpc = useTRPC();

    // Reset to first page when sorting or filtering changes
    useEffect(() => {
        const currentPagination = useUsersTableStore.getState().pagination;
        setPagination({ ...currentPagination, pageIndex: 0 }); // 0-based for TanStack React Table
    }, [sorting, columnFilters, setPagination]);

    // Convert 0-based pageIndex to 1-based page number for API
    const page = pagination.pageIndex + 1;
    const per_page = pagination.pageSize;

    // Convert sorting state to sort parameter format (e.g., "username,asc,email,desc")
    const sortParams = useMemo(() => {
        if (sorting.length === 0) return undefined;
        return sorting.map(sort => {
            const direction = sort.desc ? 'desc' : 'asc';
            return `${sort.id},${direction}`;
        }).join(',');
    }, [sorting]);

    // Convert column filters to query parameters
    const filterParams = useMemo(() => {
        const params: { role?: string; status?: string } = {};

        columnFilters.forEach(filter => {
            if (filter.id === 'role' && Array.isArray(filter.value)) {
                // For role filter, join multiple values with comma (or use first value)
                // Adjust based on backend API expectations
                params.role = filter.value.join(',');
            } else if (filter.id === 'is_active' && Array.isArray(filter.value)) {
                // Convert status filter values to backend format
                // The filter uses combined values like 'active-unlocked', 'active-locked', etc.
                // Backend might expect different format - adjust as needed
                const statusValues = filter.value as string[];
                if (statusValues.length > 0) {
                    params.status = statusValues.join(',');
                }
            }
        });

        return params;
    }, [columnFilters]);

    // Build query params for tRPC
    const queryParams = useMemo(() => ({
        page: page.toString(),
        per_page: per_page.toString(),
        ...(sortParams && { sort: sortParams }),
        ...filterParams,
    }), [page, per_page, sortParams, filterParams]);

    // Use useSuspenseQuery for Suspense support
    const queryResult = useSuspenseQuery(
        trpc.users.list.queryOptions(queryParams)
    );

    // Type assertion needed because tRPC types may not be fully inferred in this context
    const data = queryResult.data as PaginatedUserResponse;

    // Dynamically prefetch the next pages when page changes
    useEffect(() => {
        if (!data) return;

        const currentPage = data.pageNumber;
        const totalPages = data.totalPages;

        // Prefetch next pages if they exist (1-based pagination)
        const pagesToPrefetch: number[] = [];
        for (let i = 1; i <= 2; i++) {
            const nextPage = currentPage + i;
            if (nextPage <= totalPages) {
                pagesToPrefetch.push(nextPage);
            }
        }

        // Prefetch all next pages in parallel with error handling
        if (pagesToPrefetch.length > 0) {
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams = {
                    ...queryParams,
                    page: nextPage.toString(),
                };

                // Only prefetch if not already in cache
                const cachedData = queryClient.getQueryData(
                    trpc.users.list.queryKey(nextPageParams)
                );

                if (!cachedData) {
                    // Cancel any existing prefetch for this page using query cancellation
                    const queryKey = trpc.users.list.queryKey(nextPageParams);
                    queryClient.cancelQueries({ queryKey });

                    // Prefetch the next page with error handling
                    queryClient.prefetchQuery(trpc.users.list.queryOptions(nextPageParams))
                        .catch((error) => {
                            // Only log if not cancelled (cancelled queries are expected during cleanup)
                            if (error.name !== 'AbortError' && !error.message?.includes('cancel')) {
                                console.error(`Failed to prefetch users page ${nextPage}:`, error);
                            }
                        });
                }
            });
        }

        // Cleanup function to cancel pending prefetches when component unmounts or dependencies change
        return () => {
            // Cancel all pending prefetch queries for next pages
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams = {
                    ...queryParams,
                    page: nextPage.toString(),
                };
                const queryKey = trpc.users.list.queryKey(nextPageParams);
                queryClient.cancelQueries({ queryKey });
            });
        };
    }, [queryParams, data, queryClient, trpc]);

    // Extract users and pagination metadata
    const users = data?.data ?? [];
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
                <h1 className="text-2xl font-semibold">Users</h1>
                <NewUserDrawer />
            </div>
            <UsersTable
                data={users}
                paginationMeta={paginationMeta}
            />
        </div>
    )
}
