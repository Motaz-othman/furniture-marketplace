/**
 * Migrate United Weavers product images from Dropbox → S3 (with WebP compression).
 * Run this LOCALLY — not on Render. Your Mac has no memory limits.
 *
 * Usage:
 *   node src/scripts/migrate-uv-images.js --dry-run   # show counts, no changes
 *   node src/scripts/migrate-uv-images.js              # migrate for real
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import sharp from 'sharp';
import prisma from '../shared/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;
const S3_PREFIX = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;

sharp.cache(false);
sharp.concurrency(1);

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function existsInS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

function toDirectUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'www.dropbox.com' || u.hostname === 'dropbox.com') {
      u.searchParams.set('raw', '1');
      return u.toString();
    }
  } catch { /**/ }
  return url;
}

async function processImage(originalUrl) {
  if (!originalUrl || originalUrl.startsWith(S3_PREFIX)) return originalUrl;

  const hash = crypto.createHash('sha256').update(originalUrl).digest('hex').substring(0, 32);
  const webpKey = `media/${hash}.webp`;

  if (await existsInS3(webpKey)) return `${S3_PREFIX}${webpKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let response;
  try {
    response = await fetch(toDirectUrl(originalUrl), { signal: controller.signal });
  } catch (err) {
    console.warn(`  ⚠ Timeout: ${originalUrl.substring(0, 70)}`);
    return originalUrl;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    console.warn(`  ⚠ HTTP ${response.status}: ${originalUrl.substring(0, 70)}`);
    return originalUrl;
  }

  const MAX_BYTES = 50 * 1024 * 1024; // 50MB — generous on local machine
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BYTES) {
      console.warn(`  ⚠ Image too large (>50MB), skipping`);
      return originalUrl;
    }
    chunks.push(chunk);
  }

  const rawBuffer = Buffer.concat(chunks);
  const webpBuffer = await sharp(rawBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  rawBuffer.fill(0);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: webpKey,
    Body: webpBuffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return `${S3_PREFIX}${webpKey}`;
}

async function migrateMedia(media) {
  if (!media) return media;
  const result = { ...media };

  if (Array.isArray(result.mainImages)) {
    const out = [];
    for (const img of result.mainImages) {
      out.push({ ...img, url: await processImage(img.url) });
    }
    result.mainImages = out;
  }

  if (Array.isArray(result.additionalImages)) {
    const out = [];
    for (const img of result.additionalImages) {
      out.push({ ...img, url: await processImage(img.url) });
    }
    result.additionalImages = out;
  }

  return result;
}

async function main() {
  console.log(`\nUV Image Migration — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const products = await prisma.product.findMany({
    where: { source: 'UW' },
    select: { id: true, name: true, media: true, mainImage: true },
  });

  const pending = products.filter(p => {
    const main = p.media?.mainImages?.[0]?.url || p.mainImage || '';
    return main && !main.startsWith(S3_PREFIX);
  });

  console.log(`${pending.length} / ${products.length} UV products need migration\n`);
  if (pending.length === 0 || DRY_RUN) {
    console.log(DRY_RUN ? 'Dry run — no changes made.' : 'Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  let done = 0;
  for (const product of pending) {
    process.stdout.write(`[${done + 1}/${pending.length}] ${product.name.substring(0, 50).padEnd(50)} `);
    try {
      const migratedMedia = await migrateMedia(product.media);
      const mainImage = migratedMedia?.mainImages?.[0]?.url || product.mainImage;
      await prisma.product.update({
        where: { id: product.id },
        data: { media: migratedMedia, mainImage },
      });
      done++;
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  console.log(`\n✅ Done — ${done}/${pending.length} products migrated to S3 as WebP`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
