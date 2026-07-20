import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminOrders, AdminOrder } from '../../adminApi';

export default function AdminHomePage() {
  const [stats, setStats] = useState({ pending: 0, accepted: 0, ready: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const orders = await getAdminOrders();
      setStats({
        pending: orders.filter(o => o.status === 'pending').length,
        accepted: orders.filter(o => o.status === 'accepted').length,
        ready: orders.filter(o => o.status === 'ready').length,
        total: orders.length,
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <h1>Panel de Control</h1>

      {loading ? (
        <p className="text-muted">Cargando...</p>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card stat-pending">
              <span className="admin-stat-number">{stats.pending}</span>
              <span className="admin-stat-label">Pendientes</span>
            </div>
            <div className="admin-stat-card stat-accepted">
              <span className="admin-stat-number">{stats.accepted}</span>
              <span className="admin-stat-label">En preparación</span>
            </div>
            <div className="admin-stat-card stat-ready">
              <span className="admin-stat-number">{stats.ready}</span>
              <span className="admin-stat-label">Listos</span>
            </div>
            <div className="admin-stat-card stat-total">
              <span className="admin-stat-number">{stats.total}</span>
              <span className="admin-stat-label">Total pedidos</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="admin-quick-nav">
            <Link to="/admin/orders" className="admin-nav-card">
              <span className="admin-nav-icon">📋</span>
              <span className="admin-nav-label">Gestionar Pedidos</span>
            </Link>
            <Link to="/admin/catalog" className="admin-nav-card">
              <span className="admin-nav-icon">📦</span>
              <span className="admin-nav-label">Catálogo</span>
            </Link>
            <Link to="/admin/delivery" className="admin-nav-card">
              <span className="admin-nav-icon">🚚</span>
              <span className="admin-nav-label">Entrega</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
