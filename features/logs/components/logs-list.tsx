'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogsTable } from './logs-table';
import { auditLogsListQueryOptions, type AuditLogListParams } from '@/features/logs/queries/logs';
import { useLogsTableStore } from '@/lib/stores/logs-table-store';
import type { AuditLog } from '@/lib/definitions';

export default function LogsList() {
    const queryClient = useQueryClient();
    const { pagination, sorting, columnFilters, setPagination, setSorting, setColumnFilters } = useLogsTableStore();

    // Reset to first page when sorting or filtering changes
    useEffect(() => {
        const currentPagination = useLogsTableStore.getState().pagination;
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

    // Convert column filters to query parameters for audit logs
    const filterParams = useMemo(() => {
        const params: Partial<AuditLogListParams> = {};

        columnFilters.forEach(filter => {
            if (filter.id === 'eventType' && Array.isArray(filter.value)) {
                // For eventType filter, join multiple values with comma
                const eventTypeValues = filter.value as string[];
                if (eventTypeValues.length > 0) {
                    params.eventType = eventTypeValues.join(',');
                }
            } else if (filter.id === 'userUid' && filter.value) {
                params.userUid = filter.value as string;
            } else if (filter.id === 'merchantUid' && filter.value) {
                params.merchantUid = filter.value as string;
            } else if (filter.id === 'search_term' && filter.value) {
                params.search_term = filter.value as string;
            } else if (filter.id === 'startDate' && filter.value) {
                params.startDate = filter.value as string;
            } else if (filter.id === 'endDate' && filter.value) {
                params.endDate = filter.value as string;
            }
        });

        return params;
    }, [columnFilters]);

    // Memoize queryParams to prevent unnecessary re-renders and ensure stable reference
    const queryParams: AuditLogListParams = useMemo(() => ({
        page,
        per_page,
        ...(sortParams.length > 0 && { sort: sortParams }),
        ...filterParams,
    }), [page, per_page, sortParams, filterParams]);

    const { data, isLoading, isFetching } = useQuery(auditLogsListQueryOptions(queryParams));

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
                const nextPageParams: AuditLogListParams = {
                    ...queryParams,
                    page: nextPage,
                };

                // Only prefetch if not already in cache
                const cachedData = queryClient.getQueryData(
                    auditLogsListQueryOptions(nextPageParams).queryKey
                );

                if (!cachedData) {
                    // Cancel any existing prefetch for this page using query cancellation
                    const queryKey = auditLogsListQueryOptions(nextPageParams).queryKey;
                    queryClient.cancelQueries({ queryKey });

                    // Prefetch the next page with error handling
                    queryClient.prefetchQuery(auditLogsListQueryOptions(nextPageParams))
                        .catch((error) => {
                            // Only log if not cancelled (cancelled queries are expected during cleanup)
                            if (error.name !== 'AbortError' && !error.message?.includes('cancel')) {
                                console.error(`Failed to prefetch audit logs page ${nextPage}:`, error);
                            }
                        });
                }
            });
        }

        // Cleanup function to cancel pending prefetches when component unmounts or dependencies change
        return () => {
            // Cancel all pending prefetch queries for next pages
            pagesToPrefetch.forEach((nextPage) => {
                const nextPageParams: AuditLogListParams = {
                    ...queryParams,
                    page: nextPage,
                };
                const queryKey = auditLogsListQueryOptions(nextPageParams).queryKey;
                queryClient.cancelQueries({ queryKey });
            });
        };
    }, [queryParams, data, queryClient]);

    // Extract audit logs and pagination metadata
    const auditLogs = data?.data ?? [];
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
            <LogsTable
                data={auditLogs as unknown as AuditLog[]}
                paginationMeta={paginationMeta}
                isLoading={isLoading || isFetching}
            />
        </div>
    )
}

