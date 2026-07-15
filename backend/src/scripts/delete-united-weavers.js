/**
 * Delete all United Weavers products from DB and S3.
 *
 * What gets deleted:
 *   DB  — Products (+ cascades: StorefrontListing, ProductVariant, Wishlist, Review, CartItem)
 *   S3  — All media/ images referenced in product.media JSON
 *
 * Run:
 *   node src/scripts/delete-united-weavers.js --dry-run   # show counts, no changes
 *   node src/scripts/delete-united-weavers.js              # delete for real
 */

import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import prisma from '../shared/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');
const BRAND = 'United Weavers';
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function extractS3Keys(media) {
  const keys = [];
  if (!media || typeof media !== 'object') return keys;
  const prefix = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;
  for (const group of ['mainImages', 'additionalImages']) {
    for (const img of media[group] || []) {
      const url = img?.url || img?.imageUrl;
      if (url && url.startsWith(prefix)) {
        keys.push(url.replace(prefix, ''));
      }
    }
  }
  return keys;
}

async function deleteS3Keys(keys) {
  if (keys.length === 0) return;
  // S3 batch delete supports up to 1000 keys per request
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
    }));
  }
}

async function main() {
  console.log(`\n🗑  Delete United Weavers — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Find all UW products
  const products = await prisma.product.findMany({
    where: { brand: BRAND },
    select: { id: true, name: true, media: true, storefront: { select: { displayImages: true } } },
  });

  console.log(`Found ${products.length} United Weavers products`);

  if (products.length === 0) {
    console.log('Nothing to delete.');
    await prisma.$disconnect();
    return;
  }

  const productIds = products.map(p => p.id);

  // Collect all S3 keys
  const s3Keys = [];
  for (const p of products) {
    s3Keys.push(...extractS3Keys(p.media));
    s3Keys.push(...extractS3Keys({ mainImages: p.storefront?.displayImages || [] }));
  }
  const uniqueKeys = [...new Set(s3Keys)];
  console.log(`Found ${uniqueKeys.length} S3 images to delete`);

  // Count related records
  const [cartCount, orderCount] = await Promise.all([
    prisma.cartItem.count({ where: { productId: { in: productIds } } }),
    prisma.orderItem.count({ where: { productId: { in: productIds } } }),
  ]);

  console.log(`\nSummary:`);
  console.log(`  Products       : ${products.length}`);
  console.log(`  S3 images      : ${uniqueKeys.length}`);
  console.log(`  Cart items     : ${cartCount}`);
  console.log(`  Order items    : ${orderCount} ${orderCount > 0 ? '⚠️  (linked to real orders — will be nullified)' : ''}`);
  console.log(`  + cascades     : StorefrontListing, ProductVariant, Wishlist, Review\n`);

  if (DRY_RUN) {
    console.log('DRY RUN — no changes made. Remove --dry-run to execute.');
    await prisma.$disconnect();
    return;
  }

  // 1. Delete cart items (no cascade from Product)
  if (cartCount > 0) {
    await prisma.cartItem.deleteMany({ where: { productId: { in: productIds } } });
    console.log(`✓ Deleted ${cartCount} cart items`);
  }

  // 2. Nullify order items (keep order history intact, just remove product link)
  if (orderCount > 0) {
    await prisma.orderItem.updateMany({
      where: { productId: { in: productIds } },
      data: { productId: null },
    });
    console.log(`✓ Nullified ${orderCount} order item product references`);
  }

  // 3. Delete products (cascades: StorefrontListing, ProductVariant, Wishlist, Review)
  const { count } = await prisma.product.deleteMany({ where: { brand: BRAND } });
  console.log(`✓ Deleted ${count} products (+ cascaded relations)`);

  // 4. Delete S3 images
  if (uniqueKeys.length > 0) {
    await deleteS3Keys(uniqueKeys);
    console.log(`✓ Deleted ${uniqueKeys.length} S3 images`);
  }

  console.log('\n✅ Done. Re-import the United Weavers CSV to repopulate with compressed images.');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
