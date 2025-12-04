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
    IconDownload,
    IconLayoutColumns,
    IconLoader,
} from "@tabler/icons-react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    Header,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useIsMobile } from "@/hooks/use-mobile"
import { Disbursement, DisbursementSchema } from "@/lib/definitions"
import { useDisbursementsTableStore } from "@/lib/stores/disbursements-table-store"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DisbursementFilters } from "@/features/disbursements/components/disbursement-filters"
import { exportDisbursements, ExportFormat } from "@/features/disbursements/queries/export"
import {
    disbursementsKeys,
    retryDisbursement,
} from "@/features/disbursements/queries/disbursements"
import {
    CompleteDisbursementDialog,
    CancelDisbursementDialog,
} from "@/features/disbursements/components/disbursement-action-dialogs"

// Re-export schema for build compatibility
export const schema = DisbursementSchema
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { TableSkeletonRows } from "@/components/ui/table-skeleton"
import { DISBURSEMENTS_TABLE_COLUMNS } from "@/components/ui/table-skeleton-presets"

// Helper function to format amount with currency
function formatAmount(amount: string, currency: string): string {
    const numAmount = parseFloat(amount)
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numAmount)
    return `${currency} ${formatted}`
}

// Helper function to format date
function formatDate(dateString: string): string {
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
        return dateString
    }
}

// Helper function to truncate disbursement ID
function truncateId(id: string, maxLength: number = 20): string {
    if (!id || id.length <= maxLength) return id
    return `${id.substring(0, maxLength)}...`
}

// Sortable header component
function SortableHeader({
    header,
    children
}: {
    header: Header<Disbursement, unknown>
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

// Status-based action visibility helpers
const RETRY_STATUSES = ['FAILED', 'TIMEOUT', 'ERROR', 'RETRY_ATTEMPTED']
const COMPLETE_STATUSES = ['PENDING', 'PROCESSING']
const CANCEL_STATUSES = ['PENDING', 'PROCESSING']

function canRetry(status: string): boolean {
    return RETRY_STATUSES.includes(status.toUpperCase())
}

function canComplete(status: string): boolean {
    return COMPLETE_STATUSES.includes(status.toUpperCase())
}

function canCancel(status: string): boolean {
    return CANCEL_STATUSES.includes(status.toUpperCase())
}

// Actions cell component
function ActionsCell({ disbursement }: { disbursement: Disbursement }) {
    // Use numeric id for API calls
    const disbursementId = disbursement.id
    // Use uid or merchantDisbursementId for display purposes
    const disbursementRef = disbursement.merchantDisbursementId || disbursement.sourceTransactionId || disbursement.uid
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
    const isMobile = useIsMobile()
    const queryClient = useQueryClient()
    const router = useRouter()

    const handleViewDetails = () => {
        // Navigate to detail page using UID if available, otherwise use numeric ID
        const idToUse = disbursement.uid || disbursement.id
        router.push(`/disbursements/${idToUse}`)
    }

    // Retry mutation
    const retryMutation = useMutation({
        mutationFn: () => retryDisbursement(disbursementId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: disbursementsKeys.lists() })
            queryClient.invalidateQueries({ queryKey: disbursementsKeys.detail(disbursementId) })
            toast.success(data.message || 'Disbursement retry initiated successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to retry disbursement')
        },
    })

    const handleRetry = () => {
        retryMutation.mutate()
    }

    // Determine which actions are available based on status
    const status = disbursement.status?.toUpperCase() || ''
    const showRetry = canRetry(status)
    const showComplete = canComplete(status)
    const showCancel = canCancel(status)
    const hasActions = showRetry || showComplete || showCancel

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                        size="icon"
                    >
                        <IconDotsVertical />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={handleViewDetails}>
                        View Details
                    </DropdownMenuItem>

                    {hasActions && <DropdownMenuSeparator />}

                    {showRetry && (
                        <DropdownMenuItem
                            onClick={handleRetry}
                            disabled={retryMutation.isPending}
                        >
                            {retryMutation.isPending ? (
                                <IconLoader className="mr-2 size-4 animate-spin" />
                            ) : null}
                            Retry
                        </DropdownMenuItem>
                    )}

                    {showComplete && (
                        <CompleteDisbursementDialog
                            disbursementId={disbursementId}
                            disbursementRef={disbursementRef}
                            amount={disbursement.amount}
                            currency={disbursement.currency}
                            trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    Complete
                                </DropdownMenuItem>
                            }
                        />
                    )}

                    {showCancel && (showRetry || showComplete) && (
                        <DropdownMenuSeparator />
                    )}

                    {showCancel && (
                        <CancelDisbursementDialog
                            disbursementId={disbursementId}
                            disbursementRef={disbursementRef}
                            amount={disbursement.amount}
                            currency={disbursement.currency}
                            trigger={
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    Cancel
                                </DropdownMenuItem>
                            }
                        />
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <Drawer open={isDetailsOpen} onOpenChange={setIsDetailsOpen} direction={isMobile ? "bottom" : "right"}>
                <DrawerContent>
                    <DrawerHeader className="gap-1">
                        <DrawerTitle>Disbursement Details</DrawerTitle>
                        <DrawerDescription>
                            Disbursement ID: {disbursement.uid}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                        {/* Disbursement IDs Section */}
                        <div className="flex flex-col gap-3">
                            <Label className="text-base font-semibold">Disbursement IDs</Label>
                            <div className="grid gap-2 rounded-lg border p-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">UID:</span>
                                    <span className="font-mono text-xs">{disbursement.uid}</span>
                                </div>
                                {disbursement.merchantDisbursementId && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Merchant:</span>
                                        <span className="font-mono text-xs">{disbursement.merchantDisbursementId}</span>
                                    </div>
                                )}
                                {disbursement.pspDisbursementId && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">PSP:</span>
                                        <span className="font-mono text-xs">{disbursement.pspDisbursementId}</span>
                                    </div>
                                )}
                                {disbursement.sourceTransactionId && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Source Transaction:</span>
                                        <span className="font-mono text-xs">{disbursement.sourceTransactionId}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Amount and Currency */}
                        <div className="flex flex-col gap-3">
                            <Label className="text-base font-semibold">Amount</Label>
                            <div className="text-2xl font-bold">
                                {formatAmount(disbursement.amount, disbursement.currency)}
                            </div>
                        </div>

                        <Separator />

                        {/* Recipient Information */}
                        <div className="flex flex-col gap-3">
                            <Label className="text-base font-semibold">Recipient Information</Label>
                            <div className="grid gap-2 rounded-lg border p-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name:</span>
                                    <span>{disbursement.recipientName || "-"}</span>
                                </div>
                                {disbursement.recipientAccount && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Account:</span>
                                        <span>{disbursement.recipientAccount}</span>
                                    </div>
                                )}
                                {disbursement.disbursementChannel && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Channel:</span>
                                        <span>{disbursement.disbursementChannel}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Status */}
                        <div className="flex flex-col gap-3">
                            <Label className="text-base font-semibold">Status</Label>
                            <Badge
                                variant="outline"
                                className="w-fit px-3 py-1"
                                style={{
                                    backgroundColor: `${disbursement.colorCode}20`,
                                    borderColor: disbursement.colorCode,
                                    color: disbursement.colorCode,
                                }}
                            >
                                {disbursement.status === "SUCCESS" || disbursement.status === "COMPLETED" ? (
                                    <IconCircleCheckFilled className="mr-2 size-4" />
                                ) : disbursement.status === "FAILED" ? (
                                    <span className="mr-2">✕</span>
                                ) : (
                                    <IconLoader className="mr-2 size-4" />
                                )}
                                {disbursement.status}
                            </Badge>
                        </div>

                        <Separator />

                        {/* Merchant Information */}
                        <div className="flex flex-col gap-3">
                            <Label className="text-base font-semibold">Merchant Information</Label>
                            <div className="grid gap-2 rounded-lg border p-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Merchant ID:</span>
                                    <span className="font-mono text-xs">{disbursement.merchantId}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* PGO Information */}
                        <div className="flex flex-col gap-3">
                            <Label className="text-base font-semibold">Payment Gateway</Label>
                            <div className="rounded-lg border p-3">
                                <div className="font-medium">{disbursement.pgoName}</div>
                            </div>
                        </div>

                        {/* Error Information */}
                        {(disbursement.status === "FAILED" || disbursement.errorCode || disbursement.errorMessage || disbursement.description) && (
                            <>
                                <Separator />
                                <div className="flex flex-col gap-3">
                                    <Label className="text-base font-semibold text-destructive">Error Information</Label>
                                    <div className="grid gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                        {disbursement.errorCode && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Error Code:</span>
                                                <span className="font-medium text-destructive">{disbursement.errorCode}</span>
                                            </div>
                                        )}
                                        {disbursement.errorMessage && (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground">Error Message:</span>
                                                <span className="text-destructive">{disbursement.errorMessage}</span>
                                            </div>
                                        )}
                                        {disbursement.description && (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground">Description:</span>
                                                <span>{disbursement.description}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Timestamps */}
                        <div className="flex flex-col gap-3">
                            <Label className="text-base font-semibold">Timestamps</Label>
                            <div className="grid gap-2 rounded-lg border p-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Created:</span>
                                    <span>{formatDate(disbursement.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Updated:</span>
                                    <span>{formatDate(disbursement.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    )
}

const columns: ColumnDef<Disbursement>[] = [
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
        accessorKey: "uid",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Disbursement ID
            </SortableHeader>
        ),
        cell: ({ row }) => {
            const uid = row.original.uid
            const truncatedId = truncateId(uid, 20)

            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[180px]">
                                <Link
                                    href={`/disbursements/${uid}`}
                                    className="text-foreground hover:underline font-mono text-xs"
                                >
                                    {truncatedId}
                                </Link>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-mono text-xs max-w-xs break-all">{uid}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        enableHiding: false,
        size: 180,
    },
    {
        accessorKey: "recipientName",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Recipient
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[200px] min-w-[150px]">
                <div className="truncate font-medium">{row.original.recipientName || "-"}</div>
                {row.original.recipientAccount && (
                    <div className="text-muted-foreground truncate text-xs">
                        {row.original.recipientAccount}
                    </div>
                )}
            </div>
        ),
        size: 200,
    },
    {
        accessorKey: "amount",
        header: ({ header }) => (
            <div className="w-full text-right">
                <SortableHeader header={header}>
                    Amount
                </SortableHeader>
            </div>
        ),
        sortingFn: (rowA, rowB) => {
            const amountA = parseFloat(rowA.original.amount)
            const amountB = parseFloat(rowB.original.amount)
            return amountA - amountB
        },
        cell: ({ row }) => (
            <div className="text-right font-medium whitespace-nowrap">
                {formatAmount(row.original.amount, row.original.currency)}
            </div>
        ),
        size: 140,
    },
    {
        accessorKey: "status",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Status
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <Badge
                variant="outline"
                className="px-2 py-0.5 whitespace-nowrap"
                style={{
                    backgroundColor: `${row.original.colorCode}20`,
                    borderColor: row.original.colorCode,
                    color: row.original.colorCode,
                }}
            >
                {row.original.status === "SUCCESS" || row.original.status === "COMPLETED" ? (
                    <IconCircleCheckFilled className="mr-1 size-3" />
                ) : row.original.status === "FAILED" ? (
                    <span className="mr-1">✕</span>
                ) : (
                    <IconLoader className="mr-1 size-3" />
                )}
                {row.original.status}
            </Badge>
        ),
        size: 120,
    },
    {
        accessorKey: "pgoName",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Payment Gateway
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[150px] min-w-[120px] truncate">{row.original.pgoName || "-"}</div>
        ),
        size: 150,
    },
    {
        accessorKey: "createdAt",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Created
            </SortableHeader>
        ),
        sortingFn: (rowA, rowB) => {
            const dateA = new Date(rowA.original.createdAt).getTime()
            const dateB = new Date(rowB.original.createdAt).getTime()
            return dateA - dateB
        },
        cell: ({ row }) => (
            <div className="text-sm whitespace-nowrap">{formatDate(row.original.createdAt)}</div>
        ),
        size: 160,
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell disbursement={row.original} />,
    },
]


interface PaginationMeta {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
}

export function DisbursementTable({
    data,
    paginationMeta,
    isLoading = false,
}: {
    data: Disbursement[];
    paginationMeta: PaginationMeta;
    isLoading?: boolean;
}) {
    const router = useRouter()
    // Get state from Zustand store
    const {
        pagination,
        sorting,
        columnVisibility,
        rowSelection,
        filters,
        setPageIndex,
        setPageSize,
        setSorting,
        setColumnVisibility,
        setRowSelection,
    } = useDisbursementsTableStore()

    const handleRowClick = (disbursement: Disbursement) => {
        // Navigate to detail page using UID if available, otherwise use numeric ID
        const idToUse = disbursement.uid || disbursement.id
        router.push(`/disbursements/${idToUse}`)
    }

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
        },
        getRowId: (row) => row.uid,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        // Server-side pagination - don't use client-side models
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: paginationMeta.totalPages,
    })

    // Export handler using store filters
    const handleExport = React.useCallback(async (format: ExportFormat) => {
        try {
            // Build export params from store filters
            const exportParams: Parameters<typeof exportDisbursements>[0] = {
                format,
            }

            // Add filters from store
            if (filters.status) {
                exportParams.status = filters.status
            }
            if (filters.startDate) {
                exportParams.start_date = filters.startDate
            }
            if (filters.endDate) {
                exportParams.end_date = filters.endDate
            }
            if (filters.amountMin) {
                exportParams.amount_min = filters.amountMin
            }
            if (filters.amountMax) {
                exportParams.amount_max = filters.amountMax
            }
            if (filters.search) {
                exportParams.search = filters.search
            }

            await exportDisbursements(exportParams)
            toast.success(`Exporting disbursements as ${format.toUpperCase()}...`)
        } catch (error) {
            console.error('Export error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to export disbursements')
        }
    }, [filters])

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 lg:px-6 shrink-0">
                {/* Server-side Filters */}
                <DisbursementFilters />

                <div className="flex items-center gap-2">
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

                    {/* Export */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <IconDownload />
                                <span className="hidden lg:inline">Export</span>
                                <IconChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleExport('csv')}>
                                Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('excel')}>
                                Export as Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
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
                                {isLoading ? (
                                    <TableSkeletonRows rows={10} columns={DISBURSEMENTS_TABLE_COLUMNS} />
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={(e) => {
                                                // Don't navigate if clicking on action buttons or checkboxes
                                                const target = e.target as HTMLElement
                                                if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('[role="menuitem"]')) {
                                                    return
                                                }
                                                handleRowClick(row.original)
                                            }}
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
                <div className="flex items-center justify-between px-4 flex-shrink-0">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex min-w-0">
                        {Object.keys(rowSelection).length} of{" "}
                        {paginationMeta.totalElements} row(s) selected.
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit flex-shrink-0">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={`${pagination.pageSize}`}
                                onValueChange={(value) => {
                                    setPageSize(Number(value))
                                }}
                            >
                                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                    <SelectValue
                                        placeholder={pagination.pageSize}
                                    />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-fit items-center justify-center text-sm font-medium">
                            Page {pagination.pageIndex + 1} of{" "}
                            {paginationMeta.totalPages || 1}
                        </div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => setPageIndex(0)}
                                disabled={paginationMeta.first}
                            >
                                <span className="sr-only">Go to first page</span>
                                <IconChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => setPageIndex(pagination.pageIndex - 1)}
                                disabled={paginationMeta.first}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <IconChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => setPageIndex(pagination.pageIndex + 1)}
                                disabled={paginationMeta.last}
                            >
                                <span className="sr-only">Go to next page</span>
                                <IconChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() => setPageIndex(paginationMeta.totalPages - 1)}
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
