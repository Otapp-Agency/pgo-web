'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export function TransactionDetailsSkeleton() {
    const router = useRouter();

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 lg:px-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/transactions')}
                >
                    <IconArrowLeft className="size-4" />
                </Button>
                <div className="flex-1">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 lg:px-6">
                <div className="flex gap-2 mb-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-28" />
                </div>

                {/* Content Cards */}
                <div className="flex flex-col gap-4">
                    {/* Basic Information Card */}
                    <div className="rounded-lg border bg-card p-6">
                        <div className="space-y-4">
                            <div>
                                <Skeleton className="h-6 w-40 mb-1" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Details Card */}
                    <div className="rounded-lg border bg-card p-6">
                        <div className="space-y-4">
                            <div>
                                <Skeleton className="h-6 w-36 mb-1" />
                                <Skeleton className="h-4 w-56" />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-6 w-32" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-6 w-24" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-5 w-40" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Merchant & Gateway Card */}
                    <div className="rounded-lg border bg-card p-6">
                        <div className="space-y-4">
                            <div>
                                <Skeleton className="h-6 w-44 mb-1" />
                                <Skeleton className="h-4 w-72" />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timestamps Card */}
                    <div className="rounded-lg border bg-card p-6">
                        <div className="space-y-4">
                            <div>
                                <Skeleton className="h-6 w-32 mb-1" />
                                <Skeleton className="h-4 w-56" />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
