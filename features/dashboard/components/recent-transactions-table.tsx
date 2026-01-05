'use client';

import * as React from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { IconCircleCheckFilled, IconLoader } from '@tabler/icons-react';
import type { RecentActivityItem } from '@/features/dashboard/types';

// Helper function to format amount with currency
function formatAmount(amount: string, currency: string): string {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        return `${currency} 0.00`;
    }
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numAmount);
    return `${currency} ${formatted}`;
}
// Helper function to format date
function formatDate(dateString: string): string {
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
        return dateString;
    }
}

// Helper function to get status badge variant and icon
function getStatusBadge(status: string) {
    const upperStatus = status.toUpperCase();

    if (upperStatus === 'SUCCESS' || upperStatus === 'COMPLETED') {
        return {
            variant: 'default' as const,
            icon: <IconCircleCheckFilled className="mr-1 size-3" />,
            className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
        };
    } else if (upperStatus === 'FAILED') {
        return {
            variant: 'destructive' as const,
            icon: <span className="mr-1">✕</span>,
            className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
        };
    } else if (upperStatus === 'PENDING') {
        return {
            variant: 'secondary' as const,
            icon: <IconLoader className="mr-1 size-3 animate-spin" />,
            className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
        };
    }

    return {
        variant: 'outline' as const,
        icon: null,
        className: '',
    };
}

const columns: ColumnDef<RecentActivityItem>[] = [
    {
        accessorKey: 'uid',
        header: 'Transaction ID',
        cell: ({ row }) => {
            const uid = row.original.uid;
            const truncated = uid.length > 20 ? `${uid.substring(0, 20)}...` : uid;
            return (
                <div className="font-mono text-xs">
                    {truncated}
                </div>
            );
        },
    },
    {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => {
            return (
                <div className="font-semibold">
                    {formatAmount(row.original.amount, row.original.currency)}
                </div>
            );
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const statusBadge = getStatusBadge(row.original.status);
            return (
                <Badge
                    variant={statusBadge.variant}
                    className={statusBadge.className}
                >
                    {statusBadge.icon}
                    {row.original.status}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: ({ row }) => {
            return (
                <div className="text-sm text-muted-foreground">
                    {formatDate(row.original.createdAt)}
                </div>
            );
        },
    },
];

interface RecentTransactionsTableProps {
    data: RecentActivityItem[];
}

export function RecentTransactionsTable({ data }: RecentTransactionsTableProps) {
    "use no memo";
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: 'createdAt', desc: true }, // Sort by most recent first
    ]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: data || [],
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (!data || data.length === 0) {
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No recent transactions
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                            >
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}


