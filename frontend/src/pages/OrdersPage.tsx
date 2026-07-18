import React, { useState, useEffect, useRef } from 'react';
import { getMyOrders, uploadReceipt, Order } from '../api';
import OrderCard from '../components/OrderCard';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }

  function handleUploadReceipt(orderId: string) {
    setUploadingFor(orderId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;

    try {
      await uploadReceipt(uploadingFor, file);
      await loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir comprobante');
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  if (loading) {
    return <div className="page-loading">Cargando pedidos...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  // Separate active orders (pending/accepted) from history
  const activeOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'accepted'
  );
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const historyOrders = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'rejected'
  );

  return (
    <div className="orders-page">
      <h1>Mis Pedidos</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
        aria-label="Seleccionar comprobante"
      />

      {orders.length === 0 ? (
        <p className="empty-state">No tenés pedidos todavía.</p>
      ) : (
        <>
          {readyOrders.length > 0 && (
            <section>
              <h2 className="section-title">🎉 Listos para retirar</h2>
              {readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} isActive />
              ))}
            </section>
          )}

          {activeOrders.length > 0 && (
            <section>
              <h2 className="section-title">En proceso</h2>
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUploadReceipt={handleUploadReceipt}
                  isActive
                />
              ))}
            </section>
          )}

          {historyOrders.length > 0 && (
            <section>
              <h2 className="section-title">Historial</h2>
              {historyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
