import React from 'react';
import { Product } from '../api';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  adding?: boolean;
}

export default function ProductCard({ product, onAddToCart, adding }: ProductCardProps) {
  return (
    <div className="product-card">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />
      )}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        {product.description && (
          <p className="product-description">{product.description}</p>
        )}
        <div className="product-footer">
          <span className="product-price">${product.price.toFixed(2)}</span>
          <button
            className="btn btn-small btn-primary"
            onClick={() => onAddToCart(product.id)}
            disabled={adding}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            {adding ? '...' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
