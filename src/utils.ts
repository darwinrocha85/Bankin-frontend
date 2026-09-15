export function formatMoney(amount: number): string {
  return amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function maskCardId(cardId: string): string {
  if (cardId.length <= 4) return cardId;
  return `•••• ${cardId.slice(-4)}`;
}

export const CARD_STATUS_LABEL: Record<"CREATED" | "ACTIVE" | "CANCELLED", string> = {
  CREATED: "Creada (sin activar)",
  ACTIVE: "Activa",
  CANCELLED: "Cancelada",
};
