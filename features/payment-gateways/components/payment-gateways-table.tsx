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
    flexRender,
    getCoreRowModel,
    Header,
    useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"

import { PaymentGateway, PaymentGatewaySchema } from "@/lib/definitions"
import { usePaymentGatewaysTableStore } from "@/lib/stores/payment-gateways-table-store"
import { useActivatePaymentGateway, useDeactivatePaymentGateway } from "../queries/payment-gateways"

// Re-export schema for build compatibility
export const schema = PaymentGatewaySchema
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/ui/table-skeleton"
import { PAYMENT_GATEWAYS_TABLE_COLUMNS } from "@/components/ui/table-skeleton-presets"

// Helper function to format date
function formatDate(dateString: string | null | undefined): string {
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
    children,
}: {
    header: Header<PaymentGateway, unknown>
    children: React.ReactNode
}) {
    const canSort = header.column.getCanSort()
    const sortDirection = header.column.getIsSorted()

    if (!canSort) {
        return <>{children}</>
    }

    return (
        <Button
            variant="ghost"
            className="h-auto p-0 font-semibold hover:bg-transparent"
            onClick={() => header.column.toggleSorting(undefined, true)}
        >
            {children}
            <span className="ml-2">
                {sortDirection === 'asc' ? (
                    <IconArrowUp className="size-4" />
                ) : sortDirection === 'desc' ? (
                    <IconArrowDown className="size-4" />
                ) : (
                    <IconArrowsSort className="size-4 opacity-50" />
                )}
            </span>
        </Button>
    )
}

// Action cell component with hooks
function ActionCell({ gateway }: { gateway: PaymentGateway }) {
    const activateMutation = useActivatePaymentGateway()
    const deactivateMutation = useDeactivatePaymentGateway()

    const isLoading = activateMutation.isPending || deactivateMutation.isPending

    const handleActivate = () => {
        activateMutation.mutate(gateway.uid)
    }

    const handleDeactivate = () => {
        deactivateMutation.mutate(gateway.uid)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                    size="icon"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <IconLoader className="size-4 animate-spin" />
                    ) : (
                        <IconDotsVertical />
                    )}
                    <span className="sr-only">Open menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                {gateway.is_active ? (
                    <DropdownMenuItem
                        onClick={handleDeactivate}
                        disabled={isLoading}
                        className="text-destructive focus:text-destructive"
                    >
                        {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        onClick={handleActivate}
                        disabled={isLoading}
                    >
                        {activateMutation.isPending ? 'Activating...' : 'Activate'}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const columns: ColumnDef<PaymentGateway>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
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
                <div className="truncate font-medium font-mono">{row.original.code || "-"}</div>
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
        accessorKey: "supported_methods",
        header: "Supported Methods",
        cell: ({ row }) => {
            const methods = row.original.supported_methods || []
            return (
                <div className="flex flex-wrap gap-1">
                    {methods.length > 0 ? (
                        methods.map((method) => (
                            <Badge key={method} variant="outline" className="px-2 py-0.5 whitespace-nowrap">
                                {method}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </div>
            )
        },
        size: 200,
    },
    {
        accessorKey: "is_active",
        header: "Status",
        filterFn: (row, id, value) => {
            const isActive = row.getValue(id) as boolean
            if (value === undefined || value === null) return true
            return value.includes(isActive.toString())
        },
        cell: ({ row }) => {
            const isActive = row.original.is_active

            return (
                <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="px-2 py-0.5 whitespace-nowrap"
                >
                    {isActive ? (
                        <IconCircleCheckFilled className="mr-1 size-3" />
                    ) : (
                        <span className="mr-1">✕</span>
                    )}
                    {isActive ? 'Active' : 'Inactive'}
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
            <div className="text-sm whitespace-nowrap">{formatDate(row.original.created_at)}</div>
        ),
        size: 160,
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionCell gateway={row.original} />,
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

export function PaymentGatewaysTable({
    data,
    paginationMeta,
    isLoading = false,
}: {
    data: PaymentGateway[];
    paginationMeta: PaginationMeta;
    isLoading?: boolean;
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
    } = usePaymentGatewaysTableStore()

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
    const statusColumn = table.getColumn("is_active")

    // Get filter values for badge display
    const statusFilter = statusColumn?.getFilterValue() as string[] | undefined

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
                            checked={statusFilter?.includes('true') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'true'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'true')
                                    )
                                }
                            }}
                        >
                            Active
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter?.includes('false') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'false'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'false')
                                    )
                                }
                            }}
                        >
                            Inactive
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
                                {isLoading ? (
                                    <TableSkeletonRows rows={10} columns={PAYMENT_GATEWAYS_TABLE_COLUMNS} />
                                ) : table.getRowModel().rows?.length ? (
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
                            {isLoading && <IconLoader className="ml-2 size-4 animate-spin" />}
                        </div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => setPagination({ ...paginationState, pageIndex: 0 })}
                                disabled={paginationMeta.first || isLoading}
                            >
                                <span className="sr-only">Go to first page</span>
                                <IconChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => setPagination({ ...paginationState, pageIndex: paginationState.pageIndex - 1 })}
                                disabled={paginationMeta.first || isLoading}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <IconChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => setPagination({ ...paginationState, pageIndex: paginationState.pageIndex + 1 })}
                                disabled={paginationMeta.last || isLoading}
                            >
                                <span className="sr-only">Go to next page</span>
                                <IconChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() => setPagination({ ...paginationState, pageIndex: (paginationMeta.totalPages || 1) - 1 })}
                                disabled={paginationMeta.last || isLoading}
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




