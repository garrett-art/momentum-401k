#!/usr/bin/env node
/**
 * import-5500.js
 *
 * Imports DOL Form 5500 CSV data into Supabase plans_5500 table.
 * Run this once after downloading the CSV, and again each year when
 * the DOL publishes new data.
 *
 * Usage:
 *   node scripts/import-5500.js path/to/f5500_2023.csv
 *
 * Download the CSV from:
 *   https://www.dol.gov/agencies/ebsa/researchers/analysis/form-5500
 *   Look for "Form 5500 Series Data Sets" → most recent year → CSV download
 *   You want BOTH files:
 *     - F_5500_YYYY.csv  (large plans, 100+ participants)
 *     - F_5500SF_YYYY.csv (small plans, under 100 participants)
 *   Run this script once for each file.
 *
 * Requirements:
 *   npm install csv-parse @supabase/supabase-js dotenv
 *
 * Environment (reads from .env.local):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   (or set SUPABASE_SERVICE_ROLE_KEY for faster inserts bypassing RLS)
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load env from .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// States to import — expand as you prospect new markets
const TARGET_STATES = new Set(['GA', 'AL']);

// Batch size for Supabase inserts
const BATCH_SIZE = 500;

// Column name variations between Form 5500 and 5500-SF
function getField(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function parseRow(row) {
  const state = getField(row, 'SPONS_DFE_MAIL_US_STATE', 'SPONS_US_STATE');
  if (!TARGET_STATES.has(state)) return null;

  const assets = parseFloat(
    getField(row, 'TOT_ASSETS_EOY_AMT', 'NET_ASSETS', 'SCHD_H_TOT_ASSETS_EOY_AMT') || 0
  );
  const participants = parseInt(
    getField(row, 'TOT_ACTIVE_PARTCP_CNT', 'TOT_PARTCP_EOY_CNT', 'PARTCP_ACCOUNT_BAL_CNT') || 0,
    10
  );

  if (assets <= 0) return null;

  const company = getField(row,
    'SPONSOR_DFE_NAME', 'SPONS_DFE_NAME', 'BUSINESS_NAME', 'PLAN_NAME'
  );
  if (!company) return null;

  const avgBalance = participants > 0 ? Math.round(assets / participants) : 0;
  const ein = getField(row, 'SPONSOR_EIN', 'SPONS_EIN', 'EIN');
  const zip = getField(row,
    'SPONS_DFE_MAIL_US_ZIP5', 'SPONS_US_ZIP5', 'SPONS_ZIP'
  ).toString().slice(0, 5);

  return {
    ein,
    company,
    plan_name: getField(row, 'PLAN_NAME') || company,
    assets,
    participants,
    avg_balance: avgBalance,
    plan_year: getField(row, 'PLAN_YEAR_BEGIN_DATE', 'PLAN_YR').slice(0, 4),
    address: getField(row, 'SPONS_DFE_MAIL_US_ADDR1', 'SPONS_US_ADDR1'),
    city: getField(row, 'SPONS_DFE_MAIL_US_CITY', 'SPONS_US_CITY'),
    state,
    zip,
    admin_name: getField(row, 'PLAN_ADMIN_NAME', 'ADMIN_NAME') || company,
    admin_phone: getField(row, 'SPONS_DFE_PHONE_NUM', 'SPONS_PHONE_NUM'),
  };
}

async function importFile(filePath) {
  console.log(`\nImporting: ${filePath}`);
  console.log(`Filtering to states: ${[...TARGET_STATES].join(', ')}`);

  let total = 0;
  let imported = 0;
  let skipped = 0;
  let batch = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    const { error } = await supabase.from('plans_5500').upsert(batch, {
      onConflict: 'ein',
      ignoreDuplicates: false,
    });
    if (error) {
      console.error('Insert error:', error.message);
    } else {
      imported += batch.length;
      process.stdout.write(`\r  Imported: ${imported} plans...`);
    }
    batch = [];
  }

  const parser = createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true })
  );

  for await (const row of parser) {
    total++;
    const parsed = parseRow(row);
    if (!parsed) { skipped++; continue; }

    batch.push(parsed);
    if (batch.length >= BATCH_SIZE) await flushBatch();
  }

  await flushBatch();

  console.log(`\n  Done. Total rows: ${total} | Imported: ${imported} | Skipped: ${skipped}`);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/import-5500.js path/to/F_5500_YYYY.csv [path/to/F_5500SF_YYYY.csv]');
  console.log('\nDownload from: https://www.dol.gov/agencies/ebsa/researchers/analysis/form-5500');
  process.exit(0);
}

// Clear existing data for a clean import
console.log('Clearing existing plans_5500 data...');
const { error: clearError } = await supabase
  .from('plans_5500')
  .delete()
  .in('state', [...TARGET_STATES]);

if (clearError) console.warn('Clear warning:', clearError.message);

for (const filePath of args) {
  await importFile(filePath);
}

console.log('\nImport complete. Run a prospect search to verify.');
