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
      include: { customer: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Optional auth — sets req.user if token is valid, continues regardless
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { customer: true },
        });
        if (user) req.user = user;
      }
    }
  } catch {
    // Ignore auth errors — continue as guest
  }
  next();
};

// Check if user is customer
export const customerOnly = (req, res, next) => {
  if (req.user.role !== 'CUSTOMER') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  if (!req.user.customer) {
    return res.status(500).json({ error: 'Customer profile not found' });
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
