import prisma from '../../shared/config/db.js';

export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
      return res.json({ message: 'You are already subscribed!' });
    }

    await prisma.newsletterSubscriber.create({ data: { email } });

    res.json({ message: 'Successfully subscribed! Check your inbox for 10% off.' });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
};
