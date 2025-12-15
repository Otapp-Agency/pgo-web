import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';

interface PaymentGatewaysTableState {
    pagination: {
        pageIndex: number;
        pageSize: number;
    };
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
    columnVisibility: VisibilityState;
    rowSelection: Record<string, boolean>;
}

interface PaymentGatewaysTableActions {
    setPagination: (pagination: { pageIndex: number; pageSize: number }) => void;
    setSorting: (sorting: SortingState | ((prev: SortingState) => SortingState)) => void;
    setColumnFilters: (filters: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => void;
    setColumnVisibility: (visibility: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
    setRowSelection: (selection: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
    resetTableState: () => void;
}

const initialState: PaymentGatewaysTableState = {
    pagination: {
        pageIndex: 0,
        pageSize: 15,
    },
    sorting: [],
    columnFilters: [],
    columnVisibility: {},
    rowSelection: {},
};

export const usePaymentGatewaysTableStore = create<PaymentGatewaysTableState & PaymentGatewaysTableActions>()(
    persist(
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
        }),
        {
            name: 'payment-gateways-table-state',
            partialize: (state) => ({
                // Persist everything except rowSelection (reset on refresh)
                pagination: state.pagination,
                sorting: state.sorting,
                columnFilters: state.columnFilters,
                columnVisibility: state.columnVisibility,
            }),
        }
    )
);















