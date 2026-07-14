/**
 * Diagnostic: show Dropbox sync state for a specific GFW product.
 * Usage: node --env-file=.env src/scripts/check-dropbox-product.js <sku-or-externalId>
 */
import prisma from '../shared/config/db.js';
import { verifyDropboxToken } from '../shared/adapters/gfwDropboxAssets.js';

const query = process.argv[2];
if (!query) { console.error('Usage: node ... check-dropbox-product.js <sku-or-externalId>'); process.exit(1); }

const product = await prisma.product.findFirst({
  where: {
    source: 'GFW',
    OR: [{ externalId: query }, { variants: { some: { sku: query } } }],
  },
  include: { variants: { select: { sku: true } } },
});

if (!product) { console.log('No GFW product found for:', query); process.exit(0); }

const ed = product.externalData || {};
console.log('\n── Product ─────────────────────────────');
console.log('id:              ', product.id);
console.log('name:            ', product.name);
console.log('externalId:      ', product.externalId);
console.log('SKUs:            ', product.variants.map(v => v.sku).join(', '));
console.log('dropboxSynced:   ', ed.dropboxSynced ?? false);
console.log('imageMatchPrefixes:', JSON.stringify(ed.imageMatchPrefixes));
console.log('vendorAssetsLink:', ed.vendorAssetsLink);
console.log('media.mainImages:', product.media?.mainImages?.length ?? 0);
console.log('media.additional:', product.media?.additionalImages?.length ?? 0);

if (!ed.vendorAssetsLink) { console.log('\nNo Dropbox link stored.'); process.exit(0); }

console.log('\n── Dropbox token check ─────────────────');
const tokenOk = await verifyDropboxToken();
console.log(tokenOk.ok ? 'Token OK' : `Token ERROR: ${tokenOk.error}`);
if (!tokenOk.ok) process.exit(1);

// List /Product Images and /Images to see what's there
const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }));

async function getToken() {
  const res = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
      client_id: process.env.DROPBOX_APP_KEY,
      client_secret: process.env.DROPBOX_APP_SECRET,
    }),
  });
  return (await res.json()).access_token;
}

async function listFolder(token, url, path) {
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, shared_link: { url }, recursive: false }),
  });
  if (res.status === 409) return [];
  if (!res.ok) { console.log(`  list_folder(${path}) → ${res.status}`); return []; }
  return (await res.json()).entries || [];
}

const token = await getToken();
const folderUrl = ed.vendorAssetsLink;

console.log('\n── Root of Dropbox folder ──────────────');
const root = await listFolder(token, folderUrl, '');
root.forEach(e => console.log(` [${e['.tag']}] ${e.name}`));

for (const imgRoot of ['/Product Images', '/Images']) {
  const entries = await listFolder(token, folderUrl, imgRoot);
  if (entries.length === 0) continue;
  console.log(`\n── ${imgRoot} ─────────────────────────`);
  for (const e of entries) {
    console.log(` [${e['.tag']}] ${e.name}`);
    if (e['.tag'] === 'folder') {
      const sub = await listFolder(token, folderUrl, `${imgRoot}/${e.name}`);
      sub.slice(0, 8).forEach(f => console.log(`    [${f['.tag']}] ${f.name}`));
      if (sub.length > 8) console.log(`    ... ${sub.length - 8} more`);
    }
  }
}

await prisma.$disconnect();
