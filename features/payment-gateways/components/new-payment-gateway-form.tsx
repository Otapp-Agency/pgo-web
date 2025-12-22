'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useTRPC } from '@/lib/trpc/client';

// Schema matching tRPC router input
const CreatePaymentGatewaySchema = z.object({
    name: z.string().min(1, 'name is required'),
    code: z.string().min(1, 'code is required'),
    api_base_url_production: z.string().optional(),
    api_base_url_sandbox: z.string().optional(),
    credentials: z
        .record(z.string(), z.string().optional())
        .refine((val) => Object.keys(val).length > 0, {
            message: 'credentials is required and must be an object',
        }),
    supported_methods: z.array(z.string()).min(1, 'supported_methods is required and must be a non-empty array'),
    is_active: z.boolean().optional().default(true),
});

type CreatePaymentGatewayInput = z.infer<typeof CreatePaymentGatewaySchema>;

// Payment method options
const PAYMENT_METHODS = [
    { value: 'MNO' as const, label: 'Mobile Network Operator (MNO)' },
    { value: 'CARD' as const, label: 'Card' },
    { value: 'BANK_TRANSFER' as const, label: 'Bank Transfer' },
] as const;

interface NewPaymentGatewayFormProps {
    onSuccess?: () => void;
}

export function NewPaymentGatewayForm({ onSuccess }: NewPaymentGatewayFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const createPaymentGatewayMutation = useMutation(
        trpc.gateways.create.mutationOptions({
            onSuccess: () => {
                // Invalidate list query to refetch
                queryClient.invalidateQueries({ queryKey: trpc.gateways.list.queryKey() });
            },
        })
    );

    const form = useForm<CreatePaymentGatewayInput>({
        resolver: zodResolver(CreatePaymentGatewaySchema),
        defaultValues: {
            name: '',
            code: '',
            api_base_url_production: '',
            api_base_url_sandbox: '',
            credentials: {
                api_key: '',
                secret_key: '',
                merchant_id: '',
            },
            supported_methods: [],
            is_active: true,
        },
    });

    const onSubmit = async (data: CreatePaymentGatewayInput) => {
        try {
            // Filter out empty credential values
            const cleanedCredentials = Object.fromEntries(
                Object.entries(data.credentials).filter(([_, value]) => value !== '')
            ) as typeof data.credentials;

            const submitData: CreatePaymentGatewayInput = {
                ...data,
                credentials: cleanedCredentials,
            };

            await createPaymentGatewayMutation.mutateAsync(submitData);
            form.reset();
            onSuccess?.();
        } catch {
            // Error is handled by the mutation's onError callback
        }
    };

    const selectedMethods = form.watch('supported_methods');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Selcom" {...field} />
                            </FormControl>
                            <FormDescription>
                                The display name of the payment gateway.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Code</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="e.g., SELCOM"
                                    {...field}
                                    onChange={(e) => {
                                        // Convert to uppercase
                                        field.onChange(e.target.value.toUpperCase());
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                Unique short code for the payment gateway (uppercase letters, numbers, and underscores only).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="api_base_url_production"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Production API URL</FormLabel>
                                <FormControl>
                                    <Input
                                        type="url"
                                        placeholder="https://api.example.com"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="api_base_url_sandbox"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sandbox API URL</FormLabel>
                                <FormControl>
                                    <Input
                                        type="url"
                                        placeholder="https://sandbox.example.com"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                    <FormLabel>Credentials</FormLabel>
                    <FormDescription className="mb-4">
                        Enter the authentication credentials for this payment gateway.
                    </FormDescription>

                    <FormField
                        control={form.control}
                        name="credentials.api_key"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>API Key</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Enter API key" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="credentials.secret_key"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Secret Key</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Enter secret key" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="credentials.merchant_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Merchant ID (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter merchant ID" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Some PSPs require a merchant ID in addition to API credentials.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="supported_methods"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel>Supported Payment Methods</FormLabel>
                                <FormDescription>
                                    Select the payment methods this gateway supports.
                                </FormDescription>
                            </div>
                            {PAYMENT_METHODS.map((method) => (
                                <FormField
                                    key={method.value}
                                    control={form.control}
                                    name="supported_methods"
                                    render={({ field }) => {
                                        return (
                                            <FormItem
                                                key={method.value}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                            >
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(method.value)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...field.value, method.value])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                        (value) => value !== method.value
                                                                    )
                                                                );
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    {method.label}
                                                </FormLabel>
                                            </FormItem>
                                        );
                                    }}
                                />
                            ))}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <FormLabel>Active Status</FormLabel>
                                <FormDescription>
                                    Payment gateway will be available for use when active.
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

                <Button
                    type="submit"
                    className="w-full"
                    disabled={createPaymentGatewayMutation.isPending}
                >
                    {createPaymentGatewayMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Payment Gateway
                </Button>
            </form>
        </Form>
    );
}

