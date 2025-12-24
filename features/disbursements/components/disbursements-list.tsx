'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { DisbursementTable } from './disbursement-table';
import { useDisbursementsTableStore } from '@/lib/stores/disbursements-table-store';
import { useTRPC } from '@/lib/trpc/client';
import type { PaginatedDisbursementResponse } from '@/lib/definitions';

export default function DisbursementsList() {
    // Get filter and pagination state from store
    const { pagination, sorting, filters } = useDisbursementsTableStore();
    const trpc = useTRPC();

    // Build query params from store state
    // Ensure per_page is at least 1 (protect against corrupted persisted state)
    const queryParams = {
        // Pagination: convert 0-based pageIndex to 1-based page for API
        page: Math.max(1, pagination.pageIndex + 1),
        per_page: Math.max(1, pagination.pageSize || 10),
        // Server-side filters
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.amountMin && { amount_min: filters.amountMin }),
        ...(filters.amountMax && { amount_max: filters.amountMax }),
        ...(filters.search && { search: filters.search }),
        // Sorting: convert TanStack sorting format to API sort format
        ...(sorting.length > 0 && {
            sort: sorting.map(s => `${s.id},${s.desc ? 'desc' : 'asc'}`)
        }),
    };

    // Use useSuspenseQuery for Suspense support
    // Data is guaranteed to be defined - loading/error handled by Suspense/ErrorBoundary
    const queryResult = useSuspenseQuery(
        trpc.disbursements.list.queryOptions(queryParams)
    );

    // Type assertion needed because tRPC types may not be fully inferred in this context
    const data = queryResult.data as PaginatedDisbursementResponse;
    const { isFetching } = queryResult;

    // Extract disbursements and pagination meta from response
    const disbursements = data.data ?? [];
    const paginationMeta = {
        pageNumber: data.pageNumber ?? 1,
        pageSize: data.pageSize ?? pagination.pageSize,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        last: data.last ?? true,
        first: data.first ?? true,
    };

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <DisbursementTable
                data={disbursements}
                paginationMeta={paginationMeta}
                isLoading={isFetching}
            />
        </div>
    );
}
