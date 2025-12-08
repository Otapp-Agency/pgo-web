'use client';

import { useRouter } from 'next/navigation';
import React, { Suspense } from 'react'
import { transactionDetailQueryOptions } from '../queries/transactions';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { PageSkeleton } from '@/components/ui/page-skeleton';

type Props = {
    transactionId: string;
}

function TransactionDetails({ transactionId }: Props) {
    const router = useRouter();
    const { data: transaction, isLoading, error } = useQuery(transactionDetailQueryOptions(transactionId));

    return (
        <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load transaction details</div>}>
            <Suspense fallback={<PageSkeleton />}>
                <div>
                    <h1>Transaction Details</h1>
                    <p>Transaction ID: {transactionId}</p>
                    <p>Transaction: {JSON.stringify(transaction)}</p>
                </div>
            </Suspense>
        </ErrorBoundary>
    )
}

export default TransactionDetails