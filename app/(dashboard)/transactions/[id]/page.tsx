import { HydrateClient } from '@/features/disbursements/queries/server';
import { requireAnyPermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import TransactionDetails from '@/features/transactions/components/transaction-details';
import { TransactionDetailsSkeleton } from '@/features/transactions/components/transaction-details-skeleton';
import { prefetchTransactionDetail } from '@/features/transactions/queries/server';

export default async function TransactionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAnyPermission([PERMISSIONS.TRANSACTIONS.VIEW]);
    const { id } = await params;

    await prefetchTransactionDetail(id);

    return (
        <HydrateClient>
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load transaction details</div>}>
                <Suspense fallback={<TransactionDetailsSkeleton />}>
                    <TransactionDetails transactionId={id} />
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    );
}

