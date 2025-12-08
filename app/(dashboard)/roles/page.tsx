import { HydrateClient, prefetchRolesList } from '@/features/roles/queries/server';
import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import RolesList from '@/features/roles/components/roles-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { ROLES_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';

export default async function Page() {
    await requirePermission(PERMISSIONS.ROLES.VIEW);
    await prefetchRolesList();

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

