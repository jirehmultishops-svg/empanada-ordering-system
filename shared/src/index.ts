// Shared types and utilities for the empanada ordering system

export interface Category {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  username: string;
  name: string;
  whatsapp: string;
  role: 'client' | 'admin';
  createdAt: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'ready' | 'delivered';

export interface Order {
  id: string;
  clientId: string;
  totalAmount: number;
  status: OrderStatus;
  pickupSuggestion: string | null;
  timeSlotId: string | null;
  batchId: string | null;
  createdAt: string;
  updatedAt: string;
}
