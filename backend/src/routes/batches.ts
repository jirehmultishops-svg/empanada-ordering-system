import { Router, Response } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/notifications.js';

const router = Router();

// GET / - List all batches
router.get('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const batches = await db('batch').orderBy('created_at', 'desc');

    const batchesWithOrders = await Promise.all(
      batches.map(async (batch) => {
        const orders = await db('order')
          .where({ batch_id: batch.id })
          .select('id', 'client_id', 'total_amount', 'status');

        return {
          id: batch.id,
          status: batch.status,
          estimated_minutes: batch.estimated_minutes,
          created_at: batch.created_at,
          ready_at: batch.ready_at,
          orders: orders.map((o) => ({
            id: o.id,
            client_id: o.client_id,
            total_amount: parseFloat(o.total_amount),
            status: o.status,
          })),
        };
      })
    );

    return res.json({ batches: batchesWithOrders });
  } catch (error) {
    console.error('Error listing batches:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST / - Create batch from selected order IDs
router.post('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { order_ids } = req.body;

  if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
    return res.status(400).json({ message: 'Se requiere un array order_ids con al menos un pedido' });
  }

  try {
    // Validate all orders exist and are in accepted state
    const orders = await db('order').whereIn('id', order_ids);

    if (orders.length !== order_ids.length) {
      return res.status(400).json({ message: 'Uno o más pedidos no fueron encontrados' });
    }

    const invalidOrders = orders.filter((o) => o.status !== 'accepted');
    if (invalidOrders.length > 0) {
      return res.status(400).json({
        message: 'Todos los pedidos deben estar en estado "accepted" para ser agrupados en un lote',
      });
    }

    // Create batch and assign orders in a transaction
    const batch = await db.transaction(async (trx) => {
      const [newBatch] = await trx('batch')
        .insert({ status: 'pending' })
        .returning('*');

      // Assign batch_id to all orders
      await trx('order')
        .whereIn('id', order_ids)
        .update({ batch_id: newBatch.id, updated_at: trx.fn.now() });

      return newBatch;
    });

    return res.status(201).json({
      id: batch.id,
      status: batch.status,
      estimated_minutes: batch.estimated_minutes,
      created_at: batch.created_at,
      ready_at: batch.ready_at,
      order_ids,
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /:id - Update batch (set estimated_minutes or mark as ready)
router.put('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { estimated_minutes, status } = req.body;

  try {
    const batch = await db('batch').where({ id }).first();
    if (!batch) {
      return res.status(404).json({ message: 'Lote no encontrado' });
    }

    const updateData: Record<string, unknown> = {};

    if (estimated_minutes !== undefined) {
      updateData.estimated_minutes = estimated_minutes;
    }

    if (status === 'ready') {
      updateData.status = 'ready';
      updateData.ready_at = db.fn.now();

      // Notify all clients in this batch
      const orders = await db('order').where({ batch_id: id }).select('id', 'client_id');

      for (const order of orders) {
        await NotificationService.notify(
          order.client_id,
          'batch_ready',
          'Tu pedido está listo para retirar',
          { order_id: order.id, batch_id: id, pickup_address: process.env.PICKUP_ADDRESS || 'Consultar con el local' }
        );
      }
    } else if (status !== undefined) {
      updateData.status = status;
    }

    // If estimated_minutes is being set, also notify clients
    if (estimated_minutes !== undefined && status !== 'ready') {
      const orders = await db('order').where({ batch_id: id }).select('id', 'client_id');
      for (const order of orders) {
        await NotificationService.notify(
          order.client_id,
          'batch_estimated_time',
          `Tu pedido estará listo en aproximadamente ${estimated_minutes} minutos`,
          { order_id: order.id, batch_id: id, estimated_minutes }
        );
      }
    }

    const [updated] = await db('batch')
      .where({ id })
      .update(updateData)
      .returning('*');

    return res.json({
      id: updated.id,
      status: updated.status,
      estimated_minutes: updated.estimated_minutes,
      created_at: updated.created_at,
      ready_at: updated.ready_at,
    });
  } catch (error) {
    console.error('Error updating batch:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
