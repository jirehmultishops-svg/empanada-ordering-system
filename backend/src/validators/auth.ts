export interface RegisterInput {
  name: string;
  whatsapp: string;
  username: string;
  password: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRegister(body: unknown): { valid: true; data: RegisterInput } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const data = body as Record<string, unknown>;

  // Name validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'El nombre es obligatorio' });
  }

  // WhatsApp validation: 10-15 digits only
  if (!data.whatsapp || typeof data.whatsapp !== 'string') {
    errors.push({ field: 'whatsapp', message: 'El número de WhatsApp es obligatorio' });
  } else {
    const digitsOnly = data.whatsapp.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      errors.push({ field: 'whatsapp', message: 'El número de WhatsApp debe tener entre 10 y 15 dígitos' });
    } else if (!/^\d+$/.test(data.whatsapp)) {
      errors.push({ field: 'whatsapp', message: 'El número de WhatsApp debe contener solo dígitos' });
    }
  }

  // Username validation: alphanumeric, 3-30 chars
  if (!data.username || typeof data.username !== 'string') {
    errors.push({ field: 'username', message: 'El nombre de usuario es obligatorio' });
  } else if (!/^[a-zA-Z0-9]{3,30}$/.test(data.username)) {
    errors.push({ field: 'username', message: 'El nombre de usuario debe ser alfanumérico y tener entre 3 y 30 caracteres' });
  }

  // Password validation: min 6 chars
  if (!data.password || typeof data.password !== 'string') {
    errors.push({ field: 'password', message: 'La contraseña es obligatoria' });
  } else if (data.password.length < 6) {
    errors.push({ field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name: (data.name as string).trim(),
      whatsapp: data.whatsapp as string,
      username: data.username as string,
      password: data.password as string,
    },
  };
}

export interface LoginInput {
  username: string;
  password: string;
}

export function validateLogin(body: unknown): { valid: true; data: LoginInput } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const data = body as Record<string, unknown>;

  if (!data.username || typeof data.username !== 'string' || data.username.trim().length === 0) {
    errors.push({ field: 'username', message: 'El nombre de usuario es obligatorio' });
  }

  if (!data.password || typeof data.password !== 'string' || data.password.length === 0) {
    errors.push({ field: 'password', message: 'La contraseña es obligatoria' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      username: (data.username as string).trim(),
      password: data.password as string,
    },
  };
}
