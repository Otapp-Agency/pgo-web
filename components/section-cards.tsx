'use client';

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardStats } from "@/features/dashboard/types"

interface SectionCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

/**
 * Format a number as currency
 */
function formatCurrency(value: number, currency: string = 'TZS'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number with commas
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Calculate success rate percentage
 */
function calculateSuccessRate(successful: number, total: number): number {
  if (total === 0) return 0;
  return (successful / total) * 100;
}

export function SectionCards({ stats, isLoading }: SectionCardsProps) {
  const currency = stats?.currency || 'TZS';

  // Calculate success rate
  const transactionSuccessRate = stats
    ? calculateSuccessRate(stats.successful_transactions_count, stats.total_transactions_count)
    : 0;

  // Determine trend direction (for demonstration, we'll show positive for >50% success rate)
  const isPositiveTrend = transactionSuccessRate >= 50;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Card 1: Total Transactions Value */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Transactions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <Skeleton className="h-8 w-[140px]" />
            ) : (
              formatCurrency(stats?.total_transactions_value || 0, currency)
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? (
                <Skeleton className="h-4 w-[60px]" />
              ) : (
                <>
                  {formatNumber(stats?.total_transactions_count || 0)} txns
                </>
              )}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isLoading ? (
              <Skeleton className="h-4 w-[120px]" />
            ) : (
              <>
                All transactions value
              </>
            )}
          </div>
          <div className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-[100px]" />
            ) : (
              `Currency: ${currency}`
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Card 2: Successful Transactions */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Successful Transactions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <Skeleton className="h-8 w-[140px]" />
            ) : (
              formatCurrency(stats?.successful_transactions_value || 0, currency)
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? (
                <Skeleton className="h-4 w-[40px]" />
              ) : (
                <>
                  <IconTrendingUp />
                  {formatNumber(stats?.successful_transactions_count || 0)}
                </>
              )}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isLoading ? (
              <Skeleton className="h-4 w-[120px]" />
            ) : (
              <>
                Completed successfully <IconTrendingUp className="size-4" />
              </>
            )}
          </div>
          <div className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-[100px]" />
            ) : (
              `${transactionSuccessRate.toFixed(1)}% success rate`
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Card 3: Total Disbursements */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Disbursements</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <Skeleton className="h-8 w-[140px]" />
            ) : (
              formatCurrency(stats?.total_disbursements_value || 0, currency)
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? (
                <Skeleton className="h-4 w-[60px]" />
              ) : (
                <>
                  {formatNumber(stats?.total_disbursements_count || 0)} disb.
                </>
              )}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isLoading ? (
              <Skeleton className="h-4 w-[120px]" />
            ) : (
              <>
                All disbursements value
              </>
            )}
          </div>
          <div className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-[100px]" />
            ) : (
              `${formatNumber(stats?.successful_disbursements_count || 0)} successful`
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Card 4: Success Rate */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Transaction Success Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <Skeleton className="h-8 w-[80px]" />
            ) : (
              `${transactionSuccessRate.toFixed(1)}%`
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isLoading ? (
                <Skeleton className="h-4 w-[60px]" />
              ) : isPositiveTrend ? (
                <>
                  <IconTrendingUp />
                  Good
                </>
              ) : (
                <>
                  <IconTrendingDown />
                  Low
                </>
              )}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isLoading ? (
              <Skeleton className="h-4 w-[120px]" />
            ) : isPositiveTrend ? (
              <>
                Healthy success rate <IconTrendingUp className="size-4" />
              </>
            ) : (
              <>
                Needs attention <IconTrendingDown className="size-4" />
              </>
            )}
          </div>
          <div className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-[140px]" />
            ) : (
              `${formatNumber(stats?.failed_transactions_count || 0)} failed transactions`
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
