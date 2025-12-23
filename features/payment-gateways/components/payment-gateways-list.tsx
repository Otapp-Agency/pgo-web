'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PaymentGatewaysTable } from './payment-gateways-table';
import { NewPaymentGatewayDrawer } from './new-payment-gateway-drawer';
import { usePaymentGatewaysTableStore } from '@/lib/stores/payment-gateways-table-store';
import { useTRPC } from '@/lib/trpc/client';
import type { PaginatedPaymentGatewayResponse } from '@/lib/definitions';

export default function PaymentGatewaysList() {
    const trpc = useTRPC();
    const { pagination, sorting, columnFilters, setPagination } = usePaymentGatewaysTableStore();

    // Reset to first page when sorting or filtering changes
    useEffect(() => {
        const currentPagination = usePaymentGatewaysTableStore.getState().pagination;
        setPagination({ ...currentPagination, pageIndex: 0 });
    }, [sorting, columnFilters, setPagination]);

    // Convert column filters to query parameters
    const filterParams = useMemo(() => {
        const params: { is_active?: string; search?: string } = {};

        columnFilters.forEach(filter => {
            if (filter.id === 'is_active' && Array.isArray(filter.value)) {
                // For is_active filter, convert boolean strings to string for API
                const activeValues = filter.value as string[];
                if (activeValues.length > 0) {
                    params.is_active = activeValues[0];
                }
            } else if (filter.id === 'search' && typeof filter.value === 'string') {
                params.search = filter.value;
            }
        });

        return params;
    }, [columnFilters]);

    // Build query params for tRPC
    const queryParams = useMemo(() => ({
        ...filterParams,
    }), [filterParams]);

    // Use tRPC query
    const { data, isLoading, isFetching, error } = useQuery(
        trpc.gateways.list.queryOptions(queryParams)
    );

    if (error) {
        console.error('Payment gateways query error:', error);
    }

    // Extract payment gateways and pagination metadata
    const paymentGateways = (data as PaginatedPaymentGatewayResponse | undefined)?.data ?? [];
    const paginationMeta = data ? {
        pageNumber: (data as unknown as PaginatedPaymentGatewayResponse).pageNumber ?? pagination.pageIndex,
        pageSize: (data as unknown as PaginatedPaymentGatewayResponse).pageSize ?? pagination.pageSize,
        totalElements: (data as unknown as PaginatedPaymentGatewayResponse).totalElements ?? 0,
        totalPages: (data as unknown as PaginatedPaymentGatewayResponse).totalPages ?? 0,
        last: (data as unknown as PaginatedPaymentGatewayResponse).last ?? true,
        first: (data as unknown as PaginatedPaymentGatewayResponse).first ?? true,
    } : {
        pageNumber: pagination.pageIndex,
        pageSize: pagination.pageSize,
        totalElements: 0,
        totalPages: 0,
        last: true,
        first: true,
    };

    return (
        <div className="@container/main flex flex-1 flex-col gap-2 py-2">
            <div className="flex items-center justify-between px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">Payment Gateways</h1>
                <NewPaymentGatewayDrawer />
            </div>
            <PaymentGatewaysTable
                data={paymentGateways}
                paginationMeta={paginationMeta}
                isLoading={isLoading || isFetching}
            />
        </div>
    );
}