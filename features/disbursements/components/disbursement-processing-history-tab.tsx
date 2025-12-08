'use client';

import { useProcessingHistory } from '@/features/disbursements/queries/disbursements';
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
    const { data: history, isLoading, error } = useProcessingHistory(disbursementId);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                        <IconLoader className="size-4 animate-spin" />
                        <span className="text-muted-foreground">Loading processing history...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8">
                    <div className="text-destructive">
                        {error instanceof Error ? error.message : 'Failed to load processing history'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!history || history.length === 0) {
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

    // Sort by timestamp descending (most recent first)
    const sortedHistory = [...history].sort((a, b) => {
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

