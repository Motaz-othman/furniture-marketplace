import { verifyToken } from '../utils/jwt.util.js';
import prisma from '../config/db.js';

// Verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { vendor: true, customer: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Check if user is vendor
export const vendorOnly = (req, res, next) => {
  if (req.user.role !== 'VENDOR') {
    return res.status(403).json({ error: 'Vendor access required' });
  }
  next();
};

// Check if user is customer
export const customerOnly = (req, res, next) => {
  if (req.user.role !== 'CUSTOMER') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  next();
};

// Check if user is admin
export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is vendor OR admin
export const vendorOrAdmin = (req, res, next) => {
  if (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Vendor or Admin access required' });
  }
  next();
};

// Check if vendor owns the product
export const productOwnerOnly = async (req, res, next) => {
  try {
    console.log('🔒 productOwnerOnly middleware called');
    console.log('🔒 Product ID:', req.params.id);
    console.log('🔒 User vendor ID:', req.user?.vendor?.id);
    
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { vendorId: true },
    });

    if (!product) {
      console.log('❌ Product not found in middleware');
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.user.vendor.id) {
      console.log('❌ User is not product owner');
      return res.status(403).json({ error: 'Not authorized to modify this product' });
    }

    console.log('✅ Product owner verified');
    next();
  } catch (error) {
    console.error('❌ productOwnerOnly middleware error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};