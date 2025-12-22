import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import RolesList from '@/features/roles/components/roles-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { ROLES_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';
import { getQueryClient } from '@/lib/trpc/server';
import { trpc } from '@/lib/trpc/server';
import { HydrateClient } from '@/lib/server-query-client';

export default async function Page() {
    await requirePermission(PERMISSIONS.ROLES.VIEW);
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.users.roles.list.queryOptions({
            page: '1',
            per_page: '10',
        }),
    );

    return (
        <HydrateClient>
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load roles</div>}>
                <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2"><TablePageSkeleton rows={10} columns={ROLES_TABLE_COLUMNS} filterButtons={0} /></div>}>
                    <RolesList />
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    );
}

