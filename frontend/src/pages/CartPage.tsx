import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem, createOrder, Cart } from '../api';
import CartItemRow from '../components/CartItemRow';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [pickupSuggestion, setPickupSuggestion] = useState('');
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    try {
      const data = await getCart();
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el carrito');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setUpdating(true);
    try {
      const updated = await updateCartItem(itemId, quantity);
      setCart(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setUpdating(false);
    }
  }

  async function handleRemove(itemId: string) {
    setUpdating(true);
    try {
      const updated = await removeCartItem(itemId);
      setCart(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setUpdating(false);
    }
  }

  async function handleConfirmOrder() {
    if (!cart || cart.items.length === 0) return;
    setConfirming(true);
    try {
      await createOrder(pickupSuggestion || undefined);
      navigate('/orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al confirmar pedido');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return <div className="page-loading">Cargando carrito...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="cart-page">
      <h1>Tu Carrito</h1>

      {isEmpty ? (
        <div className="empty-state">
          <p>Tu carrito está vacío.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Ver Menú
          </button>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart!.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
                disabled={updating}
              />
            ))}
          </div>

          <div className="cart-total">
            <strong>Total: ${cart!.total.toFixed(2)}</strong>
          </div>

          <div className="cart-checkout">
            <div className="form-group">
              <label htmlFor="pickup-suggestion">
                Horario preferido de retiro (opcional)
              </label>
              <input
                id="pickup-suggestion"
                type="text"
                value={pickupSuggestion}
                onChange={(e) => setPickupSuggestion(e.target.value)}
                placeholder="Ej: 12:30, después de las 13"
              />
            </div>

            <button
              className="btn btn-primary btn-large"
              onClick={handleConfirmOrder}
              disabled={confirming}
            >
              {confirming ? 'Confirmando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
