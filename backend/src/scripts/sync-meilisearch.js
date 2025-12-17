import prisma from '../shared/config/db.js';
import { initializeProductsIndex, syncAllProducts } from '../shared/services/meilisearch.service.js';

async function syncMeilisearch() {
  try {
    console.log('Starting Meilisearch sync...');

    // Initialize index with settings
    console.log('Initializing products index...');
    await initializeProductsIndex();

    // Get all active products
    console.log('Fetching products from database...');
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: {
          select: { name: true }
        },
        vendor: {
          select: { businessName: true }
        }
      }
    });

    console.log(`Found ${products.length} products`);

    // Sync to Meilisearch
    if (products.length > 0) {
      console.log('Syncing products to Meilisearch...');
      await syncAllProducts(products);
      
      // Wait for indexing to complete
      console.log('Waiting for indexing to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('✅ Sync complete!');
    } else {
      console.log('No products to sync');
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

syncMeilisearch();