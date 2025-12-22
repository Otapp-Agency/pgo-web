import { z } from 'zod';
import { createTRPCRouter } from '../init';
import { disbursementsRouter } from './disbursements';
import { gatewaysRouter } from './gateways';
import { merchantsRouter } from './merchants';
import { transactionsRouter } from './transactions';
import { usersRouter } from './users';

export const appRouter = createTRPCRouter({
  // Feature routers
  disbursements: disbursementsRouter,
  gateways: gatewaysRouter,
  merchants: merchantsRouter,
  transactions: transactionsRouter,
  users: usersRouter,

  // Add more routers here as you migrate features
});

export type AppRouter = typeof appRouter;