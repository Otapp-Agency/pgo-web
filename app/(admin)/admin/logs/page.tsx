import { HydrateClient } from '@/features/logs/queries/server';
import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import LogsList from '@/features/logs/components/logs-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { MERCHANTS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';

export default async function AdminLogsPage() {
  await requirePermission(PERMISSIONS.AUDIT_AND_LOGS.VIEW);

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

