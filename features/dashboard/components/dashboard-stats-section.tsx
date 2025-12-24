'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc/client';
import { SectionCards } from '@/components/section-cards';
import type { DashboardStatsParams } from '../types';

interface DashboardStatsSectionProps {
    params?: DashboardStatsParams;
}

export function DashboardStatsSection({ params }: DashboardStatsSectionProps) {
    const trpc = useTRPC();
    const queryResult = useSuspenseQuery(trpc.dashboard.stats.queryOptions(params));

    // Type assertion needed because tRPC types may not be fully inferred in this context
    const statsData = queryResult.data;

    return (
        <SectionCards
            stats={statsData}
        />
    );
}



