import React from 'react';
import { CartItem } from '../api';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  disabled?: boolean;
}

export default function CartItemRow({ item, onUpdateQuantity, onRemove, disabled }: CartItemRowProps) {
  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <span className="cart-item-name">{item.name}</span>
        <span className="cart-item-price">${item.price.toFixed(2)} c/u</span>
      </div>
      <div className="cart-item-controls">
        <button
          className="btn btn-icon"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          disabled={disabled || item.quantity <= 1}
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        <span className="cart-item-quantity">{item.quantity}</span>
        <button
          className="btn btn-icon"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={disabled}
          aria-label="Aumentar cantidad"
        >
          +
        </button>
        <button
          className="btn btn-icon btn-danger"
          onClick={() => onRemove(item.id)}
          disabled={disabled}
          aria-label={`Eliminar ${item.name}`}
        >
          ✕
        </button>
      </div>
      <div className="cart-item-subtotal">
        Subtotal: ${item.subtotal.toFixed(2)}
      </div>
    </div>
  );
}
