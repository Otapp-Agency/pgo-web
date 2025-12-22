'use client';

import { useRouter } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';
import { TransactionDetailsSkeleton } from './transaction-details-skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import TransactionOverviewTab from './transaction-overview-tab';
import TransactionProcessingHistoryTab from './transaction-processing-history-tab';
import TransactionAuditTrailTab from './transaction-audit-trail-tab';
import { useTRPC } from '@/lib/trpc/client';
import type { Transaction } from '@/lib/definitions';

type Props = {
    transactionId: string;
}

function TransactionDetails({ transactionId }: Props) {
    const router = useRouter();
    const trpc = useTRPC();
    const { data: transactionData, isLoading, error } = useSuspenseQuery(
        trpc.transactions.getByUid.queryOptions({ id: transactionId })
    );

    // Type assertion: useSuspenseQuery data may not be fully typed
    const transaction = transactionData as Transaction;

    if (isLoading) {
        return <TransactionDetailsSkeleton />;
    }

    if (error || !transaction) {
        return (
            <div className="@container/main flex flex-1 flex-col gap-2 py-2">
                <div className="flex items-center gap-4 px-4 lg:px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/transactions')}
                    >
                        <IconArrowLeft className="size-4" />
                    </Button>
                    <div className="text-destructive">
                        {error instanceof Error ? error.message : 'Failed to load transaction details'}
                    </div>
                </div>
            </div>
        );
    }

    const formattedAmount = transaction.amount && transaction.currency
        ? `${transaction.currency} ${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'N/A';

    // The backend API endpoints for processing-history, audit-trail, and can-update
    // require a numeric Long ID. The transaction.id field from the backend response
    // should contain the numeric ID (as a string representation).
    // 
    // If transaction.id is not numeric, it means the backend returned a UID in the id field,
    // which is incorrect. The backend should always return the numeric ID in the id field.
    const transactionUid = transaction.uid || transaction.id;

    if (!transactionUid) {
        return (
            <div className="@container/main flex flex-1 flex-col gap-2 py-2">
                <div className="flex items-center gap-4 px-4 lg:px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/transactions')}
                    >
                        <IconArrowLeft className="size-4" />
                    </Button>
                    <div className="text-destructive">
                        Transaction ID is missing from response
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <div className="flex items-center gap-4 px-4 lg:px-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/transactions')}
                >
                    <IconArrowLeft className="size-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transaction Details</h1>
                    <p className="text-muted-foreground">
                        {formattedAmount} • {transaction.uid || transaction.id}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="overview" className="flex flex-1 flex-col gap-4 px-4 lg:px-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="processing-history">Processing History</TabsTrigger>
                    <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1">
                    {/* Pass UID for backend API calls */}
                    <TransactionOverviewTab
                        transaction={transaction}
                        numericId={transactionUid}
                    />
                </TabsContent>

                <TabsContent value="processing-history" className="flex-1">
                    {/* Backend now uses UID */}
                    <TransactionProcessingHistoryTab transactionId={transactionUid} />
                </TabsContent>

                <TabsContent value="audit-trail" className="flex-1">
                    {/* Backend now uses UID */}
                    <TransactionAuditTrailTab transactionId={transactionUid} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default TransactionDetails
