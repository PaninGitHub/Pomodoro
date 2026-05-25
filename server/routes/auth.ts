import { Router } from 'express';
import passport from 'passport';
import type { Config } from '../utils/env';
import { requireAuth } from '../middleware/requireAuth';
import { meHandler, logoutHandler } from '../auth/handlers';

export function buildAuthRouter(config: Config): Router {
  const router = Router();

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${config.clientUrl}?error=auth_failed`,
      session: true,
    }),
    (_req, res) => {
      res.redirect(config.clientUrl);
    }
  );

  router.get('/me', requireAuth, meHandler);

  router.post('/logout', requireAuth, logoutHandler);

  return router;
}
