import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/notifications.js';

const router = Router();

// GET / - Get authenticated client's unread notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const clientId = req.user!.id;

  try {
    const notifications = await NotificationService.getUnread(clientId);

    return res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        data: n.data,
        read: n.read,
        created_at: n.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /:id/read - Mark notification as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const clientId = req.user!.id;
  const { id } = req.params;

  try {
    const notification = await NotificationService.markAsRead(id, clientId);

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    return res.json({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      created_at: notification.created_at,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
