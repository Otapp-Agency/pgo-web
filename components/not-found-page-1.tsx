import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/empty";
import { IconHome, IconFileUnknown } from "@tabler/icons-react";

export function NotFoundPage1() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconFileUnknown className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Page Not Found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard">
              <IconHome className="mr-2 size-4" />
              Back to Dashboard
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
