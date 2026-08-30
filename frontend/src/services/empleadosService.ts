export interface EmpleadoPayload {
  nombres: string;
  apellidos: string;
  dni: string;
  cuil: string;
  email: string;
  password: string;
  perfil: "cocinero";
  fotoUri: string;
}

export async function registrarEmpleadoMock(payload: EmpleadoPayload) {
  // Imprime en la consola de Metro el JSON exacto para copiar y pegar en Postman (POST /api/empleados)
  console.log("==========================================");
  console.log("📦 PAYLOAD LISTO PARA POSTMAN [POST /api/empleados]:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("==========================================");

  // Simulación: Si el email es test@error.com simula conflicto
  if (payload.email === "test@error.com") {
    throw new Error("El correo electrónico ya se encuentra registrado.");
  }

  return {
    success: true,
    message: "Empleado cocinero registrado con éxito",
    id: "emp_" + Math.floor(Math.random() * 10000),
  };
}

// BACKEND REAL (descomentar y configurar la URL de tu API para usarlo en producción)
// // URL base de tu backend (o ngrok / Postman Mock Server en desarrollo)
// const API_URL = "https://servidor-o-api.com/api";

// export async function registrarEmpleado(payload: EmpleadoPayload) {
//   try {
//     const response = await fetch(`${API_URL}/empleados`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     const data = await response.json();

//     // Si el backend devuelve un status de error (400, 409, 500, etc.)
//     if (!response.ok) {
//       throw new Error(data.message || "Error al procesar el registro del empleado.");
//     }

//     // Retorna la respuesta del servidor (con el ID de la base de datos)
//     return data;
//   } catch (error: any) {
//     // Propaga el error hacia la pantalla para presentarlo en el modal visual con vibración
//     throw new Error(error.message || "Error de conexión con el servidor.");
//   }
// }