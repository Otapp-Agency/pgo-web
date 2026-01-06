import { HydrateClient, getQueryClient } from '@/lib/server-query-client';
import { trpc } from '@/lib/trpc/server';
import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import LogsList from '@/features/logs/components/logs-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { MERCHANTS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';

export default async function Page() {
  await requirePermission(PERMISSIONS.AUDIT_AND_LOGS.VIEW);

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.logs.list.queryOptions({
      page: '0',
      per_page: '15',
    }),
  );

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load audit logs</div>}>
        <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2"><TablePageSkeleton rows={10} columns={MERCHANTS_TABLE_COLUMNS} filterButtons={1} /></div>}>
          <LogsList />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

