'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
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

import {
    disbursementsKeys,
    completeDisbursement,
    cancelDisbursement,
} from '@/features/disbursements/queries/disbursements';

interface DisbursementDialogProps {
    disbursementId: string;
    disbursementRef: string;
    amount?: string;
    currency?: string;
    trigger?: React.ReactNode;
}

/**
 * Dialog for completing a disbursement
 */
export function CompleteDisbursementDialog({
    disbursementId,
    disbursementRef,
    amount,
    currency,
    trigger,
}: DisbursementDialogProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();

    const completeMutation = useMutation({
        mutationFn: () => completeDisbursement(disbursementId, { reason: reason || undefined }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: disbursementsKeys.lists() });
            // Invalidate all detail queries to handle both UID and numeric ID keys
            queryClient.invalidateQueries({ queryKey: disbursementsKeys.details() });
            toast.success(data.message || 'Disbursement completed successfully');
            handleClose();
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to complete disbursement');
        },
    });

    const handleComplete = () => {
        completeMutation.mutate();
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
                    <DialogTitle>Complete Disbursement</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to manually mark this disbursement as complete?
                        {formattedAmount && (
                            <span className="block mt-2 font-semibold text-foreground">
                                Amount: {formattedAmount}
                            </span>
                        )}
                        <span className="block mt-1 font-mono text-xs">
                            Ref: {disbursementRef}
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
                        Complete Disbursement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Dialog for cancelling a disbursement
 */
export function CancelDisbursementDialog({
    disbursementId,
    disbursementRef,
    amount,
    currency,
    trigger,
}: DisbursementDialogProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();

    const cancelMutation = useMutation({
        mutationFn: () => cancelDisbursement(disbursementId, { reason: reason || undefined }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: disbursementsKeys.lists() });
            // Invalidate all detail queries to handle both UID and numeric ID keys
            queryClient.invalidateQueries({ queryKey: disbursementsKeys.details() });
            toast.success(data.message || 'Disbursement cancelled successfully');
            handleClose();
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to cancel disbursement');
        },
    });

    const handleCancel = () => {
        cancelMutation.mutate();
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
                    <DialogTitle>Cancel Disbursement</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel this disbursement? This action cannot be undone.
                        {formattedAmount && (
                            <span className="block mt-2 font-semibold text-foreground">
                                Amount: {formattedAmount}
                            </span>
                        )}
                        <span className="block mt-1 font-mono text-xs">
                            Ref: {disbursementRef}
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
                        Cancel Disbursement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

