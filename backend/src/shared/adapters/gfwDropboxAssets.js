/**
 * Fetches extra assets for Global Furniture (GFW) rows from the Dropbox
 * "collection asset" folders linked in `externalData.vendorAssetsLink`.
 *
 * Each unique folder is downloaded once (folders can be 500MB+). Three
 * asset types are extracted per SKU, matched by filename prefix:
 *
 *   Product Images/JPEG/2000x2000/*.jpg  → extra storefront photos
 *   Line Drawings/{prefix}.pdf           → line drawing uploaded as PDF to S3
 *   Assembly/{prefix}.pdf               → assembly instructions uploaded as PDF to S3
 *
 * Raw TIFFs, carton photos, and any other files are skipped.
 * Best-effort throughout: failures never block the import.
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
const LINE_DRAWING_DIR_RE  = /line drawings?[\\/]/i;
const ASSEMBLY_DIR_RE      = /assembly[\\/]/i;
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
 * Stream through `zipPath` and extract entries matching any of the three
 * asset types for the given SKU prefixes (case-insensitive).
 *
 * Returns { images, lineDrawings, assembly } — each an array of { fileName, buffer }.
 */
function extractMatchingEntries(zipPath, prefixes) {
  return new Promise((resolve, reject) => {
    const images = [];
    const lineDrawings = [];
    const assembly = [];

    // decodeStrings: false skips yauzl's filename validation — some Dropbox
    // exports include a stray entry with an absolute "/" path that yauzl
    // otherwise rejects and aborts.
    yauzl.open(zipPath, { lazyEntries: true, decodeStrings: false }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.on('error', reject);
      zipfile.on('end', () => resolve({ images, lineDrawings, assembly }));

      zipfile.on('entry', (zipEntry) => {
        const fileName = zipEntry.fileName.toString('utf8');
        const base = path.basename(fileName).toLowerCase();
        const isDir = /\/$/.test(fileName);

        if (isDir) { zipfile.readEntry(); return; }

        const matchesPrefix = prefixes.some(p => base.startsWith(p));
        const isImage       = /\.(jpe?g)$/i.test(base) && PRODUCT_IMAGE_DIR_RE.test(fileName) && matchesPrefix;
        const isLineDrawing = /\.pdf$/i.test(base)     && LINE_DRAWING_DIR_RE.test(fileName)   && matchesPrefix;
        const isAssembly    = /\.pdf$/i.test(base)     && ASSEMBLY_DIR_RE.test(fileName)        && matchesPrefix;

        if (!isImage && !isLineDrawing && !isAssembly) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(zipEntry, (err, readStream) => {
          if (err) return reject(err);
          const chunks = [];
          readStream.on('data', (chunk) => chunks.push(chunk));
          readStream.on('error', reject);
          readStream.on('end', () => {
            const parsed = { fileName, buffer: Buffer.concat(chunks) };
            if (isImage) images.push(parsed);
            else if (isLineDrawing) lineDrawings.push(parsed);
            else assembly.push(parsed);
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
 * Map<sku, { images: string[], lineDrawingUrl: string|null, assemblyUrl: string|null }>
 */
export async function fetchCollectionImages(records) {
  const bySku = new Map();

  // Group records by shared asset folder so each folder is downloaded once.
  const byFolder = new Map();
  for (const { product, variant } of records) {
    const folderUrl = product.externalData?.vendorAssetsLink;
    const prefixes  = product.externalData?.imageMatchPrefixes;
    if (!isDropboxFolderUrl(folderUrl) || !prefixes?.length) continue;

    if (!byFolder.has(folderUrl)) byFolder.set(folderUrl, []);
    byFolder.get(folderUrl).push({ sku: variant.sku, prefixes: prefixes.map(p => p.toLowerCase()) });
  }

  for (const [folderUrl, items] of byFolder) {
    const allPrefixes = [...new Set(items.flatMap(i => i.prefixes))];
    const zipPath = path.join(os.tmpdir(), `gfw-assets-${crypto.randomUUID()}.zip`);

    try {
      await downloadZip(folderUrl, zipPath);
      const { images, lineDrawings, assembly } = await extractMatchingEntries(zipPath, allPrefixes);

      for (const { sku, prefixes } of items) {
        const matchFile = (entries) =>
          entries.filter(e => prefixes.some(p => path.basename(e.fileName).toLowerCase().startsWith(p)));

        // Product images → up to MAX_EXTRA_IMAGES_PER_SKU S3 URLs
        const imageMatches = matchFile(images);
        const imageUrls = [];
        for (const entry of imageMatches.slice(0, MAX_EXTRA_IMAGES_PER_SKU)) {
          const url = await uploadBufferIfNew(`${folderUrl}#${entry.fileName}`, entry.buffer, '.jpg', 'image/jpeg');
          if (url) imageUrls.push(url);
        }

        // Line drawing → first matching PDF
        const ldMatch = matchFile(lineDrawings)[0];
        const lineDrawingUrl = ldMatch
          ? await uploadBufferIfNew(`${folderUrl}#${ldMatch.fileName}`, ldMatch.buffer, '.pdf', 'application/pdf')
          : null;

        // Assembly instructions → first matching PDF
        const asmMatch = matchFile(assembly)[0];
        const assemblyUrl = asmMatch
          ? await uploadBufferIfNew(`${folderUrl}#${asmMatch.fileName}`, asmMatch.buffer, '.pdf', 'application/pdf')
          : null;

        if (imageUrls.length || lineDrawingUrl || assemblyUrl) {
          bySku.set(sku, { images: imageUrls, lineDrawingUrl, assemblyUrl });
        }
      }
    } catch (err) {
      console.warn(`[GFW Assets] Failed to process folder ${folderUrl}: ${err.message}`);
    } finally {
      await fs.promises.unlink(zipPath).catch(() => {});
    }
  }

  return bySku;
}
