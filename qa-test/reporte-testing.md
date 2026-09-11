# Reporte de Testing - App Móvil y Backend
**Tester:** Rocío Sánchez  
**Fecha:** 10 de Septiembre de 2026  
**Rama:** feature/rocio-supabase-db  
**Dispositivo:** Tablet Android con Expo Go  

---

## 1. Entorno y Configuración

- **Frontend:** Instalé dependencias faltantes (`react-native-qrcode-svg`) y limpié la caché de Metro. Levantó bien.
- **Backend:** 
  - Corregí el error de compilación en `tsconfig.json` (saqué la opción vieja de node10) y compiló perfecto con `npm run build`.
  - Creé el `.env` con las credenciales de Supabase y el puerto 3000. El servidor arranca con `npm start`.

---

## 2. Pruebas que hice

### Login
- **Campos vacíos:** Toqué "Ingresar" sin datos. Mostró el modal de campos incompletos. **(OK)**
- **Formato de mail:** Puse `jajaja123`. No lo valida en el cliente, manda la petición y tira credenciales inválidas. **(A corregir)**
- **Largo de contraseña:** Puse menos de 6 caracteres y no frena en el front, manda la consulta igual. **(A corregir)**
- **Ir al registro:** El botón de registrarse lleva bien a la pantalla de registro de cliente. **(OK)**

### Registro (Paso 1: Datos)
- **Avanzar sin datos:** Toqué "Siguiente" con todo vacío. Muestra los textos en rojo pero te deja pasar igual al paso 2. **(Bug)**
- **Escribir DNI:** Al tipear los números, el mensaje *"El número de DNI es obligatorio"* no se borra. **(Bug visual)**
- **Escáner de DNI:** Probé escanear el documento físico. Leyó el código de barras al toque y autocompletó nombre, apellido y número. **(OK)**

### Registro (Paso 2: Foto y Credenciales)
- **Permisos de cámara:** Saltó el cartel nativo de Android y los otorgó bien. **(OK)**
- **Sacar foto:** Saca la selfie y muestra la vista previa, pero sigue quedando abajo el texto rojo avisando que falta la foto. **(Bug visual)**
- **Enviar formulario:** Quedó trabado intentando conectar al backend por el tema de `localhost`. **(Bloqueado)**

---

## 3. Bugs para arreglar

### BUG-002: Te deja pasar de paso sin completar datos
En el registro de cliente, si dejás todo vacío y tocás "Siguiente", te manda a la pantalla de fotos igual. Habría que trabar el avance si los campos obligatorios no están completos.

### BUG-003: Los avisos rojos no se borran al escribir
Cuando un campo tira error, aunque después lo completes sigue mostrando la advertencia abajo:
- Pasa con el DNI mientras lo vas escribiendo.
- Pasa con la foto después de sacarte la selfie.

### BUG-004: Validar mail y clave en el front
En el login no está chequeando si el texto tiene formato de correo ni si la clave tiene el mínimo de caracteres antes de disparar la petición al servidor.