import prisma from '../../shared/config/db.js';
import { createConnectAccount, createAccountLink, getAccountDetails } from '../../shared/services/stripe.service.js';

// Start Stripe Connect onboarding
export const connectStripeAccount = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;
    const userEmail = req.user.email;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if already has account
    if (vendor.stripeAccountId && vendor.onboardingComplete) {
      return res.status(400).json({ error: 'Stripe account already connected' });
    }

    let stripeAccountId = vendor.stripeAccountId;

    // Create new Stripe account if doesn't exist
    if (!stripeAccountId) {
      const account = await createConnectAccount(userEmail);
      stripeAccountId = account.id;

      // Save to database
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          stripeAccountId,
          stripeAccountStatus: 'PENDING'
        }
      });
    }

    // Create onboarding link
    const refreshUrl = `${process.env.FRONTEND_URL}/vendor/dashboard?connect=refresh`;
    const returnUrl = `${process.env.FRONTEND_URL}/vendor/dashboard?connect=success`;

    const accountLink = await createAccountLink(stripeAccountId, refreshUrl, returnUrl);

    res.json({
      url: accountLink.url,
      accountId: stripeAccountId
    });

  } catch (error) {
    console.error('Connect Stripe account error:', error);
    res.status(500).json({ error: 'Failed to start Stripe onboarding' });
  }
};

// Check Stripe account status
export const getStripeAccountStatus = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        onboardingComplete: true,
        payoutsEnabled: true
      }
    });

    if (!vendor || !vendor.stripeAccountId) {
      return res.json({
        connected: false,
        status: 'NOT_CONNECTED'
      });
    }

    // Get fresh data from Stripe
    const account = await getAccountDetails(vendor.stripeAccountId);

    const onboardingComplete = account.details_submitted;
    const payoutsEnabled = account.payouts_enabled;

    // Update database
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        stripeAccountStatus: onboardingComplete ? 'CONNECTED' : 'PENDING',
        onboardingComplete,
        payoutsEnabled
      }
    });

    res.json({
      connected: onboardingComplete,
      status: onboardingComplete ? 'CONNECTED' : 'PENDING',
      payoutsEnabled,
      accountId: vendor.stripeAccountId
    });

  } catch (error) {
    console.error('Get Stripe account status error:', error);
    res.status(500).json({ error: 'Failed to get account status' });
  }
};

// Disconnect Stripe account
export const disconnectStripeAccount = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        stripeAccountId: null,
        stripeAccountStatus: 'NOT_CONNECTED',
        onboardingComplete: false,
        payoutsEnabled: false
      }
    });

    res.json({ message: 'Stripe account disconnected successfully' });

  } catch (error) {
    console.error('Connect Stripe account error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to start Stripe onboarding', details: error.message });
  }
};

// Get Stripe dashboard link
export const getStripeDashboardLink = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { 
        stripeAccountId: true, 
        onboardingComplete: true 
      }
    });

    if (!vendor || !vendor.stripeAccountId) {
      return res.status(400).json({ error: 'Stripe account not connected' });
    }

    if (!vendor.onboardingComplete) {
      return res.status(400).json({ error: 'Please complete Stripe onboarding first' });
    }

    // Create dashboard login link
    const { createDashboardLink } = await import('../../shared/services/stripe.service.js');
    const loginLink = await createDashboardLink(vendor.stripeAccountId);

    res.json({
      url: loginLink.url
    });

  } catch (error) {
    console.error('Get Stripe dashboard link error:', error);
    res.status(500).json({ error: 'Failed to get dashboard link' });
  }
};