'use client';

import { useQuery } from '@tanstack/react-query';
import { TransactionTable } from './transaction-table';
import { TransactionListParams, transactionsKeys, normalizeTransactionParams } from '@/features/transactions/queries/transactions';
import { useTransactionsTableStore } from '@/lib/stores/transactions-table-store';
import { QUERY_CACHE } from '@/lib/config/constants';
import { getTransactionsList } from '@/features/transactions/queries/transactions';

export default function TransactionsList() {
    // Get filter state from store
    const { pagination, sorting, filters } = useTransactionsTableStore();

    // Build query params from store state
    const queryParams: TransactionListParams = {
        // Pagination: convert 0-based pageIndex to 1-based page for API
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        // Server-side filters
        status: filters.status || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        amount_min: filters.amountMin || undefined,
        amount_max: filters.amountMax || undefined,
        search: filters.search || undefined,
        // Sorting: convert TanStack sorting format to API sort format
        sort: sorting.length > 0
            ? sorting.map(s => `${s.id},${s.desc ? 'desc' : 'asc'}`)
            : undefined,
    };

    const normalizedParams = normalizeTransactionParams(queryParams);

    const queryOptions = {
        queryKey: transactionsKeys.list(normalizedParams),
        queryFn: () => getTransactionsList(
            normalizedParams.page,
            normalizedParams.per_page,
            normalizedParams.status,
            normalizedParams.start_date,
            normalizedParams.end_date,
            normalizedParams.amount_min ? Number(normalizedParams.amount_min) : undefined,
            normalizedParams.amount_max ? Number(normalizedParams.amount_max) : undefined,
            normalizedParams.search, normalizedParams.sort),
        staleTime: QUERY_CACHE.STALE_TIME_LIST,
    };

    const { data, isLoading, isFetching } = useQuery(queryOptions);

    // Extract transactions and pagination meta from response
    const transactions = data?.data ?? [];
    const paginationMeta = {
        pageNumber: data?.pageNumber ?? 1,
        pageSize: data?.pageSize ?? pagination.pageSize,
        totalElements: data?.totalElements ?? 0,
        totalPages: data?.totalPages ?? 0,
        last: data?.last ?? true,
        first: data?.first ?? true,
    };

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <TransactionTable
                data={transactions}
                paginationMeta={paginationMeta}
                isLoading={isLoading || isFetching}
            />
        </div>
    );
}
