# Trabajo Final Integrador 2026 - Tecnicatura Universitaria en Programación (UTN)

<p align="center">
  <img src="./assets/logo.png" alt="Logo Restaurante" width="150"/>
</p>

Repositorio oficial del grupo para el Trabajo Final Integrador (TFI) de la materia. El sistema gestiona el flujo completo de un restaurante de especialidad (Comida China), desde la reserva y asignación de mesas, hasta el flujo de cocina y encuestas de satisfacción.

### 🎨 Identidad Visual del Proyecto

- **Temática:** Restaurante de Comida China.
- **Paleta de Colores:**
  - 🔴 `#780116` (Rojo Oscuro / Principal)
  - 🟡 `#F7B538` (Amarillo / Acentos)
  - 🟠 `#DB7C26` (Naranja Suave)
  - 🟧 `#D8572A` (Naranja Intenso)
  - 🟥 `#C32F27` (Rojo Vibrante)

---

## 👥 Conformación del Grupo de Trabajo y Responsabilidades

A continuación, se detallan las responsabilidades actuales de cada integrante del equipo, cumpliendo con el formato requerido para el seguimiento de tareas:

### 1. Brazanovich, Valentín

- **Rol:** Frontend Lead & UX/UI.
- **Módulos (objetivos) a desarrollar:** Punto 1 (Alta de empleados), Punto 5 (Alta de cliente registrado), Punto 9 (Alta de cliente anónimo) y maquetación general de UI/UX.
- **Fecha de inicio de la tarea:** 25/08/2026
- **Fecha de finalización de la tarea:** 15/09/2026 (Estimado)
- **Branch:** `feature/valentin-auth-ui`

### 2. Andreozzi, Sebastián

- **Rol:** Frontend App Developer.
- **Módulos (objetivos) a desarrollar:** Punto 2 (Alta de plato), Punto 3 (Alta de bebida), Punto 11 (Menú y chat de consultas) y Punto 14 (Desarrollo de los 3 minijuegos).
- **Fecha de inicio de la tarea:** 25/08/2026
- **Fecha de finalización de la tarea:** 15/09/2026 (Estimado)
- **Branch:** `feature/sebastian-menu-juegos`

### 3. Casado, Santino

- **Rol:** Backend & Integration Engineer.
- **Módulos (objetivos) a desarrollar:** Puntos 6, 7 y 8 (Aprobación/Rechazo de clientes y envíos de emails automáticos). Puntos 12, 13 y 14 (Flujo lógico de pedidos, cálculos y derivación mediante Push Notifications).
- **Fecha de inicio de la tarea:** 25/08/2026
- **Fecha de finalización de la tarea:** 15/09/2026 (Estimado)
- **Branch:** `feature/santino-server-setup`

### 4. Sanchez, Rocío

- **Rol:** Database Admin & QA / DevOps.
- **Módulos (objetivos) a desarrollar:** Punto 4 (Alta y Gestión de Mesas y QRs), Puntos 9 y 10 (Lógica de lista de espera y asignación de mesas en base de datos).
- **Fecha de inicio de la tarea:** 25/08/2026
- **Fecha de finalización de la tarea:** 15/09/2026 (Estimado)
- **Branch:** `feature/rocio-supabase-db`

> **Nota para el equipo:** Si algún integrante del equipo no logra terminar con la funcionalidad comprometida, se deberá cambiar el plazo o asignar ese módulo a otro integrante y esto debe quedar informado en esta sección del README.

---

## 🛠️ Stack Tecnológico del Proyecto

Nuestra arquitectura simula un entorno laboral real, separando las responsabilidades de Frontend, Backend y Base de Datos:

- **Frontend (App Móvil):** React Native con Expo y TypeScript.
- **Estilos UI:** NativeWind (Tailwind CSS) garantizando contraste nítido y sin espacios neutros.
- **Backend (Servidor):** Node.js y Express con TypeScript, utilizando una arquitectura modular orientada a servicios.
- **Librerías del Servidor:**
  - `typescript` & `tsx` (Compilación y ejecución en tiempo real)
  - `express` (Framework web y enrutamiento)
  - `zod` (Validación y sanitización estricta de esquemas)
  - `@supabase/supabase-js` (Cliente de base de datos y autenticación con Service Role / Anon Keys)
  - `multer` & `@types/multer` (Gestión eficiente de archivos e imágenes en memoria para Supabase Storage)
  - `nodemailer` (Envío automatizado de correos electrónicos transaccionales mediante SMTP y App Passwords)
  - `jsonwebtoken` & `bcrypt` (Autenticación y seguridad de credenciales)
  - `dotenv` (Gestión segura de variables de entorno)
  - `nodemailer` (Envío automatizado de correos electrónicos transaccionales mediante SMTP y App Passwords)
  - `node-fetch` o `fetch` nativo (Comunicación con la API de Expo Push Notifications para alertas en dispositivos móviles)
- **Base de Datos y Auth:** PostgreSQL gestionado a través de Supabase y GoTrue.
- **Servicios Externos Adicionales:**
  - Firebase Cloud Messaging + Expo Notifications (Notificaciones Push).
  - Expo Camera / Barcode Scanner (Lectura de códigos QR físicos).

---

## 🏗️ Diagrama de Clases (UML)

La arquitectura de datos se divide en tres módulos principales interconectados: Módulo de Usuarios y Accesos, Módulo del Restaurante y Módulo de Pedidos.

![Diagrama UML del Sistema](./assets/umlTFI.png)

---

## 📋 Casos de Uso del Sistema

El sistema contempla los siguientes flujos principales para la operatoria del restaurante:

- **CU-01: Registrar Empleado (Cocinero)** - Permite a un Dueño o Supervisor registrar un empleado escaneando su DNI y tomando una foto en vivo.
- **CU-02: Gestión de Platos (Alta, Modificación y Baja Lógica)** - Permite al Cocinero o Dueño agregar, modificar o dar de baja lógica platos y postres del menú utilizando un array de fotografías optimizadas.
- **CU-03: Gestión de Bebidas (Alta, Modificación y Baja Lógica)** - Permite al Cantinero o Dueño agregar, modificar o dar de baja lógica bebidas del menú con control estricto de roles.
- **CU-04: Alta y Gestión de Mesas** - El Dueño o Supervisor registra nuevas mesas y el sistema genera automáticamente su código QR.
- **CU-05: Crear Cliente Registrado** - Auto-registro de clientes validando identidad con foto obligatoria en vivo, quedando pendientes de aprobación.
- **CU-06: Aprobación o Rechazo de Cliente Registrado** - Dueño o Supervisor evalúan clientes pendientes y disparan correos transaccionales automáticos vía Nodemailer.
- **CU-09: Ingreso y Gestión de Cliente Anónimo** - Ingreso rápido mediante QR de entrada al local para listarse en espera.
- **CU-10: Asignación de Mesa a Cliente** - El Metre vincula una mesa vacía al cliente en espera y notifica vía Push Notification.
- **CU-11: Consulta QR de Mesa (A, B)** - El cliente escanea la mesa asignada para visualizar el menú y realizar consultas al mozo mediante chat en tiempo real.
- **CU-12: Realización de Pedido por el Cliente** - Selección de productos con cálculo de importe y tiempo estimado, notificado directamente al Mozo.
- **CU-13: Validación de Pedido y Derivación a Sectores** - El Mozo aprueba la solicitud derivando ítems simultáneamente a Cocina y Barra.

---

## 🛡️ Seguridad, Autenticación y Validaciones de la API (Backend)

Para proteger la integridad de los datos, el servidor implementa un conjunto robusto de mecanismos de control de acceso y validación:

1. **Gestión de Archivos Multer y Storage (Múltiples Imágenes):** Middleware configurado con `memoryStorage` que procesa un array de imágenes en paralelo (`Promise.all`) y las almacena de forma segura en los buckets correspondientes de Supabase Storage.
2. **Validación Estricta de Esquemas (Zod):** Validación de datos de entrada mediante tuplas estrictas (`as const`) e interoperabilidad con tipos de datos complejos, rechazando peticiones malformadas con un formato tipado (`400 Bad Request`).
3. **Autenticación Centralizada y Middleware ("Patovica"):** Valida tokens JWT combinados con el estado (`status`) y rol de la tabla pública. Las rutas protegidas exigen la cabecera `Authorization: Bearer <TOKEN>` y permisos específicos por rol (RBAC).
4. **Reglas de Negocio Jerárquicas y Control de Roles:** Control estricto de privilegios por categorías de productos (ej. solo _Cocinero/Dueño_ gestionan platos y postres; _Cantinero/Dueño_ gestionan bebidas) retornando bloqueos seguros (`403 Forbidden`).
5. **Baja Lógica de Productos:** Implementación de borrado lógico (`status: 'inactive'`) para preservar la integridad referencial y el historial en la tabla de ítems de pedidos.
6. **Notificaciones Transaccionales (Nodemailer):** Envío automatizado de correos HTML personalizados mediante autenticación SMTP segura y App Passwords de Gmail.
7. **Notificaciones Multicanal Automatizadas (Nodemailer & Expo Push):** Disparo simultáneo de correos transaccionales en HTML ante la aprobación/rechazo de cuentas y despacho automático de alertas móviles mediante la API de Expo Push Notifications.

---

## ⚙️ Instalación y Configuración Local

### Requisitos previos

- Node.js y npm instalados.
- Proyecto configurado en Supabase.
- Expo Go, emulador Android o simulador iOS para ejecutar el frontend.
- Dispositivo y computadora conectados a la misma red local si se utiliza Expo en un dispositivo físico.

### Backend

```bash
cd backend
npm install
npm run dev
```

Otros comandos disponibles:

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

Comandos específicos de Expo:

```bash
npm run android
npm run ios
npm run web
```

La URL de la API se genera automáticamente en `frontend/src/services/apiConfig.ts` usando la IP local detectada por Expo:

```text
http://<IP_LOCAL>:3000/api
```

### Variables de entorno

Crear el archivo `backend/.env` con las siguientes variables:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anon
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role
GMAIL_USER=correo@gmail.com
GMAIL_APP_PASSWORD=contraseña_de_aplicacion
```

| Variable                    | Uso                                                       |
| --------------------------- | --------------------------------------------------------- |
| `PORT`                      | Puerto en el que se ejecuta el backend.                   |
| `NODE_ENV`                  | Entorno de ejecución.                                     |
| `SUPABASE_URL`              | URL del proyecto Supabase.                                |
| `SUPABASE_ANON_KEY`         | Clave pública de Supabase.                                |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave administrativa utilizada únicamente por el backend. |
| `GMAIL_USER`                | Cuenta de correo utilizada por Nodemailer.                |
| `GMAIL_APP_PASSWORD`        | Contraseña de aplicación para SMTP.                       |

Para el frontend, crear `frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

> No subir archivos `.env`, contraseñas ni claves reales al repositorio. La `SUPABASE_SERVICE_ROLE_KEY` debe mantenerse exclusivamente en el backend.

---

## 🔌 Endpoints disponibles

La API se ejecuta por defecto en `http://localhost:3000`.

### Sistema

| Método | Ruta           | Auth | Descripción                         |
| ------ | -------------- | ---- | ----------------------------------- |
| `GET`  | `/`            | No   | Comprueba que la API esté activa.   |
| `GET`  | `/api/ping-db` | No   | Comprueba la conexión con Supabase. |

### Autenticación

| Método | Ruta              | Auth | Body / FormData           | Respuesta esperada                                                  |
| ------ | ----------------- | ---- | ------------------------- | ------------------------------------------------------------------- |
| `POST` | `/api/auth/login` | No   | JSON: `email`, `password` | `200` con `mensaje`, `token` y `usuario`; `400` o `401` ante error. |

### Empleados

| Método | Ruta                       | Auth                           | Body / FormData                                                                                                     | Respuesta esperada                                          |
| ------ | -------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `POST` | `/api/empleados/empleados` | Actualmente sin middleware JWT | `multipart/form-data`: `email`, `password`, `first_name`, `last_name`, `dni`, `cuil`, `role`, `rol_creador`, `foto` | `201` con empleado creado; `400`, `403` o `500` ante error. |
| `GET`  | `/api/empleados/empleados` | No                             | Sin body                                                                                                            | `200` con empleados en la propiedad `data`.                 |

### Clientes

| Método  | Ruta                           | Auth                                     | Body / FormData                                                                      | Respuesta esperada                                                     |
| ------- | ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `POST`  | `/api/clientes/register`       | No                                       | `multipart/form-data`: `email`, `password`, `first_name`, `last_name`, `dni`, `foto` | `201` con cliente pendiente; `400` o `500` ante error.                 |
| `POST`  | `/api/clientes/anonymous`      | No                                       | JSON: `client_name`, `client_photo`                                                  | `201` con cliente agregado a la lista de espera.                       |
| `GET`   | `/api/clientes?estado=pending` | No                                       | Sin body; query opcional `estado`                                                    | `200` con clientes en `data`.                                          |
| `PATCH` | `/api/clientes/:id/status`     | Bearer JWT; roles `owner` o `supervisor` | JSON: `{ "status": "approved" }`; valores `approved` o `rejected`                    | `200` con cliente actualizado; `400`, `401`, `403` o `500` ante error. |

### Productos

| Método  | Ruta                      | Auth                             | Body / FormData                                                                                              | Respuesta esperada                                                                  |
| ------- | ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `POST`  | `/api/productos`          | Bearer JWT y rol según categoría | `multipart/form-data`: `name`, `description`, `prep_time`, `price`, `category`, hasta cinco archivos `fotos` | `201` con producto creado; `400`, `401`, `403` o `500` ante error.                  |
| `PATCH` | `/api/productos/:id/baja` | Bearer JWT y rol según categoría | Sin body                                                                                                     | `200` con baja lógica (`status: inactive`); `401`, `403`, `404` o `500` ante error. |

Categorías permitidas: `dish`, `drink` y `dessert`.

### Mesas

| Método  | Ruta                    | Auth                                               | Body / FormData                                                         | Respuesta esperada                                                             |
| ------- | ----------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `POST`  | `/api/mesas`            | Bearer JWT; roles `owner` o `supervisor`           | `multipart/form-data`: `table_number`, `capacity`, `table_type`, `foto` | `201 Created` con la mesa y `qr_data`; `400`, `401`, `403` o `500` ante error. |
| `PATCH` | `/api/mesas/:id/estado` | Bearer JWT; roles `owner`, `supervisor` o `maitre` | JSON: `{ "availability": "occupied" }`                                  | `200` con mesa actualizada; `400`, `401`, `403`, `404` o `500` ante error.     |

Tipos de mesa: `standard`, `vip` y `reduced_mobility`.

Estados de disponibilidad: `free`, `occupied` y `cleaning`.

El backend genera `qr_data` con el formato `RESTO-TFI-MESA-<numero>`. El frontend debe utilizar ese valor como entrada para `react-native-qrcode-svg`.

---

## ⚠️ Diferencias conocidas entre frontend y backend

Los siguientes puntos son bloqueadores de integración para Valentín y Sebastián:

1. **Alta de mesas:** El frontend debe ajustar su request de alta de mesas para enviar `multipart/form-data` con el campo `foto` (el backend ya no acepta JSON plano para este endpoint).
2. **Variables de mesas:** El frontend debe alinear las variables del request con el esquema Zod del backend (`table_number`, `capacity`, `table_type`).
3. El frontend utiliza Supabase directamente para login y no consume actualmente `/api/auth/login`.
4. El fallback local permite mostrar la aplicación sin un JWT real.
5. Algunos servicios frontend conservan datos locales de prueba.
6. Los roles se almacenan en inglés y se muestran en español.

---

## 📊 Estado de funcionalidades

| Funcionalidad            | Estado                    | Observaciones                                                                                                           |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Login con Supabase       | Implementado              | El frontend autentica directamente contra Supabase.                                                                     |
| Login mediante API       | Implementado en backend   | Disponible en `POST /api/auth/login`, pero aún no es utilizado por el frontend.                                         |
| Alta de empleados        | Implementado              | Incluye fotografía, validación Zod y reglas jerárquicas.                                                                |
| Registro de clientes     | Implementado parcialmente | El frontend conserva un fallback local si falla el backend.                                                             |
| Aprobación de clientes   | Implementado              | Incluye validación de roles y envío automatizado de correos HTML mediante Nodemailer.                                   |
| Clientes anónimos        | Implementado en backend   | Se registran en la lista de espera.                                                                                     |
| Alta de productos        | Implementado              | Incluye hasta cinco imágenes y baja lógica.                                                                             |
| Alta y estados de mesas  | Implementado              | Backend finalizado y testeado. Pendiente integración del frontend para consumir los endpoints.                          |
| Códigos QR               | Implementado              | Backend autogenera el patrón `RESTO-TFI-MESA-<numero>`. Frontend consume este string para renderizar el QR visualmente. |
| Pedidos                  | Planificado               | El módulo existe como estructura inicial, pero no está montado.                                                         |
| Chat en tiempo real      | Planificado               | Sin implementación funcional visible.                                                                                   |
| Notificaciones push      | Implementado              | Integración completa en el servicio de clientes conectada a la API de Expo Push Notificatio                             |
| Encuestas y estadísticas | Planificado               | Sin persistencia ni pantallas funcionales completas.                                                                    |

---

## 📝 Limitaciones y funcionalidades pendientes

### Backend (Santino)

- Configuración de Nodemailer (App Passwords) y armado del endpoint para aprobar/rechazar clientes (CU-06).
- Completar el módulo de pedidos.
- Implementar los cálculos de importes y tiempos estimados del módulo de pedidos.
- Derivar pedidos a cocina y barra.
- Agregar autenticación a las rutas de empleados.
- Restringir el listado de clientes.

### Base de Datos (Rocío)

- Aplicar restricción `UNIQUE` a la columna `table_number` en la tabla `restaurant_tables`.
- Documentar y aplicar las políticas RLS.
- Agregar migraciones SQL versionadas.

### Frontend (Valentín / Sebastián)

- Ajustar el request de alta de mesas para enviar `multipart/form-data` con el campo `foto`.
- Alinear las variables del request de mesas con el backend: `table_number`, `capacity` y `table_type`.
- Implementar el menú para clientes.
- Implementar el chat en tiempo real.
- Implementar la lista de espera y la asignación de mesas.
- Implementar las notificaciones push.
- Implementar encuestas y estadísticas.

### Calidad y configuración general

- Crear pruebas unitarias y de integración.
- Agregar `.env.example` sin secretos.
- Restringir CORS en producción.

---

## 📸 Índice de Imágenes y Mockups Asociados

### 🧪 Pruebas del Backend (Postman)

1. **Validación de Esquemas (Zod - Error 400):**  
   [Ver Captura](./assets/tests/PruebaValidacionZod.png)
2. **Control de Permisos y Reglas de Negocio (Error 403):**  
   [Ver Captura](./assets/tests/PruebaReglasNegocio.png)
3. **Flujo Exitoso de Creación (201 Created):**  
   [Ver Captura](./assets/tests/FlujoExitosoCreacion.png)

### 📱 Mockups y Diseño UI (Frontend)

4. **Pantalla de Login:**  
   [Ver Mockup](./assets/makeup/logIn.png)
5. **Pantalla de Registro:**  
   [Ver Mockup](./assets/makeup/registro.png)
6. **Vista de Inicio:**  
   [Ver Mockup](./assets/makeup/viewInicio.png)
7. **Pantalla de Bienvenida de Pedido:**  
   [Ver Mockup](./assets/makeup/bienvenidaPedido.png)
8. **Códigos QR del proyecto:**  
   [Ingreso al Local](./assets/qrs/Qr_Ingreso.png) | [Mesa Asignada](./assets/qrs/Mesa_1.PNG) | [Propinas](./assets/qrs/qr_propina_20.PNG)
9. `[Pendiente]` Listados de productos y menú.
10. `[Pendiente]` Gráficos estadísticos de encuestas.

---

_Repositorio mantenido por el grupo para la materia Trabajo Final Integrador._
