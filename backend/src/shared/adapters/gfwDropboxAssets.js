/**
 * Fetches GFW product assets from Dropbox using the Dropbox API.
 *
 * Instead of downloading a full ZIP archive, this module:
 *   1. Lists only the target subfolder (JPEG / JPG / resize) via files/list_folder
 *   2. Filters entries by SKU prefix, size, and dedup before any download
 *   3. Downloads only the specific files needed via sharing/get_shared_link_file
 *
 * Requires DROPBOX_ACCESS_TOKEN in env (free Dropbox developer app token).
 */

import path from 'path';
import { uploadBufferIfNew } from '../services/s3.service.js';

const DROPBOX_API         = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT     = 'https://content.dropboxapi.com/2';
const DROPBOX_FOLDER_RE   = /dropbox\.com\/scl\/fo\//;

// Cached short-lived access token derived from the refresh token
let _cachedToken     = null;
let _tokenExpiresAt  = 0;

async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 60_000) return _cachedToken;
  const res = await fetch('https://api.dropbox.com/oauth2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
      client_id:     process.env.DROPBOX_APP_KEY,
      client_secret: process.env.DROPBOX_APP_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Dropbox token refresh failed (${res.status}): ${await res.text()}`);
  const data     = await res.json();
  _cachedToken   = data.access_token;
  _tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return _cachedToken;
}

const LINE_DRAWING_FOLDER = '/Line Drawings';
const ASSEMBLY_FOLDER     = '/Assembly';

const MAX_EXTRA_IMAGES_PER_SKU = 4;
const MAX_IMAGE_SIZE_BYTES     = 5 * 1024 * 1024; // 5 MB

function isDropboxFolderUrl(url) {
  return !!url && DROPBOX_FOLDER_RE.test(url);
}

function imageBasename(urlOrPath) {
  try {
    const p = urlOrPath.startsWith('http') ? new URL(urlOrPath).pathname : urlOrPath;
    return path.basename(p).toLowerCase().replace(/\.[^.]+$/, '');
  } catch {
    return '';
  }
}

// ─── Dropbox API helpers ──────────────────────────────────────────

/** Verify Dropbox credentials and refresh-token flow before doing any real work. */
export async function verifyDropboxToken() {
  const missing = ['DROPBOX_APP_KEY', 'DROPBOX_APP_SECRET', 'DROPBOX_REFRESH_TOKEN'].filter(k => !process.env[k]);
  if (missing.length) return { ok: false, error: `Missing env vars: ${missing.join(', ')}` };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${DROPBOX_API}/check/user`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: 'ping' }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Dropbox check failed (${res.status}): ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * List all files under a subfolder path within a shared folder link.
 * Returns [] if the subfolder does not exist (409 path_not_found).
 */
async function dropboxListAll(sharedLinkUrl, subpath, recursive = false) {
  const entries = [];
  let cursor    = null;
  let hasMore   = true;

  while (hasMore) {
    const token = await getAccessToken();
    const res = cursor
      ? await fetch(`${DROPBOX_API}/files/list_folder/continue`, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ cursor }),
        })
      : await fetch(`${DROPBOX_API}/files/list_folder`, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            path:        subpath,
            shared_link: { url: sharedLinkUrl },
            recursive,
          }),
        });

    if (res.status === 409) return []; // subfolder doesn't exist in this collection
    if (!res.ok) throw new Error(`Dropbox list_folder failed (${res.status}): ${await res.text()}`);

    const data = await res.json();
    entries.push(...(data.entries || []));
    cursor  = data.cursor;
    hasMore = data.has_more || false;
  }

  return entries;
}

/** Download a single file from within a shared folder link by its display path. */
async function dropboxDownload(sharedLinkUrl, filePath) {
  const token = await getAccessToken();
  const res = await fetch(`${DROPBOX_CONTENT}/sharing/get_shared_link_file`, {
    method:  'POST',
    headers: {
      'Authorization':   `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ url: sharedLinkUrl, path: filePath }),
    },
  });

  if (!res.ok) throw new Error(`Dropbox download failed (${res.status}): ${filePath}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── Per-folder asset fetch ───────────────────────────────────────

/**
 * BFS walk of a folder within a shared link, collecting all JPEG files up to
 * maxDepth levels of subfolders. Shared links do not support recursive listing,
 * so we enumerate each level non-recursively and enqueue subdirectories.
 */
async function collectImageFiles(sharedLinkUrl, rootPath, maxDepth = 3) {
  // Each collected file gets a `_sharedPath` — the path we constructed ourselves,
  // relative to the shared link root. path_display from Dropbox is the absolute
  // internal namespace path and causes 409 when passed to the download API.
  const imageFiles = [];
  const seenNames  = new Set(); // deduplicate across resolution subfolders
  const queue = [{ path: rootPath, depth: 0 }];

  while (queue.length > 0) {
    const { path, depth } = queue.shift();
    const entries = await dropboxListAll(sharedLinkUrl, path, false);
    console.log(`[GFW Dropbox BFS] ${path} → ${entries.length} entries (depth ${depth})`);
    for (const entry of entries) {
      const childPath = `${path}/${entry.name}`;
      if (entry['.tag'] === 'file' && /\.(jpe?g)$/i.test(entry.name)) {
        const nameLower = entry.name.toLowerCase();
        if (!seenNames.has(nameLower)) {
          seenNames.add(nameLower);
          imageFiles.push({ ...entry, _sharedPath: childPath });
        }
      } else if (entry['.tag'] === 'folder' && depth < maxDepth) {
        console.log(`[GFW Dropbox BFS] Enqueue: ${childPath}`);
        queue.push({ path: childPath, depth: depth + 1 });
      }
    }
  }

  return imageFiles;
}

async function fetchFolderAssets(folderUrl, items, logRoot = false) {
  // GFW folder structures vary across product lines:
  //   /Product Images/{Color}/          — color-named subfolders (most common)
  //   /Product Images/JPEG/2000x2000/   — format subfolders (numeric lines)
  //   /Product Images/*.jpg             — flat (no subfolders)
  //   /Images/                          — some older collections use /Images instead
  // BFS non-recursive traversal handles all of these up to 3 levels deep.
  let imageFiles = await collectImageFiles(folderUrl, '/Product Images');
  if (imageFiles.length === 0) {
    imageFiles = await collectImageFiles(folderUrl, '/Images');
  }

  console.log(`[GFW Dropbox Debug] Found ${imageFiles.length} JPEGs (SKUs: ${items.map(i => i.sku).join(',')})`);
  if (imageFiles.length > 0) {
    console.log(`[GFW Dropbox Debug] Sample files:`, imageFiles.slice(0, 5).map(f => f.name));
  }

  if (logRoot || imageFiles.length === 0) {
    const rootEntries = await dropboxListAll(folderUrl, '', false);
    console.log(`[GFW Dropbox Debug] Root (${folderUrl.slice(-16)}):`, rootEntries.slice(0, 15).map(e => `[${e['.tag']}] ${e.name}`));
  }

  // List PDFs — Line Drawings and Assembly (non-recursive, single level)
  const [ldFiles, asmFiles] = await Promise.all([
    dropboxListAll(folderUrl, LINE_DRAWING_FOLDER, false).then(e => e.filter(f => f['.tag'] === 'file' && /\.pdf$/i.test(f.name))),
    dropboxListAll(folderUrl, ASSEMBLY_FOLDER,     false).then(e => e.filter(f => f['.tag'] === 'file' && /\.pdf$/i.test(f.name))),
  ]);

  const result = new Map();

  for (const { sku, prefixes, sheetFilenames } of items) {
    // Match by filename prefix. e.name is the bare filename (not path), so this
    // works regardless of which subfolder level the image was found in.
    const candidateImages = imageFiles.filter(e => {
      const base     = e.name.toLowerCase();
      const baseName = base.replace(/\.[^.]+$/, '');
      return (
        prefixes.some(p => base.startsWith(p)) &&
        !/carton/i.test(base) &&
        !sheetFilenames.has(baseName) &&
        e.size <= MAX_IMAGE_SIZE_BYTES
      );
    });

    if (candidateImages.length > 0) {
      console.log(`[GFW Dropbox Debug] SKU ${sku} matched ${candidateImages.length}:`, candidateImages.map(f => f.name));
    }

    const imageUrls = [];
    for (const entry of candidateImages.slice(0, MAX_EXTRA_IMAGES_PER_SKU)) {
      try {
        const buffer = await dropboxDownload(folderUrl, entry._sharedPath);
        const url    = await uploadBufferIfNew(`${folderUrl}#${entry._sharedPath}`, buffer, '.jpg', 'image/jpeg');
        if (url) imageUrls.push(url);
      } catch (err) {
        console.warn(`[GFW Dropbox] Image download failed (${entry.name}): ${err.message}`);
      }
    }

    const matchPdf = (files) => files.filter(e => {
      const base = e.name.toLowerCase().replace(/\.[^.]+$/, '');
      return prefixes.some(p => base.startsWith(p));
    });

    let lineDrawingUrl = null;
    const ldEntry = matchPdf(ldFiles)[0];
    if (ldEntry) {
      const ldPath = `${LINE_DRAWING_FOLDER}/${ldEntry.name}`;
      try {
        const buffer = await dropboxDownload(folderUrl, ldPath);
        lineDrawingUrl = await uploadBufferIfNew(`${folderUrl}#${ldPath}`, buffer, '.pdf', 'application/pdf');
      } catch (err) {
        console.warn(`[GFW Dropbox] Line drawing download failed (${ldEntry.name}): ${err.message}`);
      }
    }

    let assemblyUrl = null;
    const asmEntry = matchPdf(asmFiles)[0];
    if (asmEntry) {
      const asmPath = `${ASSEMBLY_FOLDER}/${asmEntry.name}`;
      try {
        const buffer = await dropboxDownload(folderUrl, asmPath);
        assemblyUrl = await uploadBufferIfNew(`${folderUrl}#${asmPath}`, buffer, '.pdf', 'application/pdf');
      } catch (err) {
        console.warn(`[GFW Dropbox] Assembly download failed (${asmEntry.name}): ${err.message}`);
      }
    }

    if (imageUrls.length || lineDrawingUrl || assemblyUrl) {
      result.set(sku, { images: imageUrls, lineDrawingUrl, assemblyUrl });
    }
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Given the full set of normalized GFW { product, variant } records,
 * fetch Dropbox assets for each unique collection folder and return
 * Map<sku, { images: string[], lineDrawingUrl: string|null, assemblyUrl: string|null }>
 *
 * @param {Function} [onProgress] - called after each folder: (done, total, folderUrl)
 */
export async function fetchCollectionImages(records, onProgress) {
  if (!process.env.DROPBOX_REFRESH_TOKEN) {
    console.warn('[GFW Dropbox] DROPBOX_REFRESH_TOKEN not set — skipping Dropbox asset sync');
    return new Map();
  }

  const bySku = new Map();

  // Group records by shared folder URL
  const byFolder = new Map();
  for (const { product, variant } of records) {
    const folderUrl = product.externalData?.vendorAssetsLink;
    const prefixes  = product.externalData?.imageMatchPrefixes;
    if (!isDropboxFolderUrl(folderUrl) || !prefixes?.length) continue;

    const sheetImages = [
      ...(product.media?.mainImages      || []),
      ...(product.media?.additionalImages || []),
    ].filter(img => img?.url);

    // Build prefix list: imageMatchPrefixes (from row['Name'] / SKU key) plus the
    // product's Display Name, which IS the Dropbox subfolder name (e.g. "Amelia Black").
    const displayName = product.name?.trim().toLowerCase();
    const allPrefixes = [
      ...prefixes.map(p => p.toLowerCase()),
      ...(displayName && !prefixes.map(p => p.toLowerCase()).includes(displayName) ? [displayName] : []),
    ];

    if (!byFolder.has(folderUrl)) byFolder.set(folderUrl, []);
    byFolder.get(folderUrl).push({
      sku:            variant.sku,
      prefixes:       allPrefixes,
      sheetFilenames: new Set(sheetImages.map(img => imageBasename(img.url))),
    });
  }

  const folders = [...byFolder.entries()];
  const total   = folders.length;

  for (let fi = 0; fi < folders.length; fi++) {
    const [folderUrl, items] = folders[fi];
    onProgress?.(fi, total, folderUrl);

    try {
      const folderResult = await fetchFolderAssets(folderUrl, items, fi < 3);
      for (const [sku, assets] of folderResult) {
        bySku.set(sku, assets);
      }
    } catch (err) {
      console.warn(`[GFW Dropbox] Folder ${fi + 1}/${total} failed: ${err.message}`);
    }

    onProgress?.(fi + 1, total, folderUrl);
  }

  return bySku;
}
