export type UserRole = 'ADMIN' | 'CASHIER';

export interface UserProfile {
  id: string; // Tautkan dengan UUID dari Supabase Auth
  email: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface Product {
  id: string; // UUID
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string; // UUID
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  created_at?: string;
}

export type PaymentMethod = 'CASH' | 'DEBIT' | 'QRIS' | 'TRANSFER' | 'HUTANG';

export interface Transaction {
  id: string; // UUID
  receipt_number: string;
  total_amount: number;
  payment_method: PaymentMethod;
  customer_id: string | null;
  user_id: string; // ID Kasir
  status: 'COMPLETED' | 'REFUNDED' | 'UNPAID';
  created_at?: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  subtotal: number;
}

export interface StoreSettings {
  store_name: string;
  owner_name: string;
  phone: string;
  address: string;
}

export interface AppSettings {
  app_name: string;
  logo_url: string;
}
