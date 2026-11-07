/**
 * Datos fijos del local para los pedidos a domicilio.
 *
 * El restaurante es siempre el origen de la ruta. No se usa `expo-location`
 * ni permisos de ubicación: las coordenadas del local son constantes.
 */
export const RESTAURANTE_DIRECCION =
  "Av. Bartolomé Mitre 750, B1870 AAU, Avellaneda, Buenos Aires";

// Coordenadas aproximadas de Av. Mitre 750, Avellaneda.
export const RESTAURANTE_LAT = -34.66262;
export const RESTAURANTE_LNG = -58.36578;

/** Centro inicial del mapa cuando el cliente todavía no eligió su domicilio. */
export const AVELLANEDA_LAT = -34.66262;
export const AVELLANEDA_LNG = -58.36578;
