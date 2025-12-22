'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useTRPC } from '@/lib/trpc/client';
import { CreateUserSchema, type CreateUserInput } from '@/features/users/utils/user-schemas';

// User type options (from backend enum: ROOT_USER, MERCHANT_USER, SYSTEM_USER)
const USER_TYPES = [
    { value: 'ROOT_USER', label: 'Root User' },
    { value: 'SYSTEM_USER', label: 'System User' },
    { value: 'MERCHANT_USER', label: 'Merchant User' },
] as const;

interface NewUserFormProps {
    onSuccess?: () => void;
}

export function NewUserForm({ onSuccess }: NewUserFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    // Fetch available roles
    const {
        data: rolesData = [],
        isError: rolesError,
        isFetching: rolesFetching,
        refetch: refetchRoles,
    } = useSuspenseQuery(trpc.users.roles.all.queryOptions());
    // Extract role names from Role objects
    const roles = rolesData.map(role => role.name);

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(CreateUserSchema),
        defaultValues: {
            username: '',
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            password_confirmation: '',
            user_type: '',
            role: '',
            is_active: true,
            associated_merchant_id: null,
        },
    });

    const selectedRole = form.watch('role');
    const selectedUserType = form.watch('user_type');

    // Fetch merchant integrator users when role is otapp_client
    const {
        data: merchantIntegrators,
        isLoading: merchantIntegratorsLoading,
        isError: merchantIntegratorsError,
        isFetching: merchantIntegratorsFetching,
        refetch: refetchMerchantIntegrators,
    } = useQuery({
        ...trpc.users.list.queryOptions({
            role: 'merchant_integrator',
            per_page: '100',
        }),
        enabled: selectedRole === 'otapp_client',
    });

    // Fetch merchants when user_type is MERCHANT_USER
    const {
        data: merchantsData,
        isLoading: merchantsLoading,
        isError: merchantsError,
        isFetching: merchantsFetching,
        refetch: refetchMerchants,
    } = useQuery({
        ...trpc.merchants.list.queryOptions({
            page: '0',
            per_page: '100',
        }),
        enabled: selectedUserType === 'MERCHANT_USER',
    });

    // Extract merchants array from paginated response
    const merchants = merchantsData?.data ?? [];

    const createUserMutation = useMutation(
        trpc.users.create.mutationOptions()
    );

    const onSubmit = async (data: CreateUserInput) => {
        try {
            await createUserMutation.mutateAsync({
                username: data.username,
                email: data.email,
                password: data.password,
                password_confirmation: data.password_confirmation,
                user_type: data.user_type,
                first_name: data.first_name,
                last_name: data.last_name,
                role: data.role,
                is_active: data.is_active,
                associated_merchant_id: data.associated_merchant_id ?? null,
            });
            queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() });
            toast.success('User created successfully');
            form.reset();
            onSuccess?.();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create user');
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter first name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter last name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter username" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Enter email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password_confirmation"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Confirm password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="user_type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>User Type</FormLabel>
                            <Select
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    // Clear associated_merchant_id when user type changes away from MERCHANT_USER
                                    if (value !== 'MERCHANT_USER') {
                                        form.setValue('associated_merchant_id', null);
                                    }
                                }}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select user type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {USER_TYPES.map((type) => (
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
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    // Clear associated_merchant_id when role changes
                                    if (value !== 'otapp_client') {
                                        form.setValue('associated_merchant_id', null);
                                    }
                                }}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {rolesError ? (
                                        <div className="px-2 py-1.5 text-sm">
                                            <div className="flex items-center gap-2 text-destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <span>Failed to load roles</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2 h-auto p-1 text-xs"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    refetchRoles();
                                                }}
                                            >
                                                <RefreshCw className="mr-1 h-3 w-3" />
                                                Retry
                                            </Button>
                                        </div>
                                    ) : rolesFetching ? (
                                        <SelectItem value="loading" disabled>
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading roles...
                                            </div>
                                        </SelectItem>
                                    ) : (
                                        roles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {selectedRole === 'otapp_client' && (
                    <FormField
                        control={form.control}
                        name="associated_merchant_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Associated Merchant Integrator</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value ?? undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a merchant integrator" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {merchantIntegratorsError ? (
                                            <div className="px-2 py-1.5 text-sm">
                                                <div className="flex items-center gap-2 text-destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span>Failed to load merchant integrators</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="mt-2 h-auto p-1 text-xs"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        refetchMerchantIntegrators();
                                                    }}
                                                >
                                                    <RefreshCw className="mr-1 h-3 w-3" />
                                                    Retry
                                                </Button>
                                            </div>
                                        ) : merchantIntegratorsLoading || merchantIntegratorsFetching ? (
                                            <SelectItem value="loading" disabled>
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading...
                                                </div>
                                            </SelectItem>
                                        ) : merchantIntegrators?.data && merchantIntegrators.data.length > 0 ? (
                                            merchantIntegrators.data.map((user: { id: string; username: string; email: string }) => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.username} ({user.email})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No merchant integrators available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Select the merchant integrator user this OTApp client will be associated with.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {selectedUserType === 'MERCHANT_USER' && (
                    <FormField
                        control={form.control}
                        name="associated_merchant_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Associated Merchant</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value ?? undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a merchant" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {merchantsError ? (
                                            <div className="px-2 py-1.5 text-sm">
                                                <div className="flex items-center gap-2 text-destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span>Failed to load merchants</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="mt-2 h-auto p-1 text-xs"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        refetchMerchants();
                                                    }}
                                                >
                                                    <RefreshCw className="mr-1 h-3 w-3" />
                                                    Retry
                                                </Button>
                                            </div>
                                        ) : merchantsLoading || merchantsFetching ? (
                                            <SelectItem value="loading" disabled>
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading merchants...
                                                </div>
                                            </SelectItem>
                                        ) : merchants && merchants.length > 0 ? (
                                            merchants.map((merchant: { uid: string; name: string; code?: string }) => (
                                                <SelectItem key={merchant.uid} value={merchant.uid}>
                                                    {merchant.name} {merchant.code ? `(${merchant.code})` : ''}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No merchants available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Select the merchant this user will be associated with. Merchant users must be associated with a sub-merchant.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <FormLabel>Active Status</FormLabel>
                                <FormDescription>
                                    User will be able to log in when active.
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
                    disabled={createUserMutation.isPending}
                >
                    {createUserMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create User
                </Button>
            </form>
        </Form>
    );
}
