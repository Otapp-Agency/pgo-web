'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { TransactionTable } from './transaction-table';
import { useTransactionsTableStore } from '@/lib/stores/transactions-table-store';
import { useTRPC } from '@/lib/trpc/client';
import type { PaginatedTransactionResponse } from '@/lib/definitions';

export default function TransactionsList() {
    // Get filter state from store
    const { pagination, sorting, filters } = useTransactionsTableStore();
    const trpc = useTRPC();

    // Build query params from store state
    const queryParams = {
        // Pagination: convert 0-based pageIndex to 1-based page for API
        page: (pagination.pageIndex + 1).toString(),
        per_page: pagination.pageSize.toString(),
        // Server-side filters
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.amountMin && { amount_min: filters.amountMin }),
        ...(filters.amountMax && { amount_max: filters.amountMax }),
        ...(filters.search && { search: filters.search }),
        // Sorting: convert TanStack sorting format to API sort format
        ...(sorting.length > 0 && {
            sort: sorting.map(s => `${s.id},${s.desc ? 'desc' : 'asc'}`).join(',')
        }),
    };

    // Use useSuspenseQuery for Suspense support
    const queryResult = useSuspenseQuery(
        trpc.transactions.list.queryOptions(queryParams)
    );

    // Type assertion needed because tRPC types may not be fully inferred in this context
    const data = queryResult.data as PaginatedTransactionResponse;
    const { isFetching } = queryResult;

    // Extract transactions and pagination meta from response
    const transactions = data.data ?? [];
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
            <TransactionTable
                data={transactions}
                paginationMeta={paginationMeta}
                isLoading={isFetching}
            />
        </div>
    );
}
