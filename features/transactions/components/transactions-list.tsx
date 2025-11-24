'use client';

import { useTRPC } from '@/lib/trpc/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { TransactionTable } from './transaction-table';
import { TransactionSchema } from '@/lib/definitions';
import { z } from 'zod';

export default function TransactionsList() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.transactions.list.queryOptions());

    // Validate and parse the data
    const transactions = z.array(TransactionSchema).parse(data);

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <TransactionTable data={transactions} />
        </div>
    )
}