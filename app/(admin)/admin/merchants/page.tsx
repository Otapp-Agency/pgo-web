import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import MerchantsList from '@/features/merchants/components/merchants-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { MERCHANTS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';
import { HydrateClient, getQueryClient } from '@/lib/server-query-client';
import { trpc } from '@/lib/trpc/server';

export default async function AdminMerchantsPage() {
  await requirePermission(PERMISSIONS.MERCHANTS.VIEW);
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.merchants.list.queryOptions({}));

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load merchants</div>}>
        <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2"><TablePageSkeleton rows={10} columns={MERCHANTS_TABLE_COLUMNS} filterButtons={3} /></div>}>
          <MerchantsList />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

