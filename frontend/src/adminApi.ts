import { Order, Category, Product } from './api';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function clearToken(): void {
  localStorage.removeItem('token');
}

async function adminRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(error.message || `Error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ======== Orders (Admin) ========

export interface AdminOrder extends Order {
  client?: {
    id: string;
    name: string;
    whatsapp: string;
    username: string;
  };
}

export async function getAdminOrders(status?: string): Promise<AdminOrder[]> {
  const query = status ? `?status=${status}` : '';
  const data = await adminRequest<{ orders: AdminOrder[] }>(`/orders${query}`);
  return data.orders;
}

export function updateOrderStatus(orderId: string, status: 'accepted' | 'rejected' | 'ready'): Promise<AdminOrder> {
  return adminRequest<AdminOrder>(`/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function verifyReceipt(orderId: string, verified: boolean, extracted_amount?: number): Promise<void> {
  return adminRequest<void>(`/orders/${orderId}/receipt/verify`, {
    method: 'PUT',
    body: JSON.stringify({ verified, extracted_amount }),
  });
}

// ======== Categories (Admin) ========

export function getCategories(): Promise<Category[]> {
  return adminRequest<Category[]>('/categories');
}

export function createCategory(data: { name: string; description?: string; display_order?: number }): Promise<Category> {
  return adminRequest<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCategory(id: string, data: { name?: string; description?: string; display_order?: number }): Promise<Category> {
  return adminRequest<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteCategory(id: string): Promise<void> {
  return adminRequest<void>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// ======== Products (Admin) ========

export function getProducts(): Promise<Product[]> {
  return adminRequest<Product[]>('/products');
}

export interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  category_id: string;
  active?: boolean;
  image?: File;
}

export function createProduct(data: ProductFormData): Promise<Product> {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  formData.append('price', String(data.price));
  formData.append('category_id', data.category_id);
  if (data.active !== undefined) formData.append('active', String(data.active));
  if (data.image) formData.append('image', data.image);
  return adminRequest<Product>('/products', {
    method: 'POST',
    body: formData,
  });
}

export function updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product> {
  const formData = new FormData();
  if (data.name) formData.append('name', data.name);
  if (data.description !== undefined) formData.append('description', data.description || '');
  if (data.price !== undefined) formData.append('price', String(data.price));
  if (data.category_id) formData.append('category_id', data.category_id);
  if (data.active !== undefined) formData.append('active', String(data.active));
  if (data.image) formData.append('image', data.image);
  return adminRequest<Product>(`/products/${id}`, {
    method: 'PUT',
    body: formData,
  });
}

export function deleteProduct(id: string): Promise<void> {
  return adminRequest<void>(`/products/${id}`, {
    method: 'DELETE',
  });
}

// ======== Time Slots (Admin) ========

export interface TimeSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  active: boolean;
}

export async function getTimeSlots(): Promise<TimeSlot[]> {
  const data = await adminRequest<{ time_slots: TimeSlot[] }>('/admin/time-slots');
  return data.time_slots;
}

export function createTimeSlot(data: { slot_date: string; start_time: string; end_time: string }): Promise<TimeSlot> {
  return adminRequest<TimeSlot>('/admin/time-slots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTimeSlot(id: string, data: Partial<{ slot_date: string; start_time: string; end_time: string; active: boolean }>): Promise<TimeSlot> {
  return adminRequest<TimeSlot>(`/admin/time-slots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteTimeSlot(id: string): Promise<void> {
  return adminRequest<void>(`/admin/time-slots/${id}`, {
    method: 'DELETE',
  });
}

// ======== Batches (Admin) ========

export interface Batch {
  id: string;
  status: string;
  estimated_minutes: number | null;
  created_at: string;
  ready_at: string | null;
  orders?: AdminOrder[];
}

export async function getBatches(): Promise<Batch[]> {
  const data = await adminRequest<{ batches: Batch[] }>('/admin/batches');
  return data.batches;
}

export function createBatch(order_ids: string[]): Promise<Batch> {
  return adminRequest<Batch>('/admin/batches', {
    method: 'POST',
    body: JSON.stringify({ order_ids }),
  });
}

export function updateBatch(id: string, data: { estimated_minutes?: number; status?: string }): Promise<Batch> {
  return adminRequest<Batch>(`/admin/batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ======== Settings (Admin) ========

export interface DeliveryMode {
  mode: 'slots' | 'batches';
}

export function getDeliveryMode(): Promise<DeliveryMode> {
  return adminRequest<DeliveryMode>('/admin/settings/delivery-mode');
}

export function setDeliveryMode(mode: 'slots' | 'batches'): Promise<DeliveryMode> {
  return adminRequest<DeliveryMode>('/admin/settings/delivery-mode', {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  });
}
