import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { verifySession } from "@/lib/auth/services/auth.service"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { getQueryClient, trpc } from "@/lib/trpc/server"
import { HydrateClient } from "@/lib/server-query-client"
import { DashboardStatsSection } from "@/features/dashboard/components/dashboard-stats-section"
import { RecentActivitySection } from "@/features/dashboard/components/recent-activity-section"
import { SummaryCardsSkeleton } from "@/components/ui/page-skeleton"

export default async function Page() {
  // Protect dashboard - redirects to login if not authenticated
  await verifySession()

  // Prefetch dashboard stats server-side
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.dashboard.stats.queryOptions()
  );

  return (
    <HydrateClient>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Dashboard Stats Cards */}
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load dashboard stats</div>}>
              <Suspense fallback={<SummaryCardsSkeleton cardCount={4} columns={4} />}>
                <DashboardStatsSection />
              </Suspense>
            </ErrorBoundary>

            {/* <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div> */}

            {/* Recent Activity Tables */}
            <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load recent activity</div>}>
              <Suspense fallback={<div className="px-4 lg:px-6"><div className="rounded-md border p-8"><div className="h-4 w-48 bg-muted animate-pulse rounded mb-4" /><div className="h-64 bg-muted animate-pulse rounded" /></div></div>}>
                <RecentActivitySection />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </HydrateClient>
  )
}
