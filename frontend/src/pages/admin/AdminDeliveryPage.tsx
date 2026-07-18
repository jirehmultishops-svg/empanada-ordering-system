import React, { useState, useEffect, useCallback } from 'react';
import {
  TimeSlot,
  Batch,
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  getBatches,
  createBatch,
  updateBatch,
  getDeliveryMode,
  setDeliveryMode,
  getAdminOrders,
  AdminOrder,
} from '../../adminApi';

export default function AdminDeliveryPage() {
  const [mode, setMode] = useState<'slots' | 'batches'>('slots');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMode = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDeliveryMode();
      setMode(data.mode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMode(); }, [loadMode]);

  async function handleToggleMode() {
    try {
      setError('');
      const newMode = mode === 'slots' ? 'batches' : 'slots';
      await setDeliveryMode(newMode);
      setMode(newMode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar modo');
    }
  }

  if (loading) return <div className="page-loading">Cargando...</div>;

  return (
    <div className="admin-page">
      <h1>🚀 Entrega</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-mode-switch">
        <span className={mode === 'slots' ? 'mode-active' : ''}>Franjas horarias</span>
        <button className="toggle-switch" onClick={handleToggleMode} aria-label="Alternar modo de entrega">
          <span className={`toggle-knob ${mode === 'batches' ? 'toggled' : ''}`} />
        </button>
        <span className={mode === 'batches' ? 'mode-active' : ''}>Lotes</span>
      </div>

      {mode === 'slots' ? <TimeSlotsSection /> : <BatchesSection />}
    </div>
  );
}

// ======== Time Slots Section ========

function TimeSlotsSection() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ slot_date: '', start_time: '', end_time: '' });

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTimeSlots();
      setSlots(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar franjas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  function resetForm() {
    const today = new Date().toISOString().split('T')[0];
    setFormData({ slot_date: today, start_time: '', end_time: '' });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(slot: TimeSlot) {
    setFormData({
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
    setEditingId(slot.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      if (editingId) {
        await updateTimeSlot(editingId, formData);
      } else {
        await createTimeSlot(formData);
      }
      resetForm();
      await loadSlots();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta franja horaria?')) return;
    try {
      await deleteTimeSlot(id);
      await loadSlots();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  if (loading) return <div className="page-loading">Cargando...</div>;

  return (
    <div className="admin-section">
      <h2>Franjas horarias</h2>
      {error && <div className="error-message">{error}</div>}

      <button className="btn btn-small btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
        + Nueva franja
      </button>
      <small className="text-muted" style={{ display: 'block', marginTop: '0.5rem' }}>
        Máximo 4 franjas por día
      </small>

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="date"
              value={formData.slot_date}
              onChange={e => setFormData({ ...formData, slot_date: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Inicio</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Fin</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="btn btn-small btn-primary">
              {editingId ? 'Guardar' : 'Crear'}
            </button>
            <button type="button" className="btn btn-small btn-filter" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="admin-list">
        {slots.map(slot => (
          <div key={slot.id} className="admin-list-item">
            <div className="admin-list-item-info">
              <strong>{slot.slot_date}</strong>
              <span>{slot.start_time} — {slot.end_time}</span>
              {!slot.active && <span className="admin-badge-inactive">Inactiva</span>}
            </div>
            <div className="admin-list-item-actions">
              <button className="btn btn-small btn-filter" onClick={() => startEdit(slot)}>Editar</button>
              <button className="btn btn-small btn-danger" onClick={() => handleDelete(slot.id)}>Eliminar</button>
            </div>
          </div>
        ))}
        {slots.length === 0 && <div className="empty-state">No hay franjas configuradas</div>}
      </div>
    </div>
  );
}

// ======== Batches Section ========

function BatchesSection() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [batchData, orderData] = await Promise.all([
        getBatches(),
        getAdminOrders('accepted'),
      ]);
      setBatches(batchData);
      setAcceptedOrders(orderData.filter(o => !o.batch_id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function toggleOrderSelection(orderId: string) {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  }

  async function handleCreateBatch() {
    if (selectedOrders.length === 0) return;
    try {
      setError('');
      await createBatch(selectedOrders);
      setSelectedOrders([]);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear lote');
    }
  }

  async function handleSetEstimate(batchId: string) {
    try {
      setError('');
      await updateBatch(batchId, { estimated_minutes: estimatedMinutes });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar lote');
    }
  }

  async function handleMarkReady(batchId: string) {
    try {
      setError('');
      await updateBatch(batchId, { status: 'ready' });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al marcar lote como listo');
    }
  }

  if (loading) return <div className="page-loading">Cargando...</div>;

  return (
    <div className="admin-section">
      <h2>Lotes de preparación</h2>
      {error && <div className="error-message">{error}</div>}

      {/* Create batch from accepted orders */}
      {acceptedOrders.length > 0 && (
        <div className="admin-batch-create">
          <h3>Pedidos aceptados (sin lote)</h3>
          <div className="admin-list">
            {acceptedOrders.map(order => (
              <div key={order.id} className="admin-list-item selectable" onClick={() => toggleOrderSelection(order.id)}>
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={() => toggleOrderSelection(order.id)}
                />
                <div className="admin-list-item-info">
                  <strong>{order.client?.name}</strong>
                  <span>${order.total_amount}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-small btn-primary"
            disabled={selectedOrders.length === 0}
            onClick={handleCreateBatch}
          >
            Crear lote ({selectedOrders.length} pedidos)
          </button>
        </div>
      )}

      {/* Existing batches */}
      <h3>Lotes activos</h3>
      <div className="admin-list">
        {batches.map(batch => (
          <div key={batch.id} className="admin-batch-card">
            <div className="admin-batch-header">
              <span className={`order-status status-${batch.status}`}>
                {batch.status === 'pending' ? 'Preparando' : batch.status === 'ready' ? 'Listo' : batch.status}
              </span>
              <span className="admin-order-date">
                {new Date(batch.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {batch.estimated_minutes && (
              <p className="text-muted">⏱ Estimado: {batch.estimated_minutes} min</p>
            )}
            {batch.ready_at && (
              <p className="text-muted">✅ Listo: {new Date(batch.ready_at).toLocaleTimeString('es-AR')}</p>
            )}

            {batch.orders && batch.orders.length > 0 && (
              <div className="admin-batch-orders">
                {batch.orders.map(o => (
                  <span key={o.id} className="admin-badge">{o.client?.name}</span>
                ))}
              </div>
            )}

            {batch.status !== 'ready' && (
              <div className="admin-batch-actions">
                <div className="form-row">
                  <input
                    type="number"
                    min="1"
                    value={estimatedMinutes}
                    onChange={e => setEstimatedMinutes(parseInt(e.target.value) || 30)}
                    style={{ width: '80px' }}
                  />
                  <button className="btn btn-small btn-filter" onClick={() => handleSetEstimate(batch.id)}>
                    Estimar
                  </button>
                  <button className="btn btn-small btn-secondary" onClick={() => handleMarkReady(batch.id)}>
                    🔔 Listo
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {batches.length === 0 && <div className="empty-state">No hay lotes activos</div>}
      </div>
    </div>
  );
}
