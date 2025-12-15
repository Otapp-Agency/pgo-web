'use client';

import { useDisbursementDetail } from '@/features/disbursements/queries/disbursements';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IconArrowLeft, IconLoader } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import DisbursementOverviewTab from './disbursement-overview-tab';
import DisbursementProcessingHistoryTab from './disbursement-processing-history-tab';
import DisbursementAuditTrailTab from './disbursement-audit-trail-tab';

interface DisbursementDetailsProps {
    disbursementId: string;
}

export default function DisbursementDetails({ disbursementId }: DisbursementDetailsProps) {
    const router = useRouter();
    const { data: disbursement, isLoading, error } = useDisbursementDetail(disbursementId);

    if (isLoading) {
        return (
            <div className="@container/main flex flex-1 flex-col gap-2 py-2">
                <div className="flex items-center gap-4 px-4 lg:px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/disbursements')}
                    >
                        <IconArrowLeft className="size-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <IconLoader className="size-4 animate-spin" />
                        <span className="text-muted-foreground">Loading disbursement details...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !disbursement) {
        return (
            <div className="@container/main flex flex-1 flex-col gap-2 py-2">
                <div className="flex items-center gap-4 px-4 lg:px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/disbursements')}
                    >
                        <IconArrowLeft className="size-4" />
                    </Button>
                    <div className="text-destructive">
                        {error instanceof Error ? error.message : 'Failed to load disbursement details'}
                    </div>
                </div>
            </div>
        );
    }

    const formattedAmount = disbursement.amount && disbursement.currency
        ? `${disbursement.currency} ${parseFloat(disbursement.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'N/A';

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <div className="flex items-center gap-4 px-4 lg:px-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/disbursements')}
                >
                    <IconArrowLeft className="size-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Disbursement Details</h1>
                    <p className="text-muted-foreground">
                        {formattedAmount} • {disbursement.uid || disbursement.id}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="overview" className="flex flex-1 flex-col gap-4 px-4 lg:px-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="processing-history">Processing History</TabsTrigger>
                    <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1">
                    {/* Pass UID for backend API calls */}
                    <DisbursementOverviewTab
                        disbursement={disbursement}
                        numericId={disbursement.uid || disbursement.id}
                    />
                </TabsContent>

                <TabsContent value="processing-history" className="flex-1">
                    {/* Backend now uses UID */}
                    <DisbursementProcessingHistoryTab disbursementId={disbursement.uid || disbursement.id} />
                </TabsContent>

                <TabsContent value="audit-trail" className="flex-1">
                    {/* Backend now uses UID */}
                    <DisbursementAuditTrailTab disbursementId={disbursement.uid || disbursement.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}