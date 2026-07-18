import { Router, Response } from 'express';
import db from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface CartItemRow {
  id: string;
  product_id: string;
  name: string;
  image_url: string | null;
  price: string;
  quantity: number;
}

interface CartResponse {
  id: string;
  items: Array<{
    id: string;
    product_id: string;
    name: string;
    image_url: string | null;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
}

async function getCartWithTotals(clientId: string): Promise<CartResponse> {
  const cart = await db('cart').where({ client_id: clientId }).first();

  if (!cart) {
    throw new Error('Carrito no encontrado para este cliente');
  }

  const items: CartItemRow[] = await db('cart_item')
    .join('product', 'cart_item.product_id', 'product.id')
    .where({ cart_id: cart.id })
    .select(
      'cart_item.id',
      'cart_item.product_id',
      'product.name',
      'product.image_url',
      'product.price',
      'cart_item.quantity'
    );

  const formattedItems = items.map((item) => {
    const price = parseFloat(item.price);
    const subtotal = parseFloat((price * item.quantity).toFixed(2));
    return {
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      image_url: item.image_url,
      price,
      quantity: item.quantity,
      subtotal,
    };
  });

  const total = parseFloat(
    formattedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
  );

  return {
    id: cart.id,
    items: formattedItems,
    total,
  };
}

// GET / - Get the authenticated client's cart with items, product details, subtotals, and total
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await getCartWithTotals(req.user!.id);
    return res.json(cart);
  } catch (error: any) {
    if (error.message === 'Carrito no encontrado para este cliente') {
      return res.status(404).json({ message: error.message });
    }
    console.error('Error fetching cart:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /items - Add product to cart (quantity 1, or increment if already present)
router.post('/items', authenticate, async (req: AuthRequest, res: Response) => {
  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({ message: 'product_id es requerido' });
  }

  try {
    // Validate product exists and is active
    const product = await db('product').where({ id: product_id, active: true }).first();
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado o no está disponible' });
    }

    // Get client's cart
    const cart = await db('cart').where({ client_id: req.user!.id }).first();
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado para este cliente' });
    }

    // Check if product is already in cart
    const existingItem = await db('cart_item')
      .where({ cart_id: cart.id, product_id })
      .first();

    if (existingItem) {
      // Increment quantity by 1
      await db('cart_item')
        .where({ id: existingItem.id })
        .update({ quantity: existingItem.quantity + 1 });
    } else {
      // Add new item with quantity 1
      await db('cart_item').insert({
        cart_id: cart.id,
        product_id,
        quantity: 1,
      });
    }

    // Update cart timestamp
    await db('cart').where({ id: cart.id }).update({ updated_at: db.fn.now() });

    const updatedCart = await getCartWithTotals(req.user!.id);
    return res.status(201).json(updatedCart);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /items/:id - Update item quantity
router.put('/items/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity === null) {
    return res.status(400).json({ message: 'quantity es requerido' });
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'quantity debe ser un número entero mayor o igual a 1' });
  }

  try {
    // Get client's cart
    const cart = await db('cart').where({ client_id: req.user!.id }).first();
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado para este cliente' });
    }

    // Validate cart item belongs to this client's cart
    const cartItem = await db('cart_item')
      .where({ id, cart_id: cart.id })
      .first();

    if (!cartItem) {
      return res.status(404).json({ message: 'Item no encontrado en el carrito' });
    }

    // Update quantity
    await db('cart_item').where({ id }).update({ quantity });

    // Update cart timestamp
    await db('cart').where({ id: cart.id }).update({ updated_at: db.fn.now() });

    const updatedCart = await getCartWithTotals(req.user!.id);
    return res.json(updatedCart);
  } catch (error) {
    console.error('Error updating cart item:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /items/:id - Remove item from cart
router.delete('/items/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Get client's cart
    const cart = await db('cart').where({ client_id: req.user!.id }).first();
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado para este cliente' });
    }

    // Validate cart item belongs to this client's cart
    const cartItem = await db('cart_item')
      .where({ id, cart_id: cart.id })
      .first();

    if (!cartItem) {
      return res.status(404).json({ message: 'Item no encontrado en el carrito' });
    }

    // Delete item
    await db('cart_item').where({ id }).delete();

    // Update cart timestamp
    await db('cart').where({ id: cart.id }).update({ updated_at: db.fn.now() });

    const updatedCart = await getCartWithTotals(req.user!.id);
    return res.json(updatedCart);
  } catch (error) {
    console.error('Error removing cart item:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
