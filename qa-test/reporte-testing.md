# Reporte de Testing - App Móvil y Backend
**Tester:** Rocío Sánchez  
**Fecha:** 10 de Septiembre de 2026  
**Rama:** `feature/rocio-supabase-db`  
**Dispositivo de prueba:** Tablet Android con Expo Go  

---

## 1. Entorno y Configuración

Estuve preparando y probando el entorno local para que la tablet se comunique bien con el proyecto:

- **Frontend:** Se instalaron librerias que faltaban (`react-native-qrcode-svg` y dependencias nativas asociadas) y se limpio la cache de Metro. La interfaz levanto sin problemas.
- **Backend:** 
  - Saltaba un error al compilar TypeScript por `moduleResolution: "node10"`. Lo corregí en `tsconfig.json` y ya compila perfecto (`npm run build`).
  - El servidor arranca perfecto con `npm start`.

---

## 2. Casos de Prueba Ejecutados

| ID | Pantalla | Qué probé | Qué esperaba | Qué pasó | Estado |
|---|---|---|---|---|---|
| **CP-01** | Login | Tocar "Ingresar" sin completar datos | Que frene y avise que faltan campos | Saltó modal de "Campos Incompletos" | **PASS** |
| **CP-02** | Login | Meter mail sin formato válido (`jajaja123`) | Que valide el formato antes de mandar la petición | No valida en el front; mandó al servidor y dijo "Credenciales inválidas" | **FAIL** |
| **CP-03** | Login | Poner contraseña de menos de 6 caracteres | Que avise que es muy corta | No valida longitud y le pega al backend igual | **FAIL** |
| **CP-04** | Login | Clic en "¿No tienes cuenta? Regístrate..." | Ir al formulario de registro | Navega joya a la pantalla de registro | **PASS** |
| **CP-05** | Registro (Paso 1) | Tocar "Siguiente" con campos vacíos | Que no te deje pasar si falta completar | Muestra textos en rojo pero te deja avanzar igual al paso 2 | **FAIL** |
| **CP-06** | Registro (Paso 1) | Escribir número de DNI | Que se borre el aviso rojo al escribir | Sigue mostrando *"El número de DNI es obligatorio"* abajo del campo | **FAIL** |
| **CP-07** | Registro (Paso 1) | Escanear código de barras de DNI argentino | Que lea el PDF417 y autocomplete | Leyó perfecto y cargó Nombre, Apellido y DNI | **PASS** |
| **CP-08** | Registro (Paso 2) | Permisos de cámara para la foto | Que pida permiso al sistema operativo | Pidió permiso de Android correctamente | **PASS** |
| **CP-09** | Registro (Paso 2) | Sacar selfie con la cámara | Que guarde la foto y limpie el error | La foto se ve bien, pero sigue diciendo abajo que falta la foto | **FAIL** |
| **CP-10** | Login / Registro | Envío de datos al backend/Supabase | Que impacte el registro/login | Bloqueado por el tema de la IP local (`localhost`) | **BLOQUEADO** |

---

## 3. Bugs Encontrados

### BUG-002: Bypass de validación en el paso 1 de registro
- **Severidad:** Alta
- **Detalle:** En la pantalla de registro de clientes, si dejás Nombres, Apellidos y DNI en blanco y tocás el botón "Siguiente", te deja pasar al paso de credenciales y fotos igual. Muestra las advertencias en rojo pero no bloquea la navegación.
- **Solución esperada:** Que el botón no permita pasar de pantalla si `errors` tiene datos o los campos requeridos están vacíos.

### BUG-003: Textos de error que no se limpian en la interfaz
- **Severidad:** Baja (UX)
- **Detalle:** Cuando un campo queda marcado con error y después completás el dato, el texto rojo de advertencia no se va:
  - Pasa en el input de **DNI** (escribís números y sigue diciendo *"El número de DNI es obligatorio"*).
  - Pasa en la **Foto** (sacás la foto, se ve la vista previa, pero abajo sigue diciendo *"Debe tomar una fotografía personal"*).
- **Solución esperada:** Limpiar el estado de error de cada campo.

### BUG-004: Falta de validación básica de mail y clave en Login
- **Severidad:** Media
- **Detalle:** Si pones cualquier texto en el correo o una contraseña de 3 letras, la app hace la petición a ciegas en vez de chequear primero el formato con Regex y el minimo de caracteres en el front.
- **Solución esperada:** Validar en el cliente antes de disparar la función de login.