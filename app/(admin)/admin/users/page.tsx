import { HydrateClient, getQueryClient } from '@/lib/server-query-client';
import { trpc } from '@/lib/trpc/server';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import UsersList from '@/features/users/components/users-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { USERS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';
import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';

export default async function AdminUsersPage() {
  await requirePermission(PERMISSIONS.USERS.VIEW);

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.users.list.queryOptions({
      page: '1',
      per_page: '15',
    }),
  );

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load users</div>}>
        <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2"><TablePageSkeleton rows={10} columns={USERS_TABLE_COLUMNS} filterButtons={2} /></div>}>
          <UsersList />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

