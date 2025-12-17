import prisma from '../../shared/config/db.js';

// Get all customer addresses
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

// Update address
export const updateAddress = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;
    const { street, city, state, zipCode, country, isDefault } = req.body;

    // Check ownership
    const existingAddress = await prisma.address.findUnique({
      where: { id }
    });

    if (!existingAddress || existingAddress.customerId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: { street, city, state, zipCode, country, isDefault }
    });

    res.json({
      message: 'Address updated successfully',
      address
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;

    // Check ownership
    const address = await prisma.address.findUnique({
      where: { id }
    });

    if (!address || address.customerId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await prisma.address.delete({
      where: { id }
    });

    res.json({ message: 'Address deleted successfully' });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
};