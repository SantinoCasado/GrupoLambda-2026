export interface ParsedDNI {
  tramite?: string;
  apellidos: string;
  nombres: string;
  sexo?: string;
  dni: string;
  ejemplar?: string;
  fechaNacimiento?: string;
}

/**
 * Parsea el contenido leído del código del DNI argentino.
 * Formato clásico: 
 * tramite@apellidos@nombres@sexo@dni@ejemplar@fechaNacimiento@fechaEmision
 */
export function parseDniData(data: string): ParsedDNI | null {
  if (!data) return null;

  // Si viene separado por @
  const partsAt = data.split("@");
  if (partsAt.length >= 5) {
    return {
      tramite: partsAt[0]?.trim(),
      apellidos: partsAt[1]?.trim() || "",
      nombres: partsAt[2]?.trim() || "",
      sexo: partsAt[3]?.trim(),
      dni: partsAt[4]?.trim().replace(/\D/g, "") || "",
      ejemplar: partsAt[5]?.trim(),
      fechaNacimiento: partsAt[6]?.trim(),
    };
  }

  // Si viene separado por comas ,
  const partsComma = data.split(",");
  if (partsComma.length >= 5) {
    return {
      tramite: partsComma[0]?.trim(),
      apellidos: partsComma[1]?.trim() || "",
      nombres: partsComma[2]?.trim() || "",
      sexo: partsComma[3]?.trim(),
      dni: partsComma[4]?.trim().replace(/\D/g, "") || "",
      ejemplar: partsComma[5]?.trim(),
      fechaNacimiento: partsComma[6]?.trim(),
    };
  }

  return null;
}