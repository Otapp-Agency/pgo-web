'use client';

import { ErrorBoundary } from 'react-error-boundary';

export function PaymentGatewayErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<div className="px-4 lg:px-6 py-4 text-muted-foreground">Failed to load payment gateways</div>}>
      {children}
    </ErrorBoundary>
  );
}





