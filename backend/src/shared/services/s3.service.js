import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export const uploadToS3 = async (file) => {
  try {
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
    const key = `products/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
      // ✅ ACL LINE REMOVED
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
    const ext = getExtensionFromUrl(externalUrl);
    const key = `media/${hash}${ext}`;

    // Check if already in S3
    if (await existsInS3(key)) {
      const s3Url = buildS3Url(key);
      syncCache.set(externalUrl, s3Url);
      return s3Url;
    }

    // Download from external source
    const response = await fetch(externalUrl);
    if (!response.ok) {
      console.warn(`[ImageSync] Failed to download ${externalUrl}: ${response.status}`);
      return externalUrl;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || CONTENT_TYPE_MAP[ext] || 'image/jpeg';

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    const s3Url = buildS3Url(key);
    syncCache.set(externalUrl, s3Url);
    console.log(`[ImageSync] Uploaded: ${externalUrl.substring(0, 60)}... → ${key}`);
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

  if (Array.isArray(result.mainImages)) {
    result.mainImages = await Promise.all(
      result.mainImages.map(async (img) => ({
        ...img,
        url: await downloadAndUploadImage(img.url),
      }))
    );
  }

  if (Array.isArray(result.additionalImages)) {
    result.additionalImages = await Promise.all(
      result.additionalImages.map(async (img) => ({
        ...img,
        url: await downloadAndUploadImage(img.url),
      }))
    );
  }

  return result;
}
