import prisma from '../../shared/config/db.js';

// Get customer profile
export const getCustomerProfile = async (req, res) => {
  try {
    const customerId = req.user.customer.id;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true, phone: true }
        },
        addresses: true
      }
    });

    res.json(customer);

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update customer profile (phone from user table)
export const updateCustomerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { phone }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};