import prisma from '../../shared/config/db.js';

// Create address
export const createAddress = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { street, city, state, zipCode, country, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        customerId,
        street,
        city,
        state,
        zipCode,
        country: country || 'US',
        isDefault: isDefault || false
      }
    });

    res.status(201).json({
      message: 'Address created successfully',
      address
    });

  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Failed to create address' });
  }
};

// Get customer addresses
export const getAddresses = async (req, res) => {
  try {
    const customerId = req.user.customer.id;

    const addresses = await prisma.address.findMany({
      where: { customerId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(addresses);

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to get addresses' });
  }
};