import React, { useState, useEffect, useCallback } from 'react';

interface PromoSlide {
  id: string;
  type: 'image' | 'video';
  url: string;
  title?: string;
  subtitle?: string;
}

// Promotions/banners - edit these to change carousel content
const PROMO_SLIDES: PromoSlide[] = [
  {
    id: '1',
    type: 'image',
    url: '',
    title: '¡Bienvenido a Jireh.Producción!',
    subtitle: 'Los mejores productos congelados directo a tu mesa',
  },
  {
    id: '2',
    type: 'image',
    url: '',
    title: 'Ofertas Especiales',
    subtitle: 'Consultá nuestras promociones de la semana',
  },
  {
    id: '3',
    type: 'image',
    url: '',
    title: 'Pedí Online',
    subtitle: 'Hacé tu pedido fácil y rápido desde cualquier lugar',
  },
];

export default function PromoCarousel() {
  const [current, setCurrent] = useState(0);
  const slides = PROMO_SLIDES;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next]);

  if (slides.length === 0) return null;

  return (
    <div className="promo-carousel">
      <div
        className="promo-carousel-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="promo-slide">
            {slide.url ? (
              slide.type === 'video' ? (
                <video src={slide.url} autoPlay muted loop playsInline />
              ) : (
                <img src={slide.url} alt={slide.title || 'Promoción'} />
              )
            ) : (
              <div className="promo-placeholder">
                <div>
                  {slide.title && <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#eaeaea' }}>{slide.title}</h3>}
                  {slide.subtitle && <p style={{ color: '#8892b0' }}>{slide.subtitle}</p>}
                </div>
              </div>
            )}
            {slide.url && (slide.title || slide.subtitle) && (
              <div className="promo-slide-content">
                {slide.title && <h3>{slide.title}</h3>}
                {slide.subtitle && <p>{slide.subtitle}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button className="promo-nav promo-nav-prev" onClick={prev} aria-label="Anterior">
            ‹
          </button>
          <button className="promo-nav promo-nav-next" onClick={next} aria-label="Siguiente">
            ›
          </button>
          <div className="promo-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`promo-dot ${i === current ? 'active' : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
