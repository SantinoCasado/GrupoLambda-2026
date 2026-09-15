# Trabajo Final Integrador 2026 - Tecnicatura Universitaria en Programación (UTN)

<p align="center">
  <img src="./assets/logo.png" alt="Logo Restaurante" width="150"/>
</p>

Repositorio oficial del grupo para el Trabajo Final Integrador (TFI). El proyecto corresponde a un restaurante de comida china con flujo de operación completo, desde la gestión de personal y clientes hasta la asignación de mesas, pedidos, notificaciones, aprovisionamiento y seguimiento de la experiencia del cliente.

> Estado actual del proyecto: la base de backend ya está desarrollada en gran parte y montada con Express + Supabase; el frontend contiene pantallas principales de negocio y flujo de autenticación, pero aún queda integración real con varios endpoints del backend y varios módulos siguen pendientes de cierre operativo.

### 🎨 Identidad Visual del Proyecto

- **Temática:** Restaurante de comida china.
- **Paleta principal:**
  - 🔴 `#780116` (rojo oscuro / base)
  - 🟡 `#F7B538` (amarillo / acentos)
  - 🟠 `#DB7C26` (naranja suave)
  - 🟧 `#D8572A` (naranja intenso)
  - 🟥 `#C32F27` (rojo vibrante)

---

## 👥 Conformación del Grupo y Responsabilidades

### 1. Brazanovich, Valentín

- **Rol:** Frontend Lead & UX/UI.
- **Objetivos actuales:** flujo de autenticación, pantallas de alta de empleados, registro de clientes y maquetación general de la app.
- **Fecha de inicio:** 25/08/2026
- **Fecha estimada de cierre:** 15/09/2026
- **Branch:** `feature/valentin-auth-ui`

### 2. Andreozzi, Sebastián

- **Rol:** Frontend App Developer.
- **Objetivos actuales:** alta de platos/bebidas, menú, chat, y tareas de diseño funcional y flujo de usuario.
- **Fecha de inicio:** 25/08/2026
- **Fecha estimada de cierre:** 15/09/2026
- **Branch:** `feature/sebastian-menu-juegos`

### 3. Casado, Santino

- **Rol:** Backend & Integration Engineer.
- **Objetivos actuales:** autenticación, clientes, aprobación de usuarios, correos transaccionales (Nodemailer) e integración transversal de Notificaciones Push (Expo API) en todos los módulos.
- **Fecha de inicio:** 25/08/2026
- **Fecha estimada de cierre:** 15/09/2026
- **Branch:** `feature/santino-server-setup`

### 4. Sanchez, Rocío

- **Rol:** Database Admin, API Developer & QA.
- **Objetivos actuales:** modelo de tablas, QR, mesas, políticas RLS y desarrollo completo de los módulos y endpoints de Pedidos y Chat en tiempo real.
- **Fecha de inicio:** 25/08/2026
- **Fecha estimada de cierre:** 15/09/2026
- **Branch:** `feature/rocio-supabase-db`

> Nota: si un integrante no logra cerrar su módulo comprometido, el plazo o la asignación debe actualizarse y registrarse en este README.

---

## 🛠️ Stack Tecnológico

El proyecto se estructura en tres capas principales:

- **Frontend móvil:** React Native + Expo + TypeScript.
- **Estilos UI:** NativeWind.
- **Backend:** Node.js + Express + TypeScript.
- **Base de datos y autenticación:** Supabase (PostgreSQL + Auth + Storage).

### Dependencias principales del backend

- `express`
- `cors`
- `dotenv`
- `zod`
- `@supabase/supabase-js`
- `multer`
- `nodemailer`
- `firebase-admin`
- `tsx` / `typescript`

### Servicios externos y complementarios

- Supabase Storage para fotos y archivos.
- Expo Push Notifications.
- Expo Camera / Barcode Scanner para lecturas QR y fotografía en vivo.
- SMTP de Gmail mediante App Password para correos transaccionales.

---

## 🏗️ Arquitectura General

La solución está organizada por responsabilidades:

- **Frontend:** manejo visual, navegación, formularios y validaciones de UX.
- **Backend:** lógica de negocio, validación con Zod, control de Roles y middleware.
- **Supabase:** persistencia de datos, Auth, Storage, RLS y tablas de negocio.

El backend está modularizado por dominio en:

- `auth`
- `clientes`
- `empleados`
- `productos`
- `mesas`
- `pedidos`
- `chat`

El frontend evidencia también una estructura funcional por pantallas y servicios de consumo API.

![Diagrama UML del Sistema](./assets/umlTFI.png)

---

## 📋 Casos de Uso del Sistema

Los flujos principales del sistema son:

- **CU-01: Registrar Empleado**
- **CU-02: Alta de Platos**
- **CU-03: Alta de Bebidas**
- **CU-04: Alta y Gestión de Mesas**
- **CU-05: Registro de Cliente**
- **CU-06: Aprobación / Rechazo de Cliente**
- **CU-09: Ingreso de Cliente Anónimo**
- **CU-10: Asignación de Mesa a Cliente**
- **CU-11: Consulta QR de Mesa**
- **CU-12: Realización de Pedido por el Cliente**
- **CU-13: Confirmación / Derivación del Pedido**

---

## 🛡️ Seguridad y Validaciones Implementadas

El backend incorpora varias capas de control:

1. **Multer + Storage** para carga de imágenes y archivos a Supabase.
2. **Validación estricta con Zod** para prevenir datos malformados.
3. **Autenticación y middleware de roles** vía JWT.
4. **Reglas por categoría y permisos** para empleados/productos/mesas.
5. **Baja lógica de productos** con estado `inactive`.
6. **Nodemailer** para aprobaciones y notificaciones por correo.
7. **Push notifications** para estados rápidos y avisos de negocio.

---

## ⚙️ Instalación y Configuración Local

### Requisitos previos

- Node.js y npm.
- Cuenta y proyecto Supabase creados.
- Expo Go o emulador Android/iOS.
- Conexión local con la misma red si se usa un dispositivo físico.

### Backend

```bash
cd backend
npm install
npm run dev
```

Comandos extra:

```bash
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

También puede ejecutarse con:

```bash
npm run android
npm run ios
npm run web
```

La API se conecta por IP local detectada por Expo en:

```text
http://<IP_LOCAL>:3000/api
```

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

| Variable                    | Uso                               |
| --------------------------- | --------------------------------- |
| `PORT`                      | Puerto del backend                |
| `NODE_ENV`                  | Entorno de ejecución              |
| `SUPABASE_URL`              | URL del proyecto Supabase         |
| `SUPABASE_ANON_KEY`         | Clave pública de Supabase         |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada del backend         |
| `GMAIL_USER`                | Usuario SMTP                      |
| `GMAIL_APP_PASSWORD`        | Contraseña de aplicación de Gmail |

Crear `frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

> Los archivos `.env` no deben subirse al repositorio. La `SUPABASE_SERVICE_ROLE_KEY` debe mantenerse solo en el backend.

---

## 🔌 Endpoints Disponibles

La API se ejecuta por defecto en `http://localhost:3000`.

### Sistema

| Método | Ruta           | Auth | Descripción                      |
| ------ | -------------- | ---- | -------------------------------- |
| `GET`  | `/`            | No   | Verifica que la API esté activa. |
| `GET`  | `/api/ping-db` | No   | Verifica conexión con Supabase.  |

### Autenticación

| Método | Ruta              | Auth | Body / FormData           | Respuesta esperada                       |
| ------ | ----------------- | ---- | ------------------------- | ---------------------------------------- |
| `POST` | `/api/auth/login` | No   | JSON: `email`, `password` | `200` con `mensaje`, `token` y `usuario` |

### Empleados

| Método | Ruta                       | Auth                                | Body / FormData                                                                                                     | Respuesta esperada             |
| ------ | -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `POST` | `/api/empleados/empleados` | Sin JWT en la implementación actual | `multipart/form-data`: `email`, `password`, `first_name`, `last_name`, `dni`, `cuil`, `role`, `rol_creador`, `foto` | `201` con empleado creado      |
| `GET`  | `/api/empleados/empleados` | No                                  | Sin body                                                                                                            | `200` con arreglo de empleados |

### Clientes

| Método  | Ruta                       | Auth                                     | Body / FormData                                                                      | Respuesta esperada                           |
| ------- | -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| `POST`  | `/api/clientes/register`   | No                                       | `multipart/form-data`: `email`, `password`, `first_name`, `last_name`, `dni`, `foto` | `201` con cliente pendiente de aprobación    |
| `POST`  | `/api/clientes/anonymous`  | No                                       | JSON: `client_name`, `client_photo`                                                  | `201` con cliente anónimo en lista de espera |
| `GET`   | `/api/clientes`            | No                                       | Query opcional: `?estado=pending`                                                    | `200` con clientes filtrados                 |
| `PATCH` | `/api/clientes/:id/status` | Bearer JWT; roles `owner` o `supervisor` | JSON: `{ "status": "approved" }`                                                     | `200` con actualización de estado            |

### Productos

| Método  | Ruta                      | Auth                             | Body / FormData                                                                                              | Respuesta esperada             |
| ------- | ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `POST`  | `/api/productos`          | Bearer JWT y rol según categoría | `multipart/form-data`: `name`, `description`, `prep_time`, `price`, `category`, hasta cinco archivos `fotos` | `201` con producto creado      |
| `PATCH` | `/api/productos/:id/baja` | Bearer JWT                       | Sin body                                                                                                     | `200` con baja lógica          |
| `GET`   | `/api/productos`          | Bearer JWT                       | Opcional `?category=`                                                                                        | `200` con listado de productos |

Categorías permitidas: `dish`, `drink`, `dessert`.

### Mesas

| Método  | Ruta                    | Auth                                               | Body / FormData                                                         | Respuesta esperada                |
| ------- | ----------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| `POST`  | `/api/mesas`            | Bearer JWT; roles `owner` o `supervisor`           | `multipart/form-data`: `table_number`, `capacity`, `table_type`, `foto` | `201` con mesa creada y `qr_data` |
| `PATCH` | `/api/mesas/:id/estado` | Bearer JWT; roles `owner`, `supervisor` o `maitre` | JSON: `{ "availability": "occupied" }`                                  | `200` con estado actualizado      |
| `GET`   | `/api/mesas`            | Bearer JWT                                         | Sin body                                                                | `200` con listado de mesas        |

Tipos de mesa admitidos:

- `standard`
- `vip`
- `reduced_mobility`

Estados de disponibilidad:

- `free`
- `occupied`
- `cleaning`

El backend genera `qr_data` con el formato:

```text
RESTO-TFI-MESA-<numero>
```

### Pedidos

| Método | Ruta                         | Auth                    | Body / FormData                             | Respuesta esperada            |
| ------ | ---------------------------- | ----------------------- | ------------------------------------------- | ----------------------------- |
| `POST` | `/api/pedidos`               | No/según implementación | JSON con `idCliente`, `numeroMesa`, `items` | `201`/`200` con pedido creado |
| `GET`  | `/api/pedidos/:id`           | No/según implementación | Sin body                                    | `200` con estado del pedido   |
| `PUT`  | `/api/pedidos/:id/confirmar` | No/según implementación | JSON con confirmación / motivo              | `200` con pedido actualizado  |

> El módulo de pedidos ya existe en el backend y está montado, pero aún no está cerrada su integración completa con frontend ni con el flujo de operación final del restaurante.

### Chat

| Método | Ruta        | Auth                    | Body / FormData             | Respuesta esperada              |
| ------ | ----------- | ----------------------- | --------------------------- | ------------------------------- |
| `POST` | `/api/chat` | No/según implementación | JSON con mensaje/canal/mesa | `200`/`201` con mensaje enviado |
| `GET`  | `/api/chat` | No/según implementación | Query opcional `?table_id=` | `200` con historial del chat    |

---

## ⚠️ Diferencias Conocidas entre Frontend y Backend

Los siguientes puntos deben seguir revisándose para cerrar la integración real:

1. **Login actual del frontend**: el frontend autentica contra Supabase directamente y usa un fallback local. El endpoint `/api/auth/login` existe pero no es el camino principal en la app.
2. **Mesas**: el frontend ya ajustó el request para usar `multipart/form-data` y campos como `table_number`, `capacity` y `table_type`. Este punto fue corregido y ya está alineado con el backend.
3. **Pantallas de operación**: varias pantallas funcionan con datos simulados o locales mientras el backend real no está conectado de manera consistente.
4. **Módulos no totalmente integrados**: pedidos, chat, lista de espera y flujo completo de cliente siguen sin cierre de UX/backend.
5. **Roles**: en la base se usan valores en inglés (`owner`, `supervisor`, `cook`, `bartender`, etc.) y el frontend los presenta en español visualmente.

---

## 📊 Estado de Funcionalidades

| Funcionalidad                         | Estado                    | Observación                                                                             |
| ------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| Login con Supabase                    | Implementado              | Frontend autentica directamente contra Auth de Supabase.                                |
| Login mediante API                    | Implementado en backend   | Endpoint operativo en `/api/auth/login`.                                                |
| Empleados                             | Implementado              | Alta, validación y flujo operativo principal funcional.                                 |
| Clientes registrados                  | Implementado              | Flujo de registro + aprobación/rechazo con correos.                                     |
| Clientes anónimos                     | Implementado en backend   | Se agregan a la lista de espera.                                                        |
| Productos                             | Implementado              | Alta, listado y baja lógica funcional.                                                  |
| Mesas y QR                            | Implementado              | Backend y frontend ya están alineados en el formato del alta y del QR.                  |
| Pedidos                               | Parcialmente implementado | Lógica y endpoints del backend existen, falta cierre completo de flujo comercial y UX.  |
| Chat                                  | Parcialmente implementado | Backend montado, falta integración y comportamiento final en la app.                    |
| Push notifications                    | Implementado en backend   | Integrado vía Expo Push API en los flujos de Clientes y Pedidos. Falta recepción en UI. |
| Encuestas y estadísticas              | Pendiente                 | No hay persistencia ni vistas funcionales confirmadas.                                  |
| Lista de espera / asignación de mesas | Pendiente                 | Backend soporta la lógica base pero requiere cierre de negocio e integración.           |

---

## 📝 Limitaciones y Funcionalidades Pendientes

### Backend (Santino)

- Definir y reforzar permisos finales sobre endpoints sensibles.
- Asegurar validación final para rutas no protegidas/protegidas y listas de clientes.
- Asistir en la recepción de las Notificaciones Push del lado del frontend.

### Base de Datos y Módulos (Rocío)

- Aplicar restricción `UNIQUE` en `table_number` para evitar duplicados.
- Definir y aplicar policies RLS por tabla.
- Versionar todas las migraciones SQL.
- Exponer y proteger los endpoints HTTP de las lógicas de Pedidos y Chat.

### Frontend (Valentín / Sebastián)

- Integrar la app con los endpoints reales en todas las pantallas relevantes.
- Implementar menú para clientes y cálculo de pedido.
- Finalizar flujo de lista de espera y asignación de mesa.
- Completar chat en tiempo real y consumo de mensajes.
- Implementar notificaciones push y flujo end-to-end para el cliente.
- Cerrar encuestas y módulos de estadísticas.
- Revisar la integración final con QR de mesa y flujo de acceso del cliente.

### Calidad y configuración general

- Crear pruebas unitarias e integrales.
- Agregar archivo `.env.example` con placeholders.
- Restringir CORS para producción.
- Revisar documentación de uso y contratos ante cada ajuste del backend.

### Frontend (Valentín / Sebastián)

- Integrar la app con los endpoints reales en todas las pantallas relevantes.
- Implementar menú para clientes y cálculo de pedido.
- Finalizar flujo de lista de espera y asignación de mesa.
- Completar chat en tiempo real y consumo de mensajes.
- Implementar notificaciones push y flujo end-to-end para el cliente.
- Cerrar encuestas y módulos de estadísticas.
- Revisar la integración final con QR de mesa y flujo de acceso del cliente.

### Calidad y configuración general

- Crear pruebas unitarias e integrales.
- Agregar archivo `.env.example` con placeholders.
- Restringir CORS para producción.
- Revisar documentación de uso y contratos ante cada ajuste del backend.

---

## 📸 Índice de Imágenes y Mockups Asociados

### 🧪 Pruebas del Backend

1. **Validación de esquemas Zod**  
   [Ver captura](./assets/tests/PruebaValidacionZod.png)
2. **Control de permisos y reglas de negocio**  
   [Ver captura](./assets/tests/PruebaReglasNegocio.png)
3. **Flujo exitoso de creación**  
   [Ver captura](./assets/tests/FlujoExitosoCreacion.png)

### 📱 Mockups y Diseño UI

4. **Pantalla de Login**  
   [Ver mockup](./assets/makeup/logIn.png)
5. **Pantalla de Registro**  
   [Ver mockup](./assets/makeup/registro.png)
6. **Vista de Inicio**  
   [Ver mockup](./assets/makeup/viewInicio.png)
7. **Pantalla de Bienvenida de Pedido**  
   [Ver mockup](./assets/makeup/bienvenidaPedido.png)
8. **Códigos QR del proyecto**  
   [Ingreso al local](./assets/qrs/Qr_Ingreso.png) | [Mesa asignada](./assets/qrs/Mesa_1.PNG) | [Propinas](./assets/qrs/qr_propina_20.PNG)
9. `[Pendiente]` Listados de productos y menú.
10. `[Pendiente]` Gráficos estadísticos de encuestas.

---

_Repositorio mantenido por el grupo para la materia Trabajo Final Integrador._
