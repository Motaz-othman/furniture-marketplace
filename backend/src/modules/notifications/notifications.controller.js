import prisma from '../../shared/config/db.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // ✅ ADD DEBUG
    console.log('=== GET NOTIFICATIONS DEBUG ===');
    console.log('Token userId:', userId);
    console.log('User object:', req.user);
    
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const where = { userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }
    
    console.log('Where clause:', where);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.notification.count({ where })
    ]);
    
    console.log('Found notifications:', notifications.length);
    console.log('=== END DEBUG ===');

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};
// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    res.json({ unreadCount: count });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      message: 'Notification marked as read',
      notification: updated
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      message: 'All notifications marked as read',
      count: result.count
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};