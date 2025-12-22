'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

import { CreateBankAccountRequestSchema, type CreateBankAccountRequest, type BankAccount } from '@/lib/definitions';
import { useTRPC } from '@/lib/trpc/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Account type options
const ACCOUNT_TYPES = [
    { value: 'CURRENT', label: 'Current Account' },
    { value: 'SAVINGS', label: 'Savings Account' },
] as const;

// Status options
const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
] as const;

interface BankAccountFormProps {
    merchantUid: string;
    bankAccount?: BankAccount | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function BankAccountForm({ merchantUid, bankAccount, onSuccess, onCancel }: BankAccountFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const isEditMode = !!bankAccount;

    const createUpdateMutation = useMutation(
        trpc.merchants.createBankAccount.mutationOptions({
            onSuccess: (data, variables) => {
                queryClient.invalidateQueries({ queryKey: trpc.merchants.getBankAccounts.queryKey({ uid: variables.uid }) });
                toast.success(data.message || 'Bank account saved successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to save bank account');
            },
        })
    );

    const form = useForm<CreateBankAccountRequest>({
        resolver: zodResolver(CreateBankAccountRequestSchema),
        defaultValues: bankAccount ? {
            bankAccountUid: bankAccount.uid,
            accountName: bankAccount.account_name,
            bankName: bankAccount.bank_name,
            bankCode: bankAccount.bank_code || '',
            branchCode: bankAccount.branch_code || '',
            accountNumber: bankAccount.account_number,
            accountType: (bankAccount.account_type as 'CURRENT' | 'SAVINGS') || 'CURRENT',
            swiftCode: bankAccount.swift_code || '',
            iban: bankAccount.iban || '',
            bankAddress: bankAccount.bank_address || '',
            primary: bankAccount.primary || bankAccount.is_primary || false,
            status: (bankAccount.status as 'ACTIVE' | 'INACTIVE') || (bankAccount.is_active ? 'ACTIVE' : 'INACTIVE'),
            notes: bankAccount.notes || '',
        } : {
            accountName: '',
            bankName: '',
            bankCode: '',
            branchCode: '',
            accountNumber: '',
            accountType: 'CURRENT',
            swiftCode: '',
            iban: '',
            bankAddress: '',
            primary: false,
            status: 'ACTIVE',
            notes: '',
        },
    });

    const onSubmit = async (data: CreateBankAccountRequest) => {
        try {
            await createUpdateMutation.mutateAsync({
                uid: merchantUid,
                bankAccount: {
                    ...data,
                    bankAccountUid: bankAccount?.uid || '',
                },
            });
            form.reset();
            onSuccess?.();
        } catch {
            // Error is handled by the mutation's onError callback
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="accountName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Safari Express Settlements" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., CRDB Bank" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bankCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Code *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., CRDBTZTZ" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="branchCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Branch Code *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="accountNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Number *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 010038845500" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="accountType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Type *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select account type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ACCOUNT_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                {/* Additional Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Additional Information</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="swiftCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SWIFT Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., CORUTZTZ" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Optional</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="iban"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>IBAN</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., TZ5900100000000140776457" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Optional</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="bankAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bank Address</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="e.g., Ohio Street, Dar es Salaam"
                                        {...field}
                                        value={field.value || ''}
                                        rows={2}
                                    />
                                </FormControl>
                                <FormDescription>Optional</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Settings</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="primary"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Primary Account</FormLabel>
                                        <FormDescription>
                                            Mark this as the primary settlement account
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Additional notes about this bank account"
                                        {...field}
                                        value={field.value || ''}
                                        rows={3}
                                    />
                                </FormControl>
                                <FormDescription>Optional</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={createUpdateMutation.isPending}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={createUpdateMutation.isPending}
                    >
                        {createUpdateMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isEditMode ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            isEditMode ? 'Update Bank Account' : 'Create Bank Account'
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

