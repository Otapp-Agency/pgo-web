import { requireAnyPermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import TransactionDetails from '@/features/transactions/components/transaction-details';
import { TransactionDetailsSkeleton } from '@/features/transactions/components/transaction-details-skeleton';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

export default async function AdminTransactionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAnyPermission([PERMISSIONS.TRANSACTIONS.VIEW]);
    const { id } = await params;

    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.transactions.getByUid.queryOptions({
            id,
        }),
    );
    void queryClient.prefetchQuery(
        trpc.transactions.processingHistory.queryOptions({
            id,
        }),
    );
    void queryClient.prefetchQuery(
        trpc.transactions.auditTrail.queryOptions({
            id,
        }),
    );

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load transaction details</div>}>
                <Suspense fallback={<TransactionDetailsSkeleton />}>
                    <TransactionDetails transactionId={id} />
                </Suspense>
            </ErrorBoundary>
        </HydrationBoundary>
    );
}

