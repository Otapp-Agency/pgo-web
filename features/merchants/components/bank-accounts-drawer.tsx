'use client';

import { useState } from 'react';
import { IconLoader, IconTrash, IconEdit, IconBuildingBank, IconPlus } from '@tabler/icons-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';

import { BankAccount } from '@/lib/definitions';
import { useTRPC } from '@/lib/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BankAccountForm } from './bank-account-form';

interface BankAccountsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    merchantUid: string;
    merchantName: string;
}

// Helper function to format date
function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
        return dateString;
    }
}

export function BankAccountsDrawer({ open, onOpenChange, merchantUid, merchantName }: BankAccountsDrawerProps) {
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);

    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();

    const { data: bankAccountsResponse, isLoading } = useQuery(
        trpc.merchants.getBankAccounts.queryOptions({ uid: merchantUid })
    );
    const bankAccounts = (bankAccountsResponse?.data ?? []) as BankAccount[];

    const deactivateMutation = useMutation(
        trpc.merchants.deactivateBankAccount.mutationOptions({
            onSuccess: (data, variables) => {
                queryClient.invalidateQueries({ queryKey: ['bank-accounts', 'list', variables.uid] });
                toast.success(data.message || 'Bank account deactivated successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to deactivate bank account');
            },
        })
    );

    const handleAddNew = () => {
        setEditingAccount(null);
        setShowForm(true);
    };

    const handleEdit = (account: BankAccount) => {
        setEditingAccount(account);
        setShowForm(true);
    };

    const handleDelete = (account: BankAccount) => {
        setDeletingAccount(account);
    };

    const confirmDelete = () => {
        if (!deletingAccount?.uid) return;

        deactivateMutation.mutate(
            { uid: merchantUid, bankAccountUid: deletingAccount.uid },
            {
                onSuccess: () => {
                    setDeletingAccount(null);
                },
            }
        );
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingAccount(null);
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setEditingAccount(null);
    };

    return (
        <>
            <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="h-full max-h-screen">
                    <DrawerHeader className="border-b">
                        <DrawerTitle>Bank Accounts - {merchantName}</DrawerTitle>
                        <DrawerDescription>
                            Manage settlement bank accounts for this merchant.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="flex-1 overflow-y-auto p-4">
                        {showForm ? (
                            <BankAccountForm
                                merchantUid={merchantUid}
                                bankAccount={editingAccount}
                                onSuccess={handleFormSuccess}
                                onCancel={handleFormCancel}
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Bank Accounts</h3>
                                    <Button onClick={handleAddNew} size="sm">
                                        <IconPlus className="mr-2 h-4 w-4" />
                                        Add Bank Account
                                    </Button>
                                </div>

                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : bankAccounts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <IconBuildingBank className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">No bank accounts configured</p>
                                        <Button onClick={handleAddNew} className="mt-4" variant="outline">
                                            <IconPlus className="mr-2 h-4 w-4" />
                                            Add First Bank Account
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Account Name</TableHead>
                                                    <TableHead>Bank</TableHead>
                                                    <TableHead>Account Number</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Primary</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bankAccounts.map((account) => (
                                                    <TableRow key={account.uid}>
                                                        <TableCell className="font-medium">
                                                            {account.account_name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span>{account.bank_name}</span>
                                                                {account.bank_code && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {account.bank_code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {account.account_number}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {account.account_type || 'N/A'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    (account.status === 'ACTIVE' || account.is_active)
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {account.status || (account.is_active ? 'ACTIVE' : 'INACTIVE')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {(account.primary || account.is_primary) && (
                                                                <Badge variant="outline" className="bg-primary/10">
                                                                    Primary
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(account)}
                                                                >
                                                                    <IconEdit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(account)}
                                                                    disabled={deactivateMutation.isPending}
                                                                >
                                                                    <IconTrash className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {bankAccounts.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="text-sm text-muted-foreground">
                                            {bankAccounts.length} bank account{bankAccounts.length !== 1 ? 's' : ''} configured
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </DrawerContent>
            </Drawer>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingAccount} onOpenChange={(open) => !open && setDeletingAccount(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deactivate Bank Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to deactivate the bank account{' '}
                            <strong>{deletingAccount?.account_name}</strong>?
                            This action will mark the account as inactive.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingAccount(null)}
                            disabled={deactivateMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deactivateMutation.isPending}
                        >
                            {deactivateMutation.isPending ? (
                                <>
                                    <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                    Deactivating...
                                </>
                            ) : (
                                'Deactivate'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

