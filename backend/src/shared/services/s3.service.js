import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export const uploadToS3 = async (file, folder = 'products') => {
  try {
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    });

    await s3Client.send(command);

    // Return public URL
    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return url;

  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// ─── Image Compression ───────────────────────────────────────────────

// Compress and resize any image buffer before uploading to S3.
// Targets max 1600px wide, WebP at 82% quality → typically 150–400 KB from multi-MB originals.
// Falls back to the original buffer if Sharp fails (e.g. unsupported format like SVG).
async function compressImage(buffer) {
  try {
    return {
      buffer: await sharp(buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
      ext: '.webp',
      contentType: 'image/webp',
    };
  } catch (err) {
    console.warn('[ImageSync] Compression skipped:', err.message);
    return { buffer, ext: '.jpg', contentType: 'image/jpeg' };
  }
}

// ─── Image Sync Helpers ──────────────────────────────────────────────

const CONTENT_TYPE_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

// In-memory cache for a single sync run to avoid re-downloading the same URL
const syncCache = new Map();

export function clearSyncCache() {
  syncCache.clear();
}

function buildS3Url(key) {
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

function getExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.substring(pathname.lastIndexOf('.'));
    if (CONTENT_TYPE_MAP[ext]) return ext;
  } catch { /* ignore */ }
  return '.jpg'; // default fallback
}

async function existsInS3(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

/**
 * Upload an in-memory image buffer to S3, keyed by SHA-256 of `identifier`
 * (not the buffer itself) so the same source — e.g. a path inside a vendor
 * asset zip — is never uploaded twice across runs. Returns the S3 URL, or
 * null if image sync is disabled or the upload fails.
 */
export async function uploadBufferIfNew(identifier, buffer, ext = '.jpg', contentType = 'image/jpeg') {
  if (process.env.SYNC_IMAGES_TO_S3 !== 'true') return null;

  if (syncCache.has(identifier)) {
    return syncCache.get(identifier);
  }

  try {
    const compressed = await compressImage(buffer);
    const hash = crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 32);
    const key = `media/${hash}${compressed.ext}`;

    if (!(await existsInS3(key))) {
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: compressed.buffer,
        ContentType: compressed.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
    }

    const s3Url = buildS3Url(key);
    syncCache.set(identifier, s3Url);
    return s3Url;
  } catch (err) {
    console.warn(`[ImageSync] Error uploading buffer for ${identifier}: ${err.message}`);
    return null;
  }
}

/**
 * Download an image from an external URL and upload it to S3.
 * Uses a deterministic key (SHA-256 of the URL) so the same URL is never uploaded twice.
 * Returns the S3 URL, or the original URL on failure (graceful fallback).
 */
export async function downloadAndUploadImage(externalUrl) {
  if (!externalUrl) return externalUrl;

  // Check in-memory cache first (same sync run)
  if (syncCache.has(externalUrl)) {
    return syncCache.get(externalUrl);
  }

  try {
    const hash = crypto.createHash('sha256').update(externalUrl).digest('hex').substring(0, 32);
    const webpKey = `media/${hash}.webp`;

    // Check if already uploaded (compressed WebP key takes priority)
    if (await existsInS3(webpKey)) {
      const s3Url = buildS3Url(webpKey);
      syncCache.set(externalUrl, s3Url);
      return s3Url;
    }

    // Download from external source
    const response = await fetch(externalUrl);
    if (!response.ok) {
      console.warn(`[ImageSync] Failed to download ${externalUrl}: ${response.status}`);
      return externalUrl;
    }

    const rawBuffer = Buffer.from(await response.arrayBuffer());
    const compressed = await compressImage(rawBuffer);
    // Release the original buffer immediately — only keep the compressed copy
    rawBuffer.fill(0);

    // Re-key with compressed extension so .webp and .jpg don't collide
    const compressedKey = `media/${hash}${compressed.ext}`;

    // Upload compressed image to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: compressedKey,
      Body: compressed.buffer,
      ContentType: compressed.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const s3Url = buildS3Url(compressedKey);
    syncCache.set(externalUrl, s3Url);
    console.log(`[ImageSync] Uploaded: ${externalUrl.substring(0, 60)}... → ${compressedKey}`);
    return s3Url;

  } catch (err) {
    console.warn(`[ImageSync] Error processing ${externalUrl}: ${err.message}`);
    return externalUrl; // graceful fallback
  }
}

/**
 * Migrate a single image URL to S3. Returns S3 URL or original on failure.
 */
export async function migrateImageUrl(url) {
  if (!url || process.env.SYNC_IMAGES_TO_S3 !== 'true') return url;
  return downloadAndUploadImage(url);
}

/**
 * Migrate all image URLs in a product's media object to S3.
 * Returns a new media object with S3 URLs.
 */
export async function migrateMediaToS3(media) {
  if (!media || process.env.SYNC_IMAGES_TO_S3 !== 'true') return media;

  const result = { ...media };

  // Process sequentially to avoid loading multiple large images into memory at once
  if (Array.isArray(result.mainImages)) {
    const out = [];
    for (const img of result.mainImages) {
      out.push({ ...img, url: await downloadAndUploadImage(img.url) });
    }
    result.mainImages = out;
  }

  if (Array.isArray(result.additionalImages)) {
    const out = [];
    for (const img of result.additionalImages) {
      out.push({ ...img, url: await downloadAndUploadImage(img.url) });
    }
    result.additionalImages = out;
  }

  return result;
}
