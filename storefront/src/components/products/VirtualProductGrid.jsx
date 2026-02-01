'use client';

import { useRef, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ProductCard from './ProductCard';

/**
 * VirtualProductGrid - Renders a virtualized grid of products
 * Only renders visible items for better performance with large lists
 *
 * @param {Object[]} products - Array of product objects
 * @param {number} columns - Number of columns in the grid (responsive)
 * @param {number} rowHeight - Approximate height of each row in pixels
 */
const VirtualProductGrid = memo(function VirtualProductGrid({
  products,
  columns = 4,
  rowHeight = 420,
  gap = 24
}) {
  const parentRef = useRef(null);

  // Calculate rows from products based on column count
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < products.length; i += columns) {
      result.push(products.slice(i, i + columns));
    }
    return result;
  }, [products, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan: 2, // Render 2 extra rows above/below viewport
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Don't use virtualization for small lists (< 20 items)
  if (products.length < 20) {
    return (
      <div
        className="products-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="virtual-grid-container"
      style={{
        height: '100vh',
        maxHeight: 'calc(100vh - 300px)',
        overflow: 'auto',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const rowProducts = rows[virtualRow.index];
          const startIndex = virtualRow.index * columns;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                paddingBottom: `${gap}px`,
              }}
            >
              {rowProducts.map((product, colIndex) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={startIndex + colIndex}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default VirtualProductGrid;
