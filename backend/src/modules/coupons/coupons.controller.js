import prisma from '../../shared/config/db.js';

export const listCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: coupons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list coupons' });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxUses, expiresAt, isActive } = req.body;
    if (!code || !type || value == null) return res.status(400).json({ error: 'code, type, and value are required' });
    if (!['PERCENTAGE', 'FIXED'].includes(type)) return res.status(400).json({ error: 'type must be PERCENTAGE or FIXED' });
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return res.status(400).json({ error: 'value must be a positive number' });
    if (type === 'PERCENTAGE' && numValue > 100) return res.status(400).json({ error: 'Percentage value cannot exceed 100' });

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        type,
        value: numValue,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
      },
    });
    res.status(201).json({ data: coupon });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, minOrderAmount, maxUses, expiresAt, isActive } = req.body;
    if (value !== undefined) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) return res.status(400).json({ error: 'value must be a positive number' });
      if (type === 'PERCENTAGE' && numValue > 100) return res.status(400).json({ error: 'Percentage value cannot exceed 100' });
    }
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(type  !== undefined && { type }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(minOrderAmount !== undefined && { minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null }),
        ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ data: coupon });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coupon not found' });
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coupon not found' });
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!coupon || !coupon.isActive) return res.status(404).json({ error: 'Invalid or inactive coupon code' });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) return res.status(400).json({ error: 'Coupon has expired' });
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Coupon usage limit reached' });
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return res.status(400).json({ error: `Minimum order amount is $${coupon.minOrderAmount.toFixed(2)}` });
    }

    const discount = coupon.type === 'PERCENTAGE'
      ? Math.min((coupon.value / 100) * orderTotal, orderTotal)
      : Math.min(coupon.value, orderTotal);

    res.json({ valid: true, coupon, discount: parseFloat(discount.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
};
