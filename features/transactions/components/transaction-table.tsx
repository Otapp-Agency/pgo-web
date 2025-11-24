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
} from "@tabler/icons-react"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    Header,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import { format } from "date-fns"

import { useIsMobile } from "@/hooks/use-mobile"
import { Transaction, TransactionSchema } from "@/lib/definitions"

// Re-export schema for build compatibility
export const schema = TransactionSchema
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

// Helper function to truncate transaction ID
function truncateId(id: string, maxLength: number = 20): string {
    if (!id || id.length <= maxLength) return id
    return `${id.substring(0, maxLength)}...`
}

// Sortable header component
function SortableHeader({
    header,
    children
}: {
    header: Header<Transaction, unknown>
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

const columns: ColumnDef<Transaction>[] = [
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
        accessorKey: "merchantTransactionId",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Transaction ID
            </SortableHeader>
        ),
        cell: ({ row }) => {
            const transactionId = row.original.merchantTransactionId || "-"
            const truncatedId = transactionId !== "-" ? truncateId(transactionId, 20) : "-"

            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[180px]">
                                <TableCellViewer item={row.original} displayText={truncatedId} />
                            </div>
                        </TooltipTrigger>
                        {transactionId !== "-" && (
                            <TooltipContent>
                                <p className="font-mono text-xs max-w-xs break-all">{transactionId}</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            )
        },
        enableHiding: false,
        size: 180,
    },
    {
        accessorKey: "customerName",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Customer
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[200px] min-w-[150px]">
                <div className="truncate font-medium">{row.original.customerName || "-"}</div>
                {row.original.customerIdentifier && (
                    <div className="text-muted-foreground truncate text-xs">
                        {row.original.customerIdentifier}
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
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
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
        accessorKey: "merchantName",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Merchant
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[200px] min-w-[150px]">
                <div className="truncate font-medium">{row.original.merchantName || "-"}</div>
                {row.original.submerchantName && (
                    <div className="text-muted-foreground truncate text-xs">
                        {row.original.submerchantName}
                    </div>
                )}
            </div>
        ),
        size: 200,
    },
    {
        accessorKey: "pgoName",
        header: ({ header }) => (
            <SortableHeader header={header}>
                PGO
            </SortableHeader>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
        cell: ({ row }) => (
            <div className="max-w-[120px] min-w-[100px] truncate">{row.original.pgoName || "-"}</div>
        ),
        size: 120,
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
        cell: () => (
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
                <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Retry</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">Refund</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
    },
]


export function TransactionTable({
    data: initialData,
}: {
    data: Transaction[]
}) {
    const [data] = React.useState(() => initialData)
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    })

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
        },
        getRowId: (row) => row.uid,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })


    // Get unique values for filters
    const statusColumn = table.getColumn("status")
    const pgoColumn = table.getColumn("pgoName")

    const statusValues = React.useMemo(() => {
        const uniqueStatuses = new Set(data.map((t) => t.status))
        return Array.from(uniqueStatuses).sort()
    }, [data])

    const pgoValues = React.useMemo(() => {
        const uniquePgos = new Set(data.map((t) => t.pgoName).filter(Boolean))
        return Array.from(uniquePgos).sort()
    }, [data])

    const statusFilter = statusColumn?.getFilterValue() as string[] | undefined
    const pgoFilter = pgoColumn?.getFilterValue() as string[] | undefined

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
                        {statusValues.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={statusFilter?.includes(status) ?? false}
                                onCheckedChange={(checked) => {
                                    const currentFilter = statusFilter || []
                                    if (checked) {
                                        statusColumn?.setFilterValue([...currentFilter, status])
                                    } else {
                                        statusColumn?.setFilterValue(
                                            currentFilter.filter((v) => v !== status)
                                        )
                                    }
                                }}
                            >
                                {status}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* PGO Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            PGO
                            {pgoFilter && pgoFilter.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {pgoFilter.length}
                                </Badge>
                            )}
                            <IconChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuCheckboxItem
                            checked={!pgoFilter || pgoFilter.length === 0}
                            onCheckedChange={() => {
                                pgoColumn?.setFilterValue(undefined)
                            }}
                        >
                            All PGOs
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {pgoValues.map((pgo) => (
                            <DropdownMenuCheckboxItem
                                key={pgo}
                                checked={pgoFilter?.includes(pgo) ?? false}
                                onCheckedChange={(checked) => {
                                    const currentFilter = pgoFilter || []
                                    if (checked) {
                                        pgoColumn?.setFilterValue([...currentFilter, pgo])
                                    } else {
                                        pgoColumn?.setFilterValue(
                                            currentFilter.filter((v) => v !== pgo)
                                        )
                                    }
                                }}
                            >
                                {pgo}
                            </DropdownMenuCheckboxItem>
                        ))}
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
                <div className="flex items-center justify-between px-4 flex-shrink-0">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex min-w-0">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit flex-shrink-0">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value))
                                }}
                            >
                                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                    <SelectValue
                                        placeholder={table.getState().pagination.pageSize}
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
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to first page</span>
                                <IconChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <IconChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to next page</span>
                                <IconChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
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


function TableCellViewer({ item, displayText }: { item: Transaction; displayText?: string }) {
    const isMobile = useIsMobile()
    const textToShow = displayText || item.merchantTransactionId || "-"

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild>
                <Button variant="link" className="text-foreground w-fit px-0 text-left font-mono text-xs">
                    {textToShow}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="gap-1">
                    <DrawerTitle>Transaction Details</DrawerTitle>
                    <DrawerDescription>
                        Transaction ID: {item.uid}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                    {/* Transaction IDs Section */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Transaction IDs</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Internal:</span>
                                <span className="font-mono text-xs">{item.internalTransactionId}</span>
                            </div>
                            {item.externalTransactionId && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">External:</span>
                                    <span className="font-mono text-xs">{item.externalTransactionId}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Merchant:</span>
                                <span className="font-mono text-xs">{item.merchantTransactionId}</span>
                            </div>
                            {item.pspTransactionId && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">PSP:</span>
                                    <span className="font-mono text-xs">{item.pspTransactionId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Amount and Currency */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Amount</Label>
                        <div className="text-2xl font-bold">
                            {formatAmount(item.amount, item.currency)}
                        </div>
                    </div>

                    <Separator />

                    {/* Customer Information */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Customer Information</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span>{item.customerName || "-"}</span>
                            </div>
                            {item.customerIdentifier && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Identifier:</span>
                                    <span>{item.customerIdentifier}</span>
                                </div>
                            )}
                            {item.paymentMethod && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment Method:</span>
                                    <span>{item.paymentMethod}</span>
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
                                backgroundColor: `${item.colorCode}20`,
                                borderColor: item.colorCode,
                                color: item.colorCode,
                            }}
                        >
                            {item.status === "SUCCESS" || item.status === "COMPLETED" ? (
                                <IconCircleCheckFilled className="mr-2 size-4" />
                            ) : item.status === "FAILED" ? (
                                <span className="mr-2">✕</span>
                            ) : (
                                <IconLoader className="mr-2 size-4" />
                            )}
                            {item.status}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Merchant Information */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Merchant Information</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Merchant:</span>
                                <span>{item.merchantName}</span>
                            </div>
                            {item.submerchantName && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Submerchant:</span>
                                    <span>{item.submerchantName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* PGO Information */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Payment Gateway</Label>
                        <div className="rounded-lg border p-3">
                            <div className="font-medium">{item.pgoName}</div>
                        </div>
                    </div>

                    {/* Error Information */}
                    {(item.status === "FAILED" || item.errorCode || item.errorMessage || item.description) && (
                        <>
                            <Separator />
                            <div className="flex flex-col gap-3">
                                <Label className="text-base font-semibold text-destructive">Error Information</Label>
                                <div className="grid gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                    {item.errorCode && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Error Code:</span>
                                            <span className="font-medium text-destructive">{item.errorCode}</span>
                                        </div>
                                    )}
                                    {item.errorMessage && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-muted-foreground">Error Message:</span>
                                            <span className="text-destructive">{item.errorMessage}</span>
                                        </div>
                                    )}
                                    {item.description && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-muted-foreground">Description:</span>
                                            <span>{item.description}</span>
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
                                <span>{formatDate(item.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Updated:</span>
                                <span>{formatDate(item.updatedAt)}</span>
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
    )
}
