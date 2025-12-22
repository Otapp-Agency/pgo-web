'use client';

import { Disbursement } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconCircleCheckFilled, IconCircleX, IconLoader, IconRefresh, IconCheck, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { CompleteDisbursementDialog, CancelDisbursementDialog } from './disbursement-action-dialogs';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '@/lib/trpc/client';

interface DisbursementOverviewTabProps {
    disbursement: Disbursement;
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

export default function DisbursementOverviewTab({ disbursement, numericId }: DisbursementOverviewTabProps) {
    const queryClient = useQueryClient();
    // Use numeric ID for backend API calls that expect Long type
    const trpc = useTRPC();
    const { data: canUpdate } = useQuery(trpc.disbursements.canUpdate.queryOptions({ id: numericId }));

    const status = (disbursement.status || '').toUpperCase();
    const getStatusConfig = () => {
        switch (status) {
            case 'COMPLETED':
            case 'SUCCESS':
                return {
                    variant: 'default' as const,
                    icon: <IconCircleCheckFilled className="mr-1 size-3" />,
                    label: 'Completed',
                    color: disbursement.colorCode || 'bg-green-500',
                };
            case 'FAILED':
            case 'ERROR':
                return {
                    variant: 'destructive' as const,
                    icon: <IconCircleX className="mr-1 size-3" />,
                    label: 'Failed',
                    color: disbursement.colorCode || 'bg-red-500',
                };
            case 'PENDING':
                return {
                    variant: 'outline' as const,
                    icon: <IconLoader className="mr-1 size-3 animate-spin" />,
                    label: 'Pending',
                    color: disbursement.colorCode || 'bg-yellow-500',
                };
            case 'PROCESSING':
                return {
                    variant: 'outline' as const,
                    icon: <IconLoader className="mr-1 size-3 animate-spin" />,
                    label: 'Processing',
                    color: disbursement.colorCode || 'bg-blue-500',
                };
            case 'CANCELLED':
            case 'CANCELED':
                return {
                    variant: 'secondary' as const,
                    icon: <IconX className="mr-1 size-3" />,
                    label: 'Cancelled',
                    color: disbursement.colorCode || 'bg-gray-500',
                };
            default:
                return {
                    variant: 'secondary' as const,
                    icon: <span className="mr-1">•</span>,
                    label: status,
                    color: disbursement.colorCode || 'bg-gray-500',
                };
        }
    };

    const statusConfig = getStatusConfig();

    // Retry mutation
    const retryMutation = useMutation(trpc.disbursements.retry.mutationOptions())

    const handleRetry = () => {
        retryMutation.mutate({ id: numericId }, {
            onSuccess: () => {
                toast.success('Disbursement retry initiated successfully')
                queryClient.invalidateQueries({ queryKey: trpc.disbursements.list.queryKey() });
                queryClient.invalidateQueries({ queryKey: trpc.disbursements.getById.queryKey({ id: numericId }) });
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to retry disbursement')
            },
        })
    }


    const formattedAmount = disbursement.amount && disbursement.currency
        ? `${disbursement.currency} ${formatAmount(disbursement.amount)}`
        : 'N/A';

    const canRetry = status === 'FAILED' || status === 'ERROR';
    const canComplete = status === 'PENDING' || status === 'PROCESSING';
    const canCancel = status === 'PENDING' || status === 'PROCESSING';
    const showActions = canRetry || canComplete || canCancel;

    return (
        <div className="flex flex-col gap-4">
            {/* Basic Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Disbursement identification details</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Disbursement ID</p>
                        <p className="font-mono text-sm">{disbursement.id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">UID</p>
                        <p className="font-mono text-sm">{disbursement.uid}</p>
                    </div>
                    {disbursement.merchantDisbursementId && (
                        <div>
                            <p className="text-sm text-muted-foreground">Merchant Disbursement ID</p>
                            <p className="font-mono text-sm">{disbursement.merchantDisbursementId}</p>
                        </div>
                    )}
                    {disbursement.pspDisbursementId && (
                        <div>
                            <p className="text-sm text-muted-foreground">PSP Disbursement ID</p>
                            <p className="font-mono text-sm">{disbursement.pspDisbursementId}</p>
                        </div>
                    )}
                    {disbursement.sourceTransactionId && (
                        <div>
                            <p className="text-sm text-muted-foreground">Source Transaction ID</p>
                            <p className="font-mono text-sm">{disbursement.sourceTransactionId}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Transaction Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Details</CardTitle>
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
                    {disbursement.disbursementChannel && (
                        <div>
                            <p className="text-sm text-muted-foreground">Channel</p>
                            <p>{disbursement.disbursementChannel}</p>
                        </div>
                    )}
                    {disbursement.description && (
                        <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">Description</p>
                            <p>{disbursement.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recipient Information */}
            {(disbursement.recipientName || disbursement.recipientAccount) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recipient Information</CardTitle>
                        <CardDescription>Disbursement recipient details</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        {disbursement.recipientName && (
                            <div>
                                <p className="text-sm text-muted-foreground">Recipient Name</p>
                                <p>{disbursement.recipientName}</p>
                            </div>
                        )}
                        {disbursement.recipientAccount && (
                            <div>
                                <p className="text-sm text-muted-foreground">Recipient Account</p>
                                <p className="font-mono text-sm">{disbursement.recipientAccount}</p>
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
                        <p className="font-mono text-sm">{disbursement.merchantId}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Payment Gateway</p>
                        <p className="font-medium">{disbursement.pgoName || disbursement.pgoId}</p>
                        {disbursement.pgoId && disbursement.pgoName && (
                            <p className="font-mono text-xs text-muted-foreground mt-1">{disbursement.pgoId}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Response Information */}
            {(disbursement.responseCode || disbursement.responseMessage) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Response Information</CardTitle>
                        <CardDescription>Gateway response details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {disbursement.responseCode && (
                            <div>
                                <p className="text-sm text-muted-foreground">Response Code</p>
                                <p className="font-mono text-sm">{disbursement.responseCode}</p>
                            </div>
                        )}
                        {disbursement.responseMessage && (
                            <div>
                                <p className="text-sm text-muted-foreground">Response Message</p>
                                <p className="text-sm">{disbursement.responseMessage}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Error Information */}
            {(disbursement.errorCode || disbursement.errorMessage) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Error Information</CardTitle>
                        <CardDescription>Error details if the disbursement failed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {disbursement.errorCode && (
                            <div>
                                <p className="text-sm text-muted-foreground">Error Code</p>
                                <p className="font-mono text-sm">{disbursement.errorCode}</p>
                            </div>
                        )}
                        {disbursement.errorMessage && (
                            <div>
                                <p className="text-sm text-muted-foreground">Error Message</p>
                                <p className="text-sm text-destructive">{disbursement.errorMessage}</p>
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
                        <CardDescription>Available actions for this disbursement</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {canRetry && (
                                <Button
                                    variant="outline"
                                    onClick={() => retryMutation.mutate({ id: numericId })}
                                    disabled={retryMutation.isPending}
                                >
                                    {retryMutation.isPending ? (
                                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <IconRefresh className="mr-2 h-4 w-4" />
                                    )}
                                    Retry
                                </Button>
                            )}
                            {canComplete && canUpdate?.canUpdate && (
                                <CompleteDisbursementDialog
                                    disbursementId={numericId}
                                    disbursementRef={disbursement.uid || disbursement.id}
                                    amount={disbursement.amount}
                                    currency={disbursement.currency}
                                    trigger={
                                        <Button variant="outline">
                                            <IconCheck className="mr-2 h-4 w-4" />
                                            Complete
                                        </Button>
                                    }
                                />
                            )}
                            {canCancel && canUpdate?.canUpdate && (
                                <CancelDisbursementDialog
                                    disbursementId={numericId}
                                    disbursementRef={disbursement.uid || disbursement.id}
                                    amount={disbursement.amount}
                                    currency={disbursement.currency}
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
                    {disbursement.createdAt && (
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p>{formatDate(disbursement.createdAt)}</p>
                        </div>
                    )}
                    {disbursement.updatedAt && (
                        <div>
                            <p className="text-sm text-muted-foreground">Last Updated</p>
                            <p>{formatDate(disbursement.updatedAt)}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
