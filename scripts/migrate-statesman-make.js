// Migrate WB Statesman records from make='Holden', model='Statesman', series='WB'
// to make='Statesman', model='WB', series='WB'
// Statesman was a separate automotive marque 1971-1985

const SUPABASE_URL = 'https://plkaokszdkgpyecgjkiw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  // Fetch current WB Statesman records
  const records = await apiFetch('/vehicles?make=eq.Holden&model=eq.Statesman&series=eq.WB&select=id,make,model,series,grade,trim_code,engine_code,year_from,year_to');
  console.log(`Found ${records.length} WB Statesman records to migrate`);

  for (const r of records) {
    console.log(`  Migrating: ${r.grade} ${r.engine_code} (${r.id})`);
    await apiFetch(`/vehicles?id=eq.${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ make: 'Statesman', model: 'WB' }),
    });
  }

  console.log('Done. Verifying...');
  const after = await apiFetch('/vehicles?make=eq.Statesman&model=eq.WB&select=id,make,model,series,grade,engine_code');
  console.log('Statesman WB records:', JSON.stringify(after, null, 2));
}

main().catch(console.error);
