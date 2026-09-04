export interface PlatoPayload {
  nombre: string;
  descripcion: string;
  tiempoElaboracionMinutos: number;
  precio: number;
  fotos: string[];
}

// Lista en memoria para simular la existencia previa en la carta (menú)
const cartaPlatosRegistrados: string[] = [
  "BIFE DE CHORIZO CON PAPAS",
  "MILANESA NAPOLITANA",
  "SORRENTINOS DE CALABAZA",
];

export async function registrarPlatoMock(payload: PlatoPayload) {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const nombreNormalizado = payload.nombre.trim().toUpperCase();

  // Verificación de existencia en la carta
  if (cartaPlatosRegistrados.includes(nombreNormalizado)) {
    throw new Error("El plato ya se encuentra registrado en la carta del menú.");
  }

  // Se agrega a la lista simulada
  cartaPlatosRegistrados.push(nombreNormalizado);

  console.log("==========================================");
  console.log("📦 PAYLOAD LISTO PARA POSTMAN [POST /api/platos]:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("==========================================");

  return {
    success: true,
    message: "Plato incorporado a la carta con éxito",
    id: "plt_" + Date.now(),
  };
}