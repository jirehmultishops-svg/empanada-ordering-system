const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function setToken(token: string): void {
  localStorage.setItem('token', token);
}

function clearToken(): void {
  localStorage.removeItem('token');
}

async function request<T>(
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

  // Don't set Content-Type for FormData (browser sets it with boundary)
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

// Auth
export interface AuthResponse {
  token: string;
  client: {
    id: string;
    username: string;
    name: string;
    whatsapp: string;
    role: string;
  };
}

export function register(data: { name: string; whatsapp: string; username: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function login(data: { username: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Catalog
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  display_order: number;
  products: Product[];
}

export function getCatalog(): Promise<Category[]> {
  return request<Category[]>('/catalog');
}

// Cart
export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
}

export function getCart(): Promise<Cart> {
  return request<Cart>('/cart');
}

export function addToCart(product_id: string): Promise<Cart> {
  return request<Cart>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id }),
  });
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return request<Cart>(`/cart/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return request<Cart>(`/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

// Orders
export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Order {
  id: string;
  client_id: string;
  total_amount: number;
  status: string;
  pickup_suggestion: string | null;
  time_slot_id: string | null;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  receipt?: Receipt;
  bank_details?: BankDetails;
  pickup_address?: string;
}

export interface Receipt {
  id: string;
  image_url: string;
  extracted_amount: number | null;
  ocr_status: string;
  verified: boolean;
}

export interface BankDetails {
  bank: string;
  account_type: string;
  account_number: string;
  holder: string;
  cbu: string;
  alias: string;
}

export async function createOrder(pickup_suggestion?: string): Promise<Order> {
  const data = await request<{ order: Order; bank_transfer: BankDetails }>('/orders', {
    method: 'POST',
    body: JSON.stringify({ pickup_suggestion }),
  });
  return { ...data.order, bank_details: data.bank_transfer };
}

export async function getMyOrders(): Promise<Order[]> {
  const data = await request<{ orders: Order[] }>('/orders/my');
  return data.orders;
}

export function uploadReceipt(orderId: string, file: File): Promise<Receipt> {
  const formData = new FormData();
  formData.append('receipt', file);
  return request<Receipt>(`/orders/${orderId}/receipt`, {
    method: 'POST',
    body: formData,
  });
}

// Notifications
export interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const data = await request<{ notifications: Notification[] }>('/notifications');
  return data.notifications;
}

export { getToken, setToken, clearToken };
