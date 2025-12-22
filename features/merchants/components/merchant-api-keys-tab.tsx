'use client';

import { useState } from 'react';
import { IconLoader, IconTrash, IconPlus, IconCopy, IconCheck } from '@tabler/icons-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { MerchantApiKey } from '@/lib/definitions';
import { useTRPC } from '@/lib/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MerchantApiKeysTabProps {
    merchantUid: string;
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Never';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
        return dateString;
    }
}

export default function MerchantApiKeysTab({ merchantUid }: MerchantApiKeysTabProps) {
    const [page, setPage] = useState(0);
    const perPage = 15;
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newApiKey, setNewApiKey] = useState<MerchantApiKey | null>(null);
    const [revokingKey, setRevokingKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery(
        trpc.merchants.getApiKeys.queryOptions({
            uid: merchantUid,
            page: page.toString(),
            per_page: perPage.toString()
        })
    );

    const createMutation = useMutation(
        trpc.merchants.createApiKey.mutationOptions({
            onSuccess: (data, variables) => {
                queryClient.invalidateQueries({ queryKey: ['merchant-detail', variables.uid, 'api-keys'] });
                toast.success(data.message || 'API key created successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to create API key');
            },
        })
    );

    const revokeMutation = useMutation(
        trpc.merchants.revokeApiKey.mutationOptions({
            onSuccess: (data, variables) => {
                queryClient.invalidateQueries({ queryKey: ['merchant-detail', variables.uid, 'api-keys'] });
                toast.success(data.message || 'API key revoked successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to revoke API key');
            },
        })
    );

    const apiKeys = data?.data || [];
    const paginationMeta = data ? {
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        last: data.last,
    } : {
        pageNumber: page,
        pageSize: perPage,
        totalElements: 0,
        totalPages: 0,
        last: true,
    };

    const handleCreate = () => {
        createMutation.mutate(
            { uid: merchantUid, body: {} },
            {
                onSuccess: (response) => {
                    setNewApiKey(response.data);
                    setShowCreateDialog(true);
                },
            }
        );
    };

    const handleRevoke = (apiKey: string) => {
        setRevokingKey(apiKey);
    };

    const confirmRevoke = () => {
        if (!revokingKey) return;

        revokeMutation.mutate(
            { uid: merchantUid, apiKey: revokingKey },
            {
                onSuccess: () => {
                    setRevokingKey(null);
                },
            }
        );
    };

    const copyToClipboard = (text: string, type: 'key' | 'secret') => {
        navigator.clipboard.writeText(text);
        setCopiedKey(type === 'key' ? text : `secret-${text}`);
        toast.success(`${type === 'key' ? 'API Key' : 'Secret Key'} copied to clipboard`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>API Keys</CardTitle>
                            <CardDescription>
                                Manage API keys for merchant authentication
                            </CardDescription>
                        </div>
                        <Button onClick={handleCreate} size="sm" disabled={createMutation.isPending}>
                            <IconPlus className="mr-2 h-4 w-4" />
                            Create API Key
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="text-destructive py-8 text-center">
                            {error instanceof Error ? error.message : 'Failed to load API keys'}
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-muted-foreground mb-4">No API keys found</p>
                            <Button onClick={handleCreate} variant="outline" disabled={createMutation.isPending}>
                                <IconPlus className="mr-2 h-4 w-4" />
                                Create First API Key
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>API Key</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Expires</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {apiKeys.map((key: MerchantApiKey) => (
                                            <TableRow key={key.apiKey as string}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <code className="font-mono text-sm">{key.apiKey}</code>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => copyToClipboard(key.apiKey, 'key')}
                                                        >
                                                            {copiedKey === key.apiKey ? (
                                                                <IconCheck className="h-3 w-3 text-green-600" />
                                                            ) : (
                                                                <IconCopy className="h-3 w-3" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={key.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                        {key.status || 'ACTIVE'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(key.expiresAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRevoke(key.apiKey)}
                                                        disabled={revokeMutation.isPending || key.status !== 'ACTIVE'}
                                                    >
                                                        <IconTrash className="h-4 w-4 text-destructive" />
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
                                            size="sm"
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 0 || isLoading}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page + 1)}
                                            disabled={paginationMeta.last || isLoading}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* New API Key Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>API Key Created</DialogTitle>
                        <DialogDescription>
                            Your new API key has been created. Please copy both the API Key and Secret Key.
                            The secret key will only be shown once.
                        </DialogDescription>
                    </DialogHeader>
                    {newApiKey && (
                        <div className="space-y-4">
                            <div>
                                <Label>API Key</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Input
                                        value={newApiKey.apiKey}
                                        readOnly
                                        className="font-mono"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(newApiKey.apiKey, 'key')}
                                    >
                                        {copiedKey === newApiKey.apiKey ? (
                                            <IconCheck className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <IconCopy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            {newApiKey.secretKey && (
                                <div>
                                    <Label>Secret Key</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input
                                            value={newApiKey.secretKey}
                                            readOnly
                                            className="font-mono"
                                            type="password"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(newApiKey.secretKey!, 'secret')}
                                        >
                                            {copiedKey === `secret-${newApiKey.secretKey}` ? (
                                                <IconCheck className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <IconCopy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        ⚠️ Store this secret key securely. It will not be shown again.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => {
                            setShowCreateDialog(false);
                            setNewApiKey(null);
                        }}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke Confirmation Dialog */}
            <Dialog open={!!revokingKey} onOpenChange={(open) => !open && setRevokingKey(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revoke API Key</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to revoke the API key <strong>{revokingKey}</strong>?
                            This action cannot be undone and will immediately disable the key.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRevokingKey(null)}
                            disabled={revokeMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmRevoke}
                            disabled={revokeMutation.isPending}
                        >
                            {revokeMutation.isPending ? (
                                <>
                                    <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                    Revoking...
                                </>
                            ) : (
                                'Revoke'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

