import { HydrateClient, prefetchPaymentGatewaysList } from '@/features/payment-gateways/queries/server';
import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import PaymentGatewaysList from '@/features/payment-gateways/components/payment-gateways-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { PAYMENT_GATEWAYS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';

export default async function Page() {
  await requirePermission(PERMISSIONS.PAYMENT_GATEWAYS.VIEW);
  await prefetchPaymentGatewaysList();

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load payment gateways</div>}>
        <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2"><TablePageSkeleton rows={10} columns={PAYMENT_GATEWAYS_TABLE_COLUMNS} filterButtons={2} /></div>}>
          <PaymentGatewaysList />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}