import type { BankOverview, Card, Client, ClientOverview, Role, Transaction } from "./types";

// URL del backend FastAPI. Viene de .env.development o .env.production
// según el modo (ver esos archivos) -- así el frontend "sabe" solo si
// está en local o desplegado, sin tocar código. Se exporta para poder
// mostrarla en la UI como referencia (ver App.tsx).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
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

export function purchase(cardId: string, amount: number): Promise<Transaction> {
  return request("/transactions/purchase", {
    method: "POST",
    body: JSON.stringify({ card_id: cardId, amount }),
  });
}

export function recharge(cardId: string, amount: number): Promise<Transaction> {
  return request("/transactions/recharge", {
    method: "POST",
    body: JSON.stringify({ card_id: cardId, amount }),
  });
}

export function annulTransaction(transactionId: number): Promise<Transaction> {
  return request(`/transactions/${transactionId}/annul`, { method: "POST" });
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
