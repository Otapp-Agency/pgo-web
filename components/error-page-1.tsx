import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/empty";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

interface ErrorPage1Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorPage1({ error, reset }: ErrorPage1Props) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconAlertTriangle className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            {error.message || "An unexpected error occurred. Please try again."}
          </EmptyDescription>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={reset}>
            <IconRefresh className="mr-2 size-4" />
            Try Again
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

