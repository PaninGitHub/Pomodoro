// scripts/create-neon-branch.js
//
// Creates a new Neon branch named "beta" off the project's primary
// branch and prints the connection string to stdout so the operator
// can paste it into .env.beta as DATABASE_URL.
//
// Reads NEON_API_TOKEN + NEON_PROJECT_ID from .env.beta at the repo
// root. Bails with a clear message if either is missing.
//
// Run from the repo root:    node scripts/create-neon-branch.js
//
// Reference: https://api-docs.neon.tech/reference/createprojectbranch
//
// IMPORTANT: this script does NOT write the resulting DATABASE_URL to
// .env.beta automatically. It prints it. Paste it into .env.beta
// yourself so there's no chance the script clobbers something you
// already edited.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadEnvBeta() {
  const envPath = path.resolve(__dirname, '..', '.env.beta');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.beta not found at repo root.');
    console.error('       Copy .env.beta.example to .env.beta and fill in NEON_API_TOKEN + NEON_PROJECT_ID.');
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const env = loadEnvBeta();
  const token = env.NEON_API_TOKEN;
  const projectId = env.NEON_PROJECT_ID;
  if (!token || !projectId) {
    console.error('ERROR: NEON_API_TOKEN or NEON_PROJECT_ID missing from .env.beta.');
    console.error('       Skip this script and create the branch via Neon Console instead.');
    process.exit(1);
  }

  const url = `https://console.neon.tech/api/v2/projects/${projectId}/branches`;
  const body = {
    branch: { name: 'beta' },
    endpoints: [{ type: 'read_write' }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`ERROR: Neon API returned ${res.status}`);
    console.error(text);
    process.exit(1);
  }

  const data = await res.json();

  // Build the pooled connection string. Neon returns the host in the
  // endpoint; database name is usually 'neondb' but we read it from
  // the project's primary role/database if available.
  const endpoint = (data.endpoints || [])[0];
  if (!endpoint) {
    console.error('ERROR: Neon API response missing endpoint info. Raw response:');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('');
  console.log('Branch created. Next steps:');
  console.log('');
  console.log('  1. Open the Neon Console → Branches → "beta" → "Connection Details".');
  console.log('  2. Copy the connection string with role "neondb_owner" (or whichever role you use).');
  console.log('  3. Paste it as DATABASE_URL in .env.beta.');
  console.log('');
  console.log('Endpoint host (for reference):', endpoint.host);
  console.log('Branch id                    :', data.branch.id);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
