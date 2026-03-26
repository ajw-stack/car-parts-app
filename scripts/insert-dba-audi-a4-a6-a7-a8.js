#!/usr/bin/env node
// DBA Catalogue 2020 — AUDI A4(B7/B8/B9), A4/S4, A4/RS4, A5, A5/S5, A5/RS5,
//   A6(C4/C5/C6/C7), A6/S6, A6/RS6, Allroad, A7, A7/S7, A7/RS7, A8
// Usage: node scripts/insert-dba-audi-a4-a6-a7-a8.js [--dry-run]
//
// Dimensions marked (*) are estimated — verify against physical DBA 2020 catalogue.

const fs   = require('fs');
const path = require('path');
const DRY_RUN = process.argv.includes('--dry-run');

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

function dim({ type, a, b, c, d, e, f }) {
  const minPart = d ? ` (min ${d}mm)` : '';
  return `Ø${a}mm ${type} | Ht ${b}mm | ${c}mm thick${minPart} | CHD ${e}mm | ${f}-bolt`;
}

// A=Diameter B=Height C=Thickness D=MinThickness E=CHD F=Bolts
const PARTS = [
  // ─── A4 B7 fronts ─────────────────────────────────────────────────────────────
  { part_number: 'DBA806',     pos: 'Front', description: dim({ type:'Vented', a:280,   b:46.2, c:22,  d:20,   e:68, f:5 }) },
  { part_number: 'DBA2800',    pos: 'Front', description: dim({ type:'Vented', a:312,   b:46.2, c:25,  d:23,   e:68, f:5 }) },
  { part_number: 'DBA4240',    pos: 'Front', description: dim({ type:'Vented', a:312,   b:52,   c:30,  d:28,   e:68, f:5 }) },
  // ─── A4 B7 rears ──────────────────────────────────────────────────────────────
  { part_number: 'DBA2801E',   pos: 'Rear',  description: dim({ type:'Solid',  a:245,   b:39.8, c:10,  d:8,    e:68, f:5 }) },
  { part_number: 'DBA2802E',   pos: 'Rear',  description: dim({ type:'Solid',  a:240,   b:40,   c:10,  d:8,    e:68, f:5 }) },
  { part_number: 'DBA2825',    pos: 'Rear',  description: dim({ type:'Solid',  a:288,   b:36,   c:12,  d:10,   e:68, f:5 }) },
  // ─── A4 B8/B9 / A5 8T / A6 C7 / A7 fronts ────────────────────────────────────
  { part_number: 'DBA2821',    pos: 'Front', description: dim({ type:'Vented', a:321,   b:52,   c:26,  d:24,   e:68, f:5 }) }, // *estimated
  { part_number: 'DBA2822E',   pos: 'Front', description: dim({ type:'Vented', a:320,   b:52.5, c:30,  d:28,   e:68, f:5 }) },
  { part_number: 'DBA2824',    pos: 'Front', description: dim({ type:'Vented', a:314,   b:52.5, c:25,  d:23,   e:68, f:5 }) },
  { part_number: 'DBA2832E',   pos: 'Front', description: dim({ type:'Vented', a:345,   b:51,   c:30,  d:28,   e:68, f:5 }) },
  { part_number: 'DBA2848E',   pos: 'Front', description: dim({ type:'Vented', a:356,   b:52.1, c:34,  d:31.5, e:68, f:5 }) },
  { part_number: 'DBA3010E',   pos: 'Front', description: dim({ type:'Vented', a:318,   b:57.2, c:30,  d:28,   e:68, f:5 }) },
  // ─── A4 B8/B9 / A5 8T / A6 C7 / A7 rears ─────────────────────────────────────
  { part_number: 'DBA2823',    pos: 'Rear',  description: dim({ type:'Solid',  a:300,   b:36.2, c:12,  d:10,   e:68, f:5 }) },
  { part_number: 'DBA2847E',   pos: 'Rear',  description: dim({ type:'Solid',  a:330,   b:36.2, c:22,  d:20,   e:68, f:5 }) },
  { part_number: 'DBA2849E',   pos: 'Rear',  description: dim({ type:'Vented', a:355,   b:36.3, c:22,  d:20,   e:68, f:5 }) },
  { part_number: 'DBA3012E',   pos: 'Rear',  description: dim({ type:'Solid',  a:300,   b:36.2, c:12,  d:10,   e:68, f:5 }) }, // *estimated
  // ─── S4 / A4-S4 range ─────────────────────────────────────────────────────────
  { part_number: 'DBA4569',    pos: 'Front', description: dim({ type:'Vented', a:345,   b:51,   c:30,  d:28,   e:68, f:5 }) }, // *estimated
  { part_number: 'DBA5575',    pos: 'Front', description: dim({ type:'Vented', a:345,   b:46.2, c:30,  d:28,   e:68, f:5 }) },
  { part_number: 'DBA5575E',   pos: 'Front', description: dim({ type:'Vented', a:345,   b:45.5, c:30,  d:28,   e:68, f:5 }) },
  { part_number: 'DBA42575',   pos: 'Front', description: dim({ type:'Vented', a:345,   b:51,   c:30,  d:28,   e:68, f:5 }) },
  { part_number: 'DBA42576',   pos: 'Rear',  description: dim({ type:'Vented', a:300,   b:36.2, c:22,  d:20,   e:68, f:5 }) },
  // ─── RS4 / RS5 ────────────────────────────────────────────────────────────────
  { part_number: 'DBA52804',   pos: 'Front', description: dim({ type:'Vented', a:323,   b:52,   c:30,  d:28,   e:68, f:5 }) }, // *estimated
  { part_number: 'DBA52832W',  pos: 'Front', description: dim({ type:'Vented', a:345,   b:51,   c:30,  d:28,   e:68, f:5 }) },
  { part_number: 'DBA52834',   pos: 'Front', description: dim({ type:'Vented', a:365,   b:54,   c:34,  d:32,   e:68, f:5 }) },
  { part_number: 'DBA52835',   pos: 'Rear',  description: dim({ type:'Solid',  a:330,   b:41.2, c:22,  d:20,   e:68, f:5 }) },
  { part_number: 'DBA52838.1', pos: 'Front', description: dim({ type:'Vented', a:365,   b:54,   c:34,  d:32,   e:68, f:5 }) }, // *estimated same as 52834
  { part_number: 'DBA52841',   pos: 'Rear',  description: dim({ type:'Solid',  a:330,   b:36.2, c:22,  d:20,   e:68, f:5 }) },
  // ─── A6 C5 / Allroad rears ────────────────────────────────────────────────────
  { part_number: 'DBA2803',    pos: 'Rear',  description: dim({ type:'Solid',  a:255,   b:49,   c:10,  d:8,    e:68, f:5 }) }, // *estimated
  { part_number: 'DBA2805',    pos: 'Rear',  description: dim({ type:'Solid',  a:255,   b:49,   c:10,  d:8,    e:68, f:5 }) }, // *estimated
  // ─── A6 C6 ────────────────────────────────────────────────────────────────────
  { part_number: 'DBA2826E',   pos: 'Front', description: dim({ type:'Vented', a:321,   b:59.4, c:30,  d:28,   e:68, f:5 }) },
  { part_number: 'DBA2827E',   pos: 'Rear',  description: dim({ type:'Solid',  a:302,   b:49.2, c:12,  d:10,   e:68, f:5 }) },
  // ─── A6/S6 C5/C6 range ────────────────────────────────────────────────────────
  { part_number: 'DBA4241',    pos: 'Rear',  description: dim({ type:'Solid',  a:269,   b:43,   c:10,  d:8,    e:68, f:5 }) }, // *estimated
  { part_number: 'DBA52778',   pos: 'Front', description: dim({ type:'Vented', a:345,   b:46.2, c:30,  d:28,   e:68, f:5 }) }, // *estimated
  { part_number: 'DBA2779E',   pos: 'Rear',  description: dim({ type:'Solid',  a:330,   b:36.2, c:22,  d:20,   e:68, f:5 }) },
  // ─── RS6 C7 / RS7 4G ──────────────────────────────────────────────────────────
  { part_number: 'DBA53000',   pos: 'Front', description: dim({ type:'Vented', a:390,   b:60,   c:36,  d:34,   e:68, f:5 }) }, // *height estimated
  { part_number: 'DBA53001',   pos: 'Rear',  description: dim({ type:'Vented', a:356,   b:36.3, c:22,  d:20,   e:68, f:5 }) }, // *height estimated
  { part_number: 'DBA53002',   pos: 'Front', description: dim({ type:'Vented', a:390,   b:60,   c:36,  d:34,   e:68, f:5 }) }, // *height estimated
  { part_number: 'DBA53003',   pos: 'Rear',  description: dim({ type:'Vented', a:356,   b:36.3, c:22,  d:20,   e:68, f:5 }) }, // *height estimated
];

const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));
// DBA807 and DBA810 already exist in DB from insert-dba-audi.js
PART_POSITION['DBA807'] = 'Front';
PART_POSITION['DBA810'] = 'Rear';

// These rear rotors require height verification before ordering
const ROTOR_HEIGHT_CHECK = new Set(['DBA52841', 'DBA52835']);

const VEHICLES = [
  // ─── A4 B7 (2005-2008) ────────────────────────────────────────────────────────
  { model:'A4', series:'B7', year_from:2005, year_to:2008, notes:'1LZ – Front',             parts:['DBA806'] },
  { model:'A4', series:'B7', year_from:2005, year_to:2008, notes:'1ZE – Front',             parts:['DBA807'] },
  { model:'A4', series:'B7', year_from:2005, year_to:2008, notes:'2EH – Front',             parts:['DBA2800'] },
  { model:'A4', series:'B7', year_from:2005, year_to:2008, notes:'1LA – Front',             parts:['DBA4240'] },
  { model:'A4', series:'B7', year_from:2005, year_to:2008, notes:'1KD – Rear',              parts:['DBA2801E'] },
  { model:'A4', series:'B7', year_from:2005, year_to:2008, notes:'1KF – Rear',              parts:['DBA2802E'] },
  { model:'A4', series:'B7', year_from:2005, year_to:2008, notes:'1KW from 8E540001 – Rear', parts:['DBA2825'] },
  // ─── A4 B8 (2008-2015) ────────────────────────────────────────────────────────
  { model:'A4', series:'B8', year_from:2008, year_to:2015, notes:'1LA – Front',             parts:['DBA2824'] },
  { model:'A4', series:'B8', year_from:2008, year_to:2015, notes:'1LJ – Front',             parts:['DBA2822E'] },
  { model:'A4', series:'B8', year_from:2008, year_to:2015, notes:'1LT – Front',             parts:['DBA2832E'] },
  { model:'A4', series:'B8', year_from:2008, year_to:2015, notes:'1LM – Front (Wave)',      parts:['DBA52832W'] },
  { model:'A4', series:'B8', year_from:2008, year_to:2015, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'A4', series:'B8', year_from:2008, year_to:2015, notes:'2ED – Rear',              parts:['DBA2847E'] },
  // ─── A4 B9 (2015-on) ──────────────────────────────────────────────────────────
  { model:'A4', series:'B9', year_from:2015, year_to:null, notes:'1LA – Front',             parts:['DBA2824'] },
  { model:'A4', series:'B9', year_from:2015, year_to:null, notes:'1LJ – Front',             parts:['DBA3010E'] },
  { model:'A4', series:'B9', year_from:2015, year_to:null, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'A4', series:'B9', year_from:2015, year_to:null, notes:'2KW – Rear',              parts:['DBA3012E'] },
  { model:'A4', series:'B9', year_from:2015, year_to:null, notes:'2ED – Rear',              parts:['DBA2847E'] },
  // ─── S4 B5 (1997-2001) ────────────────────────────────────────────────────────
  { model:'S4', series:'B5', year_from:1997, year_to:2001, notes:'Front',                   parts:['DBA2821'] },
  { model:'S4', series:'B5', year_from:1997, year_to:2001, notes:'Front (5000 series)',     parts:['DBA4569'] },
  // ─── S4 B6 (2003-2004) ────────────────────────────────────────────────────────
  { model:'S4', series:'B6', year_from:2003, year_to:2004, notes:'1LT – Front',             parts:['DBA42575'] },
  { model:'S4', series:'B6', year_from:2003, year_to:2004, notes:'1KF – Rear',              parts:['DBA42576'] },
  // ─── S4 B7 (2004-2008) ────────────────────────────────────────────────────────
  { model:'S4', series:'B7', year_from:2004, year_to:2008, notes:'1LT – Front',             parts:['DBA42575'] },
  { model:'S4', series:'B7', year_from:2004, year_to:2008, notes:'1KF – Rear',              parts:['DBA42576'] },
  // ─── S4 B8 (2009-2015) ────────────────────────────────────────────────────────
  { model:'S4', series:'B8', year_from:2009, year_to:2015, notes:'1LJ – Front',             parts:['DBA2822E'] },
  { model:'S4', series:'B8', year_from:2009, year_to:2015, notes:'1LT – Front',             parts:['DBA2832E','DBA5575E'] },
  { model:'S4', series:'B8', year_from:2009, year_to:2015, notes:'1LM – Front (Wave)',      parts:['DBA52832W'] },
  { model:'S4', series:'B8', year_from:2009, year_to:2015, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'S4', series:'B8', year_from:2009, year_to:2015, notes:'2ED – Rear',              parts:['DBA2847E'] },
  // ─── RS4 B5 (2001-2002) ───────────────────────────────────────────────────────
  { model:'RS4', series:'B5', year_from:2001, year_to:2002, notes:'Front',                  parts:['DBA52804'] },
  // ─── RS4 B7 (2006-2008) ───────────────────────────────────────────────────────
  { model:'RS4', series:'B7', year_from:2006, year_to:2008, notes:'Front',                  parts:['DBA52838.1'] },
  { model:'RS4', series:'B7', year_from:2006, year_to:2008, notes:'2ED – Rear',             parts:['DBA52841'] },
  // ─── RS4 B8 (2012-2015) ───────────────────────────────────────────────────────
  { model:'RS4', series:'B8', year_from:2012, year_to:2015, notes:'Front',                  parts:['DBA52834'] },
  { model:'RS4', series:'B8', year_from:2012, year_to:2015, notes:'2ED – Rear',             parts:['DBA52841'] },
  { model:'RS4', series:'B8', year_from:2012, year_to:2015, notes:'2ED alt – Rear',         parts:['DBA52835'] },
  // ─── A5 8T (2007-2016) ────────────────────────────────────────────────────────
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'1LA – Front',             parts:['DBA2824'] },
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'1LJ – Front',             parts:['DBA2822E'] },
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'1ZA – Front',             parts:['DBA2821'] },
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'1LT – Front',             parts:['DBA2832E'] },
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'1LM – Front (Wave)',      parts:['DBA52832W'] },
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'1LL – Front',             parts:['DBA2848E'] },
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'A5', series:'8T', year_from:2007, year_to:2016, notes:'2ED – Rear',              parts:['DBA2847E'] },
  // ─── S5 8T (2007-2016) ────────────────────────────────────────────────────────
  { model:'S5', series:'8T', year_from:2007, year_to:2016, notes:'1LJ – Front',             parts:['DBA2822E'] },
  { model:'S5', series:'8T', year_from:2007, year_to:2016, notes:'1LT – Front',             parts:['DBA2832E','DBA5575E'] },
  { model:'S5', series:'8T', year_from:2007, year_to:2016, notes:'1LM – Front (Wave)',      parts:['DBA52832W'] },
  { model:'S5', series:'8T', year_from:2007, year_to:2016, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'S5', series:'8T', year_from:2007, year_to:2016, notes:'2ED – Rear',              parts:['DBA2847E'] },
  // ─── RS5 8T (2010-2016) ───────────────────────────────────────────────────────
  { model:'RS5', series:'8T', year_from:2010, year_to:2016, notes:'Front',                  parts:['DBA52834'] },
  { model:'RS5', series:'8T', year_from:2010, year_to:2016, notes:'2ED – Rear',             parts:['DBA52841'] },
  { model:'RS5', series:'8T', year_from:2010, year_to:2016, notes:'2ED alt – Rear',         parts:['DBA52835'] },
  // ─── A6 C4 (1994-1997) ────────────────────────────────────────────────────────
  { model:'A6', series:'C4', year_from:1994, year_to:1997, notes:'1ZE – Front',             parts:['DBA807'] },
  { model:'A6', series:'C4', year_from:1994, year_to:1997, notes:'2EH – Front',             parts:['DBA2800'] },
  { model:'A6', series:'C4', year_from:1994, year_to:1997, notes:'1KK – Rear',              parts:['DBA810'] },
  // ─── A6 C5 (1997-2004) ────────────────────────────────────────────────────────
  { model:'A6', series:'C5', year_from:1997, year_to:2004, notes:'1ZE – Front',             parts:['DBA807'] },
  { model:'A6', series:'C5', year_from:1997, year_to:2004, notes:'2EH – Front',             parts:['DBA2800'] },
  { model:'A6', series:'C5', year_from:1997, year_to:2004, notes:'1LT – Front',             parts:['DBA5575'] },
  { model:'A6', series:'C5', year_from:1997, year_to:2004, notes:'1LA – Front',             parts:['DBA4240'] },
  { model:'A6', series:'C5', year_from:1997, year_to:2004, notes:'1KE – Rear',              parts:['DBA2803'] },
  { model:'A6', series:'C5', year_from:1997, year_to:2004, notes:'1KK – Rear',              parts:['DBA810'] },
  // ─── A6 C6 (2004-2011) ────────────────────────────────────────────────────────
  { model:'A6', series:'C6', year_from:2004, year_to:2011, notes:'1LT – Front',             parts:['DBA2826E'] },
  { model:'A6', series:'C6', year_from:2004, year_to:2011, notes:'1KE – Rear',              parts:['DBA2827E'] },
  // ─── A6 C7 (2011-2018) ────────────────────────────────────────────────────────
  { model:'A6', series:'C7', year_from:2011, year_to:2018, notes:'1LJ – Front',             parts:['DBA2822E'] },
  { model:'A6', series:'C7', year_from:2011, year_to:2018, notes:'1LT – Front',             parts:['DBA2832E'] },
  { model:'A6', series:'C7', year_from:2011, year_to:2018, notes:'1LL – Front',             parts:['DBA2848E'] },
  { model:'A6', series:'C7', year_from:2011, year_to:2018, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'A6', series:'C7', year_from:2011, year_to:2018, notes:'2ED – Rear',              parts:['DBA2847E'] },
  { model:'A6', series:'C7', year_from:2011, year_to:2018, notes:'2KW – Rear',              parts:['DBA2849E'] },
  // ─── S6 C5 (2000-2004) ────────────────────────────────────────────────────────
  { model:'S6', series:'C5', year_from:2000, year_to:2004, notes:'1LT – Front',             parts:['DBA5575'] },
  { model:'S6', series:'C5', year_from:2000, year_to:2004, notes:'1KE – Rear',              parts:['DBA2803'] },
  // ─── S6 C6 (2006-2011) ────────────────────────────────────────────────────────
  { model:'S6', series:'C6', year_from:2006, year_to:2011, notes:'1LT – Front',             parts:['DBA5575'] },
  { model:'S6', series:'C6', year_from:2006, year_to:2011, notes:'1LA – Front',             parts:['DBA4240','DBA4241'] },
  { model:'S6', series:'C6', year_from:2006, year_to:2011, notes:'2EH – Front (5000)',      parts:['DBA52778'] },
  { model:'S6', series:'C6', year_from:2006, year_to:2011, notes:'2ED – Rear',              parts:['DBA2779E'] },
  // ─── S6 C7 (2012-2018) ────────────────────────────────────────────────────────
  { model:'S6', series:'C7', year_from:2012, year_to:2018, notes:'1LT – Front',             parts:['DBA2832E'] },
  { model:'S6', series:'C7', year_from:2012, year_to:2018, notes:'1LL – Front',             parts:['DBA2848E'] },
  { model:'S6', series:'C7', year_from:2012, year_to:2018, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'S6', series:'C7', year_from:2012, year_to:2018, notes:'2ED – Rear',              parts:['DBA2847E'] },
  { model:'S6', series:'C7', year_from:2012, year_to:2018, notes:'2KW – Rear',              parts:['DBA2849E'] },
  // ─── RS6 C7 (2013-2018) ───────────────────────────────────────────────────────
  { model:'RS6', series:'C7', year_from:2013, year_to:2018, notes:'Front',                  parts:['DBA53000'] },
  { model:'RS6', series:'C7', year_from:2013, year_to:2018, notes:'Rear',                   parts:['DBA53001'] },
  { model:'RS6', series:'C7', year_from:2013, year_to:2018, notes:'Front (Wave)',            parts:['DBA53002'] },
  { model:'RS6', series:'C7', year_from:2013, year_to:2018, notes:'Rear (Wave)',             parts:['DBA53003'] },
  // ─── Allroad C5 4B (2000-2005) ────────────────────────────────────────────────
  { model:'Allroad', series:'C5', year_from:2000, year_to:2005, notes:'1LT – Front',        parts:['DBA5575'] },
  { model:'Allroad', series:'C5', year_from:2000, year_to:2005, notes:'1KE – Rear',         parts:['DBA2805'] },
  // ─── Allroad C7 4G (2014-2018) ────────────────────────────────────────────────
  { model:'Allroad', series:'4G', year_from:2014, year_to:2018, notes:'2ED – Rear',         parts:['DBA2847E'] },
  { model:'Allroad', series:'4G', year_from:2014, year_to:2018, notes:'2KW – Rear',         parts:['DBA2849E'] },
  // ─── A7 4G (2010-2018) ────────────────────────────────────────────────────────
  { model:'A7', series:'4G', year_from:2010, year_to:2018, notes:'1LJ – Front',             parts:['DBA2822E'] },
  { model:'A7', series:'4G', year_from:2010, year_to:2018, notes:'1LT – Front',             parts:['DBA2832E'] },
  { model:'A7', series:'4G', year_from:2010, year_to:2018, notes:'1LL – Front',             parts:['DBA2848E'] },
  { model:'A7', series:'4G', year_from:2010, year_to:2018, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'A7', series:'4G', year_from:2010, year_to:2018, notes:'2ED – Rear',              parts:['DBA2847E'] },
  { model:'A7', series:'4G', year_from:2010, year_to:2018, notes:'2KW – Rear',              parts:['DBA2849E'] },
  // ─── S7 4G (2012-2018) ────────────────────────────────────────────────────────
  { model:'S7', series:'4G', year_from:2012, year_to:2018, notes:'1LJ – Front',             parts:['DBA2822E'] },
  { model:'S7', series:'4G', year_from:2012, year_to:2018, notes:'1LT – Front',             parts:['DBA2832E'] },
  { model:'S7', series:'4G', year_from:2012, year_to:2018, notes:'1LL – Front',             parts:['DBA2848E'] },
  { model:'S7', series:'4G', year_from:2012, year_to:2018, notes:'1KD – Rear',              parts:['DBA2823'] },
  { model:'S7', series:'4G', year_from:2012, year_to:2018, notes:'2ED – Rear',              parts:['DBA2847E'] },
  { model:'S7', series:'4G', year_from:2012, year_to:2018, notes:'2KW – Rear',              parts:['DBA2849E'] },
  // ─── RS7 4G (2013-2018) ───────────────────────────────────────────────────────
  { model:'RS7', series:'4G', year_from:2013, year_to:2018, notes:'Front (Wave)',            parts:['DBA53002'] },
  { model:'RS7', series:'4G', year_from:2013, year_to:2018, notes:'Rear (Wave)',             parts:['DBA53003'] },
  // ─── A8 D3 (2002-2010) ────────────────────────────────────────────────────────
  { model:'A8', series:'D3', year_from:2002, year_to:2010, notes:'1LT – Front',             parts:['DBA2826E'] },
  { model:'A8', series:'D3', year_from:2002, year_to:2010, notes:'2ED – Rear',              parts:['DBA2847E'] },
  { model:'A8', series:'D3', year_from:2002, year_to:2010, notes:'2KW – Rear',              parts:['DBA2849E'] },
  // ─── A8 D4 (2010-2017) ────────────────────────────────────────────────────────
  { model:'A8', series:'D4', year_from:2010, year_to:2017, notes:'1LJ – Front',             parts:['DBA2826E'] },
  { model:'A8', series:'D4', year_from:2010, year_to:2017, notes:'1LL – Front',             parts:['DBA2848E'] },
  { model:'A8', series:'D4', year_from:2010, year_to:2017, notes:'2ED – Rear',              parts:['DBA2847E'] },
  { model:'A8', series:'D4', year_from:2010, year_to:2017, notes:'2KW – Rear',              parts:['DBA2849E'] },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA AUDI A4-A8 ===');

  // 1. Upsert parts
  console.log('\n--- Parts ---');
  const partRows = PARTS.map(p => ({
    brand: 'DBA', part_number: p.part_number,
    name: `Street Series Rotor ${p.pos}`,
    description: p.description,
    category: 'Brake Rotor', category_id: 31,
  }));

  let upsertedParts;
  if (!DRY_RUN) {
    upsertedParts = await api('/parts?on_conflict=brand,part_number', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(partRows),
    });
    for (const p of upsertedParts) console.log(`  ✓ ${p.part_number}`);
    // Fetch IDs for parts already in DB from insert-dba-audi.js
    const existing = await api('/parts?brand=eq.DBA&part_number=in.(DBA807,DBA810)&select=id,part_number');
    for (const p of existing) upsertedParts.push(p);
  } else {
    for (const p of partRows) console.log(`  ${p.part_number}: ${p.description}`);
    upsertedParts = PARTS.map(p => ({ part_number: p.part_number, id: `(${p.part_number})` }));
    upsertedParts.push({ part_number: 'DBA807', id: '(DBA807)' });
    upsertedParts.push({ part_number: 'DBA810', id: '(DBA810)' });
  }

  const partIdMap = Object.fromEntries(upsertedParts.map(p => [p.part_number, p.id]));

  // 2. Vehicles
  console.log('\n--- Vehicles ---');
  const makes = [...new Set(VEHICLES.map(v => v.model))];
  const allModels = makes.join(',');
  const existing = await api(
    `/vehicles?make=eq.Audi&model=in.(${encodeURIComponent(allModels)})&select=id,model,series,year_from,year_to,notes`
  );

  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Audi', fuel_type: 'ULP',
    series: null, trim_code: null, notes: null,
    engine_litres: null, engine_config: null, engine_kw: null,
    ...v,
  }));

  const existingKeys = new Set(existing.map(v =>
    `${v.model}|${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${(v.notes ?? '').substring(0, 30)}`
  ));
  const toInsert = vehicleRows.filter(v =>
    !existingKeys.has(`${v.model}|${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${(v.notes ?? '').substring(0, 30)}`)
  );
  console.log(`Existing: ${existing.length} | To insert: ${toInsert.length}`);

  let allVehicles = [...existing];
  if (toInsert.length > 0 && !DRY_RUN) {
    const BATCH = 20;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const chunk = toInsert.slice(i, i + BATCH);
      const inserted = await api('/vehicles', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'return=representation' },
        body: JSON.stringify(chunk),
      });
      for (const v of inserted) console.log(`  ✓ ${v.id}  Audi ${v.model} ${v.series ?? ''} ${v.year_from}`);
      allVehicles.push(...inserted);
    }
  } else if (DRY_RUN) {
    for (const v of toInsert) console.log(`  Would insert: Audi ${v.model} ${v.series ?? ''} ${v.year_from} "${v.notes ?? ''}"`);
  }

  if (!DRY_RUN) {
    allVehicles = await api(
      `/vehicles?make=eq.Audi&model=in.(${encodeURIComponent(allModels)})&select=id,model,series,year_from,year_to,notes`
    );
  }

  // 3. Fitments
  console.log('\n--- Fitments ---');
  const fitments = [];
  for (const vDef of VEHICLES) {
    const matches = allVehicles.filter(v =>
      v.model === vDef.model &&
      (vDef.series === null || v.series === vDef.series) &&
      v.year_from === vDef.year_from &&
      String(v.year_to ?? '') === String(vDef.year_to ?? '') &&
      (v.notes ?? '').substring(0, 30) === (vDef.notes ?? '').substring(0, 30)
    );
    for (const v of matches) {
      for (const pn of vDef.parts) {
        const pid = partIdMap[pn];
        if (!pid) { console.warn(`  ⚠ No id for ${pn}`); continue; }
        const fitNotes = ROTOR_HEIGHT_CHECK.has(pn) ? 'Must Check Rear Rotor Height' : null;
        fitments.push({ vehicle_id: v.id, part_id: pid, position: PART_POSITION[pn], qty: 1, notes: fitNotes });
      }
    }
  }
  console.log(`Fitments to create: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    const partIds = [...new Set(fitments.map(f => f.part_id).filter(id => !String(id).startsWith('(')))];
    const existingFit = partIds.length
      ? await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`)
      : [];
    const existSet = new Set(existingFit.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    const newFit = fitments.filter(f => !existSet.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    console.log(`New: ${newFit.length}`);
    if (newFit.length > 0) {
      const BATCH = 200;
      for (let i = 0; i < newFit.length; i += BATCH) {
        await api('/vehicle_part_fitments', {
          method: 'POST',
          headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify(newFit.slice(i, i + BATCH)),
        });
      }
      console.log(`  ✓ Inserted ${newFit.length} fitments`);
      const heightCheckCount = newFit.filter(f => f.notes === 'Must Check Rear Rotor Height').length;
      if (heightCheckCount) console.log(`  ✓ ${heightCheckCount} flagged "Must Check Rear Rotor Height"`);
    }
  } else if (DRY_RUN) {
    const sample = fitments.slice(0, 10);
    for (const f of sample) console.log(`  ${f.vehicle_id} ← ${f.part_id} (${f.position})${f.notes ? ' ⚠ ' + f.notes : ''}`);
    if (fitments.length > 10) console.log(`  ... and ${fitments.length - 10} more`);
  }

  console.log('\nDone.');
}
main().catch(err => { console.error(err); process.exit(1); });
