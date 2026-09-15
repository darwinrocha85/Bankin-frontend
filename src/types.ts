// Tipos que reflejan los esquemas Pydantic del backend
// (app/adapters/inbound/api/schemas.py). Mantenerlos sincronizados a mano
// es aceptable para un demo de este tamaño; en un proyecto más grande se
// generarían automáticamente desde el OpenAPI del backend.

export type Role = "CLIENT" | "MANAGER";
export type CardStatus = "CREATED" | "ACTIVE" | "CANCELLED";
export type TransactionType = "PURCHASE" | "RECHARGE";
export type TransactionStatus = "COMPLETED" | "ANNULLED";

export interface Client {
  id: number;
  name: string;
  username: string;
  product_id: number;
  role: Role;
  created_at: string;
}

export interface Card {
  id: number;
  client_id: number;
  card_id: string;
  cardholder_name: string;
  date_expires: string;
  balance: number;
  status: CardStatus;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  card_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankOverview {
  total_clients: number;
  total_managers: number;
  total_cards: number;
  cards_by_status: Record<string, number>;
  total_balance_in_active_cards: number;
  total_transactions: number;
  transactions_by_type: Record<string, number>;
  total_purchased_amount: number;
  total_recharged_amount: number;
}

export interface ClientOverview {
  client: Client;
  cards: Card[];
  transactions: Transaction[];
}
