'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconLoader } from '@tabler/icons-react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTRPC } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';
import type { AuditTrailEntry } from '@/lib/definitions';

interface DisbursementAuditTrailTabProps {
    disbursementId: string;
}

function formatDate(dateString: string): string {
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
        return dateString;
    }
}

export default function DisbursementAuditTrailTab({ disbursementId }: DisbursementAuditTrailTabProps) {
    const trpc = useTRPC();
    const { data: auditTrail, isLoading, error } = useQuery(trpc.disbursements.auditTrail.queryOptions({ id: disbursementId }));

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                        <IconLoader className="size-4 animate-spin" />
                        <span className="text-muted-foreground">Loading audit trail...</span>
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
                        {error instanceof Error ? error.message : 'Failed to load audit trail'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Type guard: ensure auditTrail is an array
    if (!auditTrail || !Array.isArray(auditTrail) || auditTrail.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Complete history of changes and actions</CardDescription>
                </CardHeader>
                <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                        No audit trail entries available
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Type assert and sort by timestamp descending (most recent first)
    const auditTrailArray = auditTrail as AuditTrailEntry[];
    const sortedAuditTrail = [...auditTrailArray].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>Complete history of changes and actions performed on this disbursement</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Performed By</TableHead>
                                <TableHead>Field</TableHead>
                                <TableHead>Changes</TableHead>
                                <TableHead>Reason</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAuditTrail.map((entry, index) => (
                                <TableRow key={entry.id ?? `audit-${index}`}>
                                    <TableCell className="font-mono text-xs">
                                        {formatDate(entry.timestamp)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{entry.action}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {entry.performedBy && (
                                                <p className="text-sm">{entry.performedBy}</p>
                                            )}
                                            {entry.performedByUid && (
                                                <p className="text-xs font-mono text-muted-foreground">
                                                    {entry.performedByUid}
                                                </p>
                                            )}
                                            {!entry.performedBy && !entry.performedByUid && (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {entry.field ? (
                                            <span className="font-mono text-xs">{entry.field}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {entry.oldValue && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground">From: </span>
                                                    <span className="text-xs line-through">{entry.oldValue}</span>
                                                </div>
                                            )}
                                            {entry.newValue && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground">To: </span>
                                                    <span className="text-xs">{entry.newValue}</span>
                                                </div>
                                            )}
                                            {!entry.oldValue && !entry.newValue && (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {entry.reason ? (
                                            <p className="text-sm text-muted-foreground">{entry.reason}</p>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

