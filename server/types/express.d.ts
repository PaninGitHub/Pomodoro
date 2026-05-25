// Extends Express.User to our domain User type.
// passport.deserializeUser hydrates req.user from the User table.

declare global {
  namespace Express {
    interface User extends import('./db').User {}
  }
}

export {};
