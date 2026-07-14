// backend/src/modules/auth/auth.controller.js
import prisma from '../../shared/config/db.js';
import { hashPassword, comparePassword } from '../../shared/utils/bcrypt.util.js';
import { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } from '../../shared/utils/jwt.util.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendPasswordResetEmail, sendVerificationEmail } from '../../shared/services/email.service.js';


// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, claimGuestOrders } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Only CUSTOMER role allowed at registration
    const userRole = 'CUSTOMER';

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with customer profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: userRole,
        customer: {
          create: {}
        }
      },
      include: {
        customer: true
      }
    });

    // Link guest orders to new customer account (by email match)
    let claimedOrders = 0;
    if (userRole === 'CUSTOMER' && claimGuestOrders && user.customer) {
      const guestOrders = await prisma.order.findMany({
        where: { guestEmail: email, customerId: null },
        select: { id: true, addressId: true },
      });
      if (guestOrders.length > 0) {
        const orderIds = guestOrders.map(o => o.id);
        const addressIds = [...new Set(guestOrders.map(o => o.addressId))];

        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { customerId: user.customer.id },
        });
        await prisma.address.updateMany({
          where: { id: { in: addressIds }, customerId: null },
          data: { customerId: user.customer.id },
        });
        claimedOrders = guestOrders.length;
      }
    }

    // Send verification email — fire-and-forget so it never blocks registration
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken, emailVerifyExpires },
    });
    sendVerificationEmail(email, verifyToken, firstName).catch(() => {});

    const tokenPayload = { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion ?? 0 };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User registered successfully',
      user: { ...userWithoutPassword, emailVerified: false },
      token,
      refreshToken,
      ...(claimedOrders > 0 && { claimedOrders }),
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with related data
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customer: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Link any past guest orders placed with this email
    if (user.customer) {
      const guestOrders = await prisma.order.findMany({
        where: { guestEmail: email, customerId: null },
        select: { id: true, addressId: true },
      });
      if (guestOrders.length > 0) {
        const orderIds = guestOrders.map(o => o.id);
        const addressIds = [...new Set(guestOrders.map(o => o.addressId))];
        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { customerId: user.customer.id },
        });
        await prisma.address.updateMany({
          where: { id: { in: addressIds }, customerId: null },
          data: { customerId: user.customer.id },
        });
      }
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion ?? 0 };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, phone, currentPassword } = req.body;

    // Require password confirmation when changing email
    if (email && email !== req.user.email) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change your email' });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, email, phone }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password - ✅ FIXED: Uses passwordHash instead of password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ FIX: Use passwordHash (the correct field name in Prisma schema)
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword, tokenVersion: { increment: 1 } }
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

// Forgot password - send reset email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success (security: don't reveal if email exists)
    if (!user) {
      return res.json({ 
        message: 'If that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 1 hour
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordExpires
      }
    });

    // Send email (wrapped in try-catch in case email service is not configured)
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Reset the token since email failed
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });
      return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }

    res.json({ 
      message: 'If that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the token to match stored version
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpires: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password, clear reset token, and revoke all refresh tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        tokenVersion: { increment: 1 }
      }
    });

    res.json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, emailVerified: true, createdAt: true, updatedAt: true,
        customer: { select: { id: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Verify email with token from link
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const emailVerifyToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken, emailVerifyExpires: { gt: new Date() } },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Resend verification email (authenticated)
export const resendVerification = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken, emailVerifyExpires },
    });

    await sendVerificationEmail(user.email, verifyToken, user.firstName);
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
};

// Refresh access token using a valid refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.isBlocked) {
      return res.status(401).json({ error: 'User not found or blocked' });
    }

    // Reject tokens issued before the last logout or password change
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion };
    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

// Logout — invalidates all refresh tokens for this user
export const logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { tokenVersion: { increment: 1 } }
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};