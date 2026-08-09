#!/usr/bin/env node
/**
 * import-5500.js
 *
 * Imports DOL Form 5500 data into Supabase plans_5500 table.
 *
 * Usage:
 *   node scripts/import-5500.js \
 *     --sf   f_5500sf_2025_latest.csv \
 *     --main f_5500_2025_latest.csv \
 *     --sch-h f_sch_h_2025_latest.csv
 *
 * --sf     Small plans (5500-SF). Includes assets directly. Run this first.
 * --main   Large plans (Form 5500). Needs --sch-h for asset data.
 * --sch-h  Schedule H financial data. Joined to --main via ACK_ID.
 *
 * Setup (run from project root):
 *   npm install csv-parse dotenv
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

// ── Args (parse first so --url and --key are available) ───────────────────────
const allArgs = process.argv.slice(2);
let mainFile, sfFile, schHFile, supabaseUrl, supabaseKey;
for (let i = 0; i < allArgs.length; i++) {
  if (allArgs[i] === '--main')  mainFile    = allArgs[i + 1];
  if (allArgs[i] === '--sf')    sfFile      = allArgs[i + 1];
  if (allArgs[i] === '--sch-h') schHFile    = allArgs[i + 1];
  if (allArgs[i] === '--url')   supabaseUrl = allArgs[i + 1];
  if (allArgs[i] === '--key')   supabaseKey = allArgs[i + 1];
}

const SUPABASE_URL = supabaseUrl || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Pass --url YOUR_SUPABASE_URL --key YOUR_ANON_KEY as arguments.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_STATES = new Set(['GA', 'AL']);
const BATCH_SIZE = 500;

if (!sfFile && !mainFile) {
  console.log('Usage: node scripts/import-5500.js --url YOUR_URL --key YOUR_KEY --sf file.csv [--main file.csv --sch-h file.csv]');
  process.exit(0);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function streamCSV(filePath, onRow) {
  const parser = createReadStream(resolve(filePath)).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true })
  );
  for await (const row of parser) await onRow(row);
}

async function flushBatch(batch) {
  if (!batch.length) return 0;
  // Deduplicate by EIN within the batch — keep last occurrence
  const seen = new Map();
  for (const row of batch) { if (row.ein) seen.set(row.ein, row); }
  const deduped = [...seen.values()];
  const { error } = await supabase
    .from('plans_5500')
    .upsert(deduped, { onConflict: 'ein' });
  if (error) console.error('\nInsert error:', error.message);
  return deduped.length;
}

// ── Step 1: Load Schedule H assets into memory (ACK_ID → assets) ──────────────

const scheduleHAssets = new Map();

async function loadScheduleH(filePath) {
  console.log(`\nLoading Schedule H assets: ${filePath}`);
  let count = 0;

  await streamCSV(filePath, async (row) => {
    const ackId = row['ACK_ID'];
    if (!ackId) return;

    // Try common field name variations
    const assets = parseFloat(
      row['TOT_ASSETS_EOY_AMT'] ||
      row['SCH_H_TOT_ASSETS_EOY_AMT'] ||
      row['TOTAL_ASSETS_EOY'] ||
      0
    );

    if (assets > 0) {
      scheduleHAssets.set(ackId, assets);
      count++;
    }
    if (count % 100000 === 0 && count > 0) {
      process.stdout.write(`\r  Loaded ${count.toLocaleString()} asset records...`);
    }
  });

  console.log(`\r  Loaded ${count.toLocaleString()} Schedule H asset records`);

  // Log a sample record so we can confirm field names worked
  const sample = [...scheduleHAssets.entries()][0];
  if (sample) {
    console.log(`  Sample: ACK_ID=${sample[0]} → $${sample[1].toLocaleString()}`);
  } else {
    console.warn('  WARNING: No assets found. Check that TOT_ASSETS_EOY_AMT exists in the Schedule H file.');
    console.warn('  Share the Schedule H layout file to confirm the correct field name.');
  }
}

// ── Step 2: Import 5500-SF (small plans — assets included) ────────────────────

async function importSF(filePath) {
  console.log(`\nForm 5500-SF (small plans): ${filePath}`);
  let total = 0, imported = 0, skipped = 0, batch = [];

  await streamCSV(filePath, async (row) => {
    total++;

    const state = row['SF_SPONS_US_STATE'] || '';
    if (!TARGET_STATES.has(state)) { skipped++; return; }

    const company = row['SF_SPONSOR_NAME'] || row['SF_PLAN_NAME'] || '';
    const ein     = row['SF_SPONS_EIN'] || '';
    if (!company || !ein) { skipped++; return; }

    const assets       = parseFloat(row['SF_TOT_ASSETS_EOY_AMT'] || 0);
    const participants = parseInt(
      row['SF_TOT_ACT_PARTCP_EOY_CNT'] || row['SF_PARTCP_ACCOUNT_BAL_CNT'] || 0, 10
    );
    const avgBalance = assets > 0 && participants > 0
      ? Math.round(assets / participants) : 0;
    const zip = (row['SF_SPONS_US_ZIP'] || '').replace(/\D/g, '').slice(0, 5);

    batch.push({
      ein,
      company,
      plan_name:   row['SF_PLAN_NAME'] || company,
      assets,
      participants,
      avg_balance: avgBalance,
      plan_year:   (row['SF_PLAN_YEAR_BEGIN_DATE'] || '').slice(0, 4),
      address:     row['SF_SPONS_US_ADDRESS1'] || '',
      city:        row['SF_SPONS_US_CITY'] || '',
      state,
      zip,
      admin_name:  row['SF_ADMIN_SIGNED_NAME'] || row['SF_SPONS_SIGNED_NAME'] || row['SF_ADMIN_NAME'] || company,
      admin_phone: row['SF_ADMIN_PHONE_NUM'] || row['SF_SPONS_PHONE_NUM'] || '',
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await flushBatch(batch);
      batch = [];
      process.stdout.write(`\r  Scanned: ${total.toLocaleString()} | Imported: ${imported.toLocaleString()}`);
    }
  });

  imported += await flushBatch(batch);
  console.log(`\r  Scanned: ${total.toLocaleString()} | Imported: ${imported.toLocaleString()} | Skipped: ${skipped.toLocaleString()}`);
}

// ── Step 3: Import Form 5500 main (large plans — join Schedule H for assets) ──

async function importMain(filePath) {
  const hasSchH = scheduleHAssets.size > 0;
  console.log(`\nForm 5500 (large plans): ${filePath}`);
  console.log(`Asset data: ${hasSchH ? `Schedule H loaded (${scheduleHAssets.size.toLocaleString()} records)` : 'not available — no Schedule H provided'}`);

  let total = 0, imported = 0, skipped = 0, matched = 0, batch = [];

  await streamCSV(filePath, async (row) => {
    total++;

    const state = row['SPONS_DFE_MAIL_US_STATE'] || '';
    if (!TARGET_STATES.has(state)) { skipped++; return; }

    const company = row['SPONSOR_DFE_NAME'] || row['PLAN_NAME'] || '';
    const ein     = row['SPONS_DFE_EIN'] || '';
    if (!company || !ein) { skipped++; return; }

    // Join Schedule H on ACK_ID
    const ackId    = row['ACK_ID'] || '';
    const assets   = scheduleHAssets.get(ackId) || 0;
    if (assets > 0) matched++;

    const participants = parseInt(
      row['TOT_ACTIVE_PARTCP_CNT'] || row['PARTCP_ACCOUNT_BAL_CNT'] || 0, 10
    );
    const avgBalance = assets > 0 && participants > 0
      ? Math.round(assets / participants) : 0;
    const zip = (row['SPONS_DFE_MAIL_US_ZIP'] || '').replace(/\D/g, '').slice(0, 5);

    batch.push({
      ein,
      company,
      plan_name:   row['PLAN_NAME'] || company,
      assets,
      participants,
      avg_balance: avgBalance,
      plan_year:   (row['FORM_PLAN_YEAR_BEGIN_DATE'] || '').slice(0, 4),
      address:     row['SPONS_DFE_MAIL_US_ADDRESS1'] || '',
      city:        row['SPONS_DFE_MAIL_US_CITY'] || '',
      state,
      zip,
      admin_name:  row['ADMIN_SIGNED_NAME'] || row['SPONS_SIGNED_NAME'] || row['ADMIN_NAME'] || company,
      admin_phone: row['ADMIN_PHONE_NUM'] || row['SPONS_DFE_PHONE_NUM'] || '',
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await flushBatch(batch);
      batch = [];
      process.stdout.write(`\r  Scanned: ${total.toLocaleString()} | Imported: ${imported.toLocaleString()} | Asset matches: ${matched.toLocaleString()}`);
    }
  });

  imported += await flushBatch(batch);
  console.log(`\r  Scanned: ${total.toLocaleString()} | Imported: ${imported.toLocaleString()} | Asset matches: ${matched.toLocaleString()} | Skipped: ${skipped.toLocaleString()}`);
}

// ── Run ────────────────────────────────────────────────────────────────────────

console.log(`Targeting states: ${[...TARGET_STATES].join(', ')}`);
console.log('Clearing existing data for target states...');

const { error: clearErr } = await supabase
  .from('plans_5500')
  .delete()
  .in('state', [...TARGET_STATES]);

if (clearErr) console.warn('Clear warning:', clearErr.message);

// Load Schedule H first so assets are ready when we process the main file
if (schHFile) await loadScheduleH(schHFile);

if (sfFile)   await importSF(sfFile);
if (mainFile) await importMain(mainFile);

console.log('\nImport complete. Open Reach and run a Prospect search to verify.');
