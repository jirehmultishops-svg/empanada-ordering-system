import db from '../db/connection.js';

export interface NotificationData {
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  client_id: string;
  type: string;
  message: string;
  data: NotificationData | null;
  read: boolean;
  created_at: string;
}

/**
 * NotificationService - Handles creating and querying notifications for clients.
 * Uses a simple polling model: notifications are stored in the `notification` table
 * and clients fetch them via GET /api/notifications.
 */
export const NotificationService = {
  /**
   * Create a notification for a client.
   */
  async notify(
    clientId: string,
    type: string,
    message: string,
    data?: NotificationData
  ): Promise<Notification> {
    const [notification] = await db('notification')
      .insert({
        client_id: clientId,
        type,
        message,
        data: data ? JSON.stringify(data) : null,
      })
      .returning('*');

    return notification;
  },

  /**
   * Get unread notifications for a client.
   */
  async getUnread(clientId: string): Promise<Notification[]> {
    return db('notification')
      .where({ client_id: clientId, read: false })
      .orderBy('created_at', 'desc');
  },

  /**
   * Get all notifications for a client.
   */
  async getAll(clientId: string): Promise<Notification[]> {
    return db('notification')
      .where({ client_id: clientId })
      .orderBy('created_at', 'desc');
  },

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string, clientId: string): Promise<Notification | null> {
    const [updated] = await db('notification')
      .where({ id: notificationId, client_id: clientId })
      .update({ read: true })
      .returning('*');

    return updated || null;
  },

  /**
   * Notify admin(s) about an event.
   * Finds all clients with role='admin' and notifies them.
   */
  async notifyAdmins(type: string, message: string, data?: NotificationData): Promise<void> {
    const admins = await db('client').where({ role: 'admin' }).select('id');

    for (const admin of admins) {
      await db('notification')
        .insert({
          client_id: admin.id,
          type,
          message,
          data: data ? JSON.stringify(data) : null,
        });
    }
  },
};

export default NotificationService;
