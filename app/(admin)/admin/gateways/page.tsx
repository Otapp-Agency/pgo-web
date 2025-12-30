import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { Suspense } from 'react';
import PaymentGatewaysList from '@/features/payment-gateways/components/payment-gateways-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { PAYMENT_GATEWAYS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';
import { PaymentGatewayErrorBoundary } from '@/components/payment-gateway-error-boundary';
import { HydrateClient, getQueryClient } from '@/lib/server-query-client';
import { trpc } from '@/lib/trpc/server';

export default async function AdminGatewaysPage() {
  await requirePermission(PERMISSIONS.PAYMENT_GATEWAYS.VIEW);

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.gateways.list.queryOptions({}),
  );

  return (
    <HydrateClient>
      <PaymentGatewayErrorBoundary>
        <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2"><TablePageSkeleton rows={10} columns={PAYMENT_GATEWAYS_TABLE_COLUMNS} filterButtons={2} /></div>}>
          <PaymentGatewaysList />
        </Suspense>
      </PaymentGatewayErrorBoundary>
    </HydrateClient>
  );
}

