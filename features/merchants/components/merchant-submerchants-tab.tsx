'use client';

import { useState } from 'react';
import { useSubMerchants } from '@/features/merchants/queries/merchants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { IconLoader, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Merchant } from '@/lib/definitions';

interface MerchantSubmerchantsTabProps {
    merchantUid: string;
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
        return dateString;
    }
}

export default function MerchantSubmerchantsTab({ merchantUid }: MerchantSubmerchantsTabProps) {
    const router = useRouter();
    const [page, setPage] = useState(0);
    const perPage = 15;
    const { data, isLoading, error } = useSubMerchants(merchantUid, page, perPage);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sub-merchants</CardTitle>
                    <CardDescription>Merchants linked to this parent merchant</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <IconLoader className="size-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sub-merchants</CardTitle>
                    <CardDescription>Merchants linked to this parent merchant</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-destructive py-8 text-center">
                        {error instanceof Error ? error.message : 'Failed to load sub-merchants'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const subMerchants = data?.data || [];
    const paginationMeta = data ? {
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        last: data.last,
        first: data.first,
    } : {
        pageNumber: page,
        pageSize: perPage,
        totalElements: 0,
        totalPages: 0,
        last: true,
        first: true,
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sub-merchants</CardTitle>
                <CardDescription>
                    {paginationMeta.totalElements > 0
                        ? `${paginationMeta.totalElements} sub-merchant${paginationMeta.totalElements !== 1 ? 's' : ''} found`
                        : 'No sub-merchants found'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {subMerchants.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        No sub-merchants found for this merchant.
                    </div>
                ) : (
                    <>
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>KYC</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subMerchants.map((merchant: Merchant) => (
                                        <TableRow key={merchant.uid}>
                                            <TableCell className="font-mono text-sm">{merchant.code}</TableCell>
                                            <TableCell className="font-medium">{merchant.name}</TableCell>
                                            <TableCell>
                                                {merchant.merchant_type && (
                                                    <Badge variant="outline">{merchant.merchant_type}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        merchant.status?.toUpperCase() === 'ACTIVE'
                                                            ? 'default'
                                                            : merchant.status?.toUpperCase() === 'SUSPENDED'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {merchant.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={merchant.kyc_verified ? 'default' : 'secondary'}>
                                                    {merchant.kyc_verified ? 'Verified' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(merchant.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/merchants/${merchant.uid}`)}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {paginationMeta.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {paginationMeta.pageNumber + 1} of {paginationMeta.totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setPage(0)}
                                        disabled={paginationMeta.first || isLoading}
                                    >
                                        <IconChevronsLeft className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setPage(page - 1)}
                                        disabled={paginationMeta.first || isLoading}
                                    >
                                        <IconChevronLeft className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setPage(page + 1)}
                                        disabled={paginationMeta.last || isLoading}
                                    >
                                        <IconChevronRight className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setPage(paginationMeta.totalPages - 1)}
                                        disabled={paginationMeta.last || isLoading}
                                    >
                                        <IconChevronsRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

