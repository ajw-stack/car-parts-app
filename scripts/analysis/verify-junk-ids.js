#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const env = {};
for (const l of fs.readFileSync(path.join(__dirname,'..','..', '.env.local'), 'utf8').split('\n')) {
  const m = l.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function main() {
  const encoded = encodeURIComponent('(AUTO,COUPE,DRUM,HYBRID,CDI,SEDAN,MY01)');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?model=in.${encoded}&select=id,make,model,year_from,year_to&order=make.asc,model.asc`,
    { headers }
  );
  const rows = await res.json();
  for (const v of rows) {
    console.log(`${v.id}  ${v.make} | ${v.model} | ${v.year_from}-${v.year_to || 'ON'}`);
  }
  console.log(`\nTotal: ${rows.length}`);
}
main().catch(e => { console.error(e); process.exit(1); });
