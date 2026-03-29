import { router } from './trpc';
import { authRouter } from './routers/auth';
import { subscriptionRouter } from './routers/subscriptionBilling';
import { autonomousRouter } from './autonomous/router';
import { jurisdictionRouter } from './routers/jurisdictionRouter';
import { twoFactorRouter } from './two-factor-router';
import { jwtAuthRouter } from './routers/jwtAuthRouter';
import { stripeRouter } from './routers/stripe';
import { pacerRouter } from './routers/pacer';
import { documentsRouter } from './routers/documents';
import { caseFilingRouter } from './routers/caseFiling';
import { caseActivitiesRouter } from './routers/caseActivities';
import { casesRouter } from './routers/cases';
import { workflowRouter } from './routers/workflow';
import { triggerRouter } from './routers/trigger';
import { notificationRouter } from './routers/notification';
import { researchRouter } from './routers/research';
import { syncRouter } from './routers/sync';
import { adapterRouter } from './routers/adapter';
import { legalAlertsRouter } from './routers/legalAlerts';
import { userSettingsRouter } from './routers/userSettings';
import { teamMembersRouter } from './routers/teamMembers';
import { documentIntelligenceRouter } from './routers/documentIntelligence';
import { workspacesRouter } from './routers/workspaces';
import { notebookRouter } from './routers/notebook';

export const appRouter = router({
  auth: authRouter,
  subscription: subscriptionRouter,
  autonomous: autonomousRouter,
  jurisdiction: jurisdictionRouter,
  twoFactor: twoFactorRouter,
  jwtAuth: jwtAuthRouter,
  stripe: stripeRouter,
  pacer: pacerRouter,
  documents: documentsRouter,
  caseFiling: caseFilingRouter,
  caseActivities: caseActivitiesRouter,
  cases: casesRouter,
  workflow: workflowRouter,
  trigger: triggerRouter,
  notification: notificationRouter,
  research: researchRouter,
  sync: syncRouter,
  adapter: adapterRouter,
  legalAlerts: legalAlertsRouter,
  userSettings: userSettingsRouter,
  teamMembers: teamMembersRouter,
  documentIntelligence: documentIntelligenceRouter,
  workspaces: workspacesRouter,
  notebook: notebookRouter,
});

export type AppRouter = typeof appRouter;
