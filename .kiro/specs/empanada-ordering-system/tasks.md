# Plan de Implementación: Sistema de Pedidos de Empanadas

## Overview

Implementación incremental de un sistema de pedidos con API REST (Node.js/Express + TypeScript), frontend SPA (React + TypeScript), base de datos PostgreSQL, servicio OCR para verificación de pagos, y tests con fast-check. Cada tarea construye sobre las anteriores y finaliza con integración completa.

## Tasks

- [x] 1. Configuración del proyecto e infraestructura base
  - [x] 1.1 Inicializar monorepo con estructura backend y frontend
    - Crear estructura de directorios: `backend/`, `frontend/`, `shared/`
    - Configurar TypeScript, ESLint, Prettier en ambos proyectos
    - Instalar dependencias: express, pg, jsonwebtoken, bcrypt, multer, fast-check, vitest, supertest
    - Configurar scripts de build y desarrollo
    - _Requirements: 2.3, 10.4_

  - [x] 1.2 Configurar base de datos PostgreSQL y migraciones
    - Crear sistema de migraciones (knex o similar)
    - Definir migración inicial con tablas: Category, Product, Client, Cart, CartItem, Order, OrderItem, Receipt, TimeSlot, Batch
    - Configurar conexión a BD con variables de entorno
    - _Requirements: 10.4_

  - [x] 1.3 Configurar framework de testing
    - Configurar vitest para unit tests y property tests
    - Configurar supertest para integration tests
    - Crear helpers de testing (generadores base para fast-check, setup/teardown BD de test)
    - _Requirements: Estrategia de testing del diseño_

- [x] 2. Sistema de autenticación
  - [x] 2.1 Implementar registro de cliente
    - Crear endpoint `POST /api/auth/register` con validación de nombre, WhatsApp (10-15 dígitos), username único, contraseña
    - Hash de contraseña con bcrypt antes de almacenar
    - Retornar JWT en respuesta exitosa
    - Crear el carrito vacío asociado al cliente al registrar
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 10.1_

  - [x] 2.2 Implementar login y sesiones persistentes
    - Crear endpoint `POST /api/auth/login` con validación de credenciales
    - Generar JWT con expiración configurable
    - Middleware de autenticación que valida JWT en requests protegidos
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 2.3 Implementar middleware de autorización por rol
    - Middleware que verifica rol "admin" para endpoints de administración
    - Retornar 403 si un cliente intenta acceder a rutas de admin
    - _Requirements: 10.2, 10.3_

  - [ ]* 2.4 Property tests de autenticación
    - **Property 4: Round-trip de registro de cliente**
    - **Property 6: Credenciales incorrectas son rechazadas**
    - **Property 7: Validación de WhatsApp**
    - **Property 8: Unicidad de username**
    - **Property 22: Contraseñas nunca almacenadas en texto plano**
    - **Property 23: Autorización por rol**
    - **Validates: Requirements 3.2, 3.5, 3.6, 3.7, 10.1, 10.2, 10.3**

- [x] 3. Checkpoint - Verificar autenticación
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Catálogo de productos y categorías
  - [x] 4.1 Implementar CRUD de categorías (admin)
    - Crear endpoints `GET/POST/PUT/DELETE /api/categories`
    - Validar permisos de admin en creación, edición y eliminación
    - Incluir campo display_order para ordenamiento
    - _Requirements: 1.3_

  - [x] 4.2 Implementar CRUD de productos (admin)
    - Crear endpoints `GET/POST/PUT/DELETE /api/products`
    - Almacenar nombre, descripción, precio, imagen_url, categoría_id, active
    - Subida de imagen con multer al crear/editar producto
    - _Requirements: 1.2, 1.4, 1.5_

  - [x] 4.3 Implementar vista pública del catálogo
    - Endpoint `GET /api/catalog` que retorna solo productos activos agrupados por categoría
    - Ordenar categorías por display_order y productos por nombre
    - _Requirements: 1.1, 1.6_

  - [ ]* 4.4 Property tests de catálogo
    - **Property 1: Round-trip de creación de producto**
    - **Property 2: Solo productos activos visibles para clientes**
    - **Property 3: Eliminación remueve del catálogo**
    - **Validates: Requirements 1.2, 1.5, 1.6**

- [x] 5. Sistema de carrito de compras
  - [x] 5.1 Implementar gestión del carrito
    - Endpoint `GET /api/cart` para obtener carrito del cliente autenticado
    - Endpoint `POST /api/cart/items` para agregar producto (cantidad 1)
    - Endpoint `PUT /api/cart/items/:id` para modificar cantidad
    - Endpoint `DELETE /api/cart/items/:id` para eliminar item
    - Calcular subtotales y total en cada respuesta
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.9_

  - [ ]* 5.2 Property tests de carrito
    - **Property 9: Agregar producto al carrito**
    - **Property 10: Invariante de cálculo del carrito**
    - **Property 12: Persistencia del carrito en sesión**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.9**

- [x] 6. Creación y gestión de pedidos
  - [x] 6.1 Implementar confirmación de carrito como pedido
    - Endpoint `POST /api/orders` que convierte el carrito en pedido
    - Validar que el carrito no esté vacío
    - Copiar precio actual de cada producto a OrderItem.unit_price
    - Aceptar pickup_suggestion del cliente
    - Estado inicial: "pending"
    - Vaciar el carrito tras crear el pedido
    - Retornar datos bancarios para transferencia
    - _Requirements: 4.6, 4.7, 4.8, 5.1, 6.1_

  - [x] 6.2 Implementar cambios de estado del pedido (admin)
    - Endpoint `PUT /api/orders/:id/status` con validación de transiciones
    - Transiciones válidas: pending→accepted, pending→rejected, accepted→ready
    - Rechazar transiciones inválidas con HTTP 422
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 6.3 Implementar listado de pedidos
    - Endpoint `GET /api/orders` para admin (todos los pedidos con filtros)
    - Endpoint `GET /api/orders/my` para cliente (historial propio)
    - Incluir detalle completo: cliente, productos, cantidades, monto, estado pago, sugerencia horario
    - _Requirements: 6.2, 9.3_

  - [ ]* 6.4 Property tests de pedidos
    - **Property 11: Confirmación de carrito crea pedido equivalente**
    - **Property 14: Estado inicial de pedido confirmado**
    - **Property 15: Transiciones de estado válidas del pedido**
    - **Property 21: Historial completo de pedidos del cliente**
    - **Validates: Requirements 4.6, 6.1, 6.3, 6.4, 6.5, 9.3**

- [x] 7. Checkpoint - Verificar flujo de pedidos
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Verificación de pagos con OCR
  - [x] 8.1 Implementar subida de comprobantes
    - Endpoint `POST /api/orders/:id/receipt` para subir imagen
    - Almacenar imagen en storage local/S3
    - Asociar Receipt al Order con estado ocr_status: "processing"
    - _Requirements: 5.2_

  - [x] 8.2 Implementar servicio OCR
    - Crear OCRService que procesa imagen y extrae monto
    - Comparar monto extraído con total del pedido
    - Si coincide: marcar verified=true
    - Si no coincide: marcar para revisión, registrar ambos montos
    - Si falla OCR: marcar como "manual_review"
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.3 Property tests de pagos
    - **Property 13: Verificación de pago por comparación de montos**
    - **Validates: Requirements 5.4, 5.5, 5.6**

- [x] 9. Gestión de franjas horarias
  - [x] 9.1 Implementar CRUD de franjas horarias (admin)
    - Endpoints `GET/POST/PUT/DELETE /api/admin/time-slots`
    - Validar máximo 4 franjas por día
    - Registrar hora inicio y hora fin por franja
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.2 Implementar asignación de pedidos a franjas
    - Al aceptar pedido en modo franjas, asignar franja más cercana a la sugerencia del cliente
    - Notificar al cliente la franja asignada
    - _Requirements: 7.4, 7.5, 7.6_

  - [ ]* 9.3 Property tests de franjas horarias
    - **Property 16: Máximo 4 franjas horarias por día**
    - **Property 17: Asignación a franja más cercana**
    - **Property 18: Pedidos aceptados en modo franjas tienen franja asignada**
    - **Validates: Requirements 7.1, 7.4, 7.6**

- [x] 10. Modo de entrega por lotes
  - [x] 10.1 Implementar gestión de lotes (admin)
    - Endpoint `POST /api/admin/batches` para crear lote agrupando pedidos
    - Endpoint `PUT /api/admin/batches/:id` para asignar tiempo estimado y marcar como listo
    - Calcular hora estimada = momento actual + N minutos
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 10.2 Implementar alternancia entre modos
    - Endpoint `PUT /api/admin/settings/delivery-mode` para alternar entre franjas y lotes
    - Persistir configuración activa
    - _Requirements: 8.4_

  - [ ]* 10.3 Property tests de lotes
    - **Property 19: Notificación de lote a todos los clientes**
    - **Property 20: Cálculo de hora estimada del lote**
    - **Validates: Requirements 8.3, 8.5**

- [ ] 11. Sistema de notificaciones
  - [x] 11.1 Implementar servicio de notificaciones
    - Crear NotificationService que registra eventos de cambio de estado
    - Notificar al cliente cuando: pedido aceptado, rechazado, listo para retirar, lote listo
    - Notificar al admin cuando: nuevo pedido, discrepancia OCR, revisión manual requerida
    - Incluir dirección de retiro cuando pedido está listo
    - Implementar via polling o WebSocket (según complejidad deseada)
    - _Requirements: 6.4, 6.5, 7.3, 8.2, 8.5, 9.1, 9.2_

- [x] 12. Checkpoint - Verificar backend completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Frontend - Interfaz del cliente
  - [x] 13.1 Implementar vistas de autenticación
    - Pantalla de registro con campos: nombre, WhatsApp, usuario, contraseña
    - Pantalla de login
    - Persistencia del JWT en localStorage
    - Redirección automática si hay sesión activa
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 13.2 Implementar vista de catálogo
    - Mostrar productos agrupados por categoría
    - Botón de agregar al carrito en cada producto
    - Diseño mobile-first responsive
    - _Requirements: 1.1, 1.6, 4.1_

  - [x] 13.3 Implementar vista de carrito
    - Lista de items con cantidad editable
    - Subtotal por item y total general
    - Botón eliminar item
    - Botón confirmar pedido (con campo sugerencia de horario)
    - Validación de carrito vacío
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 13.4 Implementar vista de estado del pedido
    - Mostrar estado actual del pedido activo
    - Sección para subir comprobante de pago
    - Mostrar datos bancarios post-confirmación
    - Historial de pedidos anteriores
    - Mostrar dirección de retiro cuando pedido está listo
    - _Requirements: 5.1, 5.2, 9.1, 9.2, 9.3_

- [x] 14. Frontend - Panel de administración
  - [x] 14.1 Implementar dashboard de pedidos (admin)
    - Lista de pedidos con filtros por estado
    - Detalle de cada pedido: cliente, productos, monto, estado pago, sugerencia horario
    - Botones: aceptar, rechazar, marcar listo
    - Vista de comprobantes con opción de verificación manual
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 14.2 Implementar gestión de catálogo (admin)
    - CRUD de categorías con ordenamiento
    - CRUD de productos con subida de imagen
    - Toggle de activo/inactivo por producto
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 14.3 Implementar gestión de franjas y lotes (admin)
    - ABM de franjas horarias (máximo 4 por día)
    - Creación y gestión de lotes
    - Switch para alternar modo franjas/lotes
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.4_

- [x] 15. Integración final y wiring
  - [x] 15.1 Conectar frontend con backend completo
    - Configurar API client con interceptores de auth
    - Conectar todas las vistas con los endpoints correspondientes
    - Manejar errores de red y estados de carga
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 15.2 Tests de integración end-to-end
    - Test flujo completo: registro → catálogo → carrito → pedido → pago → retiro
    - Test flujo admin: gestión catálogo → gestión pedidos → franjas/lotes
    - _Requirements: Todas_

- [x] 16. Checkpoint final
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos que implementa
- Los checkpoints permiten validación incremental
- Los property tests verifican propiedades universales de correctitud (Properties 1-23)
- El stack es TypeScript end-to-end: Node.js/Express (backend), React (frontend), PostgreSQL, fast-check (testing)
