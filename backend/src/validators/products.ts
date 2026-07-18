export interface ProductInput {
  name: string;
  price: number;
  category_id: string;
  description?: string;
  image_url?: string;
  active?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateProduct(body: unknown): { valid: true; data: ProductInput } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const data = body as Record<string, unknown>;

  // Name validation: required, non-empty string
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'El nombre del producto es obligatorio' });
  }

  // Price validation: required, positive number
  if (data.price === undefined || data.price === null) {
    errors.push({ field: 'price', message: 'El precio es obligatorio' });
  } else {
    const price = Number(data.price);
    if (isNaN(price) || price <= 0) {
      errors.push({ field: 'price', message: 'El precio debe ser un número positivo' });
    }
  }

  // category_id validation: required, uuid string
  if (!data.category_id || typeof data.category_id !== 'string') {
    errors.push({ field: 'category_id', message: 'La categoría es obligatoria' });
  } else if (!UUID_REGEX.test(data.category_id)) {
    errors.push({ field: 'category_id', message: 'La categoría debe ser un UUID válido' });
  }

  // Description: optional, but must be string if provided
  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    errors.push({ field: 'description', message: 'La descripción debe ser un texto' });
  }

  // image_url: optional, but must be string if provided
  if (data.image_url !== undefined && data.image_url !== null && typeof data.image_url !== 'string') {
    errors.push({ field: 'image_url', message: 'La URL de imagen debe ser un texto' });
  }

  // active: optional, but must be boolean if provided
  if (data.active !== undefined && data.active !== null && typeof data.active !== 'boolean') {
    errors.push({ field: 'active', message: 'El campo active debe ser un booleano' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const result: ProductInput = {
    name: (data.name as string).trim(),
    price: Number(data.price),
    category_id: data.category_id as string,
  };

  if (data.description !== undefined && data.description !== null) {
    result.description = (data.description as string).trim();
  }

  if (data.image_url !== undefined && data.image_url !== null) {
    result.image_url = (data.image_url as string).trim();
  }

  if (data.active !== undefined && data.active !== null) {
    result.active = data.active as boolean;
  }

  return { valid: true, data: result };
}
