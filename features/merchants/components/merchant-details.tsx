'use client';

import { useTRPC } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IconArrowLeft, IconLoader } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import MerchantOverviewTab from './merchant-overview-tab';
import MerchantSubmerchantsTab from './merchant-submerchants-tab';
import MerchantActivityTab from './merchant-activity-tab';
import MerchantBankAccountsTab from './merchant-bank-accounts-tab';
import MerchantApiKeysTab from './merchant-api-keys-tab';

interface MerchantDetailsProps {
    merchantUid: string;
}

export default function MerchantDetails({ merchantUid }: MerchantDetailsProps) {
    const router = useRouter();
    const trpc = useTRPC();
    const { data: merchant, isLoading, error } = useQuery(
        trpc.merchants.getByUid.queryOptions({ uid: merchantUid })
    );

    if (isLoading) {
        return (
            <div className="@container/main flex flex-1 flex-col gap-2 py-2">
                <div className="flex items-center gap-4 px-4 lg:px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/merchants')}
                    >
                        <IconArrowLeft className="size-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <IconLoader className="size-4 animate-spin" />
                        <span className="text-muted-foreground">Loading merchant details...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !merchant) {
        return (
            <div className="@container/main flex flex-1 flex-col gap-2 py-2">
                <div className="flex items-center gap-4 px-4 lg:px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/merchants')}
                    >
                        <IconArrowLeft className="size-4" />
                    </Button>
                    <div className="text-destructive">
                        {error instanceof Error ? error.message : 'Failed to load merchant details'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <div className="flex items-center gap-4 px-4 lg:px-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/merchants')}
                >
                    <IconArrowLeft className="size-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{merchant.name}</h1>
                    <p className="text-muted-foreground">
                        {merchant.code} • {merchant.uid}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="overview" className="flex flex-1 flex-col gap-4 px-4 lg:px-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sub-merchants">Sub-merchants</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
                    <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1">
                    <MerchantOverviewTab merchant={merchant} />
                </TabsContent>

                <TabsContent value="sub-merchants" className="flex-1">
                    <MerchantSubmerchantsTab merchantUid={merchantUid} />
                </TabsContent>

                <TabsContent value="activity" className="flex-1">
                    <MerchantActivityTab merchantUid={merchantUid} />
                </TabsContent>

                <TabsContent value="bank-accounts" className="flex-1">
                    <MerchantBankAccountsTab merchantUid={merchantUid} merchantName={merchant.name} />
                </TabsContent>

                <TabsContent value="api-keys" className="flex-1">
                    <MerchantApiKeysTab merchantUid={merchantUid} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

