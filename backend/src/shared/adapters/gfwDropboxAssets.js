/**
 * Fetches extra assets for Global Furniture (GFW) rows from the Dropbox
 * "collection asset" folders linked in `externalData.vendorAssetsLink`.
 *
 * Each unique folder is streamed once directly from Dropbox — the zip is
 * never written to disk. Only matching entries are buffered in memory;
 * everything else (TIFFs, carton photos, unrelated files) is discarded
 * on the fly as the stream arrives.
 *
 * Three asset types are extracted per SKU, matched by filename prefix:
 *   Product Images/JPEG/2000x2000/*.jpg  → extra storefront photos → S3
 *   Line Drawings/{prefix}.pdf           → line drawing PDF → S3
 *   Assembly/{prefix}.pdf               → assembly instructions PDF → S3
 *
 * Best-effort throughout: failures never block the import.
 */

import path from 'path';
import { Readable } from 'stream';
import unzipper from 'unzipper';
import { uploadBufferIfNew } from '../services/s3.service.js';

const DROPBOX_FOLDER_RE    = /dropbox\.com\/scl\/fo\//;
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

/**
 * Stream the Dropbox zip directly from the network and extract only the
 * entries that match one of the three asset types for the given prefixes.
 * No temp files — the zip data flows through memory and is discarded.
 *
 * Returns { images, lineDrawings, assembly } — each an array of { fileName, buffer }.
 */
async function streamMatchingEntries(folderUrl, prefixes) {
  const images = [];
  const lineDrawings = [];
  const assembly = [];

  const res = await fetch(toDirectDownloadUrl(folderUrl));
  if (!res.ok || !res.body) {
    throw new Error(`Dropbox folder download failed: ${res.status}`);
  }

  const nodeStream = Readable.fromWeb(res.body);
  const zip = nodeStream.pipe(unzipper.Parse({ forceStream: true }));

  for await (const entry of zip) {
    const fileName = entry.path;
    const base = path.basename(fileName).toLowerCase();
    const isDir = fileName.endsWith('/');

    if (!isDir) {
      const matchesPrefix = prefixes.some(p => base.startsWith(p));
      const isImage       = /\.(jpe?g)$/i.test(base) && PRODUCT_IMAGE_DIR_RE.test(fileName) && matchesPrefix;
      const isLineDrawing = /\.pdf$/i.test(base)     && LINE_DRAWING_DIR_RE.test(fileName)   && matchesPrefix;
      const isAssembly    = /\.pdf$/i.test(base)     && ASSEMBLY_DIR_RE.test(fileName)        && matchesPrefix;

      if (isImage || isLineDrawing || isAssembly) {
        const buffer = await entry.buffer();
        const parsed = { fileName, buffer };
        if (isImage) images.push(parsed);
        else if (isLineDrawing) lineDrawings.push(parsed);
        else assembly.push(parsed);
        continue;
      }
    }

    // Drain entries we don't need so the stream keeps moving.
    entry.autodrain();
  }

  return { images, lineDrawings, assembly };
}

/**
 * Given the full set of normalized GFW { product, variant } records,
 * stream each unique Dropbox asset folder once and return a
 * Map<sku, { images: string[], lineDrawingUrl: string|null, assemblyUrl: string|null }>
 */
export async function fetchCollectionImages(records) {
  const bySku = new Map();

  // Group records by shared asset folder so each folder is streamed once.
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

    try {
      const { images, lineDrawings, assembly } = await streamMatchingEntries(folderUrl, allPrefixes);

      for (const { sku, prefixes } of items) {
        const matchFile = (entries) =>
          entries.filter(e => prefixes.some(p => path.basename(e.fileName).toLowerCase().startsWith(p)));

        // Product images → up to MAX_EXTRA_IMAGES_PER_SKU S3 URLs
        const imageUrls = [];
        for (const entry of matchFile(images).slice(0, MAX_EXTRA_IMAGES_PER_SKU)) {
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
    }
  }

  return bySku;
}
