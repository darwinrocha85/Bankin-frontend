import type { BankOverview, Card, Client, ClientOverview, Role, Transaction } from "./types";

// URL del backend FastAPI. Viene de .env.development o .env.production
// según el modo (ver esos archivos) -- así el frontend "sabe" solo si
// está en local o desplegado, sin tocar código. Se exporta para poder
// mostrarla en la UI como referencia (ver App.tsx).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Clave opcional para el endpoint de cobro (POST /transactions/purchase),
// pensado para que lo llamen otras apps además de este frontend. Solo hace
// falta si el backend tiene configurada EXTERNAL_API_KEY (ver .env.example
// del backend); si no, esta variable puede quedar vacía sin problema.
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Merge real de headers: un `...options` a secas pisaría por completo el
  // Content-Type por defecto en cuanto alguna llamada (como purchase, con
  // X-Api-Key) mande sus propios headers.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // el cuerpo no era JSON, nos quedamos con el statusText
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ---- Clientes ----

export function getClients(): Promise<Client[]> {
  return request("/clients");
}

export function createClient(data: {
  name: string;
  username: string;
  product_id: number;
  role?: Role;
}): Promise<Client> {
  return request("/clients", { method: "POST", body: JSON.stringify(data) });
}

// ---- Tarjetas ----

export function getCardsForClient(clientId: number): Promise<Card[]> {
  return request(`/cards?client_id=${clientId}`);
}

export function issueCard(clientId: number): Promise<Card> {
  return request("/cards", { method: "POST", body: JSON.stringify({ client_id: clientId }) });
}

export function activateCard(cardId: string): Promise<Card> {
  return request(`/cards/${cardId}/activate`, { method: "POST" });
}

export function cancelCard(cardId: string): Promise<Card> {
  return request(`/cards/${cardId}`, { method: "DELETE" });
}

// ---- Transacciones ----

export function getTransactionsForCard(cardId: string): Promise<Transaction[]> {
  return request(`/transactions/card/${cardId}`);
}

export function purchase(cardId: string, amount: number, note?: string): Promise<Transaction> {
  // Mismo endpoint que usaría una app externa para cobrar -- por eso manda
  // el header de API key si está configurada (ver API_KEY arriba) y una
  // "note" con quién origina el cobro (el backend guarda lo que le manden;
  // este frontend manda un nombre fijo, ver ClientView.tsx). Si el backend
  // no exige EXTERNAL_API_KEY, el header simplemente se ignora.
  return request("/transactions/purchase", {
    method: "POST",
    headers: API_KEY ? { "X-Api-Key": API_KEY } : undefined,
    body: JSON.stringify({ card_id: cardId, amount, note }),
  });
}

export function recharge(cardId: string, amount: number): Promise<Transaction> {
  return request("/transactions/recharge", {
    method: "POST",
    body: JSON.stringify({ card_id: cardId, amount }),
  });
}

// Anular una transacción es una acción exclusiva del gerente: el backend
// exige manager_id y valida el rol (ver routers/transactions.py).
export function annulTransaction(transactionId: number, managerId: number): Promise<Transaction> {
  return request(`/transactions/${transactionId}/annul?manager_id=${managerId}`, {
    method: "POST",
  });
}

// ---- Gerente ----

export function getBankOverview(managerId: number): Promise<BankOverview> {
  return request(`/manager/overview?manager_id=${managerId}`);
}

export function getAllClients(managerId: number): Promise<Client[]> {
  return request(`/manager/clients?manager_id=${managerId}`);
}

export function getClientOverview(managerId: number, clientId: number): Promise<ClientOverview> {
  return request(`/manager/clients/${clientId}?manager_id=${managerId}`);
}

export function getAllCards(managerId: number): Promise<Card[]> {
  return request(`/manager/cards?manager_id=${managerId}`);
}

export function getAllTransactions(managerId: number): Promise<Transaction[]> {
  return request(`/manager/transactions?manager_id=${managerId}`);
}
