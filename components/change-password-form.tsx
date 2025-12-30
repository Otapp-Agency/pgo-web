'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { useTRPC } from '@/lib/trpc/client';
import { useMutation } from '@tanstack/react-query';

const ChangePasswordSchema = z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
}).refine((data) => data.current_password !== data.new_password, {
    message: 'New password must be different from current password',
    path: ['new_password'],
});

type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

interface ChangePasswordFormProps {
    className?: string;
    isForced?: boolean; // If true, user is forced to change password before accessing app
    redirectTo?: string;
}

export function ChangePasswordForm({
    className,
    isForced = false,
    redirectTo = '/dashboard',
}: ChangePasswordFormProps) {
    const router = useRouter();
    const trpc = useTRPC();

    const form = useForm<ChangePasswordInput>({
        resolver: zodResolver(ChangePasswordSchema),
        defaultValues: {
            current_password: '',
            new_password: '',
            confirm_password: '',
        },
    });

    const changePasswordMutation = useMutation(trpc.auth.changePassword.mutationOptions({
        onSuccess: (data) => {
            toast.success(data.message || 'Password changed successfully');
            form.reset();
            
            // Redirect after successful password change
            router.push(redirectTo);
        },
        onError: (error: unknown) => {
            const trpcError = error as { message?: string }
            toast.error(trpcError.message || 'Failed to change password');
        },
    }));

    const onSubmit = async (data: ChangePasswordInput) => {
        changePasswordMutation.mutate({
            currentPassword: data.current_password,
            newPassword: data.new_password,
            confirmPassword: data.confirm_password,
        });
    };

    return (
        <div className={cn('flex flex-col gap-6', className)}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        {isForced ? 'Password Change Required' : 'Change Password'}
                    </CardTitle>
                    <CardDescription>
                        {isForced
                            ? 'You must change your password before continuing.'
                            : 'Enter your current password and choose a new one.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="current_password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Enter your current password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="new_password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Enter your new password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                            Must be at least 8 characters with uppercase, lowercase, number, and special character.
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirm_password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Confirm your new password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={changePasswordMutation.isPending}
                                >
                                    {changePasswordMutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Change Password
                                </Button>
                            </div>

                            {!isForced && (
                                <div className="text-center">
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={() => router.back()}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

