'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTRPC } from '@/lib/trpc/client';

interface TransactionDialogProps {
    transactionId: string;
    transactionRef: string;
    amount?: string;
    currency?: string;
    trigger?: React.ReactNode;
}

/**
 * Dialog for refunding a transaction
 */
export function RefundTransactionDialog({
    transactionId,
    transactionRef,
    amount,
    currency,
    trigger,
}: TransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    const refundMutation = useMutation(
        trpc.transactions.refund.mutationOptions()
    );

    const handleRefundMutation = () => {
        if (!amount) {
            toast.error('Transaction amount is required for refund');
            return;
        }
        refundMutation.mutate(
            {
                id: transactionId,
                refundAmount: amount,
                reason: reason || undefined,
            },
            {
                onSuccess: (data) => {
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.list.queryKey() });
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.getByUid.queryKey({ id: transactionId }) });
                    toast.success(data.message || 'Transaction refunded successfully');
                    handleClose();
                },
                onError: (error) => {
                    toast.error(error.message || 'Failed to refund transaction');
                },
            }
        );
    };

    const handleRefund = () => {
        handleRefundMutation();
    };

    const handleClose = () => {
        setOpen(false);
        setReason('');
        refundMutation.reset();
    };

    const formattedAmount = amount && currency
        ? `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : null;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                handleClose();
            } else {
                setOpen(true);
            }
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refund
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Refund Transaction</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to refund this transaction?
                        {formattedAmount && (
                            <span className="block mt-2 font-semibold text-foreground">
                                Amount: {formattedAmount}
                            </span>
                        )}
                        <span className="block mt-1 font-mono text-xs">
                            Ref: {transactionRef}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="refund-reason">Reason (optional)</Label>
                    <Textarea
                        id="refund-reason"
                        placeholder="Enter reason for refund..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={refundMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleRefund}
                        disabled={refundMutation.isPending}
                    >
                        {refundMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Refund Transaction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Dialog for completing a transaction
 */
export function CompleteTransactionDialog({
    transactionId,
    transactionRef,
    amount,
    currency,
    trigger,
}: TransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    const completeMutation = useMutation(
        trpc.transactions.complete.mutationOptions()
    );

    const handleCompleteMutation = () => {
        completeMutation.mutate(
            {
                id: transactionId,
                reason: reason || undefined,
            },
            {
                onSuccess: (data) => {
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.list.queryKey() });
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.getByUid.queryKey({ id: transactionId }) });
                    toast.success(data.message || 'Transaction completed successfully');
                    handleClose();
                },
                onError: (error) => {
                    toast.error(error.message || 'Failed to complete transaction');
                },
            }
        );
    };

    const handleComplete = () => {
        handleCompleteMutation();
    };

    const handleClose = () => {
        setOpen(false);
        setReason('');
        completeMutation.reset();
    };

    const formattedAmount = amount && currency
        ? `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : null;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                handleClose();
            } else {
                setOpen(true);
            }
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete Transaction</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to manually mark this transaction as complete?
                        {formattedAmount && (
                            <span className="block mt-2 font-semibold text-foreground">
                                Amount: {formattedAmount}
                            </span>
                        )}
                        <span className="block mt-1 font-mono text-xs">
                            Ref: {transactionRef}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="complete-reason">Reason (optional)</Label>
                    <Textarea
                        id="complete-reason"
                        placeholder="Enter reason for completion..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={completeMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleComplete}
                        disabled={completeMutation.isPending}
                    >
                        {completeMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Complete Transaction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Dialog for cancelling a transaction
 */
export function CancelTransactionDialog({
    transactionId,
    transactionRef,
    amount,
    currency,
    trigger,
}: TransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    const cancelMutation = useMutation(
        trpc.transactions.cancel.mutationOptions()
    );

    const handleCancelMutation = () => {
        cancelMutation.mutate(
            {
                id: transactionId,
                reason: reason || undefined,
            },
            {
                onSuccess: (data) => {
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.list.queryKey() });
                    queryClient.invalidateQueries({ queryKey: trpc.transactions.getByUid.queryKey({ id: transactionId }) });
                    toast.success(data.message || 'Transaction cancelled successfully');
                    handleClose();
                },
                onError: (error) => {
                    toast.error(error.message || 'Failed to cancel transaction');
                },
            }
        );
    };

    const handleCancel = () => {
        handleCancelMutation();
    };

    const handleClose = () => {
        setOpen(false);
        setReason('');
        cancelMutation.reset();
    };

    const formattedAmount = amount && currency
        ? `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : null;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                handleClose();
            } else {
                setOpen(true);
            }
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm">
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancel Transaction</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel this transaction? This action cannot be undone.
                        {formattedAmount && (
                            <span className="block mt-2 font-semibold text-foreground">
                                Amount: {formattedAmount}
                            </span>
                        )}
                        <span className="block mt-1 font-mono text-xs">
                            Ref: {transactionRef}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="cancel-reason">Reason (optional)</Label>
                    <Textarea
                        id="cancel-reason"
                        placeholder="Enter reason for cancellation..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={cancelMutation.isPending}
                    >
                        Go Back
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelMutation.isPending}
                    >
                        {cancelMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Cancel Transaction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

