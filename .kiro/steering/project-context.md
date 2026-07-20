---
inclusion: auto
---

# Jireh.Producción - Contexto del Proyecto

## Información General
- Nombre: Jireh.Producción (sistema de pedidos multiproducto)
- URL producción: https://empanada-ordering-system-production.up.railway.app
- Hosting: Railway (proyecto "believable-endurance", servicio "empanada-ordering-system")
- DB: PostgreSQL en Railway
- Volume: /app/uploads (persistente para imágenes)

## Stack Técnico
- Backend: Node.js + Express + TypeScript (ESM, "type": "module")
- Frontend: React + TypeScript + Vite
- DB: PostgreSQL con Knex.js
- Auth: JWT con jsonwebtoken (secret: process.env.JWT_SECRET || 'empanadas-jireh-secreto-2024')
- Token expira en 7 días (hardcodeado, NO leer de env)

## Deploy
- Railway CLI instalado y logueado como ROBERTO DOMINGUEZ
- Proyecto linkeado: `railway link --project "believable-endurance" --service "empanada-ordering-system" --environment "production"`
- Para deployar: `railway up --detach` (NO usar solo `railway redeploy` porque solo relanza el mismo build)
- SIEMPRE deployar después de hacer push con cambios
- Variables de entorno importantes en Railway:
  - DATABASE_URL: conexión a PostgreSQL
  - JWT_SECRET: empanadas-jireh-secreto-2024
  - NODE_ENV: production
  - NO debe existir JWT_EXPIRES_IN (se borró porque causaba que tokens expiraran en segundos)

## Problemas Conocidos y Resueltos
1. JWT_EXPIRES_IN=7 en Railway → tokens expiraban en 7 segundos. SOLUCIÓN: borrar variable, hardcodear '7d' en código.
2. Price de PostgreSQL llega como string → crash en frontend con .toFixed(). SOLUCIÓN: parseFloat() en endpoints catalog y products.
3. Campo "active" llega como string "true" en FormData multipart → validador rechazaba. SOLUCIÓN: aceptar strings "true"/"false".
4. Imágenes se perdían entre deploys. SOLUCIÓN: Railway Volume montado en /app/uploads.
5. `require()` no funciona en ESM → usar import para jsonwebtoken en index.ts.

## Diseño Actual
- UI futurista dark mode (púrpura/cyan/neón)
- Carrusel de promociones en catálogo (editable en frontend/src/components/PromoCarousel.tsx)
- Mobile-first responsive (breakpoint 768px para grid 2 columnas)
- Admin: Pedidos, Catálogo (productos+categorías), Entrega (slots/batches)
- Cliente: Menú (catálogo público), Carrito, Pedidos, Login/Registro
- Nombre de marca: "Jireh.Producción" (navbar + título de página)

## Historial de Cambios (Sesión 20/Jul/2026)
1. Fix JWT token expirando inmediatamente (JWT_EXPIRES_IN=7 en Railway → borrada)
2. Fix price como string desde PostgreSQL → parseFloat en catalog y products endpoints
3. Fix validador de productos rechazando "active" como string en FormData multipart
4. Agregado Railway Volume en /app/uploads para persistir imágenes
5. Nombre cambiado de "Empanadas" a "Jireh.Producción"
6. Rediseño completo UI futurista dark mode
7. Agregado carrusel de promociones (PromoCarousel.tsx)
8. Fix debug endpoint usando require() en ESM → cambiado a import
9. Agregado logging en middleware auth para debugging
10. Creada bitácora de proyecto (.kiro/steering/project-context.md) con inclusion: auto
11. Creado hook "update-project-log" para actualizar bitácora al final de cada sesión

## Credenciales Admin
- Usuario: admin
- Password: admin123456
- Rol: admin (en tabla client)

## Arquitectura de Rutas
- /api/auth - login/register
- /api/catalog - catálogo público (sin auth)
- /api/categories - CRUD categorías (admin)
- /api/products - CRUD productos (admin) + listado público
- /api/cart - carrito (auth)
- /api/orders - pedidos (admin: listar todos, cliente: crear + /my)
- /api/admin/time-slots - franjas horarias (admin)
- /api/admin/batches - tandas (admin)
- /api/admin/settings - configuración (admin)
- /api/notifications - notificaciones (auth)
