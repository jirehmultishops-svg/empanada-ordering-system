import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalog, addToCart, Category } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import PromoCarousel from '../components/PromoCarousel';

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    try {
      const data = await getCatalog();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(productId: string) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAddingId(productId);
    try {
      await addToCart(productId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al agregar al carrito');
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return <div className="page-loading">Cargando catálogo...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  return (
    <div className="catalog-page">
      <PromoCarousel />
      <h1>Nuestro Menú</h1>
      {categories.length === 0 ? (
        <p className="empty-state">No hay productos disponibles en este momento.</p>
      ) : (
        categories.map((category) => (
          <section key={category.id} className="category-section">
            <h2 className="category-title">{category.name}</h2>
            {category.description && (
              <p className="category-description">{category.description}</p>
            )}
            <div className="products-grid">
              {category.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  adding={addingId === product.id}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
