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
 *   Product Images/JPEG/[subfolder]/*.jpg  → extra storefront photos → S3
 *   Product Images/JPG/[subfolder]/*.jpg   → extra storefront photos → S3
 *   Product Images/resize/[subfolder]/*    → extra storefront photos → S3
 *   Line Drawings/{prefix}.pdf    → line drawing PDF → S3
 *   Assembly/{prefix}.pdf         → assembly instructions PDF → S3
 *
 * Rules applied per entry:
 *   - Carton images (filename contains "carton") are skipped entirely
 *   - Images larger than 5 MB are skipped (checked via ZIP header before buffering)
 *   - Dropbox images that duplicate a spreadsheet image (same base filename) are skipped
 *   - Only Product Images/JPEG|JPG|resize/ entries are considered for images
 *   - Dropbox is always attempted — never skipped per product
 *
 * Best-effort throughout: failures and timeouts never block the import.
 */

import path from 'path';
import { Readable } from 'stream';
import unzipper from 'unzipper';
import { uploadBufferIfNew } from '../services/s3.service.js';

const DROPBOX_FOLDER_RE    = /dropbox\.com\/scl\/fo\//;
// Matches the known "good" image subfolders: JPEG/2000x2000, JPG, or resize
const PRODUCT_IMAGE_DIR_RE = /product images[\\/](jpe?g|resize)([\\/]|$)/i;
const LINE_DRAWING_DIR_RE  = /line drawings?[\\/]/i;
const ASSEMBLY_DIR_RE      = /assembly[\\/]/i;

const MAX_EXTRA_IMAGES_PER_SKU = 4;
const MAX_IMAGE_SIZE_BYTES     = 5 * 1024 * 1024; // 5 MB
const FOLDER_TIMEOUT_MS        = 5 * 60_000;       // 5 minutes per folder

function isDropboxFolderUrl(url) {
  return !!url && DROPBOX_FOLDER_RE.test(url);
}

function toDirectDownloadUrl(url) {
  const u = new URL(url);
  u.searchParams.set('dl', '1');
  return u.toString();
}

/** Extract the lowercase extension-less basename from a URL or file path. */
function imageBasename(urlOrPath) {
  try {
    const p = urlOrPath.startsWith('http') ? new URL(urlOrPath).pathname : urlOrPath;
    return path.basename(p).toLowerCase().replace(/\.[^.]+$/, '');
  } catch {
    return '';
  }
}

/**
 * Stream the Dropbox zip directly from the network and extract only the
 * entries matching the three asset types. Aborts after FOLDER_TIMEOUT_MS.
 *
 * Returns { images, lineDrawings, assembly } — each an array of { fileName, buffer }.
 */
async function streamMatchingEntries(folderUrl, prefixes) {
  const images       = [];
  const lineDrawings = [];
  const assembly     = [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FOLDER_TIMEOUT_MS);

  try {
    const res = await fetch(toDirectDownloadUrl(folderUrl), { signal: controller.signal });
    if (!res.ok || !res.body) {
      throw new Error(`Dropbox folder download failed: ${res.status}`);
    }

    const nodeStream = Readable.fromWeb(res.body);
    const zip = nodeStream.pipe(unzipper.Parse({ forceStream: true }));

    for await (const entry of zip) {
      if (controller.signal.aborted) break;

      const fileName = entry.path;
      const base     = path.basename(fileName).toLowerCase();
      const isDir    = fileName.endsWith('/');

      if (isDir) { entry.autodrain(); continue; }

      // Rule: skip carton images
      if (base.includes('carton')) { entry.autodrain(); continue; }

      const matchesPrefix = prefixes.some(p => base.startsWith(p));
      const isImage       = /\.(jpe?g)$/i.test(base) && PRODUCT_IMAGE_DIR_RE.test(fileName) && matchesPrefix;
      const isLineDrawing = /\.pdf$/i.test(base)      && LINE_DRAWING_DIR_RE.test(fileName)  && matchesPrefix;
      const isAssembly    = /\.pdf$/i.test(base)      && ASSEMBLY_DIR_RE.test(fileName)       && matchesPrefix;

      if (!isImage && !isLineDrawing && !isAssembly) { entry.autodrain(); continue; }

      // Rule: skip images > 5 MB — check ZIP header first to avoid buffering huge files
      if (isImage) {
        const knownSize = typeof entry.uncompressedSize === 'number' ? entry.uncompressedSize : 0;
        if (knownSize > MAX_IMAGE_SIZE_BYTES) { entry.autodrain(); continue; }
      }

      const buffer = await entry.buffer();

      // Fallback size check for entries where ZIP header didn't report size
      if (isImage && buffer.length > MAX_IMAGE_SIZE_BYTES) continue;

      const parsed = { fileName, buffer };
      if (isImage)           images.push(parsed);
      else if (isLineDrawing) lineDrawings.push(parsed);
      else                    assembly.push(parsed);
    }
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      throw new Error(`Dropbox folder timed out after ${FOLDER_TIMEOUT_MS / 60000} minutes — skipping`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  return { images, lineDrawings, assembly };
}

/**
 * Given the full set of normalized GFW { product, variant } records,
 * stream each unique Dropbox asset folder once and return a
 * Map<sku, { images: string[], lineDrawingUrl: string|null, assemblyUrl: string|null }>
 *
 * @param {Function} [onProgress] - called after each folder: (done, total, folderUrl)
 */
export async function fetchCollectionImages(records, onProgress) {
  const bySku = new Map();

  // Group records by shared asset folder so each folder is streamed once.
  // Also collect spreadsheet image filenames per SKU for deduplication.
  const byFolder = new Map();
  for (const { product, variant } of records) {
    const folderUrl = product.externalData?.vendorAssetsLink;
    const prefixes  = product.externalData?.imageMatchPrefixes;
    if (!isDropboxFolderUrl(folderUrl) || !prefixes?.length) continue;

    const sheetImages = [
      ...(product.media?.mainImages    || []),
      ...(product.media?.additionalImages || []),
    ].filter(img => img?.url);

    if (!byFolder.has(folderUrl)) byFolder.set(folderUrl, []);
    byFolder.get(folderUrl).push({
      sku:            variant.sku,
      prefixes:       prefixes.map(p => p.toLowerCase()),
      // Set of extension-less basenames already present in the spreadsheet
      sheetFilenames: new Set(sheetImages.map(img => imageBasename(img.url))),
    });
  }

  const folders = [...byFolder.entries()];
  const total   = folders.length;

  for (let fi = 0; fi < folders.length; fi++) {
    const [folderUrl, items] = folders[fi];
    const allPrefixes = [...new Set(items.flatMap(i => i.prefixes))];

    onProgress?.(fi, total, folderUrl);

    try {
      const { images, lineDrawings, assembly } = await streamMatchingEntries(folderUrl, allPrefixes);

      for (const { sku, prefixes, sheetFilenames } of items) {
        const matchFile = (entries) =>
          entries.filter(e => {
            const base     = path.basename(e.fileName).toLowerCase();
            const baseName = base.replace(/\.[^.]+$/, '');
            // Must match this SKU's prefix
            if (!prefixes.some(p => base.startsWith(p))) return false;
            // Rule: skip if same base filename already exists in spreadsheet images
            if (sheetFilenames.has(baseName)) return false;
            return true;
          });

        const imageUrls = [];
        for (const entry of matchFile(images).slice(0, MAX_EXTRA_IMAGES_PER_SKU)) {
          const url = await uploadBufferIfNew(`${folderUrl}#${entry.fileName}`, entry.buffer, '.jpg', 'image/jpeg');
          if (url) imageUrls.push(url);
        }

        const ldMatch = matchFile(lineDrawings)[0];
        const lineDrawingUrl = ldMatch
          ? await uploadBufferIfNew(`${folderUrl}#${ldMatch.fileName}`, ldMatch.buffer, '.pdf', 'application/pdf')
          : null;

        const asmMatch = matchFile(assembly)[0];
        const assemblyUrl = asmMatch
          ? await uploadBufferIfNew(`${folderUrl}#${asmMatch.fileName}`, asmMatch.buffer, '.pdf', 'application/pdf')
          : null;

        if (imageUrls.length || lineDrawingUrl || assemblyUrl) {
          bySku.set(sku, { images: imageUrls, lineDrawingUrl, assemblyUrl });
        }
      }
    } catch (err) {
      console.warn(`[GFW Assets] Folder ${fi + 1}/${total} failed: ${err.message}`);
    }

    onProgress?.(fi + 1, total, folderUrl);
  }

  return bySku;
}
