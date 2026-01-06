import 'server-only'; // <-- ensure this file cannot be imported from the client
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/app';
import { createTRPCClient, httpLink } from '@trpc/client';
import { getSession } from '@/lib/auth/services/auth.service';

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

// Create a context function for server-side usage (no fetch options needed)
const getServerContext = async () => {
    const session = await getSession();
    return {
        session,
        userId: session?.userId,
        token: session?.token,
    };
};

export const trpc = createTRPCOptionsProxy({
    ctx: getServerContext,
    router: appRouter,
    queryClient: getQueryClient,
});
// If your router is on a separate server, pass a client:
createTRPCOptionsProxy({
    client: createTRPCClient({
        links: [httpLink({ url: '...' })],
    }),
    queryClient: getQueryClient,
});