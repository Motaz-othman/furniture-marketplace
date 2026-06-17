/**
 * Fetches extra product images for Global Furniture (GFW) rows from the
 * Dropbox "collection asset" folders linked in `externalData.vendorAssetsLink`.
 *
 * Those folders are shared per-collection (not per-SKU) and contain line
 * drawings, assembly PDFs, raw TIFFs, carton photos, and a
 * `Product Images/JPEG/2000x2000/<sku-prefix>-*.jpg` set — only the latter
 * is useful for the storefront. Each unique folder is downloaded once
 * (folders can be 500MB+) and matching images are extracted directly from
 * the zip stream without writing the full archive to disk twice.
 *
 * Best-effort throughout: any failure (download, zip parse, no match) just
 * means that SKU gets no extra images — never blocks the import.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import yauzl from 'yauzl';
import { uploadBufferIfNew } from '../services/s3.service.js';

const DROPBOX_FOLDER_RE = /dropbox\.com\/scl\/fo\//;
const PRODUCT_IMAGE_DIR_RE = /product images[\\/].*2000x2000[\\/]/i;
const MAX_EXTRA_IMAGES_PER_SKU = 4;

function isDropboxFolderUrl(url) {
  return !!url && DROPBOX_FOLDER_RE.test(url);
}

function toDirectDownloadUrl(url) {
  const u = new URL(url);
  u.searchParams.set('dl', '1');
  return u.toString();
}

async function downloadZip(folderUrl, destPath) {
  const res = await fetch(toDirectDownloadUrl(folderUrl));
  if (!res.ok || !res.body) {
    throw new Error(`Dropbox folder download failed: ${res.status}`);
  }
  await pipeline(res.body, fs.createWriteStream(destPath));
}

/**
 * Stream through `zipPath` and extract entries under
 * `Product Images/**\/2000x2000/*.jpg` whose filename starts with one of
 * `prefixes` (case-insensitive). Returns [{ fileName, buffer }].
 */
function extractMatchingEntries(zipPath, prefixes) {
  return new Promise((resolve, reject) => {
    const results = [];

    // decodeStrings: false skips yauzl's filename validation — some Dropbox
    // exports include a stray entry with an absolute "/" path that yauzl
    // otherwise rejects with "absolute path: /" and aborts the whole read.
    yauzl.open(zipPath, { lazyEntries: true, decodeStrings: false }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.on('error', reject);
      zipfile.on('end', () => resolve(results));

      zipfile.on('entry', (entry) => {
        const fileName = entry.fileName.toString('utf8');
        const base = path.basename(fileName).toLowerCase();
        const isMatch = !/\/$/.test(fileName)
          && /\.(jpe?g)$/i.test(base)
          && PRODUCT_IMAGE_DIR_RE.test(fileName)
          && prefixes.some(p => base.startsWith(p));

        if (!isMatch) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) return reject(err);
          const chunks = [];
          readStream.on('data', (chunk) => chunks.push(chunk));
          readStream.on('error', reject);
          readStream.on('end', () => {
            results.push({ fileName, buffer: Buffer.concat(chunks) });
            zipfile.readEntry();
          });
        });
      });

      zipfile.readEntry();
    });
  });
}

/**
 * Given the full set of normalized GFW { product, variant } records,
 * download each unique Dropbox asset folder once and return a
 * Map<sku, string[]> of extra S3 image URLs found for that SKU.
 */
export async function fetchCollectionImages(records) {
  const bySku = new Map();

  // Group records by shared asset folder so each folder is downloaded once.
  const byFolder = new Map();
  for (const { product, variant } of records) {
    const folderUrl = product.externalData?.vendorAssetsLink;
    const prefixes = product.externalData?.imageMatchPrefixes;
    if (!isDropboxFolderUrl(folderUrl) || !prefixes?.length) continue;

    if (!byFolder.has(folderUrl)) byFolder.set(folderUrl, []);
    byFolder.get(folderUrl).push({ sku: variant.sku, prefixes: prefixes.map(p => p.toLowerCase()) });
  }

  for (const [folderUrl, items] of byFolder) {
    const allPrefixes = [...new Set(items.flatMap(i => i.prefixes))];
    const zipPath = path.join(os.tmpdir(), `gfw-assets-${crypto.randomUUID()}.zip`);

    try {
      await downloadZip(folderUrl, zipPath);
      const entries = await extractMatchingEntries(zipPath, allPrefixes);

      for (const { sku, prefixes } of items) {
        const matches = entries.filter(e => prefixes.some(p => path.basename(e.fileName).toLowerCase().startsWith(p)));
        if (!matches.length) continue;

        const urls = [];
        for (const entry of matches.slice(0, MAX_EXTRA_IMAGES_PER_SKU)) {
          const identifier = `${folderUrl}#${entry.fileName}`;
          const url = await uploadBufferIfNew(identifier, entry.buffer, '.jpg', 'image/jpeg');
          if (url) urls.push(url);
        }
        if (urls.length) bySku.set(sku, urls);
      }
    } catch (err) {
      console.warn(`[GFW Assets] Failed to process folder ${folderUrl}: ${err.message}`);
    } finally {
      await fs.promises.unlink(zipPath).catch(() => {});
    }
  }

  return bySku;
}
