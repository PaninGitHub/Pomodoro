// Types mirror the DB schema exactly. Update on every migration.

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: Date;
  last_login_at: Date | null;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'display_name' | 'avatar_url'>;
