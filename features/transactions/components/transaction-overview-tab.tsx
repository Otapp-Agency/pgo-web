'use client';

import { Transaction } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconCircleCheckFilled, IconCircleX, IconLoader, IconRefresh, IconCheck, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import {
    RefundTransactionDialog,
    CompleteTransactionDialog,
    CancelTransactionDialog,
} from './transaction-action-dialogs';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '@/lib/trpc/client';

interface TransactionOverviewTabProps {
    transaction: Transaction;
    numericId: string;   // The numeric ID required by backend APIs (Long type)
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
        return dateString;
    }
}

function formatAmount(amount: string): string {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numAmount);
}

export default function TransactionOverviewTab({ transaction, numericId }: TransactionOverviewTabProps) {
    const queryClient = useQueryClient();
    const trpc = useTRPC();
    // Use numeric ID for backend API calls that expect Long type
    const { data: canUpdate } = useQuery(
        trpc.transactions.canUpdate.queryOptions({ id: numericId })
    );

    const status = (transaction.status || '').toUpperCase();
    const getStatusConfig = () => {
        switch (status) {
            case 'COMPLETED':
            case 'SUCCESS':
                return {
                    variant: 'default' as const,
                    icon: <IconCircleCheckFilled className="mr-1 size-3" />,
                    label: 'Completed',
                    color: transaction.colorCode || 'bg-green-500',
                };
            case 'FAILED':
            case 'ERROR':
                return {
                    variant: 'destructive' as const,
                    icon: <IconCircleX className="mr-1 size-3" />,
                    label: 'Failed',
                    color: transaction.colorCode || 'bg-red-500',
                };
            case 'PENDING':
                return {
                    variant: 'outline' as const,
                    icon: <IconLoader className="mr-1 size-3 animate-spin" />,
                    label: 'Pending',
                    color: transaction.colorCode || 'bg-yellow-500',
                };
            case 'PROCESSING':
                return {
                    variant: 'outline' as const,
                    icon: <IconLoader className="mr-1 size-3 animate-spin" />,
                    label: 'Processing',
                    color: transaction.colorCode || 'bg-blue-500',
                };
            case 'CANCELLED':
            case 'CANCELED':
                return {
                    variant: 'secondary' as const,
                    icon: <IconX className="mr-1 size-3" />,
                    label: 'Cancelled',
                    color: transaction.colorCode || 'bg-gray-500',
                };
            default:
                return {
                    variant: 'secondary' as const,
                    icon: <span className="mr-1">•</span>,
                    label: status,
                    color: transaction.colorCode || 'bg-gray-500',
                };
        }
    };

    const statusConfig = getStatusConfig();

    const retryMutation = useMutation(
        trpc.transactions.retry.mutationOptions()
    );

    const handleRetryMutation = () => {
        retryMutation.mutate(
            { id: numericId },
            {
                onSuccess: (data) => {
                    // Invalidate all detail queries
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.list.queryKey() });
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.getByUid.queryKey({ id: transaction.uid || transaction.id }) });
                    toast.success(data.message || 'Transaction retry initiated successfully');
                },
                onError: (error) => {
                    toast.error(error.message || 'Failed to retry transaction');
                },
            }
        );
    };

    const formattedAmount = transaction.amount && transaction.currency
        ? `${transaction.currency} ${formatAmount(transaction.amount)}`
        : 'N/A';

    const canRetry = status === 'FAILED' || status === 'ERROR';
    const canRefund = status === 'COMPLETED' || status === 'SUCCESS';
    const canComplete = status === 'PENDING' || status === 'PROCESSING';
    const canCancel = status === 'PENDING' || status === 'PROCESSING';
    const showActions = canRetry || canRefund || canComplete || canCancel;

    return (
        <div className="flex flex-col gap-4">
            {/* Basic Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Transaction identification details</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-sm">{transaction.id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">UID</p>
                        <p className="font-mono text-sm">{transaction.uid}</p>
                    </div>
                    {transaction.internalTransactionId && (
                        <div>
                            <p className="text-sm text-muted-foreground">Internal Transaction ID</p>
                            <p className="font-mono text-sm">{transaction.internalTransactionId}</p>
                        </div>
                    )}
                    {transaction.externalTransactionId && (
                        <div>
                            <p className="text-sm text-muted-foreground">External Transaction ID</p>
                            <p className="font-mono text-sm">{transaction.externalTransactionId}</p>
                        </div>
                    )}
                    {transaction.merchantTransactionId && (
                        <div>
                            <p className="text-sm text-muted-foreground">Merchant Transaction ID</p>
                            <p className="font-mono text-sm">{transaction.merchantTransactionId}</p>
                        </div>
                    )}
                    {transaction.pspTransactionId && (
                        <div>
                            <p className="text-sm text-muted-foreground">PSP Transaction ID</p>
                            <p className="font-mono text-sm">{transaction.pspTransactionId}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>Amount and payment information</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-lg font-semibold">{formattedAmount}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={statusConfig.variant} className="px-2 py-0.5" style={{ backgroundColor: statusConfig.color }}>
                            {statusConfig.icon}
                            {statusConfig.label}
                        </Badge>
                    </div>
                    {transaction.paymentMethod && (
                        <div>
                            <p className="text-sm text-muted-foreground">Payment Method</p>
                            <p>{transaction.paymentMethod}</p>
                        </div>
                    )}
                    {transaction.description && (
                        <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">Description</p>
                            <p>{transaction.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Customer Information */}
            {(transaction.customerName || transaction.customerIdentifier) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Information</CardTitle>
                        <CardDescription>Customer details</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        {transaction.customerName && (
                            <div>
                                <p className="text-sm text-muted-foreground">Customer Name</p>
                                <p>{transaction.customerName}</p>
                            </div>
                        )}
                        {transaction.customerIdentifier && (
                            <div>
                                <p className="text-sm text-muted-foreground">Customer Identifier</p>
                                <p className="font-mono text-sm">{transaction.customerIdentifier}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Merchant & Gateway Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Merchant & Gateway</CardTitle>
                    <CardDescription>Associated merchant and payment gateway</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Merchant ID</p>
                        <p className="font-mono text-sm">{transaction.merchantId}</p>
                    </div>
                    {transaction.merchantName && (
                        <div>
                            <p className="text-sm text-muted-foreground">Merchant Name</p>
                            <p className="font-medium">{transaction.merchantName}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm text-muted-foreground">Payment Gateway</p>
                        <p className="font-medium">{transaction.pgoName || transaction.pgoId}</p>
                        {transaction.pgoId && transaction.pgoName && (
                            <p className="font-mono text-xs text-muted-foreground mt-1">{transaction.pgoId}</p>
                        )}
                    </div>
                    {(transaction.submerchantId || transaction.submerchantName) && (
                        <div>
                            <p className="text-sm text-muted-foreground">Submerchant</p>
                            <p className="font-medium">{transaction.submerchantName || transaction.submerchantId}</p>
                            {transaction.submerchantUid && (
                                <p className="font-mono text-xs text-muted-foreground mt-1">{transaction.submerchantUid}</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Response Information */}
            {(transaction.errorCode || transaction.errorMessage) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Error Information</CardTitle>
                        <CardDescription>Error details if the transaction failed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {transaction.errorCode && (
                            <div>
                                <p className="text-sm text-muted-foreground">Error Code</p>
                                <p className="font-mono text-sm">{transaction.errorCode}</p>
                            </div>
                        )}
                        {transaction.errorMessage && (
                            <div>
                                <p className="text-sm text-muted-foreground">Error Message</p>
                                <p className="text-sm text-destructive">{transaction.errorMessage}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            {showActions && (
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Available actions for this transaction</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {canRetry && canUpdate?.canUpdate && (
                                <Button
                                    variant="outline"
                                    onClick={handleRetryMutation}
                                    disabled={retryMutation.isPending}
                                >
                                    {retryMutation.isPending ? (
                                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <IconRefresh className="mr-2 h-4 w-4" />
                                    )}
                                    Retry
                                </Button>
                            )}                            {canRefund && canUpdate?.canUpdate && (
                                <RefundTransactionDialog
                                    transactionId={numericId}
                                    transactionRef={transaction.uid || transaction.id}
                                    amount={transaction.amount}
                                    currency={transaction.currency}
                                    trigger={
                                        <Button variant="outline">
                                            <IconRefresh className="mr-2 h-4 w-4" />
                                            Refund
                                        </Button>
                                    }
                                />
                            )}
                            {canComplete && canUpdate?.canUpdate && (
                                <CompleteTransactionDialog
                                    transactionId={numericId}
                                    transactionRef={transaction.uid || transaction.id}
                                    amount={transaction.amount}
                                    currency={transaction.currency}
                                    trigger={
                                        <Button variant="outline">
                                            <IconCheck className="mr-2 h-4 w-4" />
                                            Complete
                                        </Button>
                                    }
                                />
                            )}
                            {canCancel && canUpdate?.canUpdate && (
                                <CancelTransactionDialog
                                    transactionId={numericId}
                                    transactionRef={transaction.uid || transaction.id}
                                    amount={transaction.amount}
                                    currency={transaction.currency}
                                    trigger={
                                        <Button variant="outline">
                                            <IconX className="mr-2 h-4 w-4" />
                                            Cancel
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                        {canUpdate && !canUpdate.canUpdate && canUpdate.reason && (
                            <p className="text-sm text-muted-foreground mt-2">{canUpdate.reason}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Timestamps */}
            <Card>
                <CardHeader>
                    <CardTitle>Timestamps</CardTitle>
                    <CardDescription>Creation and update dates</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    {transaction.createdAt && (
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p>{formatDate(transaction.createdAt)}</p>
                        </div>
                    )}
                    {transaction.updatedAt && (
                        <div>
                            <p className="text-sm text-muted-foreground">Last Updated</p>
                            <p>{formatDate(transaction.updatedAt)}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
