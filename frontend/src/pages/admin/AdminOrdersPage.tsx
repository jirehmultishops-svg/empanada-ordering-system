import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminOrder,
  getAdminOrders,
  updateOrderStatus,
  verifyReceipt,
} from '../../adminApi';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptados' },
  { value: 'ready', label: 'Listos' },
  { value: 'rejected', label: 'Rechazados' },
];

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'accepted': return 'Aceptado';
    case 'rejected': return 'Rechazado';
    case 'ready': return 'Listo';
    case 'delivered': return 'Entregado';
    default: return status;
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminOrders(statusFilter || undefined);
      setOrders(data);
    } catch (err: unknown) {
      // Don't show error if session expired (redirect is already happening)
      if (err instanceof Error && err.message === 'Sesión expirada') return;
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleStatusChange(orderId: string, status: 'accepted' | 'rejected' | 'ready') {
    try {
      setActionLoading(orderId);
      await updateOrderStatus(orderId, status);
      await loadOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVerifyReceipt(orderId: string, verified: boolean) {
    try {
      setActionLoading(orderId);
      await verifyReceipt(orderId, verified);
      await loadOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al verificar comprobante');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="admin-page">
      <h1>📋 Pedidos</h1>

      <div className="admin-filters">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`btn btn-small ${statusFilter === opt.value ? 'btn-primary' : 'btn-filter'}`}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="page-loading">Cargando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">No hay pedidos {statusFilter && `con estado "${statusLabel(statusFilter)}"`}</div>
      ) : (
        <div className="admin-orders-list">
          {orders.map(order => (
            <AdminOrderCard
              key={order.id}
              order={order}
              loading={actionLoading === order.id}
              onStatusChange={handleStatusChange}
              onVerifyReceipt={handleVerifyReceipt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrderCardProps {
  order: AdminOrder;
  loading: boolean;
  onStatusChange: (orderId: string, status: 'accepted' | 'rejected' | 'ready') => void;
  onVerifyReceipt: (orderId: string, verified: boolean) => void;
}

function AdminOrderCard({ order, loading, onStatusChange, onVerifyReceipt }: OrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`admin-order-card status-border-${order.status}`}>
      <div className="admin-order-header" onClick={() => setShowDetails(!showDetails)}>
        <div>
          <span className="admin-order-client">{order.client?.name || 'Cliente'}</span>
          <span className={`order-status status-${order.status}`}>{statusLabel(order.status)}</span>
        </div>
        <div className="admin-order-meta">
          <span className="admin-order-amount">${order.total_amount}</span>
          <span className="admin-order-date">
            {new Date(order.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="admin-order-details">
          {order.client?.whatsapp && (
            <p className="admin-order-whatsapp">📱 {order.client.whatsapp}</p>
          )}

          {order.pickup_suggestion && (
            <p className="admin-order-suggestion">🕐 Sugerencia: {order.pickup_suggestion}</p>
          )}

          <div className="admin-order-items">
            {order.items.map(item => (
              <div key={item.id} className="order-item-line">
                <span>{item.quantity}x {item.product?.name || 'Producto'}</span>
                <span>${(item.unit_price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Receipt section */}
          {order.receipt && (
            <div className="admin-receipt-section">
              <h4>Comprobante</h4>
              <div className="admin-receipt-info">
                <span>Estado OCR: {order.receipt.ocr_status}</span>
                {order.receipt.extracted_amount != null && (
                  <span>Monto extraído: ${order.receipt.extracted_amount}</span>
                )}
                <span>Verificado: {order.receipt.verified ? '✅ Sí' : '❌ No'}</span>
              </div>
              {order.receipt.image_url && (
                <a href={order.receipt.image_url} target="_blank" rel="noopener noreferrer" className="btn btn-small btn-secondary">
                  Ver imagen
                </a>
              )}
              {!order.receipt.verified && (
                <div className="admin-receipt-actions">
                  <button
                    className="btn btn-small btn-secondary"
                    disabled={loading}
                    onClick={() => onVerifyReceipt(order.id, true)}
                  >
                    ✓ Verificar pago
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    disabled={loading}
                    onClick={() => onVerifyReceipt(order.id, false)}
                  >
                    ✗ Rechazar pago
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="admin-order-actions">
            {order.status === 'pending' && (
              <>
                <button
                  className="btn btn-small btn-secondary"
                  disabled={loading}
                  onClick={() => onStatusChange(order.id, 'accepted')}
                >
                  ✓ Aceptar
                </button>
                <button
                  className="btn btn-small btn-danger"
                  disabled={loading}
                  onClick={() => onStatusChange(order.id, 'rejected')}
                >
                  ✗ Rechazar
                </button>
              </>
            )}
            {order.status === 'accepted' && (
              <button
                className="btn btn-small btn-primary"
                disabled={loading}
                onClick={() => onStatusChange(order.id, 'ready')}
              >
                🔔 Marcar listo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
