import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type postgres from 'postgres';
import type { Config } from '../utils/env';
import type { User } from '../types/db';
import { upsertUserFromGoogleProfile } from './upsertUser';

export function configurePassport(config: Config, sql: postgres.Sql): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await upsertUserFromGoogleProfile(sql, {
            id: profile.id,
            displayName: profile.displayName,
            emails: profile.emails ?? [],
            photos: profile.photos,
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

  passport.serializeUser<string>((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser<string>(async (id, done) => {
    try {
      const rows = await sql<User[]>`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      const user = rows[0];
      if (!user) {
        done(null, false);
        return;
      }
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  });
}
