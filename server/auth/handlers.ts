import type { Request, Response } from 'express';
import type { User, PublicUser } from '../types/db';

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
  };
}

export function meHandler(req: Request, res: Response): void {
  // requireAuth has already guaranteed req.user is set when this runs.
  const user = req.user as User;
  res.status(200).json({ user: toPublicUser(user) });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'Could not sign you out. Please try again.' });
        resolve();
        return;
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ ok: true });
      resolve();
    });
  });
}
