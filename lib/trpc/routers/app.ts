import { createTRPCRouter } from '../init';
import { authRouter } from './auth';
import { dashboardRouter } from './dashboard';
import { disbursementsRouter } from './disbursements';
import { gatewaysRouter } from './gateways';
import { logsRouter } from './logs';
import { merchantsRouter } from './merchants';
import { transactionsRouter } from './transactions';
import { usersRouter } from './users';

export const appRouter = createTRPCRouter({
  // Auth router
  auth: authRouter,
  // Feature routers
  dashboard: dashboardRouter,
  disbursements: disbursementsRouter,
  gateways: gatewaysRouter,
  logs: logsRouter,
  merchants: merchantsRouter,
  transactions: transactionsRouter,
  users: usersRouter,

  // Add more routers here as you migrate features
});

export type AppRouter = typeof appRouter;