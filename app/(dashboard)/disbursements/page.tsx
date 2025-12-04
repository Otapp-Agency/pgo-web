import { HydrateClient, prefetchDisbursementsList, prefetchMonthlyDisbursementSummary } from '@/features/disbursements/queries/server';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import DisbursementsList from '@/features/disbursements/components/disbursements-list';
import { TablePageSkeleton } from '@/components/ui/table-skeleton';
import { DISBURSEMENTS_TABLE_COLUMNS } from '@/components/ui/table-skeleton-presets';
import { requirePermission } from '@/lib/auth/auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { MonthlySummarySection } from '@/features/disbursements/components/monthly-summary-section';
import { StatsSection } from '@/features/disbursements/components/stats-section';
import { SummaryCardsSkeleton } from '@/components/ui/page-skeleton';

export default async function Page() {
  await requirePermission(PERMISSIONS.DISBURSEMENTS.VIEW);

  await Promise.all([
    prefetchDisbursementsList(),
    prefetchMonthlyDisbursementSummary(),
  ]);

  return (
    <HydrateClient>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          {/* Statistics Section */}
          <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load statistics</div>}>
            <Suspense fallback={<div className="px-4 lg:px-6"><SummaryCardsSkeleton cardCount={4} columns={4} /></div>}>
              <StatsSection />
            </Suspense>
          </ErrorBoundary>

          {/* Monthly Transaction Summary Section */}
          <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load monthly summary</div>}>
            <Suspense fallback={<div className="px-4 lg:px-6"><SummaryCardsSkeleton cardCount={4} columns={4} /></div>}>
              <MonthlySummarySection />
            </Suspense>
          </ErrorBoundary>

          {/* Transactions List */}
          <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load transactions</div>}>
            <Suspense fallback={<div className="@container/main flex flex-1 flex-col gap-2 py-2"><TablePageSkeleton rows={10} columns={DISBURSEMENTS_TABLE_COLUMNS} filterButtons={3} /></div>}>
              <DisbursementsList />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </HydrateClient>
  );
}

