import { create } from 'zustand';
import { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import { PAGINATION } from '@/lib/config/constants';

interface RolesTableState {
    pagination: {
        pageIndex: number; // 0-based page index for TanStack React Table
        pageSize: number;
    };
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
    columnVisibility: VisibilityState;
    rowSelection: Record<string, boolean>;
}

interface RolesTableActions {
    setPagination: (pagination: { pageIndex: number; pageSize: number }) => void;
    setSorting: (sorting: SortingState | ((prev: SortingState) => SortingState)) => void;
    setColumnFilters: (filters: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => void;
    setColumnVisibility: (visibility: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
    setRowSelection: (selection: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
    resetTableState: () => void;
}

const initialState: RolesTableState = {
    pagination: {
        pageIndex: 0, // 0-based for TanStack React Table (first page)
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    },
    sorting: [],
    columnFilters: [],
    columnVisibility: {},
    rowSelection: {},
};

export const useRolesTableStore = create<RolesTableState & RolesTableActions>()(
    (set) => ({
        ...initialState,

        setPagination: (pagination) => set({ pagination }),

        setSorting: (sorting) => set((state) => ({
            sorting: typeof sorting === 'function' ? sorting(state.sorting) : sorting,
        })),

        setColumnFilters: (filters) => set((state) => ({
            columnFilters: typeof filters === 'function' ? filters(state.columnFilters) : filters,
        })),

        setColumnVisibility: (visibility) => set((state) => ({
            columnVisibility: typeof visibility === 'function' ? visibility(state.columnVisibility) : visibility,
        })),

        setRowSelection: (selection) => set((state) => ({
            rowSelection: typeof selection === 'function' ? selection(state.rowSelection) : selection,
        })),

        resetTableState: () => set(initialState),
    })
);

