import { HydrateClient, prefetchMerchantDetail } from '@/features/merchants/queries/server';
import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import MerchantDetails from '@/features/merchants/components/merchant-details';
import { PageSkeleton } from '@/components/ui/page-skeleton';

export default async function MerchantDetailPage({
    params,
}: {
    params: Promise<{ uid: string }>;
}) {
    await requirePermission(PERMISSIONS.MERCHANTS.VIEW);
    const { uid } = await params;
    await prefetchMerchantDetail(uid);

    return (
        <HydrateClient>
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load merchant details</div>}>
                <Suspense fallback={<PageSkeleton />}>
                    <MerchantDetails merchantUid={uid} />
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    );
}

