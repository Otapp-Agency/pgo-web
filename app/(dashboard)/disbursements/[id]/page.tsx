import { HydrateClient, prefetchDisbursementDetail } from '@/features/disbursements/queries/server';
import { requireAnyPermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import DisbursementDetails from '@/features/disbursements/components/disbursement-details';
import { PageSkeleton } from '@/components/ui/page-skeleton';

export default async function DisbursementDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAnyPermission([PERMISSIONS.DISBURSEMENTS.VIEW, PERMISSIONS.TRANSACTIONS.VIEW]);
    const { id } = await params;
    await prefetchDisbursementDetail(id);

    return (
        <HydrateClient>
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load disbursement details</div>}>
                <Suspense fallback={<PageSkeleton />}>
                    <DisbursementDetails disbursementId={id} />
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    );
}

