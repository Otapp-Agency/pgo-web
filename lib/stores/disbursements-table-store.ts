import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SortingState, VisibilityState } from '@tanstack/react-table';

/**
 * Server-side filter state for disbursements
 * These filters are sent to the API and processed server-side
 */
interface ServerSideFilters {
    status: string | null;
    startDate: string | null;
    endDate: string | null;
    amountMin: string | null;
    amountMax: string | null;
    search: string | null;
}

interface DisbursementsTableState {
    // Pagination state (server-side)
    pagination: {
        pageIndex: number;
        pageSize: number;
    };
    // Sorting state (server-side)
    sorting: SortingState;
    // Server-side filters
    filters: ServerSideFilters;
    // Local UI state
    columnVisibility: VisibilityState;
    rowSelection: Record<string, boolean>;
}

interface DisbursementsTableActions {
    // Pagination
    setPagination: (pagination: { pageIndex: number; pageSize: number }) => void;
    setPageIndex: (pageIndex: number) => void;
    setPageSize: (pageSize: number) => void;
    // Sorting
    setSorting: (sorting: SortingState | ((prev: SortingState) => SortingState)) => void;
    // Server-side filters
    setStatus: (status: string | null) => void;
    setDateRange: (startDate: string | null, endDate: string | null) => void;
    setAmountRange: (amountMin: string | null, amountMax: string | null) => void;
    setSearch: (search: string | null) => void;
    clearFilters: () => void;
    // Local UI state
    setColumnFilters: (filters: unknown) => void;
    setColumnVisibility: (visibility: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
    setRowSelection: (selection: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
    // Reset
    resetTableState: () => void;
}

const initialFilters: ServerSideFilters = {
    status: null,
    startDate: null,
    endDate: null,
    amountMin: null,
    amountMax: null,
    search: null,
};

const initialState: DisbursementsTableState = {
    pagination: {
        pageIndex: 0,
        pageSize: 10,
    },
    sorting: [],
    filters: initialFilters,
    columnVisibility: {},
    rowSelection: {},
};

export const useDisbursementsTableStore = create<DisbursementsTableState & DisbursementsTableActions>()(
    persist(
        (set) => ({
            ...initialState,

            // Pagination actions
            setPagination: (pagination) => set({ pagination }),

            setPageIndex: (pageIndex) => set((state) => ({
                pagination: { ...state.pagination, pageIndex },
            })),

            setPageSize: (pageSize) => set((state) => ({
                pagination: { ...state.pagination, pageSize, pageIndex: 0 }, // Reset to first page
            })),

            // Sorting action
            setSorting: (sorting) => set((state) => ({
                sorting: typeof sorting === 'function' ? sorting(state.sorting) : sorting,
            })),

            // Server-side filter actions
            setStatus: (status) => set((state) => ({
                filters: { ...state.filters, status },
                pagination: { ...state.pagination, pageIndex: 0 }, // Reset to first page on filter change
            })),

            setDateRange: (startDate, endDate) => set((state) => ({
                filters: { ...state.filters, startDate, endDate },
                pagination: { ...state.pagination, pageIndex: 0 },
            })),

            setAmountRange: (amountMin, amountMax) => set((state) => ({
                filters: { ...state.filters, amountMin, amountMax },
                pagination: { ...state.pagination, pageIndex: 0 },
            })),

            setSearch: (search) => set((state) => ({
                filters: { ...state.filters, search },
                pagination: { ...state.pagination, pageIndex: 0 },
            })),

            clearFilters: () => set((state) => ({
                filters: initialFilters,
                pagination: { ...state.pagination, pageIndex: 0 },
            })),

            // Local UI state actions (keeping for backwards compatibility)
            setColumnFilters: () => {
                // No-op: filters are now server-side
            },

            setColumnVisibility: (visibility) => set((state) => ({
                columnVisibility: typeof visibility === 'function' ? visibility(state.columnVisibility) : visibility,
            })),

            setRowSelection: (selection) => set((state) => ({
                rowSelection: typeof selection === 'function' ? selection(state.rowSelection) : selection,
            })),

            // Reset all state
            resetTableState: () => set(initialState),
        }),
        {
            name: 'disbursements-table-state',
            partialize: (state) => ({
                // Persist pagination, sorting, filters, and column visibility
                // Don't persist rowSelection (reset on refresh)
                pagination: state.pagination,
                sorting: state.sorting,
                filters: state.filters,
                columnVisibility: state.columnVisibility,
            }),
        }
    )
);

/**
 * Helper function to check if any filters are active
 */
export function hasActiveFilters(filters: ServerSideFilters): boolean {
    return !!(
        filters.status ||
        filters.startDate ||
        filters.endDate ||
        filters.amountMin ||
        filters.amountMax ||
        filters.search
    );
}

/**
 * Helper to convert store filters to API query params
 */
export function filtersToQueryParams(filters: ServerSideFilters): Record<string, string | undefined> {
    return {
        status: filters.status || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        amount_min: filters.amountMin || undefined,
        amount_max: filters.amountMax || undefined,
        search_term: filters.search || undefined,
    };
}
