import React from 'react';
import { Order } from '../api';

interface OrderCardProps {
  order: Order;
  onUploadReceipt?: (orderId: string) => void;
  isActive?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  ready: 'Listo para retirar',
  delivered: 'Entregado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'status-pending',
  accepted: 'status-accepted',
  rejected: 'status-rejected',
  ready: 'status-ready',
  delivered: 'status-delivered',
};

export default function OrderCard({ order, onUploadReceipt, isActive }: OrderCardProps) {
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusClass = STATUS_COLORS[order.status] || '';
  const date = new Date(order.created_at).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`order-card ${isActive ? 'order-active' : ''}`}>
      <div className="order-header">
        <span className={`order-status ${statusClass}`}>{statusLabel}</span>
        <span className="order-date">{date}</span>
      </div>

      <div className="order-items-list">
        {order.items.map((item) => (
          <div key={item.id} className="order-item-line">
            <span>{item.quantity}x {item.product?.name || 'Producto'}</span>
            <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="order-total">
        Total: ${order.total_amount.toFixed(2)}
      </div>

      {order.pickup_suggestion && (
        <div className="order-detail">
          <small>Horario sugerido: {order.pickup_suggestion}</small>
        </div>
      )}

      {order.status === 'ready' && order.pickup_address && (
        <div className="order-pickup-address">
          <strong>📍 Retirá en:</strong> {order.pickup_address}
        </div>
      )}

      {order.bank_details && order.status === 'pending' && !order.receipt && (
        <div className="order-bank-details">
          <h4>Datos para transferencia:</h4>
          <p><strong>Banco:</strong> {order.bank_details.bank}</p>
          <p><strong>Tipo:</strong> {order.bank_details.account_type}</p>
          <p><strong>Número:</strong> {order.bank_details.account_number}</p>
          <p><strong>Titular:</strong> {order.bank_details.holder}</p>
          {order.bank_details.cbu && <p><strong>CBU:</strong> {order.bank_details.cbu}</p>}
          {order.bank_details.alias && <p><strong>Alias:</strong> {order.bank_details.alias}</p>}
        </div>
      )}

      {order.receipt && (
        <div className="order-receipt-status">
          <small>
            Comprobante: {order.receipt.verified ? '✅ Verificado' : '⏳ En revisión'}
          </small>
        </div>
      )}

      {onUploadReceipt && !order.receipt && order.status !== 'rejected' && (
        <button
          className="btn btn-small btn-secondary"
          onClick={() => onUploadReceipt(order.id)}
        >
          📎 Subir Comprobante
        </button>
      )}
    </div>
  );
}
