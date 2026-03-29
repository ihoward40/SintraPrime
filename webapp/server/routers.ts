import { AppRouter } from './app-router';
import { twoFactorRouter } from './two-factor-router';

const appRouter = new AppRouter();

// Register the twoFactorRouter
appRouter.registerRouter({
  twoFactor: twoFactorRouter,
});

// Remove trkFactorRouter and troFactorRouter
// Note: Additional logic for removing them should be placed here if needed
