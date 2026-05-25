// One-shot DB inspection. Local-only, not committed.
const postgres = require('postgres');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    const users = await sql`SELECT id, email, display_name, role, created_at, last_login_at FROM users`;
    console.log('USERS:');
    console.table(users);

    const sessionCount = await sql`SELECT COUNT(*)::int as n FROM session`;
    console.log(`SESSIONS active: ${sessionCount[0].n}`);

    const migrations = await sql`SELECT filename, applied_at FROM _migrations ORDER BY filename`;
    console.log('MIGRATIONS:');
    console.table(migrations);
  } finally {
    await sql.end({ timeout: 5 });
  }
})();
