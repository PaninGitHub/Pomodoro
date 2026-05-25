// Hits /api/health on the local dev server. Exits 0 on success, 1 on failure.
// Node 20+ has fetch built-in; no dependencies.

const url = process.env.SMOKE_URL || 'http://localhost:3001/api/health';

async function main() {
  try {
    const res = await fetch(url);
    if (res.status !== 200) {
      console.error(`SMOKE FAIL: ${url} returned status ${res.status}`);
      process.exit(1);
    }
    const body = await res.json();
    if (body.status !== 'ok') {
      console.error(`SMOKE FAIL: body was ${JSON.stringify(body)}`);
      process.exit(1);
    }
    console.log(`SMOKE OK: ${url} → ${JSON.stringify(body)}`);
    process.exit(0);
  } catch (err) {
    console.error(`SMOKE FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

void main();
