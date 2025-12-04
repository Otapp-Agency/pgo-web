'use client';

import { Merchant } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconCircleCheckFilled, IconShieldCheck, IconShieldX, IconLoader } from '@tabler/icons-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface MerchantOverviewTabProps {
    merchant: Merchant;
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
        return dateString;
    }
}

export default function MerchantOverviewTab({ merchant }: MerchantOverviewTabProps) {
    const status = (merchant.status || '').toUpperCase();
    const getStatusConfig = () => {
        switch (status) {
            case 'ACTIVE':
                return {
                    variant: 'default' as const,
                    icon: <IconCircleCheckFilled className="mr-1 size-3" />,
                    label: 'Active',
                };
            case 'SUSPENDED':
                return {
                    variant: 'destructive' as const,
                    icon: <span className="mr-1">⚠</span>,
                    label: 'Suspended',
                };
            case 'INACTIVE':
            default:
                return {
                    variant: 'secondary' as const,
                    icon: <span className="mr-1">✕</span>,
                    label: 'Inactive',
                };
        }
    };

    const statusConfig = getStatusConfig();

    const getKycConfig = () => {
        if (merchant.kyc_status) {
            switch (merchant.kyc_status.toUpperCase()) {
                case 'APPROVED':
                case 'VERIFIED':
                    return {
                        variant: 'default' as const,
                        icon: <IconShieldCheck className="mr-1 size-3" />,
                        label: 'Approved',
                    };
                case 'IN_REVIEW':
                case 'PENDING':
                    return {
                        variant: 'outline' as const,
                        icon: <IconLoader className="mr-1 size-3" />,
                        label: 'In Review',
                    };
                case 'REJECTED':
                    return {
                        variant: 'destructive' as const,
                        icon: <IconShieldX className="mr-1 size-3" />,
                        label: 'Rejected',
                    };
                default:
                    break;
            }
        }

        if (merchant.kyc_verified) {
            return {
                variant: 'default' as const,
                icon: <IconShieldCheck className="mr-1 size-3" />,
                label: 'Verified',
            };
        }
        return {
            variant: 'secondary' as const,
            icon: <IconShieldX className="mr-1 size-3" />,
            label: 'Pending',
        };
    };

    const kycConfig = getKycConfig();

    return (
        <div className="flex flex-col gap-4">
            {/* Basic Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Merchant profile details</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Merchant ID</p>
                        <p className="font-mono text-sm">{merchant.id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">UID</p>
                        <p className="font-mono text-sm">{merchant.uid}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Code</p>
                        <p className="font-mono">{merchant.code}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{merchant.name}</p>
                    </div>
                    {merchant.business_name && (
                        <div>
                            <p className="text-sm text-muted-foreground">Business Name</p>
                            <p>{merchant.business_name}</p>
                        </div>
                    )}
                    {merchant.merchant_type && (
                        <div>
                            <p className="text-sm text-muted-foreground">Type</p>
                            <Badge variant="outline">{merchant.merchant_type}</Badge>
                        </div>
                    )}
                    {merchant.merchant_role && (
                        <div>
                            <p className="text-sm text-muted-foreground">Role</p>
                            <Badge variant="outline">{merchant.merchant_role}</Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Status & KYC */}
            <Card>
                <CardHeader>
                    <CardTitle>Status & Verification</CardTitle>
                    <CardDescription>Current status and KYC information</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Status</p>
                        <Badge variant={statusConfig.variant} className="px-2 py-0.5">
                            {statusConfig.icon}
                            {statusConfig.label}
                        </Badge>
                        {merchant.status_reason && (
                            <p className="text-sm text-muted-foreground mt-2">{merchant.status_reason}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">KYC Status</p>
                        <Badge variant={kycConfig.variant} className="px-2 py-0.5">
                            {kycConfig.icon}
                            {kycConfig.label}
                        </Badge>
                        {merchant.kyc_verified_at && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Verified: {formatDate(merchant.kyc_verified_at)}
                            </p>
                        )}
                        {merchant.kyc_notes && (
                            <p className="text-sm text-muted-foreground mt-2">{merchant.kyc_notes}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Contact Information */}
            {(merchant.contact_email || merchant.contact_phone || merchant.website_url) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                        <CardDescription>Merchant contact details</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        {merchant.contact_email && (
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p>{merchant.contact_email}</p>
                            </div>
                        )}
                        {merchant.contact_phone && (
                            <div>
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p>{merchant.contact_phone}</p>
                            </div>
                        )}
                        {merchant.website_url && (
                            <div>
                                <p className="text-sm text-muted-foreground">Website</p>
                                <a href={merchant.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {merchant.website_url}
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Business Information */}
            {(merchant.business_address || merchant.business_city || merchant.business_country) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Business Address</CardTitle>
                        <CardDescription>Registered business location</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {merchant.business_address && <p>{merchant.business_address}</p>}
                            {(merchant.business_city || merchant.business_state || merchant.business_postal_code) && (
                                <p className="text-muted-foreground">
                                    {[merchant.business_city, merchant.business_state, merchant.business_postal_code]
                                        .filter(Boolean)
                                        .join(', ')}
                                </p>
                            )}
                            {merchant.business_country && <p className="text-muted-foreground">{merchant.business_country}</p>}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Transaction Limits */}
            {(merchant.single_transaction_limit || merchant.daily_transaction_limit || merchant.monthly_transaction_limit) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Transaction Limits</CardTitle>
                        <CardDescription>Configured transaction limits</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        {merchant.single_transaction_limit && (
                            <div>
                                <p className="text-sm text-muted-foreground">Single Transaction</p>
                                <p className="font-medium">{merchant.single_transaction_limit}</p>
                            </div>
                        )}
                        {merchant.daily_transaction_limit && (
                            <div>
                                <p className="text-sm text-muted-foreground">Daily Limit</p>
                                <p className="font-medium">{merchant.daily_transaction_limit}</p>
                            </div>
                        )}
                        {merchant.monthly_transaction_limit && (
                            <div>
                                <p className="text-sm text-muted-foreground">Monthly Limit</p>
                                <p className="font-medium">{merchant.monthly_transaction_limit}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Parent Merchant */}
            {merchant.parent_merchant_uid && (
                <Card>
                    <CardHeader>
                        <CardTitle>Parent Merchant</CardTitle>
                        <CardDescription>Associated parent merchant</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <p className="text-sm text-muted-foreground">Parent Merchant</p>
                            <p className="font-medium">{merchant.parent_merchant_name || merchant.parent_merchant_uid}</p>
                            <p className="font-mono text-xs text-muted-foreground mt-1">{merchant.parent_merchant_uid}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Timestamps */}
            <Card>
                <CardHeader>
                    <CardTitle>Timestamps</CardTitle>
                    <CardDescription>Creation and update dates</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    {merchant.created_at && (
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p>{formatDate(merchant.created_at)}</p>
                        </div>
                    )}
                    {merchant.updated_at && (
                        <div>
                            <p className="text-sm text-muted-foreground">Last Updated</p>
                            <p>{formatDate(merchant.updated_at)}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

