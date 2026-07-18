export interface CategoryInput {
  name: string;
  description?: string;
  display_order?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCategory(body: unknown): { valid: true; data: CategoryInput } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const data = body as Record<string, unknown>;

  // Name validation: required, non-empty string
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'El nombre de la categoría es obligatorio' });
  }

  // Description: optional, but must be string if provided
  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    errors.push({ field: 'description', message: 'La descripción debe ser un texto' });
  }

  // display_order: optional, but must be a number if provided
  if (data.display_order !== undefined && data.display_order !== null) {
    const order = Number(data.display_order);
    if (isNaN(order) || !Number.isInteger(order)) {
      errors.push({ field: 'display_order', message: 'El orden debe ser un número entero' });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const result: CategoryInput = {
    name: (data.name as string).trim(),
  };

  if (data.description !== undefined && data.description !== null) {
    result.description = (data.description as string).trim();
  }

  if (data.display_order !== undefined && data.display_order !== null) {
    result.display_order = Number(data.display_order);
  }

  return { valid: true, data: result };
}
