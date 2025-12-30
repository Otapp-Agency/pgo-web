"use client"

import * as React from "react"
import {
    IconArrowDown,
    IconArrowUp,
    IconArrowsSort,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircleCheckFilled,
    IconDotsVertical,
    IconLayoutColumns,
    IconLoader,
    IconShieldCheck,
    IconShieldX,
    IconTrash,
} from "@tabler/icons-react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    Header,
    useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"

import { useIsMobile } from "@/hooks/use-mobile"
import { Merchant, MerchantSchema } from "@/lib/definitions"
import { useMerchantsTableStore } from "@/lib/stores/merchants-table-store"
import { useTRPC } from '@/lib/trpc/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BankAccountsDrawer } from "./bank-accounts-drawer"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Re-export schema for build compatibility
export const schema = MerchantSchema
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Helper function to format date
function formatDate(dateString: string | null): string {
    if (!dateString) return '-'
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
        return dateString
    }
}

// Helper function to truncate ID
function truncateId(id: string, maxLength: number = 20): string {
    if (!id || id.length <= maxLength) return id
    return `${id.substring(0, maxLength)}...`
}

// Sortable header component
function SortableHeader({
    header,
    children
}: {
    header: Header<Merchant, unknown>
    children: React.ReactNode
}) {
    const canSort = header.column.getCanSort()

    if (!canSort) {
        return <>{children}</>
    }

    return (
        <Button
            variant="ghost"
            className="h-auto p-0 font-semibold hover:bg-transparent"
            onClick={header.column.getToggleSortingHandler()}
        >
            <div className="flex items-center gap-2">
                {children}
                <span className="ml-1">
                    {header.column.getIsSorted() === "desc" ? (
                        <IconArrowDown className="size-4" />
                    ) : header.column.getIsSorted() === "asc" ? (
                        <IconArrowUp className="size-4" />
                    ) : (
                        <IconArrowsSort className="size-4 text-muted-foreground opacity-50" />
                    )}
                </span>
            </div>
        </Button>
    )
}

const columns: ColumnDef<Merchant>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            </div>
        ),
        cell: ({ row }) => (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            </div>
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "id",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Merchant ID
            </SortableHeader>
        ),
        cell: ({ row }) => {
            const merchantId = row.original.id
            const truncatedId = truncateId(merchantId, 20)

            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[180px]">
                                <TableCellViewer item={row.original} displayText={truncatedId} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-mono text-xs max-w-xs break-all">{merchantId}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        enableHiding: false,
        size: 180,
    },
    {
        accessorKey: "code",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Code
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[150px] min-w-[120px]">
                <div className="truncate font-medium font-mono text-sm">{row.original.code || "-"}</div>
            </div>
        ),
        size: 150,
    },
    {
        accessorKey: "name",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Name
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[250px] min-w-[200px]">
                <div className="truncate font-medium">{row.original.name || "-"}</div>
            </div>
        ),
        size: 250,
    },
    {
        accessorKey: "merchant_type",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Type
            </SortableHeader>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
        cell: ({ row }) => (
            <Badge variant="outline" className="px-2 py-0.5 whitespace-nowrap">
                {row.original.merchant_type || "-"}
            </Badge>
        ),
        size: 120,
    },
    {
        accessorKey: "merchant_role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.original.merchant_role
            if (!role) return <span className="text-muted-foreground">-</span>

            const roleColors: Record<string, string> = {
                'ROOT': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
                'PLATFORM': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                'SUBMERCHANT': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                'AGENT': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                'PARTNER': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
            }

            return (
                <Badge variant="outline" className={`px-2 py-0.5 whitespace-nowrap ${roleColors[role] || ''}`}>
                    {role}
                </Badge>
            )
        },
        size: 120,
    },
    {
        accessorKey: "contact_email",
        header: "Email",
        cell: ({ row }) => (
            <div className="max-w-[200px]">
                <div className="truncate text-sm">{row.original.contact_email || "-"}</div>
            </div>
        ),
        size: 200,
    },
    {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, value) => {
            const status = (row.getValue(id) as string).toUpperCase()
            return value.includes(status)
        },
        cell: ({ row }) => {
            const status = (row.original.status || '').toUpperCase()

            // Determine badge variant and display based on status
            const getStatusConfig = () => {
                switch (status) {
                    case 'ACTIVE':
                        return {
                            variant: 'default' as const,
                            icon: <IconCircleCheckFilled className="mr-1 size-3" />,
                            label: 'Active',
                        }
                    case 'SUSPENDED':
                        return {
                            variant: 'destructive' as const,
                            icon: <span className="mr-1">⚠</span>,
                            label: 'Suspended',
                        }
                    case 'INACTIVE':
                    default:
                        return {
                            variant: 'secondary' as const,
                            icon: <span className="mr-1">✕</span>,
                            label: 'Inactive',
                        }
                }
            }

            const config = getStatusConfig()

            return (
                <Badge
                    variant={config.variant}
                    className="px-2 py-0.5 whitespace-nowrap"
                >
                    {config.icon}
                    {config.label}
                </Badge>
            )
        },
        size: 120,
    },
    {
        accessorKey: "kyc_verified",
        header: "KYC",
        filterFn: (row, id, value) => {
            const kycVerified = row.getValue(id) as boolean
            if (value === undefined || value === null) return true
            return value.includes(kycVerified.toString())
        },
        cell: ({ row }) => {
            const kycVerified = row.original.kyc_verified
            const kycStatus = row.original.kyc_status

            // Determine display based on kyc_status if available
            const getKycConfig = () => {
                if (kycStatus) {
                    switch (kycStatus.toUpperCase()) {
                        case 'APPROVED':
                        case 'VERIFIED':
                            return {
                                variant: 'default' as const,
                                icon: <IconShieldCheck className="mr-1 size-3" />,
                                label: 'Approved',
                            }
                        case 'IN_REVIEW':
                        case 'PENDING':
                            return {
                                variant: 'outline' as const,
                                icon: <IconLoader className="mr-1 size-3" />,
                                label: 'In Review',
                            }
                        case 'REJECTED':
                            return {
                                variant: 'destructive' as const,
                                icon: <IconShieldX className="mr-1 size-3" />,
                                label: 'Rejected',
                            }
                        default:
                            break;
                    }
                }

                // Fallback to kycVerified boolean
                if (kycVerified) {
                    return {
                        variant: 'default' as const,
                        icon: <IconShieldCheck className="mr-1 size-3" />,
                        label: 'Verified',
                    }
                }
                return {
                    variant: 'secondary' as const,
                    icon: <IconShieldX className="mr-1 size-3" />,
                    label: 'Pending',
                }
            }

            const config = getKycConfig()

            return (
                <Badge
                    variant={config.variant}
                    className="px-2 py-0.5 whitespace-nowrap"
                >
                    {config.icon}
                    {config.label}
                </Badge>
            )
        },
        size: 120,
    },
    {
        accessorKey: "created_at",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Created
            </SortableHeader>
        ),
        sortingFn: (rowA, rowB) => {
            const dateA = rowA.original.created_at ? new Date(rowA.original.created_at).getTime() : 0
            const dateB = rowB.original.created_at ? new Date(rowB.original.created_at).getTime() : 0
            return dateA - dateB
        },
        cell: ({ row }) => (
            <div className="text-sm whitespace-nowrap">{formatDate(row.original.created_at ?? null)}</div>
        ),
        size: 160,
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionCell merchant={row.original} />,
    },
]

// ActionCell component for merchant actions
interface ActionCellProps {
    merchant: Merchant
}

function ActionCell({ merchant }: ActionCellProps) {
    const router = useRouter()
    const [showStatusDialog, setShowStatusDialog] = React.useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
    const [showBankAccountsDrawer, setShowBankAccountsDrawer] = React.useState(false)
    const [selectedStatus, setSelectedStatus] = React.useState<'ACTIVE' | 'SUSPENDED' | 'INACTIVE'>('ACTIVE')
    const [statusReason, setStatusReason] = React.useState('')

    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const deleteMutation = useMutation(
        trpc.merchants.delete.mutationOptions({
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: trpc.merchants.list.queryKey() });
                toast.success(data.message || 'Merchant deleted successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to delete merchant');
            },
        })
    );

    const updateStatusMutation = useMutation(
        trpc.merchants.updateStatus.mutationOptions({
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: trpc.merchants.list.queryKey() });
                toast.success(data.message || 'Merchant status updated successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to update merchant status');
            },
        })
    );

    const isPending = deleteMutation.isPending || updateStatusMutation.isPending

    const handleDelete = () => {
        if (!merchant.uid) {
            toast.error("Merchant UID is missing, cannot delete.")
            return
        }
        deleteMutation.mutate({ uid: merchant.uid }, {
            onSuccess: () => {
                setShowDeleteDialog(false)
            }
        })
    }

    const handleStatusChange = () => {
        if (!merchant.uid) {
            toast.error("Merchant UID is missing, cannot update status.")
            return
        }
        updateStatusMutation.mutate(
            { uid: merchant.uid, status: selectedStatus, reason: statusReason },
            {
                onSuccess: () => {
                    setShowStatusDialog(false)
                    setStatusReason('')
                }
            }
        )
    }

    const openStatusDialog = (status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE') => {
        setSelectedStatus(status)
        setShowStatusDialog(true)
    }

    // Determine current status for conditional rendering
    const currentStatus = merchant.status?.toUpperCase() || 'ACTIVE'

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                        size="icon"
                        disabled={isPending}
                    >
                        {isPending ? <IconLoader className="size-4 animate-spin" /> : <IconDotsVertical />}
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => merchant.uid && router.push(`/merchants/${merchant.uid}`)}>
                        View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {/* Status Actions */}
                    {currentStatus !== 'ACTIVE' && (
                        <DropdownMenuItem onClick={() => openStatusDialog('ACTIVE')}>
                            Set Active
                        </DropdownMenuItem>
                    )}
                    {currentStatus !== 'SUSPENDED' && (
                        <DropdownMenuItem onClick={() => openStatusDialog('SUSPENDED')}>
                            Suspend
                        </DropdownMenuItem>
                    )}
                    {currentStatus !== 'INACTIVE' && (
                        <DropdownMenuItem onClick={() => openStatusDialog('INACTIVE')}>
                            Set Inactive
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Verify KYC</DropdownMenuItem>
                    <DropdownMenuItem>Manage API Keys</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowBankAccountsDrawer(true)}>
                        View Bank Accounts
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isPending}
                    >
                        <IconTrash className="mr-2 size-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Change Dialog */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Merchant Status</DialogTitle>
                        <DialogDescription>
                            You are about to change the status of <strong>{merchant.name}</strong> to <strong>{selectedStatus}</strong>.
                            Please provide a reason for this change.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Textarea
                                id="reason"
                                placeholder="Enter reason for status change..."
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowStatusDialog(false)}
                            disabled={updateStatusMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStatusChange}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? (
                                <>
                                    <IconLoader className="mr-2 size-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Confirm'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Merchant</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{merchant.name}</strong>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={deleteMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <IconLoader className="mr-2 size-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bank Accounts Drawer */}
            {merchant.uid && (
                <BankAccountsDrawer
                    open={showBankAccountsDrawer}
                    onOpenChange={setShowBankAccountsDrawer}
                    merchantUid={merchant.uid}
                    merchantName={merchant.name}
                />
            )}
        </>
    )
}


interface PaginationMeta {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
}

export function MerchantsTable({
    data,
    paginationMeta,
}: {
    data: Merchant[];
    paginationMeta: PaginationMeta;
}) {
    const {
        pagination: paginationState,
        sorting: sortingState,
        columnFilters: columnFiltersState,
        columnVisibility,
        rowSelection,
        setPagination,
        setSorting,
        setColumnFilters,
        setColumnVisibility,
        setRowSelection,
    } = useMerchantsTableStore()

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting: sortingState,
            columnVisibility,
            rowSelection,
            columnFilters: columnFiltersState,
            pagination: paginationState,
        },
        getRowId: (row) => row.id,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: (updater) => {
            const newSorting = typeof updater === 'function'
                ? updater(sortingState)
                : updater;
            setSorting(newSorting);
        },
        onColumnFiltersChange: (updater) => {
            const newFilters = typeof updater === 'function'
                ? updater(columnFiltersState)
                : updater;
            setColumnFilters(newFilters);
        },
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: (updater) => {
            const newPagination = typeof updater === 'function'
                ? updater(paginationState)
                : updater;
            setPagination(newPagination);
        },
        // Server-side pagination, sorting, and filtering configuration
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: paginationMeta.totalPages,
        getCoreRowModel: getCoreRowModel(),
    })


    // Get unique values for filters
    const statusColumn = table.getColumn("status")
    const typeColumn = table.getColumn("merchant_type")
    const kycColumn = table.getColumn("kyc_verified")

    // Get filter values for badge display
    const statusFilter = statusColumn?.getFilterValue() as string[] | undefined
    const typeFilter = typeColumn?.getFilterValue() as string[] | undefined
    const kycFilter = kycColumn?.getFilterValue() as string[] | undefined

    // Get unique types from data for filter dropdown
    const uniqueTypes = React.useMemo(() => {
        const types = new Set<string>()
        data.forEach(merchant => {
            if (merchant.merchant_type) types.add(merchant.merchant_type)
        })
        return Array.from(types).sort()
    }, [data])

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="flex items-center justify-end gap-2 px-4 lg:px-6 shrink-0">
                {/* Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            Status
                            {statusFilter && statusFilter.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {statusFilter.length}
                                </Badge>
                            )}
                            <IconChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuCheckboxItem
                            checked={!statusFilter || statusFilter.length === 0}
                            onCheckedChange={() => {
                                statusColumn?.setFilterValue(undefined)
                            }}
                        >
                            All Statuses
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={statusFilter?.includes('ACTIVE') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'ACTIVE'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'ACTIVE')
                                    )
                                }
                            }}
                        >
                            Active
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter?.includes('SUSPENDED') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'SUSPENDED'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'SUSPENDED')
                                    )
                                }
                            }}
                        >
                            Suspended
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter?.includes('INACTIVE') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'INACTIVE'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'INACTIVE')
                                    )
                                }
                            }}
                        >
                            Inactive
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Type Filter */}
                {uniqueTypes.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                Type
                                {typeFilter && typeFilter.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {typeFilter.length}
                                    </Badge>
                                )}
                                <IconChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuCheckboxItem
                                checked={!typeFilter || typeFilter.length === 0}
                                onCheckedChange={() => {
                                    typeColumn?.setFilterValue(undefined)
                                }}
                            >
                                All Types
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            {uniqueTypes.map((type) => (
                                <DropdownMenuCheckboxItem
                                    key={type}
                                    checked={(typeColumn?.getFilterValue() as string[] | undefined)?.includes(type) ?? false}
                                    onCheckedChange={(checked) => {
                                        const currentFilter = (typeColumn?.getFilterValue() as string[]) || []
                                        if (checked) {
                                            typeColumn?.setFilterValue([...currentFilter, type])
                                        } else {
                                            typeColumn?.setFilterValue(
                                                currentFilter.filter((v) => v !== type)
                                            )
                                        }
                                    }}
                                >
                                    {type}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* KYC Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            KYC Status
                            {kycFilter && kycFilter.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {kycFilter.length}
                                </Badge>
                            )}
                            <IconChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuCheckboxItem
                            checked={!kycFilter || kycFilter.length === 0}
                            onCheckedChange={() => {
                                kycColumn?.setFilterValue(undefined)
                            }}
                        >
                            All KYC Statuses
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={kycFilter?.includes('true') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = kycFilter || []
                                if (checked) {
                                    kycColumn?.setFilterValue([...currentFilter, 'true'])
                                } else {
                                    kycColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'true')
                                    )
                                }
                            }}
                        >
                            Verified
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={kycFilter?.includes('false') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = kycFilter || []
                                if (checked) {
                                    kycColumn?.setFilterValue([...currentFilter, 'false'])
                                } else {
                                    kycColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'false')
                                    )
                                }
                            }}
                        >
                            Not Verified
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Customize Columns */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <IconLayoutColumns />
                            <span className="hidden lg:inline">Customize Columns</span>
                            <span className="lg:hidden">Columns</span>
                            <IconChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {table
                            .getAllColumns()
                            .filter(
                                (column) =>
                                    typeof column.accessorFn !== "undefined" &&
                                    column.getCanHide()
                            )
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="relative flex flex-col gap-4 px-4 lg:px-6 min-w-0">
                <div className="w-full overflow-x-auto rounded-lg border">
                    <div className="min-w-full inline-block">
                        <Table className="w-full">
                            <TableHeader className="bg-muted sticky top-0 z-10">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return (
                                                <TableHead key={header.id} colSpan={header.colSpan}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody className="**:data-[slot=table-cell]:first:w-8">
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center"
                                        >
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className="flex items-center justify-between px-4 shrink-0">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex min-w-0">
                        {table.getSelectedRowModel().rows.length} of{" "}
                        {paginationMeta.totalElements} row(s) selected.
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit shrink-0">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    const newPageSize = Number(value);
                                    // Reset to first page when changing page size
                                    setPagination({
                                        pageIndex: 0,
                                        pageSize: newPageSize,
                                    });
                                }}
                            >
                                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                    <SelectValue
                                        placeholder={table.getState().pagination.pageSize}
                                    />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 15, 20, 30, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-fit items-center justify-center text-sm font-medium">
                            Page {paginationMeta.pageNumber + 1} of{" "}
                            {paginationMeta.totalPages || 1}
                        </div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => setPagination({ ...paginationState, pageIndex: 0 })}
                                disabled={paginationMeta.first}
                            >
                                <span className="sr-only">Go to first page</span>
                                <IconChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => setPagination({ ...paginationState, pageIndex: paginationState.pageIndex - 1 })}
                                disabled={paginationMeta.first}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <IconChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => setPagination({ ...paginationState, pageIndex: paginationState.pageIndex + 1 })}
                                disabled={paginationMeta.last}
                            >
                                <span className="sr-only">Go to next page</span>
                                <IconChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() => setPagination({ ...paginationState, pageIndex: (paginationMeta.totalPages || 1) - 1 })}
                                disabled={paginationMeta.last}
                            >
                                <span className="sr-only">Go to last page</span>
                                <IconChevronsRight />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


function TableCellViewer({ item, displayText }: { item: Merchant; displayText?: string }) {
    const textToShow = displayText || item.id || "-"
    const isMobile = useIsMobile()

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild>
                <Button variant="link" className="text-foreground w-fit px-0 text-left font-mono text-xs">
                    {textToShow}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="gap-1">
                    <DrawerTitle>Merchant Details</DrawerTitle>
                    <DrawerDescription>
                        Merchant ID: {item.id}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                    {/* Merchant Information Section */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Merchant Information</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ID:</span>
                                <span className="font-mono text-xs">{item.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">UID:</span>
                                <span className="font-mono text-xs">{item.uid}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Code:</span>
                                <span className="font-mono">{item.code}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span>{item.name}</span>
                            </div>
                            {item.merchant_type && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type:</span>
                                    <Badge variant="outline">{item.merchant_type}</Badge>
                                </div>
                            )}
                            {item.contact_email && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span>{item.contact_email}</span>
                                </div>
                            )}
                            {item.contact_phone && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Contact Info:</span>
                                    <span>{item.contact_phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Status Information */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Status</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant={item.status === 'active' ? "default" : "secondary"}>
                                    {item.status === 'active' ? (
                                        <>
                                            <IconCircleCheckFilled className="mr-1 size-3" />
                                            Active
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-1">✕</span>
                                            Inactive
                                        </>
                                    )}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">KYC Verified:</span>
                                <Badge variant={item.kyc_verified ? "default" : "secondary"}>
                                    {item.kyc_verified ? (
                                        <>
                                            <IconShieldCheck className="mr-1 size-3" />
                                            Verified
                                        </>
                                    ) : (
                                        <>
                                            <IconShieldX className="mr-1 size-3" />
                                            Not Verified
                                        </>
                                    )}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Timestamps */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Timestamps</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            {item.created_at && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Created:</span>
                                    <span>{formatDate(item.created_at)}</span>
                                </div>
                            )}
                            {item.updated_at && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Updated:</span>
                                    <span>{formatDate(item.updated_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DrawerFooter className="flex flex-row gap-2">
                    {item.uid && (
                        <Button variant="default" asChild className="flex-1">
                            <Link href={`/merchants/${item.uid}`}>
                                View Complete Details
                            </Link>
                        </Button>
                    )}
                    <DrawerClose asChild>
                        <Button variant="outline" className={item.uid ? "flex-1" : "w-full"}>Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer >
    )
}

