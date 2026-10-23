export interface FormErrors {
  nombres?: string;
  apellidos?: string;
  dni?: string;
  cuil?: string;
  email?: string;
  password?: string;
  confirmarPassword?: string;
  fotoUri?: string;
}

export function validarPaso1(values: {
  nombres: string;
  apellidos: string;
  dni: string;
  cuil: string;
}): Partial<FormErrors> {
  const errors: Partial<FormErrors> = {};

  if (!values.nombres.trim()) {
    errors.nombres = "El nombre es obligatorio.";
  } else if (values.nombres.trim().length < 2) {
    errors.nombres = "Debe tener al menos 2 caracteres.";
  }

  if (!values.apellidos.trim()) {
    errors.apellidos = "El apellido es obligatorio.";
  } else if (values.apellidos.trim().length < 2) {
    errors.apellidos = "Debe tener al menos 2 caracteres.";
  }

  const cleanDni = values.dni.replace(/\D/g, "");
  if (!cleanDni) {
    errors.dni = "El DNI es obligatorio.";
  } else if (cleanDni.length !== 8) {
    errors.dni = "El DNI debe tener 8 dígitos.";
  }

  const cleanCuil = values.cuil.replace(/\D/g, "");
  if (!cleanCuil) {
    errors.cuil = "El CUIL es obligatorio.";
  } else if (cleanCuil.length !== 11) {
    errors.cuil = "El CUIL debe tener exactamente 11 dígitos.";
  } else if (cleanDni && !cleanCuil.includes(cleanDni)) {
    errors.cuil = "El CUIL debe coincidir con el DNI ingresado.";
  }

  return errors;
}

export function validarFormEmpleado(values: {
  nombres: string;
  apellidos: string;
  dni: string;
  cuil: string;
  email: string;
  password: string;
  confirmarPassword: string;
  fotoUri: string | null;
}): FormErrors {
  const errors: FormErrors = {};

  // Nombres y Apellidos
  if (!values.nombres.trim()) {
    errors.nombres = "El nombre es obligatorio.";
  } else if (values.nombres.trim().length < 2) {
    errors.nombres = "Debe tener al menos 2 caracteres.";
  }

  if (!values.apellidos.trim()) {
    errors.apellidos = "El apellido es obligatorio.";
  } else if (values.apellidos.trim().length < 2) {
    errors.apellidos = "Debe tener al menos 2 caracteres.";
  }

  // DNI (7 u 8 dígitos numéricos)
  const cleanDni = values.dni.replace(/\D/g, "");
  if (!cleanDni) {
    errors.dni = "El DNI es obligatorio.";
  } else if (cleanDni.length != 8) {
    errors.dni = "El DNI debe tener 8 dígitos.";
  }

  // CUIL (11 dígitos numéricos que deben contener el DNI en el medio)
  const cleanCuil = values.cuil.replace(/\D/g, "");
  if (!cleanCuil) {
    errors.cuil = "El CUIL es obligatorio.";
  } else if (cleanCuil.length !== 11) {
    errors.cuil = "El CUIL debe tener exactamente 11 dígitos.";
  } else if (cleanDni && !cleanCuil.includes(cleanDni)) {
    errors.cuil = "El CUIL debe coincidir con el DNI ingresado.";
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!values.email.trim()) {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!emailRegex.test(values.email.trim())) {
    errors.email = "El formato de correo no es válido.";
  }

  // Contraseña
  if (!values.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (values.password.length < 6) {
    errors.password = "La contraseña debe tener al menos 6 caracteres.";
  }

  // Confirmación de contraseña
  if (!values.confirmarPassword) {
    errors.confirmarPassword = "Debe confirmar la contraseña.";
  } else if (values.confirmarPassword !== values.password) {
    errors.confirmarPassword = "Las contraseñas no coinciden.";
  }

  // Foto obligatoria
  if (!values.fotoUri) {
    errors.fotoUri = "La foto personal tomada desde la cámara es obligatoria.";
  }

  return errors;
}