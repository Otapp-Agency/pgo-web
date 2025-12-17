'use client';

import { ErrorPage1 } from "@/components/error-page-1";
import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return <ErrorPage1 error={error} reset={reset} />;
}
