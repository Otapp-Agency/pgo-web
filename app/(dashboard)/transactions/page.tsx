import {
    HydrateClient,
    prefetchMonthlyTransactionStats,
    prefetchTransactionsListServer,
} from '@/features/transactions/queries/server';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import TransactionsList from '@/features/transactions/components/transactions-list';
import { MonthlySummarySection } from '@/features/transactions/components/monthly-summary-section';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { TRANSACTIONS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';
import { SummaryCardsSkeleton } from '@/components/ui/page-skeleton';

export default async function Page() {
    // Prefetch both transactions list and monthly summary in parallel
    await Promise.all([
        prefetchTransactionsListServer(),
        prefetchMonthlyTransactionStats(),
    ]);

    return (
        <HydrateClient>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    {/* Monthly Transaction Summary Section */}
                    <ErrorBoundary
                        fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load monthly summary</div>}>
                        <Suspense fallback={<div className="px-4 lg:px-6">
                            <SummaryCardsSkeleton cardCount={4} columns={4} /></div>}>
                            <MonthlySummarySection />
                        </Suspense>
                    </ErrorBoundary>

                    {/* Transactions List */}
                    <ErrorBoundary
                        fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load transactions</div>}>
                        <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2">
                            <TablePageSkeleton rows={10} columns={TRANSACTIONS_TABLE_COLUMNS} filterButtons={3} /></div>}>
                            <TransactionsList />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </div>
        </HydrateClient>
    );
}
