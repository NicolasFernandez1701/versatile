#!/usr/bin/env node
/**
 * Verifies that every RPC the client calls exists in the linked Supabase project.
 *
 * PostgREST answers PGRST202 ("Could not find the function ... in the schema
 * cache") when the function is missing, and any other status when it exists.
 * A probe with dummy parameters is therefore enough to detect a migration file
 * that was committed but never applied to the database.
 *
 * The probes cannot write anything: every function these RPCs expose validates
 * the caller first, and an anonymous probe has auth.uid() = null, so the guards
 * reject it before touching a row.
 *
 * Usage: npm run db:verify
 */
import { readFileSync } from 'node:fs';

const REQUIRED_RPCS = [
  {
    name: 'save_teacher_onboarding_details',
    migration: '007_save_teacher_onboarding_rpc.sql',
    payload: { p_address: null, p_birth_date: null, p_specialties: [] },
    usedBy: 'teacher onboarding (step 3)',
  },
  {
    name: 'unlink_studio_member',
    migration: '006_unlink_studio_member_rpc.sql',
    payload: { p_studio_id: null, p_user_id: null },
    usedBy: 'unlinking a teacher from the studio',
  },
  {
    name: 'get_financial_balance',
    migration: '001_multi_tenant.sql',
    payload: { query_year: 2000, query_month: 1, p_studio_id: null },
    usedBy: 'admin dashboard finances',
  },
];

function readEnv() {
  const env = {};
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index).trim()] = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return env;
}

async function probe(url, anonKey, rpc) {
  const response = await fetch(`${url}/rest/v1/rpc/${rpc.name}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rpc.payload),
  });

  const body = await response.text();

  // PGRST202 means PostgREST could not resolve the function: the migration is missing.
  const missing =
    body.includes('PGRST202') || (response.status === 404 && body.includes('schema cache'));

  return { status: response.status, missing, body: body.slice(0, 200) };
}

const env = readEnv();
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log(`Checking ${REQUIRED_RPCS.length} RPCs against ${url}\n`);

let missingCount = 0;

for (const rpc of REQUIRED_RPCS) {
  const result = await probe(url, anonKey, rpc);

  if (result.missing) {
    missingCount += 1;
    console.log(`MISSING  ${rpc.name}`);
    console.log(`         migration not applied: ${rpc.migration}`);
    console.log(`         breaks: ${rpc.usedBy}\n`);
  } else {
    console.log(`ok       ${rpc.name}  (HTTP ${result.status})\n`);
  }
}

if (missingCount > 0) {
  console.error(
    `\n${missingCount} RPC(s) missing. Apply the migrations listed above, then re-run this check.`,
  );
  console.error("If a function still answers 404 right after being created: NOTIFY pgrst, 'reload schema';");
  process.exit(1);
}

console.log('All required RPCs are present.');
