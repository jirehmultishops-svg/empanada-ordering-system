import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyOrders, Order } from '../api';

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'accepted': return 'Aceptado';
    case 'rejected': return 'Rechazado';
    case 'ready': return 'Listo para retirar';
    case 'delivered': return 'Entregado';
    default: return status;
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'accepted': return '✅';
    case 'rejected': return '❌';
    case 'ready': return '🔔';
    case 'delivered': return '📦';
    default: return '📋';
  }
}

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadActiveOrders();
    }
  }, [isAuthenticated]);

  async function loadActiveOrders() {
    try {
      setLoading(true);
      const orders = await getMyOrders();
      // Show only active orders (not delivered/rejected)
      setActiveOrders(orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected'));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="home-page">
        <div className="home-hero">
          <h1>Jireh.Producción</h1>
          <p className="home-subtitle">Pedí online, retirá cuando esté listo</p>
          <div className="home-actions">
            <Link to="/catalog" className="btn btn-primary btn-large">Ver Catálogo</Link>
            <Link to="/login" className="btn btn-secondary btn-large" style={{ marginTop: '0.75rem' }}>Iniciar Sesión</Link>
          </div>
        </div>

        <div className="home-steps">
          <h2>¿Cómo funciona?</h2>
          <div className="step-list">
            <div className="step-item">
              <span className="step-number">1</span>
              <div>
                <strong>Elegí tus productos</strong>
                <p>Navegá el catálogo y agregá al carrito</p>
              </div>
            </div>
            <div className="step-item">
              <span className="step-number">2</span>
              <div>
                <strong>Confirmá tu pedido</strong>
                <p>Revisá el carrito y enviá tu pedido</p>
              </div>
            </div>
            <div className="step-item">
              <span className="step-number">3</span>
              <div>
                <strong>Subí el comprobante</strong>
                <p>Realizá la transferencia y subí la foto</p>
              </div>
            </div>
            <div className="step-item">
              <span className="step-number">4</span>
              <div>
                <strong>Retirá tu pedido</strong>
                <p>Te avisamos cuando esté listo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <h1>Hola, {user?.name || 'Cliente'} 👋</h1>

      {/* Active Orders Tracker */}
      <section className="home-section">
        <h2>Mis Pedidos Activos</h2>
        {loading ? (
          <p className="text-muted">Cargando...</p>
        ) : activeOrders.length === 0 ? (
          <div className="home-empty">
            <p>No tenés pedidos activos</p>
            <Link to="/catalog" className="btn btn-primary btn-small">Ver Catálogo</Link>
          </div>
        ) : (
          <div className="home-orders-track">
            {activeOrders.map(order => (
              <div key={order.id} className="home-order-card">
                <div className="home-order-status">
                  <span className="home-order-icon">{statusIcon(order.status)}</span>
                  <div>
                    <span className={`order-status status-${order.status}`}>{statusLabel(order.status)}</span>
                    <span className="home-order-date">
                      {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                </div>
                <span className="home-order-total">${order.total_amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delivery Process */}
      <section className="home-section">
        <h2>Proceso de Entrega</h2>
        <div className="delivery-timeline">
          <div className="timeline-step">
            <div className="timeline-dot active"></div>
            <div className="timeline-content">
              <strong>Pedido realizado</strong>
              <p>Tu pedido fue recibido</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <strong>En preparación</strong>
              <p>Estamos preparando tu pedido</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <strong>Listo para retirar</strong>
              <p>Te notificamos para que pases a buscar</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="home-section">
        <div className="home-quick-actions">
          <Link to="/catalog" className="quick-action-card">
            <span className="quick-action-icon">🛒</span>
            <span>Ver Catálogo</span>
          </Link>
          <Link to="/orders" className="quick-action-card">
            <span className="quick-action-icon">📋</span>
            <span>Historial</span>
          </Link>
          <Link to="/cart" className="quick-action-card">
            <span className="quick-action-icon">🧺</span>
            <span>Mi Carrito</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
