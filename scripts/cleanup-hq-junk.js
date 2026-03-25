#!/usr/bin/env node
// Clean up junk HQ records: migrate 2 fitments to clean records, then delete junk

const fs   = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(urlPath, options = {}) {
  const res = await fetch(`${BASE}/rest/v1${urlPath}`, { headers: hdrs, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Clean HQ records inserted by insert-holden-hq.js
const cleanIds = [
  '098f7dd4-ca99-4c5d-ac30-5eec0bb1bcc4', // 173 LC
  '7dfcb9ec-2e47-4914-a31f-33baf666a356', // 173
  'e426cde1-cb82-47f4-8701-ab871ea58b8e', // 202 LC
  '036b6efd-f3c2-42b7-94a1-5a38d0cf4108', // 202
  '8456d88b-2cef-4202-8af7-2b7bed1c733c', // 253 LC
  '0f765192-5f77-447c-ad6d-8f6f31433022', // 253
  'be0c1d5c-495a-4cf4-b3b2-b71060be68ec', // 308
  'b49b6463-191a-4f55-a843-dff79103ba28', // 350
];

const junkIds = [
  '741355b5-4d35-4e71-9b5c-3eedaa6ea55e', // 11OM Custom
  '65e34526-33cf-486b-898a-b921f8b8d211', // 11QE Custom
  '650a5aa9-3445-4b1b-8012-c53da596b3bd', // 11QL Custom
  '1c4e3930-5bda-4484-bfc0-26ba19474646', // 253 HC De Ville
  'be4dbee5-5120-4c57-8e0e-be9f5fb16a56', // 253 LC De Ville
  'cd65f553-d401-4921-a93c-be1e211de68f', // 308 HC De Ville
  '66d8bfcb-7382-450a-8f7b-10f073fbee4d', // 350 HC De Ville
  'd922ad0c-6302-45d7-ac70-7f20428cb958', // null/null (has 2 fitments)
];

const partId = '7c0fcd18-a3d0-4547-9b14-97d9f55b7e45';

async function main() {
  // 1. Add fitments (Front + Rear) to all clean HQ engine variants
  const newFitments = cleanIds.flatMap(vid => [
    { vehicle_id: vid, part_id: partId, position: 'Front', qty: 1 },
    { vehicle_id: vid, part_id: partId, position: 'Rear',  qty: 1 },
  ]);
  await api('/vehicle_part_fitments', {
    method: 'POST',
    headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(newFitments),
  });
  console.log(`Migrated fitments (Front+Rear) to ${cleanIds.length} clean HQ records`);

  // 2. Delete fitments on junk records
  await api(`/vehicle_part_fitments?vehicle_id=in.(${junkIds.join(',')})`, { method: 'DELETE' });
  console.log('Deleted fitments on junk records');

  // 3. Delete junk vehicle records
  await api(`/vehicles?id=in.(${junkIds.join(',')})`, { method: 'DELETE' });
  console.log(`Deleted ${junkIds.length} junk HQ vehicle records`);
}

main().catch(err => { console.error(err); process.exit(1); });
