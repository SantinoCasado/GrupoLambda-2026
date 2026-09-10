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
- **Base de Datos y Auth:** PostgreSQL gestionado a través de Supabase y GoTrue.
- **Servicios Externos Adicionales:**
  - Firebase Cloud Messaging + Expo Notifications (Notificaciones Push).
  - Expo Camera / Barcode Scanner (Lectura de códigos QR físicos).

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
4. **Reglas de Negocio Jerárquicas y Control de Roles:** Control estricto de privilegios por categorías de productos (ej. solo *Cocinero/Dueño* gestionan platos y postres; *Cantinero/Dueño* gestionan bebidas) retornando bloqueos seguros (`403 Forbidden`).
5. **Baja Lógica de Productos:** Implementación de borrado lógico (`status: 'inactive'`) para preservar la integridad referencial y el historial en la tabla de ítems de pedidos.
6. **Notificaciones Transaccionales (Nodemailer):** Envío automatizado de correos HTML personalizados mediante autenticación SMTP segura y App Passwords de Gmail.

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
