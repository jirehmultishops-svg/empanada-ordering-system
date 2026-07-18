# Documento de Requisitos - Sistema de Pedidos de Empanadas

## Introducción

Sistema de pedidos para un negocio de empanadas (extensible a otros productos alimenticios) donde los clientes acceden mediante QR o link, navegan un catálogo de productos, arman un carrito de compras, pagan por transferencia bancaria y pasan a retirar en horarios coordinados con el administrador. El sistema incluye catálogo de productos con categorías, carrito de compras, gestión de pedidos, verificación de pagos mediante OCR/IA, y dos modos de entrega: franjas horarias programadas o preparación por lotes bajo demanda.

## Glosario

- **Sistema**: La aplicación web completa de pedidos
- **Cliente**: Persona que escanea el QR o accede al link para realizar un pedido
- **Administrador**: Dueño del negocio que gestiona pedidos, horarios y verificación de pagos
- **Catálogo**: Colección de productos organizados por categorías, con imágenes, descripciones y precios
- **Categoría**: Agrupación de productos del mismo tipo (ej: empanadas, bebidas, postres)
- **Carrito**: Selección temporal de productos con cantidades que el Cliente va armando antes de confirmar un Pedido
- **Pedido**: Solicitud de compra confirmada por un Cliente a partir de su Carrito
- **Franja_Horaria**: Bloque de tiempo definido por el Administrador para retiro de pedidos
- **Comprobante**: Imagen de la transferencia bancaria enviada por el Cliente como prueba de pago
- **Motor_OCR**: Componente que analiza imágenes de comprobantes para extraer montos transferidos
- **Sesión_Persistente**: Mecanismo que recuerda al Cliente en su dispositivo sin requerir login repetido
- **Modo_Franjas**: Modo de entrega donde el Administrador define horarios fijos de retiro
- **Modo_Lotes**: Modo de entrega donde el Administrador agrupa pedidos y define un tiempo estimado de preparación

## Requisitos

### Requisito 1: Catálogo de Productos con Categorías

**Historia de Usuario:** Como Administrador, quiero gestionar un catálogo de productos organizados por categorías, para que los Clientes puedan ver los productos disponibles y el sistema sea extensible a nuevas categorías en el futuro.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar el Catálogo de productos organizado por Categorías, con nombre, imagen, descripción y precio de cada producto
2. WHEN el Administrador agrega un producto, THE Sistema SHALL almacenar el nombre, descripción, precio, imagen y Categoría del producto en el Catálogo
3. WHEN el Administrador crea una nueva Categoría, THE Sistema SHALL registrarla y permitir asociar productos a ella
4. WHEN el Administrador edita un producto existente, THE Sistema SHALL actualizar la información del producto en el Catálogo
5. WHEN el Administrador elimina un producto, THE Sistema SHALL remover el producto del Catálogo
6. WHEN un Cliente accede al Sistema, THE Sistema SHALL mostrar únicamente los productos activos del Catálogo agrupados por Categoría

### Requisito 2: Acceso por QR y Link

**Historia de Usuario:** Como Cliente, quiero acceder al sistema escaneando un código QR o abriendo un link, para poder ver el catálogo y hacer pedidos fácilmente.

#### Criterios de Aceptación

1. WHEN el Cliente escanea el código QR, THE Sistema SHALL redirigir al Cliente a la interfaz de pedidos
2. WHEN el Administrador comparte un link directo, THE Sistema SHALL permitir al Cliente acceder a la interfaz de pedidos
3. THE Sistema SHALL ser accesible desde navegadores móviles sin requerir instalación de aplicaciones

### Requisito 3: Registro e Inicio de Sesión del Cliente

**Historia de Usuario:** Como Cliente, quiero registrarme con mi nombre, WhatsApp, usuario y contraseña, para que el sistema me recuerde y no tenga que registrarme cada vez.

#### Criterios de Aceptación

1. WHEN un Cliente nuevo accede al Sistema, THE Sistema SHALL solicitar nombre, número de WhatsApp, nombre de usuario y contraseña para el registro
2. WHEN el Cliente completa el registro con datos válidos, THE Sistema SHALL crear la cuenta y establecer una Sesión_Persistente en el dispositivo
3. WHILE el Cliente tiene una Sesión_Persistente activa, THE Sistema SHALL permitir el acceso sin solicitar credenciales
4. WHEN la Sesión_Persistente expira o el Cliente accede desde otro dispositivo, THE Sistema SHALL solicitar nombre de usuario y contraseña para iniciar sesión
5. IF el Cliente ingresa credenciales incorrectas, THEN THE Sistema SHALL mostrar un mensaje de error indicando que las credenciales son inválidas
6. THE Sistema SHALL validar que el número de WhatsApp contenga entre 10 y 15 dígitos
7. THE Sistema SHALL validar que el nombre de usuario sea único en el Sistema

### Requisito 4: Carrito de Compras y Realización de Pedidos

**Historia de Usuario:** Como Cliente, quiero armar un carrito de compras seleccionando productos del catálogo con cantidades, para poder revisar mi selección antes de confirmar el pedido.

#### Criterios de Aceptación

1. WHEN el Cliente selecciona un producto del Catálogo, THE Sistema SHALL agregar el producto al Carrito con cantidad 1
2. WHEN el Cliente modifica la cantidad de un producto en el Carrito, THE Sistema SHALL actualizar la cantidad y recalcular el subtotal
3. WHEN el Cliente elimina un producto del Carrito, THE Sistema SHALL remover el producto y recalcular el monto total
4. THE Sistema SHALL mostrar en el Carrito: lista de productos seleccionados, cantidad de cada uno, subtotal por producto y monto total
5. THE Sistema SHALL calcular el monto total del Carrito sumando el precio de cada producto multiplicado por su cantidad
6. WHEN el Cliente confirma el Carrito, THE Sistema SHALL crear un Pedido con los productos, cantidades, monto total y datos del Cliente
7. WHEN el Cliente confirma el Pedido, THE Sistema SHALL solicitar al Cliente una sugerencia de horario de retiro preferido
8. IF el Cliente intenta confirmar un Carrito vacío, THEN THE Sistema SHALL mostrar un mensaje indicando que debe agregar al menos un producto
9. WHILE el Cliente navega el Catálogo, THE Sistema SHALL mantener el estado del Carrito persistente en la sesión

### Requisito 5: Pago por Transferencia con Verificación OCR

**Historia de Usuario:** Como Administrador, quiero que el sistema lea los comprobantes de transferencia bancaria automáticamente, para verificar pagos sin tener que revisar montos manualmente.

#### Criterios de Aceptación

1. WHEN el Cliente realiza un Pedido, THE Sistema SHALL indicar los datos bancarios para la transferencia
2. WHEN el Cliente sube una imagen del Comprobante, THE Sistema SHALL almacenar la imagen asociada al Pedido
3. WHEN un Comprobante es subido, THE Motor_OCR SHALL analizar la imagen y extraer el monto transferido
4. WHEN el Motor_OCR extrae el monto, THE Sistema SHALL comparar el monto extraído con el monto total del Pedido
5. WHEN el monto extraído coincide con el monto total del Pedido, THE Sistema SHALL marcar el pago como verificado automáticamente
6. IF el monto extraído no coincide con el monto total del Pedido, THEN THE Sistema SHALL notificar al Administrador la discrepancia mostrando ambos montos
7. IF el Motor_OCR no puede leer el Comprobante, THEN THE Sistema SHALL notificar al Administrador para revisión manual del Comprobante

### Requisito 6: Interfaz de Administración de Pedidos

**Historia de Usuario:** Como Administrador, quiero recibir y gestionar los pedidos entrantes, para organizar la preparación y entrega de empanadas.

#### Criterios de Aceptación

1. WHEN un Cliente confirma un Pedido, THE Sistema SHALL mostrar el Pedido en la interfaz del Administrador con estado "pendiente"
2. THE Sistema SHALL mostrar en cada Pedido: nombre del Cliente, productos solicitados, cantidades, monto total, estado del pago y sugerencia de horario del Cliente
3. WHEN el Administrador acepta un Pedido, THE Sistema SHALL cambiar el estado del Pedido a "aceptado"
4. WHEN el Administrador rechaza un Pedido, THE Sistema SHALL cambiar el estado del Pedido a "rechazado" y notificar al Cliente
5. WHEN el Administrador marca un Pedido como "listo para retirar", THE Sistema SHALL notificar al Cliente que su Pedido está disponible

### Requisito 7: Gestión de Franjas Horarias de Retiro

**Historia de Usuario:** Como Administrador, quiero definir hasta 4 franjas horarias diarias de retiro, para organizar cuándo los clientes pueden pasar a buscar sus pedidos.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador configurar hasta 4 Franjas_Horarias por día
2. WHEN el Administrador crea una Franja_Horaria, THE Sistema SHALL registrar la hora de inicio y la hora de fin
3. WHEN el Administrador modifica una Franja_Horaria, THE Sistema SHALL actualizar la información y notificar a los Clientes afectados
4. WHILE el Modo_Franjas está activo, THE Sistema SHALL asignar cada Pedido aceptado a una Franja_Horaria disponible
5. WHEN un Cliente sugiere un horario de retiro, THE Sistema SHALL mostrar la sugerencia al Administrador junto con las Franjas_Horarias configuradas
6. WHEN el Administrador acepta la sugerencia de horario del Cliente, THE Sistema SHALL asignar el Pedido a la Franja_Horaria más cercana a la sugerencia

### Requisito 8: Modo de Entrega por Lotes

**Historia de Usuario:** Como Administrador, quiero poder agrupar pedidos y dar un tiempo estimado de preparación, para manejar la demanda cuando necesito ir a preparar más empanadas en casa.

#### Criterios de Aceptación

1. WHILE el Modo_Lotes está activo, THE Sistema SHALL permitir al Administrador agrupar múltiples Pedidos en un lote de preparación
2. WHEN el Administrador establece un tiempo de preparación para un lote, THE Sistema SHALL notificar a cada Cliente del lote el tiempo estimado de espera
3. WHEN el Administrador indica "en N minutos estará su pedido", THE Sistema SHALL registrar la hora estimada de disponibilidad y mostrarla al Cliente
4. THE Sistema SHALL permitir al Administrador alternar entre Modo_Franjas y Modo_Lotes según la situación del día
5. WHEN el Administrador marca un lote como "listo", THE Sistema SHALL notificar a todos los Clientes del lote que sus Pedidos están disponibles para retiro

### Requisito 9: Notificaciones al Cliente

**Historia de Usuario:** Como Cliente, quiero recibir actualizaciones sobre el estado de mi pedido, para saber cuándo puedo pasar a retirar mis empanadas.

#### Criterios de Aceptación

1. WHEN el estado de un Pedido cambia, THE Sistema SHALL mostrar el nuevo estado al Cliente en su interfaz
2. WHEN un Pedido es marcado como "listo para retirar", THE Sistema SHALL mostrar al Cliente la dirección o indicación de dónde retirar
3. THE Sistema SHALL mostrar al Cliente el historial de sus Pedidos anteriores con sus estados

### Requisito 10: Seguridad y Persistencia de Datos

**Historia de Usuario:** Como Administrador, quiero que los datos del sistema estén protegidos y persistan correctamente, para no perder información de pedidos ni clientes.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar las contraseñas de los Clientes utilizando un algoritmo de hash seguro
2. THE Sistema SHALL validar la autenticación del Administrador mediante credenciales protegidas antes de permitir acceso a la interfaz de administración
3. IF un Cliente intenta acceder a funciones del Administrador, THEN THE Sistema SHALL denegar el acceso y redirigir a la interfaz del Cliente
4. THE Sistema SHALL persistir todos los Pedidos, datos de Clientes y configuración de Franjas_Horarias en una base de datos
