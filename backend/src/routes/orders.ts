import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth.js';
import { processReceipt } from '../services/ocr.js';
import { NotificationService } from '../services/notifications.js';

const router = Router();

// Valid state transitions for orders
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['ready'],
};

/**
 * Validates whether a state transition is allowed.
 * Returns { valid: true } if allowed, or { valid: false, message } with details.
 */
export function validateTransition(
  currentStatus: string,
  newStatus: string
): { valid: true } | { valid: false; message: string } {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    const validOptions = allowed ? allowed.join(', ') : 'ninguna';
    return {
      valid: false,
      message: `Transición inválida: no se puede cambiar de "${currentStatus}" a "${newStatus}". Transiciones válidas desde "${currentStatus}": ${validOptions}`,
    };
  }
  return { valid: true };
}

/**
 * Finds the nearest active time slot for a given date based on the client's pickup suggestion.
 * Compares the suggestion time to each slot's start_time and picks the closest one.
 */
export async function findNearestTimeSlot(
  pickupSuggestion: string | null,
  slotDate: string
): Promise<{ id: string; start_time: string; end_time: string } | null> {
  const slots = await db('time_slot')
    .where({ slot_date: slotDate, active: true })
    .orderBy('start_time', 'asc');

  if (slots.length === 0) return null;

  // If no suggestion, return the first available slot
  if (!pickupSuggestion) return slots[0];

  // Parse suggestion as time (HH:MM format expected, or try to extract time)
  const suggestionMinutes = parseTimeToMinutes(pickupSuggestion);
  if (suggestionMinutes === null) return slots[0];

  let nearest = slots[0];
  let minDiff = Math.abs(parseTimeToMinutes(slots[0].start_time)! - suggestionMinutes);

  for (let i = 1; i < slots.length; i++) {
    const slotMinutes = parseTimeToMinutes(slots[i].start_time)!;
    const diff = Math.abs(slotMinutes - suggestionMinutes);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = slots[i];
    }
  }

  return nearest;
}

/**
 * Parses a time string (HH:MM or HH:MM:SS) to minutes since midnight.
 * Returns null if parsing fails.
 */
export function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// POST / - Create order from cart
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const clientId = req.user!.id;
  const { pickup_suggestion } = req.body;

  try {
    // Get client's cart
    const cart = await db('cart').where({ client_id: clientId }).first();
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado para este cliente' });
    }

    // Get cart items with product prices
    const cartItems = await db('cart_item')
      .join('product', 'cart_item.product_id', 'product.id')
      .where({ cart_id: cart.id })
      .select(
        'cart_item.id',
        'cart_item.product_id',
        'cart_item.quantity',
        'product.price'
      );

    // Validate cart is not empty
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Debés agregar al menos un producto' });
    }

    // Execute in a transaction
    const order = await db.transaction(async (trx) => {
      // Calculate total
      const totalAmount = cartItems.reduce((sum, item) => {
        return sum + parseFloat(item.price) * item.quantity;
      }, 0);

      // Create order
      const [newOrder] = await trx('order')
        .insert({
          client_id: clientId,
          total_amount: parseFloat(totalAmount.toFixed(2)),
          status: 'pending',
          pickup_suggestion: pickup_suggestion || null,
        })
        .returning('*');

      // Create order items (copy current price as unit_price)
      const orderItems = cartItems.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.price),
      }));

      await trx('order_item').insert(orderItems);

      // Empty the cart
      await trx('cart_item').where({ cart_id: cart.id }).delete();

      // Update cart timestamp
      await trx('cart').where({ id: cart.id }).update({ updated_at: trx.fn.now() });

      return newOrder;
    });

    // Fetch order items for response
    const items = await db('order_item')
      .join('product', 'order_item.product_id', 'product.id')
      .where({ order_id: order.id })
      .select(
        'order_item.id',
        'order_item.product_id',
        'product.name',
        'order_item.quantity',
        'order_item.unit_price'
      );

    const bankDetails = {
      alias: process.env.BANK_ALIAS || 'empanadas.alias',
      cbu: process.env.BANK_CBU || '0000000000000000000000',
    };

    // Notify admin about new order
    try {
      await NotificationService.notifyAdmins(
        'new_order',
        `Nuevo pedido recibido de ${req.user!.username}`,
        { order_id: order.id, total_amount: parseFloat(order.total_amount) }
      );
    } catch (notifyError) {
      console.error('Error notifying admin about new order:', notifyError);
    }

    return res.status(201).json({
      order: {
        id: order.id,
        client_id: order.client_id,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        pickup_suggestion: order.pickup_suggestion,
        created_at: order.created_at,
        items: items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
        })),
      },
      bank_transfer: bankDetails,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /:id/status - Change order status (admin only)
router.put('/:id/status', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'El campo "status" es requerido' });
  }

  try {
    const order = await db('order').where({ id }).first();
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const result = validateTransition(order.status, status);
    if (!result.valid) {
      return res.status(422).json({ message: result.message });
    }

    const updateData: Record<string, unknown> = { status, updated_at: db.fn.now() };

    // If accepting order in 'slots' mode, assign nearest time slot
    if (status === 'accepted') {
      try {
        const setting = await db('settings').where({ key: 'delivery_mode' }).first();
        const deliveryMode = setting?.value || 'slots';

        if (deliveryMode === 'slots') {
          const today = new Date().toISOString().split('T')[0];
          const nearestSlot = await findNearestTimeSlot(order.pickup_suggestion, today);
          if (nearestSlot) {
            updateData.time_slot_id = nearestSlot.id;
          }
        }
      } catch (slotError) {
        // Non-critical: log but continue with status change
        console.error('Error assigning time slot:', slotError);
      }
    }

    const [updatedOrder] = await db('order')
      .where({ id })
      .update(updateData)
      .returning('*');

    // Send notifications based on new status
    try {
      if (status === 'accepted') {
        let message = 'Tu pedido fue aceptado';
        const data: Record<string, unknown> = { order_id: id };

        if (updatedOrder.time_slot_id) {
          const slot = await db('time_slot').where({ id: updatedOrder.time_slot_id }).first();
          if (slot) {
            message = `Tu pedido fue aceptado. Franja de retiro: ${slot.start_time} - ${slot.end_time}`;
            data.time_slot = { start_time: slot.start_time, end_time: slot.end_time };
          }
        }

        await NotificationService.notify(order.client_id, 'order_accepted', message, data);
      } else if (status === 'rejected') {
        await NotificationService.notify(
          order.client_id,
          'order_rejected',
          'Tu pedido fue rechazado',
          { order_id: id }
        );
      } else if (status === 'ready') {
        await NotificationService.notify(
          order.client_id,
          'order_ready',
          'Tu pedido está listo para retirar',
          {
            order_id: id,
            pickup_address: process.env.PICKUP_ADDRESS || 'Consultar con el local',
          }
        );
      }
    } catch (notifyError) {
      // Non-critical: log but don't fail the status change
      console.error('Error sending notification:', notifyError);
    }

    return res.json({
      id: updatedOrder.id,
      client_id: updatedOrder.client_id,
      total_amount: parseFloat(updatedOrder.total_amount),
      status: updatedOrder.status,
      pickup_suggestion: updatedOrder.pickup_suggestion,
      time_slot_id: updatedOrder.time_slot_id || null,
      created_at: updatedOrder.created_at,
      updated_at: updatedOrder.updated_at,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET / - List all orders (admin only) with optional status filter
router.get('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

  try {
    let query = db('order')
      .join('client', 'order.client_id', 'client.id')
      .select(
        'order.id',
        'order.client_id',
        'order.total_amount',
        'order.status',
        'order.pickup_suggestion',
        'order.time_slot_id',
        'order.batch_id',
        'order.created_at',
        'order.updated_at',
        'client.name as client_name',
        'client.whatsapp as client_whatsapp'
      )
      .orderBy('order.created_at', 'desc');

    if (status && typeof status === 'string') {
      query = query.where('order.status', status);
    }

    const orders = await query;

    // Fetch items and receipts for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await db('order_item')
          .join('product', 'order_item.product_id', 'product.id')
          .where({ order_id: order.id })
          .select(
            'order_item.id',
            'order_item.product_id',
            'product.name',
            'order_item.quantity',
            'order_item.unit_price'
          );

        const receipt = await db('receipt')
          .where({ order_id: order.id })
          .first();

        return {
          id: order.id,
          client_id: order.client_id,
          client_name: order.client_name,
          client_whatsapp: order.client_whatsapp,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          pickup_suggestion: order.pickup_suggestion,
          time_slot_id: order.time_slot_id,
          batch_id: order.batch_id,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price),
          })),
          receipt: receipt
            ? {
                id: receipt.id,
                image_url: receipt.image_url,
                extracted_amount: receipt.extracted_amount ? parseFloat(receipt.extracted_amount) : null,
                ocr_status: receipt.ocr_status,
                verified: receipt.verified,
                uploaded_at: receipt.uploaded_at,
              }
            : null,
        };
      })
    );

    return res.json({ orders: ordersWithDetails });
  } catch (error) {
    console.error('Error listing orders:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /my - List authenticated client's orders (history)
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  const clientId = req.user!.id;

  try {
    const orders = await db('order')
      .where({ client_id: clientId })
      .select(
        'id',
        'client_id',
        'total_amount',
        'status',
        'pickup_suggestion',
        'time_slot_id',
        'batch_id',
        'created_at',
        'updated_at'
      )
      .orderBy('created_at', 'desc');

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await db('order_item')
          .join('product', 'order_item.product_id', 'product.id')
          .where({ order_id: order.id })
          .select(
            'order_item.id',
            'order_item.product_id',
            'product.name',
            'order_item.quantity',
            'order_item.unit_price'
          );

        const receipt = await db('receipt')
          .where({ order_id: order.id })
          .first();

        return {
          id: order.id,
          client_id: order.client_id,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          pickup_suggestion: order.pickup_suggestion,
          time_slot_id: order.time_slot_id,
          batch_id: order.batch_id,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price),
          })),
          receipt: receipt
            ? {
                id: receipt.id,
                image_url: receipt.image_url,
                extracted_amount: receipt.extracted_amount ? parseFloat(receipt.extracted_amount) : null,
                ocr_status: receipt.ocr_status,
                verified: receipt.verified,
                uploaded_at: receipt.uploaded_at,
              }
            : null,
        };
      })
    );

    return res.json({ orders: ordersWithDetails });
  } catch (error) {
    console.error('Error listing client orders:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Configure multer for receipt image uploads
const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${randomUUID()}${ext}`);
  },
});

const receiptUpload = multer({ storage: receiptStorage });

// POST /:id/receipt - Upload payment receipt image
router.post('/:id/receipt', authenticate, receiptUpload.single('receipt'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const clientId = req.user!.id;

  try {
    // Find the order and validate it belongs to the authenticated client
    const order = await db('order').where({ id }).first();
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (order.client_id !== clientId) {
      return res.status(403).json({ message: 'No tenés permiso para subir un comprobante a este pedido' });
    }

    // Validate that an image file was provided
    if (!req.file) {
      return res.status(400).json({ message: 'Se requiere una imagen del comprobante' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    // Create the receipt record with initial processing status
    const [receipt] = await db('receipt')
      .insert({
        order_id: id,
        image_url: imageUrl,
        ocr_status: 'processing',
        verified: false,
      })
      .returning('*');

    // Fire and forget: process OCR asynchronously
    processReceipt(receipt.id).catch((err) => {
      console.error(`Error in async OCR processing for receipt ${receipt.id}:`, err);
    });

    return res.status(201).json({
      id: receipt.id,
      order_id: receipt.order_id,
      image_url: receipt.image_url,
      ocr_status: receipt.ocr_status,
      verified: receipt.verified,
      uploaded_at: receipt.uploaded_at,
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /:id/receipt/verify - Manually verify receipt (admin only)
router.put('/:id/receipt/verify', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { verified, extracted_amount } = req.body;

  if (typeof verified !== 'boolean') {
    return res.status(400).json({ message: 'El campo "verified" (boolean) es requerido' });
  }

  try {
    // Find the order
    const order = await db('order').where({ id }).first();
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Find the receipt for this order
    const receipt = await db('receipt').where({ order_id: id }).first();
    if (!receipt) {
      return res.status(404).json({ message: 'No se encontró comprobante para este pedido' });
    }

    // Update receipt with manual verification
    const updateData: Record<string, unknown> = {
      verified,
      ocr_status: 'completed',
    };

    if (extracted_amount !== undefined && extracted_amount !== null) {
      updateData.extracted_amount = extracted_amount;
    }

    const [updatedReceipt] = await db('receipt')
      .where({ id: receipt.id })
      .update(updateData)
      .returning('*');

    return res.json({
      id: updatedReceipt.id,
      order_id: updatedReceipt.order_id,
      image_url: updatedReceipt.image_url,
      extracted_amount: updatedReceipt.extracted_amount ? parseFloat(updatedReceipt.extracted_amount) : null,
      ocr_status: updatedReceipt.ocr_status,
      verified: updatedReceipt.verified,
      uploaded_at: updatedReceipt.uploaded_at,
    });
  } catch (error) {
    console.error('Error verifying receipt:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
