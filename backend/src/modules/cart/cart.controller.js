import prisma from '../../shared/config/db.js';

// Get customer's cart
export const getCart = async (req, res) => {
  try {
    const customerId = req.user.customer.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId },
      include: {
        product: {
          include: {
            vendor: {
              select: { businessName: true }
            }
          }
        },
        variant: true // ← ADDED
      }
    });

    // Calculate total using variant price if available
    const total = cartItems.reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.product.price;
      return sum + (price * item.quantity);
    }, 0);

    res.json({
      items: cartItems,
      itemCount: cartItems.length,
      total: Math.round(total * 100) / 100
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { productId, variantId, quantity } = req.body; // ← ADDED variantId

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.isActive) {
      return res.status(400).json({ error: 'Product is not available' });
    }

    // ✅ VARIANT VALIDATION & STOCK CHECK
    let availableStock;
    let itemPrice;
    
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId }
      });

      if (!variant) {
        return res.status(404).json({ error: 'Variant not found' });
      }

      if (variant.productId !== productId) {
        return res.status(400).json({ error: 'Variant does not belong to this product' });
      }

      if (!variant.isActive) {
        return res.status(400).json({ error: 'This variant is not available' });
      }

      availableStock = variant.stockQuantity;
      itemPrice = variant.price;
    } else {
      availableStock = product.stockQuantity;
      itemPrice = product.price;
    }

    // Check stock availability
    if (availableStock < quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock. Available: ${availableStock}` 
      });
    }

    // Check if item already in cart (same product + variant combo)
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        customerId,
        productId,
        variantId: variantId || null
      }
    });

    let cartItem;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      
      if (availableStock < newQuantity) {
        return res.status(400).json({ 
          error: `Insufficient stock. Available: ${availableStock}, In cart: ${existingItem.quantity}` 
        });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: true,
          variant: true
        }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          customerId,
          productId,
          variantId: variantId || undefined,
          quantity
        },
        include: {
          product: true,
          variant: true
        }
      });
    }

    res.status(201).json({
      message: 'Item added to cart',
      cartItem
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;
    const { quantity } = req.body;

    // Find cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { 
        product: true,
        variant: true // ← ADDED
      }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check ownership
    if (cartItem.customerId !== customerId) {
      return res.status(403).json({ error: 'Not your cart item' });
    }

    // ✅ CHECK STOCK FROM VARIANT OR PRODUCT
    const availableStock = cartItem.variant 
      ? cartItem.variant.stockQuantity 
      : cartItem.product.stockQuantity;

    if (availableStock < quantity) {
      return res.status(400).json({ 
        error: `Not enough stock available. Available: ${availableStock}` 
      });
    }

    // Update quantity
    const updatedItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: { 
        product: true,
        variant: true
      }
    });

    res.json({
      message: 'Cart item updated',
      cartItem: updatedItem
    });

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (cartItem.customerId !== customerId) {
      return res.status(403).json({ error: 'Not your cart item' });
    }

    await prisma.cartItem.delete({
      where: { id }
    });

    res.json({ message: 'Item removed from cart' });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const customerId = req.user.customer.id;

    await prisma.cartItem.deleteMany({
      where: { customerId }
    });

    res.json({ message: 'Cart cleared' });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};