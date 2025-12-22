import { TRPCError, initTRPC } from '@trpc/server';
import { cache } from 'react';
// import superjson from 'superjson';
import { getSession } from '@/lib/auth/services/auth.service';

export const createTRPCContext = cache(async (opts?: { headers: Headers }) => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const session = await getSession();

  return {
    session,
    userId: session?.userId,
    token: session?.token,
  };
});

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<typeof createTRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ next, ctx }) => {
  if (!ctx?.session?.token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No valid session found' });
  }
  return next({ ctx });
});