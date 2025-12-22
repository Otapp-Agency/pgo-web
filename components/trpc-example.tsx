'use client';

import { trpc } from '@/lib/trpc/client';

export function TrpcExample() {
  // Example usage of the hello procedure
  const helloQuery = trpc.hello.useQuery({ name: 'World' });

  // Example usage of disbursements procedures
  const disbursementsQuery = trpc.disbursements.list.useQuery({
    page: 1,
    per_page: 5
  });

  if (helloQuery.isLoading) return <div>Loading hello...</div>;
  if (helloQuery.error) return <div>Error: {helloQuery.error.message}</div>;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">tRPC Integration Example</h3>

      <div className="space-y-4">
        {/* Hello procedure example */}
        <div>
          <h4 className="font-medium">Hello Procedure:</h4>
          <p className="text-sm text-muted-foreground">{helloQuery.data?.message}</p>
        </div>

        {/* Disbursements list example */}
        <div>
          <h4 className="font-medium">Disbursements List:</h4>
          {disbursementsQuery.isLoading && <p>Loading disbursements...</p>}
          {disbursementsQuery.error && (
            <p className="text-red-500">Error: {disbursementsQuery.error.message}</p>
          )}
          {disbursementsQuery.data && (
            <div className="text-sm">
              <p>Total: {disbursementsQuery.data.totalElements} disbursements</p>
              <p>Page: {disbursementsQuery.data.pageNumber} of {disbursementsQuery.data.totalPages}</p>
              <ul className="mt-2 space-y-1">
                {disbursementsQuery.data.data.slice(0, 3).map((disbursement) => (
                  <li key={disbursement.id} className="text-xs">
                    {disbursement.id}: {disbursement.merchantDisbursementId} - {disbursement.amount}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}