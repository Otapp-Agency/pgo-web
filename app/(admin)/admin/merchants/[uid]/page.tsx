import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import MerchantDetails from '@/features/merchants/components/merchant-details';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { HydrateClient, getQueryClient } from '@/lib/server-query-client';
import { trpc } from '@/lib/trpc/server';

export default async function AdminMerchantDetailPage({
    params,
}: {
    params: Promise<{ uid: string }>;
}) {
    await requirePermission(PERMISSIONS.MERCHANTS.VIEW);
    const { uid } = await params;
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.merchants.getByUid.queryOptions({ uid }));

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

