'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconLoader } from '@tabler/icons-react';
import { format } from 'date-fns';
import {
    Timeline,
    TimelineItem,
    TimelineHeader,
    TimelineTime,
    TimelineTitle,
    TimelineDescription,
} from '@/components/timeline';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc/client';
import type { ProcessingHistoryEntry } from '@/lib/definitions';

interface DisbursementProcessingHistoryTabProps {
    disbursementId: string;
}

function formatDate(dateString: string): string {
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
        return dateString;
    }
}

function getStatusBadgeVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('SUCCESS') || upperStatus.includes('COMPLETED')) {
        return 'default';
    }
    if (upperStatus.includes('FAILED') || upperStatus.includes('ERROR')) {
        return 'destructive';
    }
    if (upperStatus.includes('PENDING') || upperStatus.includes('PROCESSING')) {
        return 'outline';
    }
    return 'secondary';
}

export default function DisbursementProcessingHistoryTab({ disbursementId }: DisbursementProcessingHistoryTabProps) {
    const trpc = useTRPC();
    const { data: history } = useSuspenseQuery(trpc.disbursements.processingHistory.queryOptions({
        id: disbursementId,
    }));

    // Type guard: ensure history is an array
    if (!history || !Array.isArray(history) || history.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Processing History</CardTitle>
                    <CardDescription>Timeline of processing events</CardDescription>
                </CardHeader>
                <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                        No processing history available
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Type assert and sort by timestamp descending (most recent first)
    const historyArray = history as ProcessingHistoryEntry[];
    const sortedHistory = [...historyArray].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Processing History</CardTitle>
                <CardDescription>Timeline of processing events and status changes</CardDescription>
            </CardHeader>
            <CardContent>
                <Timeline>
                    {sortedHistory.map((entry, index) => (
                        <TimelineItem key={entry.id ?? `history-${index}`}>
                            <TimelineHeader>
                                <TimelineTime variant={getStatusBadgeVariant(entry.status)}>
                                    {entry.status}
                                </TimelineTime>
                                <TimelineTitle className="text-base font-medium">
                                    {formatDate(entry.timestamp)}
                                    {entry.attemptNumber && (
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            Attempt {entry.attemptNumber}
                                        </span>
                                    )}
                                    {entry.retryCount !== undefined && entry.retryCount !== null && entry.retryCount !== undefined && entry.retryCount > 0 && (
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            Retry {entry.retryCount}
                                        </span>
                                    )}
                                </TimelineTitle>
                            </TimelineHeader>
                            <TimelineDescription>
                                <div className="space-y-1">
                                    {entry.message && (
                                        <p className="text-sm">{entry.message}</p>
                                    )}
                                    {entry.errorCode && (
                                        <p className="text-xs font-mono text-muted-foreground">
                                            Error Code: {entry.errorCode}
                                        </p>
                                    )}
                                    {entry.errorMessage && (
                                        <p className="text-sm text-destructive">{entry.errorMessage}</p>
                                    )}
                                    {entry.processingTime !== undefined && entry.processingTime !== null && (
                                        <p className="text-xs text-muted-foreground">
                                            Processing time: {entry.processingTime}ms
                                        </p>
                                    )}
                                </div>
                            </TimelineDescription>
                        </TimelineItem>
                    ))}
                </Timeline>
            </CardContent>
        </Card>
    );
}

