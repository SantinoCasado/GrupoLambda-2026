export interface PlatoFormErrors {
  nombre?: string;
  descripcion?: string;
  tiempoElaboracion?: string;
  precio?: string;
  fotos?: string;
}

export function validatePlatoForm(values: {
  nombre: string;
  descripcion: string;
  tiempoElaboracion: string;
  precio: string;
  fotos: (string | null)[];
}): PlatoFormErrors {
  const errors: PlatoFormErrors = {};

  // Nombre
  if (!values.nombre.trim()) {
    errors.nombre = "El nombre del plato es obligatorio.";
  } else if (values.nombre.trim().length < 3) {
    errors.nombre = "Debe tener al menos 3 caracteres.";
  }

  // Descripción
  if (!values.descripcion.trim()) {
    errors.descripcion = "La descripción es obligatoria.";
  } else if (values.descripcion.trim().length < 10) {
    errors.descripcion = "Debe ingresar una descripción más detallada (mínimo 10 caracteres).";
  }

  // Tiempo de elaboración (en minutos)
  const tiempoNum = Number(values.tiempoElaboracion);
  if (!values.tiempoElaboracion.trim()) {
    errors.tiempoElaboracion = "El tiempo de elaboración es obligatorio.";
  } else if (isNaN(tiempoNum) || !Number.isInteger(tiempoNum) || tiempoNum <= 0) {
    errors.tiempoElaboracion = "Debe ser un número entero positivo de minutos.";
  } else if (tiempoNum > 60) {
    errors.tiempoElaboracion = "El tiempo no puede exceder los 60 minutos.";
  }

  // Precio
  const precioNum = Number(values.precio.replace(",", "."));
  if (!values.precio.trim()) {
    errors.precio = "El precio es obligatorio.";
  } else if (isNaN(precioNum) || precioNum <= 0) {
    errors.precio = "Debe ingresar un precio numérico válido mayor a cero.";
  }

  // Tres fotos obligatorias
  const fotosCargadas = values.fotos.filter((f) => f !== null);
  if (fotosCargadas.length < 3) {
    errors.fotos = "Debe registrar exactamente tres (3) fotografías del plato.";
  }

  return errors;
}