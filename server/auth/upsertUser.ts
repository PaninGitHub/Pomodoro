import type postgres from 'postgres';
import type { User } from '../types/db';

export interface GoogleProfile {
  id: string;
  emails: { value: string }[];
  displayName: string;
  photos?: { value: string }[];
}

export async function upsertUserFromGoogleProfile(
  sql: postgres.Sql,
  profile: GoogleProfile
): Promise<User> {
  const email = profile.emails[0]?.value;
  if (!email) {
    throw new Error('Google profile is missing email');
  }
  const avatarUrl = profile.photos?.[0]?.value ?? null;

  const existing = await sql<User[]>`
    SELECT * FROM users WHERE google_id = ${profile.id} LIMIT 1
  `;

  if (existing.length === 0) {
    const inserted = await sql<User[]>`
      INSERT INTO users (google_id, email, display_name, avatar_url)
      VALUES (${profile.id}, ${email}, ${profile.displayName}, ${avatarUrl})
      RETURNING *
    `;
    const row = inserted[0];
    if (!row) throw new Error('User insert returned no row');
    return row;
  }

  const updated = await sql<User[]>`
    UPDATE users SET last_login_at = NOW()
    WHERE google_id = ${profile.id}
    RETURNING *
  `;
  const row = updated[0];
  if (!row) throw new Error('User update returned no row');
  return row;
}
