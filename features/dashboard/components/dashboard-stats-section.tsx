'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardStatsQueryOptions } from '../queries/dashboard';
import { SectionCards } from '@/components/section-cards';
import { SummaryCardsSkeleton } from '@/components/ui/page-skeleton';
import type { DashboardStatsParams } from '../types';

interface DashboardStatsSectionProps {
    params?: DashboardStatsParams;
}

export function DashboardStatsSection({ params }: DashboardStatsSectionProps) {
    const {
        data: statsData,
        isLoading,
        isFetching,
        error,
    } = useQuery(dashboardStatsQueryOptions(params));

    // Show loading skeleton
    if (isLoading) {
        return <SummaryCardsSkeleton cardCount={4} columns={4} />;
    }

    // Show error state
    if (error) {
        return (
            <div className="px-4 lg:px-6 py-4 text-muted-foreground">
                Failed to load dashboard stats: {error.message}
            </div>
        );
    }

    return (
        <SectionCards
            stats={statsData}
            isLoading={isFetching}
        />
    );
}



