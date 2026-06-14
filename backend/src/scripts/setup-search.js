import prisma from '../shared/config/db.js';

// One-time setup for Postgres-based fuzzy search (replaces Meilisearch).
// Enables pg_trgm and adds trigram indexes used by the search controller.
async function setupSearch() {
  try {
    console.log('Enabling pg_trgm extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    console.log('Creating trigram indexes...');
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON "Product" USING gin (name gin_trgm_ops);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS product_brand_trgm_idx ON "Product" USING gin (brand gin_trgm_ops);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS product_collection_trgm_idx ON "Product" USING gin (collection gin_trgm_ops);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS product_description_trgm_idx ON "Product" USING gin (description gin_trgm_ops);`
    );

    console.log('Search setup complete.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Search setup failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

setupSearch();
