import { Router } from 'express';
import { Notification } from './notification.model.js';

/** Mounted under /me (auth applied by parent). */
export function notificationRouter() {
  const router = Router();

  router.get('/notifications', async (req, res) => {
    const [items, unread] = await Promise.all([
      Notification.find({ userId: req.auth!.userId }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: req.auth!.userId, readAt: { $exists: false } }),
    ]);
    res.json({ items, unread });
  });

  router.post('/notifications/read-all', async (req, res) => {
    await Notification.updateMany({ userId: req.auth!.userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    res.status(204).end();
  });

  return router;
}
