import React, { useState, useEffect, useCallback } from 'react';
import { Category, Product } from '../../api';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  ProductFormData,
} from '../../adminApi';

type Tab = 'categories' | 'products';

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('products');

  return (
    <div className="admin-page">
      <h1>📦 Catálogo</h1>

      <div className="admin-tabs">
        <button
          className={`btn btn-small ${tab === 'products' ? 'btn-primary' : 'btn-filter'}`}
          onClick={() => setTab('products')}
        >
          Productos
        </button>
        <button
          className={`btn btn-small ${tab === 'categories' ? 'btn-primary' : 'btn-filter'}`}
          onClick={() => setTab('categories')}
        >
          Categorías
        </button>
      </div>

      {tab === 'categories' ? <CategoriesSection /> : <ProductsSection />}
    </div>
  );
}

// ======== Categories Section ========

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', display_order: 0 });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  function resetForm() {
    setFormData({ name: '', description: '', display_order: 0 });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(cat: Category) {
    setFormData({ name: cat.name, description: cat.description || '', display_order: cat.display_order });
    setEditingId(cat.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      if (editingId) {
        await updateCategory(editingId, formData);
      } else {
        await createCategory(formData);
      }
      resetForm();
      await loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  if (loading) return <div className="page-loading">Cargando...</div>;

  return (
    <div className="admin-section">
      {error && <div className="error-message">{error}</div>}

      <button className="btn btn-small btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
        + Nueva categoría
      </button>

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Orden</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
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
        {categories.map(cat => (
          <div key={cat.id} className="admin-list-item">
            <div className="admin-list-item-info">
              <strong>{cat.name}</strong>
              {cat.description && <span className="text-muted"> — {cat.description}</span>}
              <span className="admin-badge">Orden: {cat.display_order}</span>
            </div>
            <div className="admin-list-item-actions">
              <button className="btn btn-small btn-filter" onClick={() => startEdit(cat)}>Editar</button>
              <button className="btn btn-small btn-danger" onClick={() => handleDelete(cat.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======== Products Section ========

interface ProductWithActive extends Product {
  active?: boolean;
}

function ProductsSection() {
  const [products, setProducts] = useState<ProductWithActive[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    category_id: '',
    active: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods as ProductWithActive[]);
      setCategories(cats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function resetForm() {
    setFormData({ name: '', description: '', price: 0, category_id: categories[0]?.id || '', active: true });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(prod: ProductWithActive) {
    setFormData({
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      category_id: prod.category_id,
      active: prod.active !== false,
    });
    setEditingId(prod.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      if (editingId) {
        await updateProduct(editingId, formData);
      } else {
        await createProduct(formData);
      }
      resetForm();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await deleteProduct(id);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  async function handleToggleActive(prod: ProductWithActive) {
    try {
      await updateProduct(prod.id, { active: !(prod.active !== false) });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
    }
  }

  function getCategoryName(id: string): string {
    return categories.find(c => c.id === id)?.name || 'Sin categoría';
  }

  if (loading) return <div className="page-loading">Cargando...</div>;

  return (
    <div className="admin-section">
      {error && <div className="error-message">{error}</div>}

      <button className="btn btn-small btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
        + Nuevo producto
      </button>

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              required
            >
              <option value="">Seleccionar...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Imagen</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.active !== false}
                onChange={e => setFormData({ ...formData, active: e.target.checked })}
              />{' '}
              Activo
            </label>
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
        {products.map(prod => (
          <div key={prod.id} className={`admin-list-item ${prod.active === false ? 'inactive' : ''}`}>
            <div className="admin-list-item-info">
              <strong>{prod.name}</strong>
              <span className="admin-badge">${prod.price}</span>
              <span className="text-muted">{getCategoryName(prod.category_id)}</span>
              {prod.active === false && <span className="admin-badge-inactive">Inactivo</span>}
            </div>
            <div className="admin-list-item-actions">
              <button
                className={`btn btn-small ${prod.active !== false ? 'btn-filter' : 'btn-secondary'}`}
                onClick={() => handleToggleActive(prod)}
              >
                {prod.active !== false ? 'Desactivar' : 'Activar'}
              </button>
              <button className="btn btn-small btn-filter" onClick={() => startEdit(prod)}>Editar</button>
              <button className="btn btn-small btn-danger" onClick={() => handleDelete(prod.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
