# Trabajo Final Integrador 2026 - Tecnicatura Universitaria en Programación (UTN)

<p align="center">
  <img src="./assets/logo.png" alt="Logo Restaurante" width="150"/>
</p>

Repositorio oficial del grupo para el Trabajo Final Integrador (TFI). La aplicación móvil y la API acompañan la operación de un restaurante de comida china: gestión de usuarios, mesas y sala de espera, carta, pedidos, comandas, chat, juegos y notificaciones.

## 🧭 Índice General

### División 1 — Galería de Imágenes

- [Inicio de la galería](#galeria-visual)
- [Marca, splash y mockups](#marca-splash-y-mockups)
- [Walkthroughs por perfil](#walkthroughs-por-perfil)
  - [Dueño](#walkthrough-dueno)
  - [Supervisor](#walkthrough-supervisor)
  - [Metre](#walkthrough-metre)
  - [Mozo](#walkthrough-mozo)
  - [Cocinero](#walkthrough-cocinero)
  - [Cantinero](#walkthrough-cantinero)
  - [Cliente registrado y anónimo](#walkthrough-clientes)
- [Notificaciones push](#evidencia-de-notificaciones-push)
  - [Correos transaccionales](#correos-transaccionales)
- [Chats y conversaciones](#chats-y-conversaciones)
- [Modales y resultados](#modales-y-resultados)
- [Códigos QR](#galeria-codigos-qr)
- [Diagramas](#diagramas-del-sistema)
- [Pruebas y validaciones](#evidencia-de-pruebas)
- [Capturas pendientes de agregar](#capturas-pendientes)

### División 2 — Documentación del Proyecto

- [Inicio de la documentación](#documentacion-del-proyecto)
- [Identidad y equipo](#identidad-y-equipo)
- [Tecnologías y arquitectura](#tecnologias-y-arquitectura)
- [Funcionalidades y consignas 1–22](#funcionalidades-y-consignas)
- [Matriz de cobertura de las consignas](#matriz-cobertura)
- [Instalación y configuración](#instalacion-y-configuracion)
- [Endpoints](#endpoints)
- [Estado de funcionalidades](#estado-funcionalidades)
- [Tareas completadas](#tareas-completadas)

---

<a id="galeria-visual"></a>

## 🖼️ División 1 — Galería de Imágenes

Esta sección reúne evidencia visual del sistema. Las capturas existentes se muestran aquí y los apartados sin material quedan preparados para agregar nuevas imágenes sin mezclarlas con endpoints, arquitectura o tareas.

<a id="marca-splash-y-mockups"></a>

### Marca, splash y mockups

| Elemento                        | Vista / recurso                                                          |
| ------------------------------- | ------------------------------------------------------------------------ |
| Logo del proyecto               | ![Logo del restaurante](./assets/logo.png)                               |
| Pantalla de inicio              | ![Pantalla de inicio](./assets/Inicio.jpeg)                              |
| Accesos rápidos de perfiles     | ![Modal de accesos rápidos para pruebas](./assets/accesos_rapidos.jpeg)  |
| Imagen de splash                | ![Splash del proyecto](./assets/splash.jpeg)                             |
| Mockup de login                 | ![Mockup de login](./assets/makeup/logIn.png)                            |
| Mockup de registro              | ![Mockup de registro](./assets/makeup/registro.png)                      |
| Mockup de inicio                | ![Mockup de inicio](./assets/makeup/viewInicio.png)                      |
| Mockup de bienvenida del pedido | ![Mockup de bienvenida del pedido](./assets/makeup/bienvenidaPedido.png) |

**Animación de splash:** [ver o descargar el recurso MP4](./assets/splash_gif.mp4). El archivo tiene extensión `.mp4`, aunque su nombre incluya `gif`.

<a id="walkthroughs-por-perfil"></a>

### Walkthroughs por perfil

Las capturas están agrupadas por rol para recorrer los flujos disponibles en cada perfil; los pasos aún no fotografiados se detallan en el apartado de capturas pendientes.

<a id="walkthrough-dueno"></a>

#### Walkthrough: Dueño

| Paso / pantalla                           | Captura                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Dashboard                                 | ![Dashboard del dueño](./assets/mapeo/dueño/dueño_dashboard.jpeg)                          |
| Selección de perfil para alta de empleado | ![Selección de perfil de empleado](./assets/mapeo/dueño/dueño_altaEmpleado_seleccion.jpeg) |
| Alta de empleado, paso 1                  | ![Alta de empleado paso 1](./assets/mapeo/dueño/dueño_altaEmpleado_1.jpeg)                 |
| Alta de empleado, paso 2                  | ![Alta de empleado paso 2](./assets/mapeo/dueño/dueño_altaEmpleado_2.jpeg)                 |
| Alta de mesa, paso 1                      | ![Alta de mesa paso 1](./assets/mapeo/dueño/dueño_altaMesas_1.jpeg)                        |
| Alta de mesa, paso 2                      | ![Alta de mesa paso 2](./assets/mapeo/dueño/dueño_altaMesas_2.jpeg)                        |
| Asignación de mesa exitosa                | ![Asignación de mesa exitosa](./assets/mapeo/dueño/dueño_asignarMesa_exito.jpeg)           |
| Gestión de mesas                          | ![Dashboard de mesas del dueño](./assets/mapeo/dueño/dueño_dashboard_mesas.jpeg)           |
| Aprobación de clientes                    | ![Aprobación de clientes](./assets/mapeo/dueño/dueño_aprobacionCliente.jpeg)               |
| Estadisticas Torta                        | ![Estadísticas de torta del dueño](./assets/mapeo/dueño/dueño_estadisticas_torta.jpeg)     |
| Estadisticas Barras                       | ![Estadísticas de barras del dueño](./assets/mapeo/dueño/dueño_estadisticas_barras.jpeg)   |
| Estadisticas Lineal                       | ![Estadísticas de lineas del dueño](./assets/mapeo/dueño/dueño_estadisticas_lineal.jpeg)   |

---

<a id="walkthrough-supervisor"></a>

#### Walkthrough: Supervisor

| Paso / pantalla                           | Captura                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Dashboard                                 | ![Dashboard del supervisor](./assets/mapeo/supervisor/supervisor_dashboard.jpeg)                        |
| Selección de perfil para alta de empleado | ![Selección del perfil de empleado](./assets/mapeo/supervisor/supervisor_altaEmpleado_seleccion.jpeg)   |
| Alta de empleado, paso 1                  | ![Alta de empleado del supervisor, paso 1](./assets/mapeo/supervisor/supervisor_altaEmpleado_1.jpeg)    |
| Alta de empleado, paso 2                  | ![Alta de empleado del supervisor, paso 2](./assets/mapeo/supervisor/supervisor_altaEmpleado_2.jpeg)    |
| Gestión de mesas y QR                     | ![Gestión de mesas del supervisor](./assets/mapeo/supervisor/supervisor_dashboardMesas.jpeg)            |
| Alta de mesa, paso 1                      | ![Alta de mesa del supervisor, paso 1](./assets/mapeo/supervisor/supervisor_altaMesa_1.jpeg)            |
| Alta de mesa, paso 2                      | ![Alta de mesa del supervisor, paso 2](./assets/mapeo/supervisor/supervisor_altaMesa_2.jpeg)            |
| Confirmación de alta de mesa              | ![Confirmación de alta de mesa](./assets/mapeo/supervisor/supervisor_altaMesa_confirmacion.jpeg)        |
| Error de validación de mesa duplicada     | ![Validación de mesa duplicada](./assets/mapeo/supervisor/supervisor_mesas_validator.jpeg)              |
| Aprobación de clientes                    | ![Aprobación de clientes por supervisor](./assets/mapeo/supervisor/supervisor_aprobacionClientes.jpeg)  |
| Estadisticas Torta                        | ![Estadísticas de torta del supervisor](./assets/mapeo/supervisor/supervisor_estadisticas_torta.jpeg)   |
| Estadisticas Barras                       | ![Estadísticas de barras del supervisor](./assets/mapeo/supervisor/supervisor_estadisticas_barras.jpeg) |
| Estadisticas Lineal                       | ![Estadísticas de lineas del supervisor](./assets/mapeo/supervisor/supervisor_estadisticas_lineal.jpeg) |

---

<a id="walkthrough-metre"></a>

#### Walkthrough: Metre

| Paso / pantalla                         | Captura                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Dashboard del metre                     | ![Dashboard del metre](./assets/mapeo/metre/metre_dashboard.jpeg)                                     |
| Gestión de mesas, estado vacío          | ![Gestor de mesas vacío del metre](./assets/mapeo/metre/metre_gestorMesas_1.jpeg)                     |
| Gestión de mesas, con cliente en espera | ![Gestor de mesas con cliente en espera](./assets/mapeo/metre/metre_gestorMesas_2.jpeg)               |
| Selección de mesa para asignación       | ![Selección de mesa para asignar al cliente](./assets/mapeo/metre/metre_asignarMesa_seleccionar.jpeg) |
| Confirmación de asignación              | ![Confirmación de mesa asignada](./assets/mapeo/metre/metre_asignarMesa_confirmacion.jpeg)            |
| Registro asistido de cliente            | ![Registro de cliente por el metre](./assets/mapeo/metre/metre_registroCliente.jpeg)                  |

---

<a id="walkthrough-mozo"></a>

#### Walkthrough: Mozo

| Paso / pantalla         | Captura                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Dashboard del mozo      | ![Dashboard del mozo](./assets/mapeo/mozo/mozo_dashboard.jpg)                                     |
| Acceso a chats / mesas  | ![Dashboard de chats del mozo](./assets/mapeo/mozo/mozo_dashboard_chats.jpeg)                     |
| Ejemplo de chat en vivo | ![Conversación de consulta al mozo en la mesa 2](./assets/mapeo/mozo/mozo_chatEjemplo.jpeg)       |
| Comandas                | ![Comandas visibles para el mozo](./assets/mapeo/mozo/mozo_comandas.jpeg)                         |
| Pedidos Listos          | ![Pedidos listos para entregar](./assets/mapeo/mozo/mozo_dashboard_pedidosListos.jpeg)            |
| Transacciones           | ![Transacciones de pedidos y cuentas](./assets/mapeo/mozo/mozo_dashboard_transacciones.jpeg)      |
| Detalle de Transacción  | ![Detalle de transacción de pedido y cuenta](./assets/mapeo/mozo/mozo_detalle_transacciones.jpeg) |

Pendiente de agregar: pedido listo, entrega, solicitud de cuenta y confirmación del pago.

---

<a id="walkthrough-cocinero"></a>

#### Walkthrough: Cocinero

| Paso / pantalla       | Captura                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| Dashboard             | ![Dashboard del cocinero](./assets/mapeo/cocinero/cocinero_dashboard.jpeg)             |
| Alta de plato, paso 1 | ![Alta de plato, datos](./assets/mapeo/cocinero/cocinero_altaPlato_1.jpeg)             |
| Alta de plato, paso 2 | ![Alta de plato, fotografías](./assets/mapeo/cocinero/cocinero_altaPlato_2.jpeg)       |
| Carta de platos       | ![Carta de platos del cocinero](./assets/mapeo/cocinero/cocinero_cartaPlatos_1.jpeg)   |
| Carta de platos 2     | ![Carta de platos del cocinero 2](./assets/mapeo/cocinero/cocinero_cartaPlatos_2.jpeg) |
| Comandas de cocina    | ![Comandas del sector cocina](./assets/mapeo/cocinero/cocinero_comandas.jpeg)          |

---

<a id="walkthrough-cantinero"></a>

#### Walkthrough: Cantinero

| Paso / pantalla                  | Captura                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Dashboard                        | ![Dashboard del cantinero](./assets/mapeo/cantinero/cantinero_dashboard.jpeg)                               |
| Alta de bebida, paso 1           | ![Alta de bebida, datos](./assets/mapeo/cantinero/cantinero_altaBebida_1.jpeg)                              |
| Alta de bebida, paso 2           | ![Alta de bebida, fotografías](./assets/mapeo/cantinero/cantinero_altaBebida_2.jpeg)                        |
| Validación de campos incompletos | ![Error de validación en el alta de bebida](./assets/mapeo/cantinero/cantinero_altaBebida_validations.jpeg) |
| Carta de bebidas                 | ![Carta de bebidas del cantinero](./assets/mapeo/cantinero/cantinero_cartaBebidas.jpeg)                     |
| Comandas de bar                  | ![Comandas del sector bar](./assets/mapeo/cantinero/cantinero_comandas.jpeg)                                |

---

<a id="walkthrough-clientes"></a>

#### Walkthrough: Clientes

##### Cliente registrado

| Paso / pantalla  | Captura                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Registro, paso 1 | ![Registro de cliente paso 1](./assets/mapeo/registro_inicio_clientes/cliente_registro_1.jpeg) |
| Registro, paso 2 | ![Registro de cliente paso 2](./assets/mapeo/registro_inicio_clientes/cliente_registro_2.jpeg) |

##### Ingreso y sala de espera

| Paso / pantalla                           | Captura                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard de ingreso a la lista de espera | ![Dashboard del cliente en lista de espera](./assets/mapeo/registro_inicio_clientes/cliente_dashboard_ingresoListaEspera.jpeg)       |
| Ver Reseñas del Restaurante               | ![Ver Reseñas del Restaurante](./assets/mapeo/registro_inicio_clientes/cliente_verReseñas.jpeg)                                      |
| Confirmación de ingreso en puerta         | ![Ingreso confirmado en puerta](./assets/mapeo/registro_inicio_clientes/cliente_confirmacion_listaEspera.jpeg)                       |
| Modal de ingreso confirmado               | ![Confirmación para entrar a la lista de espera](./assets/mapeo/registro_inicio_clientes/cliente_confirmacionModal_listaEspera.jpeg) |
| Confirmación para abandonar la fila       | ![Modal para abandonar la lista de espera](./assets/mapeo/registro_inicio_clientes/cliente_abandonarModal_listaEspera.jpeg)          |

##### Asignación de mesa y acceso al menú

| Paso / pantalla                        | Captura                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Modal de mesa asignada                 | ![Confirmación de mesa asignada](./assets/mapeo/registro_inicio_clientes/cliente_confirmacionModal_asignacionMesa.jpeg)    |
| Escaneo del QR de la mesa              | ![Cliente listo para escanear el QR de su mesa](./assets/mapeo/registro_inicio_clientes/cliente_escanearMesa.jpeg)         |
| Dashboard pedir y chat desde la mesa   | ![Dashboard del cliente en la mesa](./assets/mapeo/registro_inicio_clientes/cliente_dashboard_agregarPedido.jpg)           |
| Carta con opción para agregar un plato | ![Producto de la carta agregado al pedido](./assets/mapeo/registro_inicio_clientes/cliente_agregarAPedido.jpg)             |
| Otro producto agregado desde la carta  | ![Segundo producto de la carta](./assets/mapeo/registro_inicio_clientes/cliente_agregarAPedido_2.jpg)                      |
| Pedido rechazado por el mozo           | ![Pedido rechazado por el mozo](./assets/mapeo/registro_inicio_clientes/cliente_rechazo_comanda.jpg)                       |
| Carrito post rechazo del mozo          | ![Carrito del cliente luego del rechazo del mozo](./assets/mapeo/registro_inicio_clientes/cliente_carrito_postRechazo.jpg) |
| Dashboard post pedido                  | ![Dashboard del cliente con pedido en curso](./assets/mapeo/registro_inicio_clientes/cliente_dashboard_postPedido.jpg)     |
| Detalle del pedido en curso            | ![Detalle del pedido en curso](./assets/mapeo/registro_inicio_clientes/cliente_verEstadoPedido.jpg)                        |
| Detalle del Pago                       | ![Detalle del pago del pedido](./assets/mapeo/registro_inicio_clientes/cliente_pago_detalle.jpeg)                          |

##### Chat con el mozo

![Consulta del cliente al mozo desde la mesa](./assets/mapeo/registro_inicio_clientes/cliente_chatMozo.jpg)

##### Juegos y descuentos

| Paso / pantalla                              | Captura                                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Dashboard de juegos                          | ![Sección de juegos del cliente registrado](./assets/mapeo/registro_inicio_clientes/cliente_dashBoard_games.jpg)        |
| Instrucciones del memotest                   | ![Instrucciones para jugar al memotest](./assets/mapeo/registro_inicio_clientes/cliente_comoJugar_memTest.jpeg)         |
| Partida de memotest                          | ![Partida de memotest](./assets/mapeo/registro_inicio_clientes/cliente_inGame_memoTest.jpeg)                            |
| Memotest completado y descuento obtenido     | ![Resultado exitoso del memotest](./assets/mapeo/registro_inicio_clientes/cliente_finished_memoTest.jpeg)               |
| Instrucciones del rompecabezas               | ![Instrucciones para armar el rompecabezas](./assets/mapeo/registro_inicio_clientes/cliente_comoJugar_rompeCabeza.jpeg) |
| Partida de rompecabezas                      | ![Partida de rompecabezas](./assets/mapeo/registro_inicio_clientes/cliente_inGame_rompeCabeza.jpeg)                     |
| Reinicio del rompecabezas                    | ![Reinicio del rompecabezas](./assets/mapeo/registro_inicio_clientes/cliente_reiniciar_rompeCabeza.jpeg)                |
| Rompecabezas completado y descuento obtenido | ![Resultado exitoso del rompecabezas](./assets/mapeo/registro_inicio_clientes/cliente_finished_rompeCabeza.jpeg)        |
| Instrucciones del ¿Y la bolita?              | ![Instrucciones para armar el rompecabezas](./assets/mapeo/registro_inicio_clientes/cliente_comoJugar_yLaBolita.jpg)    |
| Partida de ¿Y la bolita?                     | ![Partida de rompecabezas](./assets/mapeo/registro_inicio_clientes/cliente_inGame_yLaBolita.jpg)                        |

##### Reseñas y encuestas

![Resultados de reseñas visibles para el cliente](./assets/mapeo/registro_inicio_clientes/cliente_verReseñas.jpeg)

Pendiente de agregar: espera de aprobación, aviso de aprobación/rechazo, login aceptado y denegado, estado del pedido, cuenta y pago.

##### Cliente anónimo / invitado

| Paso / pantalla       | Captura                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Ingreso como invitado | ![Ingreso de cliente invitado](./assets/mapeo/registro_inicio_clientes/cliente_invitado.jpeg) |

Pendiente de agregar: pasos exclusivos del registro anónimo y su experiencia posterior a la asignación de mesa.

<a id="chats-y-conversaciones"></a>

### Chats y conversaciones

El [walkthrough del Mozo](#walkthrough-mozo) contiene el acceso a chats y un ejemplo de conversación en vivo. Se pueden añadir capturas de otros mensajes, notificaciones y estados de lectura.

<a id="modales-y-resultados"></a>

### Modales y resultados

Agregar más evidencia de:

- Confirmaciones antes de acciones destructivas o cambios de estado.
- Resultados exitosos de alta de empleado, producto, mesa, cliente y pedido.
- Rechazo de registro o pedido, con el mensaje visible para el usuario.
- Errores de validación de formularios y errores de conexión/servidor.
- Confirmación de recepción, cobro, cuenta solicitada y mesa liberada.

Captura disponible de una validación de mesa duplicada: [ver walkthrough del Supervisor](#walkthrough-supervisor).

<a id="evidencia-de-notificaciones-push"></a>

### Evidencia de notificaciones push

| Plataforma | Captura                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| iOS        | ![Notificación push en iOS](./assets/notifications/pushNoti_Ios.jpeg)         |
| Android    | ![Notificación push en Android](./assets/notifications/pushNoti_android.jpeg) |

Las capturas actuales muestran notificaciones del sistema en iOS y Android. Se pueden sumar evidencias por evento: nuevo cliente, lista de espera, mesa asignada, chat, cocina/bar, pedido listo y cierre de cuenta.

---

<a id="correos-transaccionales"></a>

### Correos transaccionales

| Evento                            | Captura                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| Rechazo de registro de cliente    | ![Correo automático de rechazo del registro](./assets/notifications/mailRechazo.png)       |
| Aprobación de registro de cliente | ![Correo automático de aprobación del registro](./assets/notifications/mailAprobacion.png) |

---

<a id="galeria-codigos-qr"></a>

### Galería de códigos QR

#### QR de acceso e ingreso a sala de espera

![QR de ingreso a la sala de espera](./assets/qrs/qr_ingresoListaEspera.jpeg)

#### QR de mesas

| Mesa   | Código QR                                    |
| ------ | -------------------------------------------- |
| Mesa 1 | ![QR de mesa 1](./assets/qrs/qr_mesa_1.jpeg) |
| Mesa 2 | ![QR de mesa 2](./assets/qrs/qr_mesa_2.jpeg) |
| Mesa 3 | ![QR de mesa 3](./assets/qrs/qr_mesa_3.jpeg) |
| Mesa 4 | ![QR de mesa 4](./assets/qrs/qr_mesa_4.jpeg) |

---

#### QR de propinas

| Porcentaje | Código QR                                                      |
| ---------- | -------------------------------------------------------------- |
| 0 %        | ![QR de propina 0 por ciento](./assets/qrs/qr_propina_0.PNG)   |
| 5 %        | ![QR de propina 5 por ciento](./assets/qrs/qr_propina_5.PNG)   |
| 10 %       | ![QR de propina 10 por ciento](./assets/qrs/qr_propina_10.PNG) |
| 15 %       | ![QR de propina 15 por ciento](./assets/qrs/qr_propina_15.PNG) |
| 20 %       | ![QR de propina 20 por ciento](./assets/qrs/qr_propina_20.PNG) |

---

<a id="evidencia-de-pruebas"></a>

### Evidencia de pruebas

| Prueba                       | Captura                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| Validación de esquemas Zod   | ![Prueba de validación Zod](./assets/tests/PruebaValidacionZod.png)    |
| Reglas de negocio y permisos | ![Prueba de reglas de negocio](./assets/tests/PruebaReglasNegocio.png) |
| Creación exitosa             | ![Prueba de creación exitosa](./assets/tests/FlujoExitosoCreacion.png) |
| Reporte de testing           | [Abrir reporte de testing](./qa-test/reporte-testing.md)               |

> El reporte existente está fechado el 10/09/2026 y corresponde a una tablet Android con Expo Go. Es evidencia histórica, no una validación completa de los cambios posteriores.

<a id="diagramas-del-sistema"></a>

### Diagramas del sistema

![Diagrama UML del sistema](./assets/umlTFI.png)

<a id="capturas-pendientes"></a>

### Capturas pendientes

Este índice queda abierto para incorporar nuevas evidencias sin reestructurar el README. Mantener las imágenes dentro de `assets/mapeo/<perfil>/`, `assets/notifications/`, `assets/qrs/` o `assets/tests/`, y agregar cada captura en el subapartado correspondiente.

- Pasos adicionales de los walkthroughs por perfil, como lista de espera, pedido listo, entrega y cierre de cuenta.
- Vistas de las fotografías individuales seleccionadas para platos y bebidas.
- Transiciones de navegación y estados de operación que todavía no tengan captura.
- Modales de confirmación, validación, éxito, rechazo y error.
- Flujo detallado del cliente registrado y del cliente anónimo.
- Tickets completos y estados de pedidos posteriores a la comanda.
- Encuestas, gráficos y pantallas de cuenta/pago.
- Notificaciones push separadas por evento y perfil destinatario.

---

<a id="documentacion-del-proyecto"></a>

## 📚 División 2 — Documentación del Proyecto

<a id="identidad-y-equipo"></a>

## 🎨 Identidad Visual

- **Temática:** restaurante de comida china.
- **Paleta principal:**
  - `#780116` — rojo oscuro.
  - `#F7B538` — amarillo.
  - `#DB7C26` — naranja suave.
  - `#D8572A` — naranja intenso.
  - `#C32F27` — rojo vibrante.

---

## 👥 Grupo y Responsabilidades

### 1. Brazanovich, Valentín

- **Rol:** Frontend Lead & UX/UI.
- **Objetivos:** autenticación, alta de empleados, registro de clientes y maquetación de la aplicación.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** `feature/valentin-auth-ui`.

### 2. Andreozzi, Sebastián

- **Rol:** Frontend App Developer.
- **Objetivos:** pantallas de platos y bebidas, carta, interacción de cliente y funcionalidades de interfaz vinculadas con pedidos y juegos.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** `feature/sebastian-menu-juegos`.

### 3. Casado, Santino

- **Rol:** Backend & Integration Engineer.
- **Objetivos:** autenticación, clientes, aprobación de usuarios, correos transaccionales con Nodemailer e integración transversal de notificaciones push mediante Expo API.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** Integrada en `main` desde `feature/santino-server-setup`.

### 4. Sanchez, Rocío

- **Rol:** Database Admin, API Developer & QA.
- **Objetivos:** modelo de tablas, QR, mesas, políticas RLS y desarrollo de los módulos y endpoints de Pedidos y Chat en tiempo real.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** `feature/rocio-supabase-db`.

> La fecha oficial de entrega se coordina con la cátedra y el cronograma vigente del equipo.

---

<a id="tecnologias-y-arquitectura"></a>

## 🛠️ Tecnologías

- **Aplicación móvil:** React Native, Expo y TypeScript.
- **Estilos:** NativeWind.
- **API:** Node.js, Express y TypeScript.
- **Base de datos, autenticación y almacenamiento:** Supabase, PostgreSQL, Supabase Auth y Supabase Storage.
- **Validación de datos:** Zod.
- **Carga de archivos:** Multer.
- **Correo transaccional:** Nodemailer.
- **Notificaciones móviles:** Expo Notifications y Expo Push API.
- **Lectura de QR y cámara:** Expo Camera.

---

## 🏗️ Arquitectura

El frontend se organiza en pantallas, servicios de acceso a API y contextos de sesión y carrito. La navegación principal está coordinada desde `frontend/App.tsx`.

El backend separa rutas, controladores, servicios y esquemas por dominio:

- `auth`
- `cliente`
- `empleados`
- `productos`
- `mesas`
- `pedidos`
- `chat`
- `juegos`
- `encuesta` (módulo completo, con rutas montadas e integración funcional para registrar y consultar encuestas).

Supabase proporciona persistencia, autenticación y almacenamiento de archivos. Las políticas RLS deben revisarse junto con la autorización aplicada en los middleware del backend.

El endpoint de asignación de mesas utiliza actualizaciones condicionales sobre la fila de espera y la disponibilidad para detectar cambios concurrentes. Si la mesa deja de estar libre luego de marcar la espera como asignada, intenta revertir esa asignación. Es un rollback compensatorio entre peticiones, no una transacción atómica; el código registra si la reversión también falla.

La instancia de Supabase puede reforzar el ciclo de pedidos mediante constraints SQL como `orders_status_check`. El código local utiliza `pending`, `in_preparation`, `ready`, `delivered`, `received`, `bill_requested`, `paid` y `cancelled`; cualquier constraint activo debe admitir todos los estados que el flujo persiste. No hay migraciones SQL en este repositorio para verificar o reproducir ese constraint; conviene versionar el esquema para evitar diferencias entre entornos.

---

<a id="documentacion-del-proyecto"></a>

## 📚 División 2 — Documentación del Proyecto

<a id="identidad-y-equipo"></a>

## 🎨 Identidad Visual

- **Temática:** restaurante de comida china.
- **Paleta principal:**
  - `#780116` — rojo oscuro.
  - `#F7B538` — amarillo.
  - `#DB7C26` — naranja suave.
  - `#D8572A` — naranja intenso.
  - `#C32F27` — rojo vibrante.

---

## 👥 Grupo y Responsabilidades

### 1. Brazanovich, Valentín

- **Rol:** Frontend Lead & UX/UI.
- **Objetivos:** autenticación, alta de empleados, registro de clientes y maquetación de la aplicación.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** `feature/valentin-auth-ui`.

### 2. Andreozzi, Sebastián

- **Rol:** Frontend App Developer.
- **Objetivos:** pantallas de platos y bebidas, carta, interacción de cliente y funcionalidades de interfaz vinculadas con pedidos y juegos.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** `feature/sebastian-menu-juegos`.

### 3. Casado, Santino

- **Rol:** Backend & Integration Engineer.
- **Objetivos:** autenticación, clientes, aprobación de usuarios, correos transaccionales con Nodemailer e integración transversal de notificaciones push mediante Expo API.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** Integrada en `main` desde `feature/santino-server-setup`.

### 4. Sanchez, Rocío

- **Rol:** Database Admin, API Developer & QA.
- **Objetivos:** modelo de tablas, QR, mesas, políticas RLS y desarrollo de los módulos y endpoints de Pedidos y Chat en tiempo real.
- **Fecha de inicio:** 25/08/2026.
- **Fecha estimada de cierre:** pendiente de confirmar con la cátedra.
- **Branch:** `feature/rocio-supabase-db`.

> La fecha oficial de entrega se coordina con la cátedra y el cronograma vigente del equipo.

---

<a id="tecnologias-y-arquitectura"></a>

## 🛠️ Tecnologías

- **Aplicación móvil:** React Native, Expo y TypeScript.
- **Estilos:** NativeWind.
- **API:** Node.js, Express y TypeScript.
- **Base de datos, autenticación y almacenamiento:** Supabase, PostgreSQL, Supabase Auth y Supabase Storage.
- **Validación de datos:** Zod.
- **Carga de archivos:** Multer.
- **Correo transaccional:** Nodemailer.
- **Notificaciones móviles:** Expo Notifications y Expo Push API.
- **Lectura de QR y cámara:** Expo Camera.

---

## 🏗️ Arquitectura

El frontend se organiza en pantallas, servicios de acceso a API y contextos de sesión y carrito. La navegación principal está coordinada desde `frontend/App.tsx`.

El backend separa rutas, controladores, servicios y esquemas por dominio:

- `auth`
- `cliente`
- `empleados`
- `productos`
- `mesas`
- `pedidos`
- `chat`
- `juegos`
- `encuesta` (módulo completo, con validación de unicidad por pedido, cálculo agregado de promedios para gráficos y conteo de requerimientos excluyentes).

Supabase proporciona persistencia, autenticación y almacenamiento de archivos. Las políticas RLS deben revisarse junto con la autorización aplicada en los middleware del backend.

El endpoint de asignación de mesas utiliza actualizaciones condicionales sobre la fila de espera y la disponibilidad para detectar cambios concurrentes. Si la mesa deja de estar libre luego de marcar la espera como asignada, intenta revertir esa asignación. Es un rollback compensatorio entre peticiones, no una transacción atómica; el código registra si la reversión también falla.

La tabla `orders` implementa un cierre contable preciso utilizando los campos `total_amount` (precio base de los ítems), `discount_amount` (descuento ganado en juegos), `tip_amount` (propina) y `final_total` (precio inmutable pagado por el cliente). La instancia de Supabase refuerza el ciclo de pedidos mediante constraints SQL como `orders_status_check`. Los estados admitidos son: `pending`, `in_preparation`, `ready`, `on_the_way`, `delivered`, `bill_requested`, `paid` y `cancelled`.

---

<a id="funcionalidades-y-consignas"></a>

## 📋 Funcionalidades del Sistema

- Registro y administración de empleados.
- Registro, aprobación y rechazo de clientes.
- Registro de clientes anónimos y gestión de la sala de espera.
- Alta de mesas y generación de datos QR.
- Alta, consulta y baja lógica de productos.
- Consulta de carta, armado de carrito y seguimiento de pedidos.
- Gestión de comandas de mozo, cocina y bar.
- Chat entre clientes y personal del restaurante.
- Notificaciones push para eventos de clientes, pedidos, mesas y chat.
- Registro de jugadas y consulta de descuentos asociados a pedidos.
- **Puntos 21–22 — Solicitud y cierre de cuenta:** flujo completo de solicitud, selección obligatoria de propina, cálculo del precio final, aplicación automática de descuentos previos y liberación de mesa.
- Encuestas y estadísticas: módulo con validación de una única encuesta por pedido/estadía, recolección de fotos/requerimientos excluyentes y consulta de datos procesados listos para gráficos de torta, barra y lineal.

### Matriz de cobertura de las consignas

<a id="matriz-cobertura"></a>

Los 22 puntos de la consigna están completados.

| Punto | Flujo evaluado                                                               | Estado                                                   |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1     | Alta de empleado por dueño/supervisor, DNI, foto desde cámara y validaciones | Completo.                                                |
| 2     | Alta de plato con descripción, tiempo, precio y tres imágenes                | Completo.                                                |
| 3     | Alta de bebida con campos y tres imágenes                                    | Completo.                                                |
| 4     | Alta/listado/estado de mesa y QR automático                                  | Completo.                                                |
| 5     | Registro de cliente, QR de DNI, foto en vivo y estado pendiente              | Completo.                                                |
| 6     | Lista de pendientes y aprobación/rechazo por dueño/supervisor                | Completo.                                                |
| 7     | Rechazo, correo personalizado y bloqueo del cliente                          | Completo.                                                |
| 8     | Aprobación, correo personalizado e ingreso habilitado                        | Completo.                                                |
| 9     | Cliente anónimo, QR de entrada, cola de espera y consulta de encuestas       | Completo.                                                |
| 10    | Asignación de mesa por metre y restricciones de vinculación                  | Completo.                                                |
| 11    | QR de mesa, carta con imágenes y chat con push                               | Completo.                                                |
| 12    | Carrito, cantidades, importe, tiempo y aprobación del mozo                   | Completo.                                                |
| 13    | Rechazo y edición/reenvío del pedido                                         | Completo.                                                |
| 14    | Aprobación y derivación a cocina/bar; descuentos de juegos                   | Completo.                                                |
| 15    | Acceso a juegos y aplicación de un único beneficio                           | Completo.                                                |
| 16    | Pedidos de cocina agrupados por mesa y cambio de estado                      | Completo.                                                |
| 17    | Pedidos de bar agrupados por mesa y cambio de estado                         | Completo.                                                |
| 18    | Pedido completo cuando cocina/bar finalizan; aviso al mozo                   | Completo.                                                |
| 19    | Entrega del mozo y recepción confirmada por cliente                          | Completo.                                                |
| 20    | Encuesta única por estadía y gráficos de resultados                          | Completo: incluye gráficos y requerimientos excluyentes. |
| 21    | Solicitud de cuenta, detalle, descuento, propina y pago                      | Completo: cálculo de `final_total` con propina en JSON.  |
| 22    | Confirmación de pago, mesa libre y notificación a dueño/supervisor           | Completo: actualización a `free` y envío de push.        |

### Flujos principales por perfil

- **Dueño/supervisor:** gestionar personal y mesas, revisar clientes pendientes, consultar operación y recibir notificaciones.
- **Metre:** registrar o asistir clientes, consultar la lista de espera, asignar mesas y gestionar el acceso al salón.
- **Mozo:** atender chats y comandas, confirmar pedidos, coordinar entregas y gestionar la solicitud/cobro de cuenta.
- **Cocinero/cantinero:** mantener productos de su sector y procesar los tickets correspondientes.
- **Cliente registrado:** registrarse y esperar aprobación, ingresar a la fila, usar la mesa asignada, pedir, chatear, jugar, encuestar y solicitar la cuenta.
- **Cliente anónimo:** ingresar sin aprobación, esperar asignación y utilizar los flujos habilitados; los juegos con descuento son exclusivos para clientes registrados.

---

<a id="instalacion-y-configuracion"></a>

## ⚙️ Instalación y Configuración Local

### Requisitos

- Node.js y npm.
- Proyecto Supabase configurado.
- Expo Go o un development build / emulador compatible.
- Para un dispositivo físico, computadora y dispositivo conectados a la misma red local.
- Para probar push remoto, un dispositivo o build compatible y permisos de notificaciones habilitados.

### Backend

```bash
cd backend
npm install
npm run dev
```

Comandos adicionales:

```bash
npm run build
npm start
```

### Frontend

En otra terminal:

```bash
cd frontend
npm install
npm start
```

Comandos de Expo:

```bash
npm run android
npm run ios
npm run web
```

El frontend obtiene la IP local a partir del host de Expo para conectarse a la API. El backend utiliza el puerto `3000` por defecto.

### Variables de entorno

Crear `backend/.env`:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anon
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role
GMAIL_USER=correo@gmail.com
GMAIL_APP_PASSWORD=contraseña_de_aplicacion
```

Crear `frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

En desarrollo, el frontend también admite opcionalmente `EXPO_PUBLIC_TEST_PUSH_TOKEN` para pruebas de notificaciones.

> No subir archivos `.env`, contraseñas ni claves reales al repositorio. `SUPABASE_SERVICE_ROLE_KEY` debe permanecer exclusivamente en el backend. No usar tokens de prueba como credenciales permanentes.

---

<a id="endpoints"></a>

## 🔌 Endpoints del Backend

La API se ejecuta por defecto en `http://localhost:3000`.

### Sistema y autenticación

| Método | Ruta              | Autenticación | Descripción                                 |
| ------ | ----------------- | ------------- | ------------------------------------------- |
| `GET`  | `/`               | No            | Comprueba que la API esté activa.           |
| `GET`  | `/api/ping-db`    | No            | Comprueba la conexión con Supabase.         |
| `POST` | `/api/auth/login` | No            | Login del backend con `email` y `password`. |

El frontend inicia sesión directamente con Supabase y conserva un fallback local de demostración; no depende exclusivamente de `/api/auth/login`.

### Empleados y sala de espera

| Método | Ruta                       | Autenticación                                      | Datos principales                                                                                                    |
| ------ | -------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/empleados/empleados` | Actualmente sin middleware JWT                     | `multipart/form-data`: `email`, `password`, `first_name`, `last_name`, `dni`, `cuil`, `role`, `rol_creador`, `foto`. |
| `GET`  | `/api/empleados/empleados` | Actualmente sin middleware JWT                     | Lista empleados.                                                                                                     |
| `GET`  | `/api/empleados/`          | Bearer JWT; roles `maitre`, `owner` o `supervisor` | Lista de espera.                                                                                                     |

### Clientes

| Método  | Ruta                       | Autenticación                            | Datos principales                                                                     |
| ------- | -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `POST`  | `/api/clientes/register`   | Sin middleware JWT                       | `multipart/form-data`: `email`, `password`, `first_name`, `last_name`, `dni`, `foto`. |
| `POST`  | `/api/clientes/anonymous`  | Sin middleware JWT                       | JSON con `client_name` y `client_photo`.                                              |
| `GET`   | `/api/clientes`            | Actualmente sin middleware JWT           | Lista clientes; admite filtro de estado.                                              |
| `PATCH` | `/api/clientes/:id/status` | Bearer JWT; roles `owner` o `supervisor` | JSON con `status`: `approved` o `rejected`.                                           |
| `PATCH` | `/api/clientes/push-token` | Bearer JWT                               | JSON con `push_token`.                                                                |
| `POST`  | `/api/clientes/ingresar`   | Actualmente sin middleware JWT           | Registra el ingreso a la lista de espera.                                             |

### Productos

| Método  | Ruta                      | Autenticación                                        | Datos principales                                                                                              |
| ------- | ------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `POST`  | `/api/productos`          | Bearer JWT; permisos por categoría en el controlador | `multipart/form-data`: `name`, `description`, `prep_time`, `price`, `category` y hasta cinco archivos `fotos`. |
| `GET`   | `/api/productos`          | Bearer JWT                                           | Lista productos; admite `?category=`.                                                                          |
| `PATCH` | `/api/productos/:id/baja` | Bearer JWT                                           | Baja lógica del producto.                                                                                      |

Categorías utilizadas: `dish`, `drink` y `dessert`. La ruta `DELETE /api/productos/:id` existe para desarrollo y testing; no usar en producción.

### Mesas

| Método  | Ruta                      | Autenticación                                      | Datos principales                                                         |
| ------- | ------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST`  | `/api/mesas`              | Bearer JWT; roles `owner` o `supervisor`           | `multipart/form-data`: `table_number`, `capacity`, `table_type`, `foto`.  |
| `GET`   | `/api/mesas`              | Bearer JWT                                         | Lista mesas.                                                              |
| `PATCH` | `/api/mesas/:id/estado`   | Bearer JWT; roles `owner`, `supervisor` o `maitre` | JSON con `availability`.                                                  |
| `PATCH` | `/api/mesas/asignar-mesa` | Bearer JWT; roles `maitre`, `owner` o `supervisor` | JSON con `waiting_id` y `table_id`; asigna la mesa y notifica al cliente. |

Tipos admitidos: `standard`, `vip`, `reduced_mobility`. Estados: `free`, `occupied`, `cleaning`.

Al crear una mesa, el backend genera `qr_data` con este patrón:

```text
RESTO-TFI-MESA-<numero>
```

### Pedidos

| Método  | Ruta                                | Autenticación                                                       | Datos principales                                                                                      |
| ------- | ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `POST`  | `/api/pedidos`                      | Actualmente sin middleware JWT                                      | JSON con `id_cliente`, `numero_mesa`, `productos` (`id_producto`, `cantidad`) y `order_type` opcional. |
| `GET`   | `/api/pedidos/:id`                  | Actualmente sin middleware JWT                                      | Consulta estado, mesa, productos, importe y tiempo estimado.                                           |
| `PUT`   | `/api/pedidos/:id`                  | Actualmente sin middleware JWT                                      | JSON con `productos`; modifica un pedido rechazado.                                                    |
| `PUT`   | `/api/pedidos/:id/confirmar`        | Bearer JWT; roles `waiter`, `owner` o `supervisor`                  | JSON con `waiter_id`, `estado` (`in_preparation` o `cancelled`) y `rejection_reason` si se cancela.    |
| `GET`   | `/api/pedidos/cocina`               | Actualmente sin middleware JWT                                      | Lista pedidos pendientes de cocina.                                                                    |
| `GET`   | `/api/pedidos/bar`                  | Actualmente sin middleware JWT                                      | Lista pedidos pendientes de bar.                                                                       |
| `PATCH` | `/api/pedidos/items/:item_id/listo` | Bearer JWT; roles `cook`, `bartender`, `owner` o `supervisor`       | Marca un ítem como listo.                                                                              |
| `PATCH` | `/api/pedidos/:id/entregar`         | Bearer JWT; roles `waiter`, `owner` o `supervisor`                  | Marca el pedido como entregado.                                                                        |
| `PATCH` | `/api/pedidos/:id/recibir`          | Bearer JWT; roles actuales `registered_client` o `anonymous_client` | Confirma la recepción del pedido.                                                                      |
| `PATCH` | `/api/pedidos/:id/solicitar-cuenta` | Bearer JWT; roles `waiter`, `owner` o `supervisor`                  | Solicita la cuenta y notifica a los perfiles de operación.                                             |
| `POST`  | `/api/pedidos/cobrar`               | Bearer JWT; roles autorizados de operación                          | JSON con `pedido_id` y `propina` obligatoria; devuelve el detalle y resultado del pago.                |

`order_type` admite `dine_in` o `delivery`. El detalle de cuenta y el resultado del pago se obtienen mediante las rutas de solicitud y cobro documentadas arriba.

> **Integración de Juegos y Cobros**: El frontend no debe enviar el monto del descuento. El backend lo extrae de forma segura leyendo el campo discount_amount inyectado previamente por el módulo de juegos.

> ## ⚠️ Atención Frontend: los roles de la API se envían en inglés
>
> Los middlewares comparan el rol del usuario con los valores guardados en Supabase. No enviar etiquetas traducidas como `mozo` o `cocinero` al backend.
>
> Los roles encontrados en las rutas actuales incluyen `waiter`, `cook`, `bartender`, `maitre`, `owner`, `supervisor`, `registered_client` y `anonymous_client`. **En particular, `/api/pedidos/:id/recibir` exige `registered_client` y `anonymous_client`, no `client` y `anonymous`.** No enviar nombres traducidos como `mozo` o `cocinero` ni usar alias distintos de los aceptados por cada endpoint.

### Chat

| Método | Ruta        | Autenticación | Datos principales                                                                                                       |
| ------ | ----------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/chat` | Bearer JWT    | JSON con `message`, `table_id` opcional, `order_id` opcional y `chat_type` opcional. El remitente se toma de la sesión. |
| `GET`  | `/api/chat` | Bearer JWT    | Lista mensajes; admite `?table_id=<UUID>`.                                                                              |

`chat_type` admite `table_waiter` y `delivery_client`. Al enviar un mensaje, el backend puede notificar al destinatario mediante Expo Push API.

### Juegos

| Método | Ruta                           | Autenticación                  | Descripción                                          |
| ------ | ------------------------------ | ------------------------------ | ---------------------------------------------------- |
| `POST` | `/api/juegos/jugada`           | Actualmente sin middleware JWT | Registra una jugada y procesa la regla de descuento. |
| `GET`  | `/api/juegos/pedido/:order_id` | Actualmente sin middleware JWT | Consulta jugadas o descuentos asociados al pedido.   |

### Encuestas

El módulo de encuestas está montado y funcional. El endpoint de registro valida que exista como máximo una encuesta por pedido/estadía (`order_id`) y evita duplicados.

| Método | Ruta                          | Autenticación definida en el router                        | Datos / respuesta                                                                                                        |
| ------ | ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `POST` | `/api/encuestas`              | Bearer JWT; roles `registered_client` o `anonymous_client` | Registra `order_id`, `user_id`, `calidad`, `amabilidad`, `limpieza` y `comentario`; valida una sola encuesta por pedido. |
| `GET`  | `/api/encuestas/estadisticas` | Sin middleware de autenticación                            | Devuelve el total y los agregados para gráficos de comida, servicio y limpieza.                                          |

---

<a id="estado-funcionalidades"></a>

## 📊 Estado de Funcionalidades

| Funcionalidad                      | Estado   | Observación                                                                      |
| ---------------------------------- | -------- | -------------------------------------------------------------------------------- |
| Login con Supabase                 | Completo | Autenticación del frontend mediante Supabase.                                    |
| Login por API                      | Completo | Endpoint disponible en `/api/auth/login`.                                        |
| Empleados                          | Completo | Alta, listado y consulta de espera por perfil autorizado.                        |
| Registro y aprobación de clientes  | Completo | Registro pendiente, aprobación/rechazo, correo y push.                           |
| Clientes anónimos y sala de espera | Completo | Registro de invitado, cola, asignación y notificaciones.                         |
| Productos y carta                  | Completo | Alta, listado y baja lógica de productos; cartas por categoría.                  |
| Mesas y QR                         | Completo | Alta, listado, estados, asignación concurrente y QR.                             |
| Pedidos y comandas                 | Completo | Ciclo de pedido, cocina/bar, entrega, cuenta y pago.                             |
| Chat                               | Completo | Conversaciones de cliente y personal con notificaciones push.                    |
| Push notifications                 | Completo | Expo Push API, registro de token, recepción y navegación en iOS/Android.         |
| Juegos y descuentos                | Completo | Juegos, regla de primer intento y descuento asociado al pedido.                  |
| Solicitud y cobro de cuenta        | Completo | Propina obligatoria, cálculo de cuenta, descuentos, notificaciones y liberación. |
| Encuestas y estadísticas           | Completo | Una encuesta por pedido/estadía y consulta de resultados agregados.              |

---

<a id="tareas-completadas"></a>

## ✅ Tareas Completadas

### Backend e integración — Santino

#### Hitos completados

- [x] Rama `feature/santino-server-setup` integrada en `main`.
- [x] Asignación de mesas protegida frente a actualizaciones concurrentes mediante condiciones de estado y rollback compensatorio si la mesa deja de estar disponible.

- [x] Revisar las rutas que todavía no tenían middleware JWT, incluidos los módulos de empleados, clientes, pedidos y juegos, según el cierre informado.
- [x] Corregir el cálculo de cobro con `total_amount`, descuento de juego y detalle respaldado por `order_items`.
- [x] Exigir una propina válida y prevenir cobros repetidos.
- [x] Liberar la mesa mediante `availability` y coordinar el pago con la confirmación del mozo.
- [x] Restringir las rutas de cuenta por rol, obtener los datos de mesa y notificar a mozo, dueño y supervisor.
- [x] Montar `/api/encuestas`, propagar `user_id` y aplicar unicidad por `order_id` según el cierre informado por el equipo.
- [x] Dar soporte al frontend en las pruebas integrales de pedidos, cuenta, encuestas y push.

### Base de datos y módulos API — Rocío

- [x] Aplicar o verificar la restricción `UNIQUE` de `table_number`.
- [x] Definir, aplicar y documentar las policies RLS.
- [x] Versionar las migraciones SQL.
- [x] Revisar y proteger los endpoints de Pedidos y Chat según rol y propiedad de los recursos.
- [x] Coordinar los datos entre lista de espera, mesas, pedidos y chat.

### Frontend — Valentín / Sebastián

- [x] Completar pruebas end-to-end de registro, aprobación, ingreso a sala de espera, asignación de mesa, carta, pedido y chat.
- [x] Verificar que errores de red no aparezcan como operaciones exitosas persistidas.
- [x] Completar la navegación e integración de juegos y descuentos asociados a pedidos.
- [x] Integrar solicitud de cuenta, selección de propina, detalle del ticket y espera de confirmación del mozo.
- [x] Reemplazar los datos demostrativos de encuestas con información de `/api/encuestas/estadisticas`.
- [x] Completar y capturar modales de confirmación, éxito, rechazo y error para cada flujo.

### Calidad, seguridad y entrega

- [x] Revisar y configurar CORS para el entorno de entrega.
- [x] Crear o completar pruebas unitarias y de integración para rutas, permisos, estados y notificaciones.
- [x] Agregar `backend/.env.example` y `frontend/.env.example` sin secretos.
- [x] Confirmar con la cátedra la fecha oficial de entrega y actualizar el cronograma del equipo.
- [x] Actualizar esta documentación si cambian contratos, nombres de campos o estados.

_Repositorio mantenido por el grupo para la materia Trabajo Final Integrador._
