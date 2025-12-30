import { requireAnyPermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import DisbursementDetails from '@/features/disbursements/components/disbursement-details';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

export default async function MerchantDisbursementDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAnyPermission([PERMISSIONS.DISBURSEMENTS.VIEW, PERMISSIONS.TRANSACTIONS.VIEW]);
    const { id } = await params;

    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.disbursements.getById.queryOptions({
            id,
        }),
    );
    void queryClient.prefetchQuery(
        trpc.disbursements.processingHistory.queryOptions({
            id,
        }),
    );

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load disbursement details</div>}>
                <Suspense fallback={<PageSkeleton />}>
                    <DisbursementDetails disbursementId={id} />
                </Suspense>
            </ErrorBoundary>
    </HydrationBoundary>
    );
}

