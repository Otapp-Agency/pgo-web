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
import { Separator } from '@/components/ui/separator';

import { CreateMerchantRequestSchema, type CreateMerchantRequest } from '@/lib/definitions';
import { useTRPC } from '@/lib/trpc/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Merchant type options
const MERCHANT_TYPES = [
    { value: 'RETAIL', label: 'Retail' },
    { value: 'TRAVEL', label: 'Travel' },
    { value: 'HOSPITALITY', label: 'Hospitality' },
    { value: 'E_COMMERCE', label: 'E-Commerce' },
    { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
    { value: 'OTHER', label: 'Other' },
] as const;

interface NewSubmerchantFormProps {
    parentMerchantId: number;
    onSuccess?: () => void;
}

export function NewSubmerchantForm({ parentMerchantId, onSuccess }: NewSubmerchantFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const createMerchantMutation = useMutation(
        trpc.merchants.create.mutationOptions({
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: ['merchants', 'list'] });
                queryClient.invalidateQueries({ queryKey: ['merchants', 'getSubMerchants'] });
                toast.success(data.message || 'Sub-merchant created successfully');
            },
            onError: (error) => {
                console.error('Sub-merchant creation error:', error);
                console.error('Error details:', {
                    message: error.message,
                    cause: error.cause,
                    stack: error.stack,
                    data: (error as any).data,
                    shape: (error as any).shape,
                    name: error.name,
                });

                // Extract error message from tRPC error
                let errorMessage = error.message || 'Failed to create sub-merchant';

                // Check if it's the specific parent merchant validation error
                if (errorMessage.includes('Only PLATFORM merchants can be assigned as parents')) {
                    errorMessage = 'Only PLATFORM merchants can be assigned as parents. Please ensure the parent merchant has the PLATFORM role.';
                }

                toast.error(errorMessage);
            },
        })
    );

    const form = useForm<CreateMerchantRequest>({
        resolver: zodResolver(CreateMerchantRequestSchema),
        defaultValues: {
            merchantName: '',
            merchantCode: '',
            businessName: '',
            businessRegistrationNumber: '',
            businessAddress: '',
            businessCity: '',
            businessState: '',
            businessPostalCode: '',
            businessCountry: '',
            contactEmail: '',
            contactPhone: '',
            websiteUrl: '',
            merchantType: 'RETAIL',
            merchantRole: 'SUBMERCHANT',
            parentMerchantId: parentMerchantId,
            singleTransactionLimit: undefined,
            dailyTransactionLimit: undefined,
            monthlyTransactionLimit: undefined,
        },
    });

    const onSubmit = async (data: CreateMerchantRequest) => {
        try {
            // Clean up the data before submission
            const cleanData = {
                ...data,
                websiteUrl: data.websiteUrl || undefined,
                parentMerchantId: parentMerchantId,
            };
            console.log('Submitting sub-merchant creation:', cleanData);
            await createMerchantMutation.mutateAsync(cleanData);
            form.reset({
                merchantName: '',
                merchantCode: '',
                businessName: '',
                businessRegistrationNumber: '',
                businessAddress: '',
                businessCity: '',
                businessState: '',
                businessPostalCode: '',
                businessCountry: '',
                contactEmail: '',
                contactPhone: '',
                websiteUrl: '',
                merchantType: 'RETAIL',
                merchantRole: 'SUBMERCHANT',
                parentMerchantId: parentMerchantId,
                singleTransactionLimit: undefined,
                dailyTransactionLimit: undefined,
                monthlyTransactionLimit: undefined,
            });
            onSuccess?.();
        } catch (error) {
            // Error is handled by the mutation's onError callback
            console.error('Sub-merchant form submission error:', error);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="merchantName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Merchant Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Safari Express Ltd" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="merchantCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Merchant Code *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="SAFEXP123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Business Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Safari Express Company Ltd" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="businessRegistrationNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Business Registration Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="BRN-002356" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="merchantType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Merchant Type *</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {MERCHANT_TYPES.map((type) => (
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

                    <FormField
                        control={form.control}
                        name="parentMerchantId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parent Merchant ID</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        disabled
                                        value={field.value ?? ''}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                        ref={field.ref}
                                    />
                                </FormControl>
                                <FormDescription>
                                    This sub-merchant will be linked to the parent merchant.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="contactEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="info@company.co.tz" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="contactPhone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Phone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+255712345678" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="websiteUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Website URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://www.company.co.tz" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />

                {/* Business Address */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Business Address</h3>

                    <FormField
                        control={form.control}
                        name="businessAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Street Address</FormLabel>
                                <FormControl>
                                    <Input placeholder="Plot 12, Sam Nujoma Road" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="businessCity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Dar es Salaam" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="businessState"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>State/Region</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Kinondoni" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="businessPostalCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Postal Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="14111" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="businessCountry"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Tanzania" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                {/* Transaction Limits */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Transaction Limits</h3>

                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="singleTransactionLimit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Single Transaction</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="250000"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                field.onChange(value ? parseFloat(value) : undefined);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dailyTransactionLimit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Daily Limit</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="1000000"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                field.onChange(value ? parseFloat(value) : undefined);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="monthlyTransactionLimit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monthly Limit</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="5000000"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                field.onChange(value ? parseFloat(value) : undefined);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={createMerchantMutation.isPending}
                >
                    {createMerchantMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Sub-merchant
                </Button>
            </form>
        </Form>
    );
}

