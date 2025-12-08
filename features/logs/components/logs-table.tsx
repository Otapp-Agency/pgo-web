"use client"

// {
//     "data": [
//         {
//             "id": "uuid",
//             "user_id": "uuid | null",
//             "username": "string | null",
//             "action": "string (e.g., 'USER_CREATED', 'PGO_UPDATED')",
//             "description": "string (e.g., 'User 'john.doe' created by Admin 'jane.smith'')",
//             "ip_address": "string",
//             "old_values": "json | null",
//             "new_values": "json | null",
//             "timestamp": "datetime"
//         }
//     ]
// }


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

import { useIsMobile } from "@/hooks/use-mobile"
import { AuditLog, AuditLogSchema } from "@/lib/definitions"
import { useLogsTableStore } from "@/lib/stores/logs-table-store"

// Re-export schema for build compatibility
export const schema = AuditLogSchema
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
import { LOGS_TABLE_COLUMNS } from "@/components/ui/table-skeleton-presets"

// Helper function to format date
function formatDate(dateString: string | null): string {
    if (!dateString) return '-'
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
        return dateString
    }
}

// Helper function to truncate ID (handles both string and number)
function truncateId(id: string | number, maxLength: number = 20): string {
    const idStr = String(id)
    if (!idStr || idStr.length <= maxLength) return idStr
    return `${idStr.substring(0, maxLength)}...`
}

// Sortable header component
function SortableHeader({
    header,
    children
}: {
    header: Header<AuditLog, unknown>
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

const columns: ColumnDef<AuditLog>[] = [
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
                Audit Log ID
            </SortableHeader>
        ),
        cell: ({ row }) => {
            const auditLogId = row.original.id
            const truncatedId = truncateId(auditLogId, 20)

            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[180px]">
                                <TableCellViewer item={row.original} displayText={truncatedId} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-mono text-xs max-w-xs break-all">{auditLogId}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        enableHiding: false,
        size: 180,
    },
    {
        accessorKey: "eventType",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Event Type
            </SortableHeader>
        ),
        cell: ({ row }) => {
            const eventType = row.original.eventType || "-"
            return (
                <div className="max-w-[200px] min-w-[150px]">
                    <Badge variant="outline" className="px-2 py-0.5 whitespace-nowrap font-mono text-xs">
                        {eventType}
                    </Badge>
                </div>
            )
        },
        size: 200,
    },
    {
        accessorKey: "username",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Username
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[200px] min-w-[150px]">
                <div className="truncate font-medium">{row.original.username || "-"}</div>
            </div>
        ),
        size: 200,
    },
    {
        accessorKey: "event",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Event
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[400px] min-w-[300px]">
                <div className="truncate text-sm">{row.original.event || "-"}</div>
            </div>
        ),
        size: 400,
    },
    {
        accessorKey: "ipAddress",
        header: ({ header }) => (
            <SortableHeader header={header}>
                IP Address
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[150px] min-w-[120px]">
                <div className="truncate font-mono text-xs">{row.original.ipAddress || "-"}</div>
            </div>
        ),
        size: 150,
    },
    {
        accessorKey: "createdAt",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Created At
            </SortableHeader>
        ),
        sortingFn: (rowA, rowB) => {
            const dateA = rowA.original.createdAt
                ? new Date(rowA.original.createdAt).getTime()
                : 0
            const dateB = rowB.original.createdAt
                ? new Date(rowB.original.createdAt).getTime()
                : 0
            return dateA - dateB
        },
        cell: ({ row }) => {
            const createdAt = row.original.createdAt || null
            return (
                <div className="text-sm whitespace-nowrap">{formatDate(createdAt)}</div>
            )
        },
        size: 160,
    },
    {
        id: "actions",
        cell: ({ row, table }) => {
            const openDetailDrawer = (table.options.meta as { openDetailDrawer?: (log: AuditLog) => void })?.openDetailDrawer
            return (
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
                        <DropdownMenuItem
                            onClick={() => {
                                if (openDetailDrawer) {
                                    openDetailDrawer(row.original)
                                }
                            }}
                        >
                            View Details
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
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

export function LogsTable({
    data,
    paginationMeta,
    isLoading = false,
}: {
    data: AuditLog[];
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
    } = useLogsTableStore()

    const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
    const isMobile = useIsMobile()

    const openDetailDrawer = React.useCallback((log: AuditLog) => {
        setSelectedLog(log)
        setIsDrawerOpen(true)
    }, [])

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
        meta: {
            openDetailDrawer,
        },
        getRowId: (row) => row.id.toString(),
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
    const eventTypeColumn = table.getColumn("eventType")

    // Get filter values for badge display
    const eventTypeFilter = eventTypeColumn?.getFilterValue() as string[] | undefined

    // Get unique event types from data for filter dropdown
    const uniqueEventTypes = React.useMemo(() => {
        const eventTypes = new Set<string>()
        data.forEach(log => {
            if (log.eventType) eventTypes.add(log.eventType)
        })
        return Array.from(eventTypes).sort()
    }, [data])

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="flex items-center justify-end gap-2 px-4 lg:px-6 shrink-0">
                {/* Event Type Filter */}
                {uniqueEventTypes.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                Event Type
                                {eventTypeFilter && eventTypeFilter.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {eventTypeFilter.length}
                                    </Badge>
                                )}
                                <IconChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuCheckboxItem
                                checked={!eventTypeFilter || eventTypeFilter.length === 0}
                                onCheckedChange={() => {
                                    eventTypeColumn?.setFilterValue(undefined)
                                }}
                            >
                                All Event Types
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            {uniqueEventTypes.map((eventType) => (
                                <DropdownMenuCheckboxItem
                                    key={eventType}
                                    checked={(eventTypeColumn?.getFilterValue() as string[] | undefined)?.includes(eventType) ?? false}
                                    onCheckedChange={(checked) => {
                                        const currentFilter = (eventTypeColumn?.getFilterValue() as string[]) || []
                                        if (checked) {
                                            eventTypeColumn?.setFilterValue([...currentFilter, eventType])
                                        } else {
                                            eventTypeColumn?.setFilterValue(
                                                currentFilter.filter((v) => v !== eventType)
                                            )
                                        }
                                    }}
                                >
                                    {eventType}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

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
                                    <TableSkeletonRows rows={10} columns={LOGS_TABLE_COLUMNS} />
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
            {selectedLog && (
                <Drawer
                    open={isDrawerOpen}
                    onOpenChange={(open) => {
                        setIsDrawerOpen(open)
                        if (!open) {
                            setSelectedLog(null)
                        }
                    }}
                    direction={isMobile ? "bottom" : "right"}
                >
                    <DrawerContent>
                        <DrawerHeader className="gap-1">
                            <DrawerTitle>Audit Log Details</DrawerTitle>
                            <DrawerDescription>
                                Audit Log ID: {selectedLog.id}
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                            {/* Audit Log Information Section */}
                            <div className="flex flex-col gap-3">
                                <Label className="text-base font-semibold">Audit Log Information</Label>
                                <div className="grid gap-2 rounded-lg border p-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="font-mono text-xs">{selectedLog.id}</span>
                                    </div>
                                    {selectedLog.userUid && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">User UID:</span>
                                            <span className="font-mono text-xs">{selectedLog.userUid}</span>
                                        </div>
                                    )}
                                    {selectedLog.username && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Username:</span>
                                            <span>{selectedLog.username}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Event Type:</span>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {selectedLog.eventType || "-"}
                                        </Badge>
                                    </div>
                                    {selectedLog.event && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Event:</span>
                                            <span className="wrap-break-word text-right max-w-[60%]">{selectedLog.event}</span>
                                        </div>
                                    )}
                                    {selectedLog.details && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Details:</span>
                                            <span className="wrap-break-word text-right max-w-[60%]">{selectedLog.details}</span>
                                        </div>
                                    )}
                                    {selectedLog.ipAddress && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IP Address:</span>
                                            <span className="font-mono text-xs">{selectedLog.ipAddress}</span>
                                        </div>
                                    )}
                                    {selectedLog.success !== undefined && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Success:</span>
                                            <Badge variant={selectedLog.success ? "default" : "destructive"}>
                                                {selectedLog.success ? "Yes" : "No"}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(selectedLog.resourceUid || selectedLog.resourceType || selectedLog.merchantId || selectedLog.metadata) && (
                                <>
                                    <Separator />

                                    {/* Additional Information */}
                                    <div className="flex flex-col gap-3">
                                        <Label className="text-base font-semibold">Additional Information</Label>
                                        <div className="grid gap-2 rounded-lg border p-3">
                                            {selectedLog.resourceUid && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Resource UID:</span>
                                                    <span className="font-mono text-xs">{selectedLog.resourceUid}</span>
                                                </div>
                                            )}
                                            {selectedLog.resourceType && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Resource Type:</span>
                                                    <span>{selectedLog.resourceType}</span>
                                                </div>
                                            )}
                                            {selectedLog.merchantId && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Merchant ID:</span>
                                                    <span className="font-mono text-xs">{selectedLog.merchantId}</span>
                                                </div>
                                            )}
                                            {selectedLog.userAgent && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">User Agent:</span>
                                                    <span className="text-xs">{selectedLog.userAgent}</span>
                                                </div>
                                            )}
                                            {selectedLog.requestId && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Request ID:</span>
                                                    <span className="font-mono text-xs">{selectedLog.requestId}</span>
                                                </div>
                                            )}
                                            {selectedLog.requestMethod && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Request Method:</span>
                                                    <span>{selectedLog.requestMethod}</span>
                                                </div>
                                            )}
                                            {selectedLog.requestPath && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Request Path:</span>
                                                    <span className="font-mono text-xs">{selectedLog.requestPath}</span>
                                                </div>
                                            )}
                                            {selectedLog.metadata && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-muted-foreground font-medium">Metadata:</span>
                                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                                                        {selectedLog.metadata}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            <Separator />

                            {/* Timestamp */}
                            <div className="flex flex-col gap-3">
                                <Label className="text-base font-semibold">Timestamps</Label>
                                <div className="grid gap-2 rounded-lg border p-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Created At:</span>
                                        <span>{formatDate(selectedLog.createdAt)}</span>
                                    </div>
                                    {selectedLog.updatedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Updated At:</span>
                                            <span>{formatDate(selectedLog.updatedAt)}</span>
                                        </div>
                                    )}
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
            )}
        </div>
    )
}


function TableCellViewer({ item, displayText }: { item: AuditLog; displayText?: string }) {
    const isMobile = useIsMobile()
    const textToShow = displayText || item.id || "-"

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild>
                <Button variant="link" className="text-foreground w-fit px-0 text-left font-mono text-xs">
                    {textToShow}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="gap-1">
                    <DrawerTitle>Audit Log Details</DrawerTitle>
                    <DrawerDescription>
                        Audit Log ID: {item.id}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                    {/* Audit Log Information Section */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Audit Log Information</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ID:</span>
                                <span className="font-mono text-xs">{item.id}</span>
                            </div>
                            {item.userUid && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">User UID:</span>
                                    <span className="font-mono text-xs">{item.userUid}</span>
                                </div>
                            )}
                            {item.username && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Username:</span>
                                    <span>{item.username}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Event Type:</span>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {item.eventType || "-"}
                                </Badge>
                            </div>
                            {item.event && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Event:</span>
                                    <span className="wrap-break-word text-right max-w-[60%]">{item.event}</span>
                                </div>
                            )}
                            {item.details && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Details:</span>
                                    <span className="wrap-break-word text-right max-w-[60%]">{item.details}</span>
                                </div>
                            )}
                            {item.ipAddress && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">IP Address:</span>
                                    <span className="font-mono text-xs">{item.ipAddress}</span>
                                </div>
                            )}
                            {item.success !== undefined && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Success:</span>
                                    <Badge variant={item.success ? "default" : "destructive"}>
                                        {item.success ? "Yes" : "No"}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>

                    {(item.resourceUid || item.resourceType || item.merchantId || item.metadata) && (
                        <>
                            <Separator />

                            {/* Additional Information */}
                            <div className="flex flex-col gap-3">
                                <Label className="text-base font-semibold">Additional Information</Label>
                                <div className="grid gap-2 rounded-lg border p-3">
                                    {item.resourceUid && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Resource UID:</span>
                                            <span className="font-mono text-xs">{item.resourceUid}</span>
                                        </div>
                                    )}
                                    {item.resourceType && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Resource Type:</span>
                                            <span>{item.resourceType}</span>
                                        </div>
                                    )}
                                    {item.merchantId && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Merchant ID:</span>
                                            <span className="font-mono text-xs">{item.merchantId}</span>
                                        </div>
                                    )}
                                    {item.userAgent && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">User Agent:</span>
                                            <span className="text-xs">{item.userAgent}</span>
                                        </div>
                                    )}
                                    {item.requestId && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Request ID:</span>
                                            <span className="font-mono text-xs">{item.requestId}</span>
                                        </div>
                                    )}
                                    {item.requestMethod && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Request Method:</span>
                                            <span>{item.requestMethod}</span>
                                        </div>
                                    )}
                                    {item.requestPath && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Request Path:</span>
                                            <span className="font-mono text-xs">{item.requestPath}</span>
                                        </div>
                                    )}
                                    {item.metadata && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-muted-foreground font-medium">Metadata:</span>
                                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                                                {item.metadata}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    {/* Timestamp */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Timestamps</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created At:</span>
                                <span>{formatDate(item.createdAt)}</span>
                            </div>
                            {item.updatedAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Updated At:</span>
                                    <span>{formatDate(item.updatedAt)}</span>
                                </div>
                            )}
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