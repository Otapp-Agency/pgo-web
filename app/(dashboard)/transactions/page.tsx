import { HydrateClient, prefetch, trpc } from '@/lib/trpc/server';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import TransactionsList from '@/features/transactions/components/transactions-list';

export default async function Page() {
  prefetch(trpc.transactions.list.queryOptions());

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<div>Loading...</div>}>
          <TransactionsList />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
