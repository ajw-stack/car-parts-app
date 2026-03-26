// Update VQ Statesman records with grade variants and correct technical data
// Source: user-provided specs - 3.8L V6 LN3 127kW, 5.0L V8 HEC 165kW, 1990-1994
// Grades: Statesman and Caprice

const SUPABASE_URL = 'https://plkaokszdkgpyecgjkiw.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function api(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const VQ_V6_ID = '8b41f888-4a7c-480d-9952-16aab376c31e'; // LN3 3.8L V6
const VQ_V8_ID = '4c344ee5-b8bf-4ae5-b265-fa57d760685a'; // LB9 5.0L V8

async function main() {
  // Step 1: Update existing records to Statesman grade with corrected tech data
  console.log('Updating V6 record to Statesman grade...');
  await api(`/vehicles?id=eq.${VQ_V6_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({
      grade: 'Statesman',
      trim_code: 'Statesman',
      engine_kw: 127,
      year_to: 1994,
      specs: { engine_description: '3800 Series II V6 (LN3)' },
    }),
  });

  console.log('Updating V8 record to Statesman grade...');
  await api(`/vehicles?id=eq.${VQ_V8_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({
      grade: 'Statesman',
      trim_code: 'Statesman',
      engine_kw: 165,
      year_to: 1994,
      specs: { engine_description: 'HEC 5000i V8' },
    }),
  });

  // Step 2: Insert Caprice grade variants
  const capriceVehicles = [
    {
      make: 'Holden', model: 'Statesman', series: 'VQ',
      grade: 'Caprice', trim_code: 'Caprice',
      engine_code: 'LN3', engine_litres: 3.8, engine_config: 'V6', engine_kw: 127,
      fuel_type: 'ULP', year_from: 1990, year_to: 1994,
      notes: 'Sedan',
      specs: { engine_description: '3800 Series II V6 (LN3)' },
    },
    {
      make: 'Holden', model: 'Statesman', series: 'VQ',
      grade: 'Caprice', trim_code: 'Caprice',
      engine_code: 'LB9', engine_litres: 5.0, engine_config: 'V8', engine_kw: 165,
      fuel_type: 'ULP', year_from: 1990, year_to: 1994,
      notes: 'Sedan',
      specs: { engine_description: 'HEC 5000i V8' },
    },
  ];

  console.log('Inserting Caprice V6 and V8...');
  const inserted = await api('/vehicles', {
    method: 'POST',
    body: JSON.stringify(capriceVehicles),
  });

  const capriceV6Id = inserted.find(v => v.engine_code === 'LN3').id;
  const capriceV8Id = inserted.find(v => v.engine_code === 'LB9').id;
  console.log(`  Caprice V6: ${capriceV6Id}`);
  console.log(`  Caprice V8: ${capriceV8Id}`);

  // Step 3: Copy fitments from Statesman to Caprice variants
  // Fetch existing fitments
  const fitments = await api(`/vehicle_part_fitments?vehicle_id=in.(${VQ_V6_ID},${VQ_V8_ID})&select=vehicle_id,part_id,position,qty,notes`);
  console.log(`Copying ${fitments.length} fitments to Caprice variants...`);

  const newFitments = fitments.map(f => ({
    vehicle_id: f.vehicle_id === VQ_V6_ID ? capriceV6Id : capriceV8Id,
    part_id: f.part_id,
    position: f.position,
    qty: f.qty,
    notes: f.notes,
  }));

  await api('/vehicle_part_fitments', {
    method: 'POST',
    body: JSON.stringify(newFitments),
  });

  // Step 4: Update WB Statesman records with engine descriptions
  console.log('Updating WB Statesman engine descriptions...');
  const wbEngineDescs = {
    '202': '3.3L Inline 6 (202)',
    '253': '4.2L V8 (253)',
    '308': '5.0L V8 (308)',
  };

  const wbRecords = await api('/vehicles?make=eq.Holden&model=eq.Statesman&series=eq.WB&select=id,engine_code');
  for (const r of wbRecords) {
    const desc = wbEngineDescs[r.engine_code];
    if (desc) {
      await api(`/vehicles?id=eq.${r.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ specs: { engine_description: desc } }),
      });
      console.log(`  WB ${r.engine_code}: "${desc}"`);
    }
  }

  // Also update WB commercial records
  const wbCommRecords = await api('/vehicles?make=eq.Holden&model=eq.WB&select=id,engine_code,grade');
  for (const r of wbCommRecords) {
    const desc = wbEngineDescs[r.engine_code];
    if (desc) {
      await api(`/vehicles?id=eq.${r.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ specs: { engine_description: desc } }),
      });
      console.log(`  WB commercial ${r.grade} ${r.engine_code}: "${desc}"`);
    }
  }

  console.log('\nDone. Verifying VQ records...');
  const final = await api('/vehicles?make=eq.Holden&model=eq.Statesman&series=eq.VQ&select=id,grade,engine_code,engine_kw,year_from,year_to,specs');
  for (const v of final) {
    console.log(`  ${v.grade} ${v.engine_code} ${v.engine_kw}kW ${v.year_from}-${v.year_to} specs:${JSON.stringify(v.specs)}`);
  }
}

main().catch(console.error);
