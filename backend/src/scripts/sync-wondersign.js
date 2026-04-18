/**
 * Wondersign → Database Sync Script
 *
 * Thin CLI wrapper around the sync service.
 *
 * Usage:
 *   node src/scripts/sync-wondersign.js              # auto (incremental if possible, else full)
 *   node src/scripts/sync-wondersign.js --full        # force full sync
 *   node src/scripts/sync-wondersign.js --incremental # force incremental sync
 *
 * Env:
 *   WONDERSIGN_MODE=mock (default) or live
 */

import prisma from '../shared/config/db.js';
import { runFullSync, runIncrementalSync } from '../shared/services/sync.service.js';

function parseSyncType() {
  const args = process.argv.slice(2);
  if (args.includes('--full')) return 'full';
  if (args.includes('--incremental')) return 'incremental';
  return 'auto';
}

async function main() {
  const envMode = process.env.WONDERSIGN_MODE || 'mock';
  const requestedType = parseSyncType();

  console.log(`🔄 Wondersign Sync (env: ${envMode}, requested: ${requestedType})`);
  console.log('─'.repeat(50));

  try {
    let result;

    if (requestedType === 'full') {
      result = await runFullSync();
    } else if (requestedType === 'incremental') {
      result = await runIncrementalSync();
    } else {
      // auto: try incremental, service falls back to full if no previous sync
      result = await runIncrementalSync();
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ ${result.type} complete in ${result.elapsed}s`);
    console.log(`   ${result.created} created, ${result.updated} updated, ${result.variantCount} variants`);
  } catch (err) {
    console.error(`\n❌ Sync failed: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
