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
    IconLock,
    IconLockOpen,
} from "@tabler/icons-react"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    Header,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { useSuspenseQuery } from "@tanstack/react-query"

import { useIsMobile } from "@/hooks/use-mobile"
import { User, UserSchema } from "@/lib/definitions"
import { useUsersTableStore } from "@/lib/stores/users-table-store"
import { useTRPC } from "@/lib/trpc/client"

// Re-export schema for build compatibility
export const schema = UserSchema
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
import { USERS_TABLE_COLUMNS } from "@/components/ui/table-skeleton-presets"
import { ResetPasswordDialog } from "./reset-password-dialog"

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
    header: Header<User, unknown>
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

const columns: ColumnDef<User>[] = [
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
                User ID
            </SortableHeader>
        ),
        cell: ({ row }) => {
            const userId = row.original.id
            const truncatedId = truncateId(userId, 20)

            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[180px]">
                                <TableCellViewer item={row.original} displayText={truncatedId} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-mono text-xs max-w-xs break-all">{userId}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        enableHiding: false,
        size: 180,
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
        accessorKey: "email",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Email
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[250px] min-w-[200px]">
                <div className="truncate">{row.original.email || "-"}</div>
            </div>
        ),
        size: 250,
    },
    {
        accessorKey: "role",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Role
            </SortableHeader>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
        cell: ({ row }) => (
            <Badge variant="outline" className="px-2 py-0.5 whitespace-nowrap">
                {row.original.role || "-"}
            </Badge>
        ),
        size: 120,
    },
    {
        accessorKey: "is_active",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Status
            </SortableHeader>
        ),
        filterFn: (row, id, value) => {
            const status = row.original.is_active ? 'active' : 'inactive'
            const locked = row.original.is_locked ? 'locked' : 'unlocked'
            const combined = `${status}-${locked}`
            return value.includes(combined)
        },
        cell: ({ row }) => {
            const isActive = row.original.is_active
            const isLocked = row.original.is_locked

            return (
                <div className="flex items-center gap-2">
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
                    {isLocked && (
                        <Badge
                            variant="destructive"
                            className="px-2 py-0.5 whitespace-nowrap"
                        >
                            <IconLock className="mr-1 size-3" />
                            Locked
                        </Badge>
                    )}
                </div>
            )
        },
        size: 150,
    },
    {
        accessorKey: "associated_merchant_id",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Merchant ID
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="max-w-[200px] min-w-[150px]">
                <div className="truncate font-mono text-xs">
                    {row.original.associated_merchant_id || "-"}
                </div>
            </div>
        ),
        size: 200,
    },
    {
        accessorKey: "last_login_at",
        header: ({ header }) => (
            <SortableHeader header={header}>
                Last Login
            </SortableHeader>
        ),
        sortingFn: (rowA, rowB) => {
            const dateA = rowA.original.last_login_at ? new Date(rowA.original.last_login_at).getTime() : 0
            const dateB = rowB.original.last_login_at ? new Date(rowB.original.last_login_at).getTime() : 0
            return dateA - dateB
        },
        cell: ({ row }) => (
            <div className="text-sm whitespace-nowrap">{formatDate(row.original.last_login_at)}</div>
        ),
        size: 160,
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
        cell: ({ row }) => {
            const user = row.original;
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <ResetPasswordDialog
                            userId={user.id}
                            username={user.username}
                            trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    Reset Password
                                </DropdownMenuItem>
                            }
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
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

export function UsersTable({
    data,
    paginationMeta,
    isLoading = false,
}: {
    data: User[];
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
    } = useUsersTableStore()

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
    const roleColumn = table.getColumn("role")
    const statusColumn = table.getColumn("is_active")

    // Fetch all available roles from the server (not just from current page)
    const trpc = useTRPC();
    const { data: rolesData = [] } = useSuspenseQuery(
        trpc.users.roles.all.queryOptions()
    );
    // Extract role names from Role objects
    const roleValues = rolesData.map(role => role.name);

    // Get role filter value for badge display
    const roleFilterValue = roleColumn?.getFilterValue() as string[] | undefined
    const roleFilterCount = roleFilterValue?.length ?? 0

    const statusFilter = statusColumn?.getFilterValue() as string[] | undefined

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="flex items-center justify-end gap-2 px-4 lg:px-6 shrink-0">
                {/* Role Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            Role
                            {roleFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {roleFilterCount}
                                </Badge>
                            )}
                            <IconChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuCheckboxItem
                            checked={!roleColumn?.getFilterValue() || (roleColumn.getFilterValue() as string[]).length === 0}
                            onCheckedChange={() => {
                                roleColumn?.setFilterValue(undefined)
                            }}
                        >
                            All Roles
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {roleValues.map((role) => (
                            <DropdownMenuCheckboxItem
                                key={role}
                                checked={(roleColumn?.getFilterValue() as string[] | undefined)?.includes(role) ?? false}
                                onCheckedChange={(checked) => {
                                    const currentFilter = (roleColumn?.getFilterValue() as string[]) || []
                                    if (checked) {
                                        roleColumn?.setFilterValue([...currentFilter, role])
                                    } else {
                                        roleColumn?.setFilterValue(
                                            currentFilter.filter((v) => v !== role)
                                        )
                                    }
                                }}
                            >
                                {role}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

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
                            checked={statusFilter?.includes('active-unlocked') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'active-unlocked'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'active-unlocked')
                                    )
                                }
                            }}
                        >
                            Active & Unlocked
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter?.includes('active-locked') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'active-locked'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'active-locked')
                                    )
                                }
                            }}
                        >
                            Active & Locked
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter?.includes('inactive-unlocked') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'inactive-unlocked'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'inactive-unlocked')
                                    )
                                }
                            }}
                        >
                            Inactive & Unlocked
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter?.includes('inactive-locked') ?? false}
                            onCheckedChange={(checked) => {
                                const currentFilter = statusFilter || []
                                if (checked) {
                                    statusColumn?.setFilterValue([...currentFilter, 'inactive-locked'])
                                } else {
                                    statusColumn?.setFilterValue(
                                        currentFilter.filter((v) => v !== 'inactive-locked')
                                    )
                                }
                            }}
                        >
                            Inactive & Locked
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
                                    <TableSkeletonRows rows={10} columns={USERS_TABLE_COLUMNS} />
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
                                    // Reset to first page when changing page size (0-based)
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
                            Page {paginationMeta.pageNumber} of{" "}
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
                                onClick={() => setPagination({ ...paginationState, pageIndex: paginationMeta.totalPages ? paginationMeta.totalPages - 1 : 0 })}
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


function TableCellViewer({ item, displayText }: { item: User; displayText?: string }) {
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
                    <DrawerTitle>User Details</DrawerTitle>
                    <DrawerDescription>
                        User ID: {item.id}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                    {/* User Information Section */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">User Information</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ID:</span>
                                <span className="font-mono text-xs">{item.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Username:</span>
                                <span>{item.username}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span>{item.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Role:</span>
                                <Badge variant="outline">{item.role}</Badge>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Status Information */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Status</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Active:</span>
                                <Badge variant={item.is_active ? "default" : "secondary"}>
                                    {item.is_active ? (
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
                                <span className="text-muted-foreground">Locked:</span>
                                <Badge variant={item.is_locked ? "destructive" : "outline"}>
                                    {item.is_locked ? (
                                        <>
                                            <IconLock className="mr-1 size-3" />
                                            Locked
                                        </>
                                    ) : (
                                        <>
                                            <IconLockOpen className="mr-1 size-3" />
                                            Unlocked
                                        </>
                                    )}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Merchant Information */}
                    {item.associated_merchant_id && (
                        <>
                            <div className="flex flex-col gap-3">
                                <Label className="text-base font-semibold">Associated Merchant</Label>
                                <div className="rounded-lg border p-3">
                                    <div className="font-mono text-xs">{item.associated_merchant_id}</div>
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-base font-semibold">Timestamps</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created:</span>
                                <span>{formatDate(item.created_at)}</span>
                            </div>
                            {item.last_login_at && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Last Login:</span>
                                    <span>{formatDate(item.last_login_at)}</span>
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

