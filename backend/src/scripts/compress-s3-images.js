/**
 * Batch compress existing S3 product images.
 *
 * For every .jpg / .jpeg / .png in the media/ prefix that does NOT already
 * have a matching .webp sibling, this script:
 *   1. Downloads the original from S3
 *   2. Compresses + resizes to max 1600px WebP @ 82% quality via Sharp
 *   3. Uploads the .webp back to S3 with the same hash key
 *   4. Updates the DB row (ProductImage.imageUrl) to point to the new URL
 *
 * Run:
 *   node src/scripts/compress-s3-images.js
 *   node src/scripts/compress-s3-images.js --dry-run   (no uploads, no DB writes)
 *
 * Safe to re-run — skips images that already have a .webp sibling.
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import prisma from '../shared/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;
const PREFIX = 'media/';
const MAX_WIDTH = 1600;
const QUALITY = 82;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function s3Url(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function existsInS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function listAllObjects() {
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents || []) {
      const key = obj.Key;
      if (/\.(jpg|jpeg|png)$/i.test(key)) keys.push({ key, size: obj.Size });
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function main() {
  if (!BUCKET || !REGION) {
    console.error('Missing AWS_S3_BUCKET or AWS_REGION env vars');
    process.exit(1);
  }

  console.log(`\n🗜  S3 image compression script`);
  console.log(`   Bucket : ${BUCKET}`);
  console.log(`   Mode   : ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  const objects = await listAllObjects();
  console.log(`Found ${objects.length} original images in ${PREFIX}\n`);

  let skipped = 0, compressed = 0, failed = 0;

  for (const { key, size } of objects) {
    const webpKey = key.replace(/\.(jpg|jpeg|png)$/i, '.webp');

    // Skip if WebP already exists
    if (await existsInS3(webpKey)) {
      skipped++;
      continue;
    }

    const sizeMB = (size / 1024 / 1024).toFixed(1);
    process.stdout.write(`  ${key} (${sizeMB} MB) → `);

    try {
      if (!DRY_RUN) {
        // Download original
        const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const originalBuffer = await streamToBuffer(Body);

        // Compress
        const webpBuffer = await sharp(originalBuffer)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toBuffer();

        const newSizeMB = (webpBuffer.length / 1024 / 1024).toFixed(2);

        // Upload WebP
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: webpKey,
          Body: webpBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }));

        // Update DB — swap old URL for new WebP URL
        const oldUrl = s3Url(key);
        const newUrl = s3Url(webpKey);
        const { count } = await prisma.productImage.updateMany({
          where: { imageUrl: oldUrl },
          data: { imageUrl: newUrl },
        });

        console.log(`✓ ${newSizeMB} MB WebP (${count} DB rows updated)`);
      } else {
        console.log(`[dry-run] would compress`);
      }
      compressed++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Done — ${compressed} compressed, ${skipped} already WebP, ${failed} failed`);
  if (!DRY_RUN && compressed > 0) {
    console.log('   Old .jpg files are still on S3 (originals kept as backup).');
    console.log('   Delete them manually once you confirm the site looks correct.');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
