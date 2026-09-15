import { useEffect, useState } from "react";
import {
  ApiError,
  activateCard,
  cancelCard,
  getCardsForClient,
  getTransactionsForCard,
  issueCard,
  purchase,
  recharge,
} from "../api";
import type { Card, Client, Transaction } from "../types";
import { CARD_STATUS_LABEL, formatDate, formatMoney, maskCardId } from "../utils";

interface ClientViewProps {
  client: Client;
  onLogout: () => void;
}

export function ClientView({ client, onLogout }: ClientViewProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedCard = cards.find((c) => c.card_id === selectedCardId) ?? null;

  async function loadCards() {
    try {
      const data = await getCardsForClient(client.id);
      setCards(data);
      if (data.length > 0 && !selectedCardId) {
        setSelectedCardId(data[0].card_id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error cargando tarjetas");
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions(cardId: string) {
    try {
      const data = await getTransactionsForCard(cardId);
      setTransactions(data.sort((a, b) => b.id - a.id));
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  useEffect(() => {
    if (selectedCardId) loadTransactions(selectedCardId);
  }, [selectedCardId]);

  async function withBusy(fn: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      await loadCards();
      if (selectedCardId) await loadTransactions(selectedCardId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Ocurrió un error");
    } finally {
      setBusy(false);
    }
  }

  function handleIssueCard() {
    withBusy(() => issueCard(client.id));
  }

  function handleActivate() {
    if (selectedCard) withBusy(() => activateCard(selectedCard.card_id));
  }

  function handleCancel() {
    if (selectedCard) withBusy(() => cancelCard(selectedCard.card_id));
  }

  function handlePurchase() {
    const amount = Number(amountInput);
    if (selectedCard && amount > 0) {
      // Manda una "note" fija identificando esta app como origen del cobro
      // -- lo mismo que se espera que haga cualquier otra app que llame a
      // este mismo endpoint (ver api.ts / README del backend).
      withBusy(() => purchase(selectedCard.card_id, amount, "BankIn Frontend")).then(() =>
        setAmountInput("")
      );
    }
  }

  function handleRecharge() {
    const amount = Number(amountInput);
    if (selectedCard && amount > 0) {
      withBusy(() => recharge(selectedCard.card_id, amount)).then(() => setAmountInput(""));
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <h1>BankIn</h1>
          <p className="subtitle">
            Hola, {client.name} · producto #{client.product_id}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>
          Cambiar de usuario
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="layout-two-col">
        <section className="panel">
          <div className="panel-header">
            <h2>Mis tarjetas</h2>
            <button className="btn btn-primary" onClick={handleIssueCard} disabled={busy}>
              + Emitir tarjeta
            </button>
          </div>

          {loading && <p className="muted">Cargando...</p>}
          {!loading && cards.length === 0 && (
            <p className="muted">Todavía no tienes tarjetas. Emite la primera.</p>
          )}

          <ul className="card-list">
            {cards.map((card) => (
              <li key={card.card_id}>
                <button
                  className={`card-list-item ${card.card_id === selectedCardId ? "selected" : ""}`}
                  onClick={() => setSelectedCardId(card.card_id)}
                >
                  <div className="card-list-item-top">
                    <span className="mono">{maskCardId(card.card_id)}</span>
                    <span className={`badge badge-status-${card.status.toLowerCase()}`}>
                      {CARD_STATUS_LABEL[card.status]}
                    </span>
                  </div>
                  <div className="card-list-item-balance">${formatMoney(card.balance)}</div>
                  <div className="muted small">Vence {card.date_expires}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          {!selectedCard && <p className="muted">Selecciona una tarjeta para ver el detalle.</p>}

          {selectedCard && (
            <>
              <div className="panel-header">
                <h2>Tarjeta {maskCardId(selectedCard.card_id)}</h2>
                <span className={`badge badge-status-${selectedCard.status.toLowerCase()}`}>
                  {CARD_STATUS_LABEL[selectedCard.status]}
                </span>
              </div>

              <p className="balance-big">${formatMoney(selectedCard.balance)}</p>

              {actionError && <div className="alert alert-error">{actionError}</div>}

              <div className="button-row">
                {selectedCard.status === "CREATED" && (
                  <button className="btn btn-primary" onClick={handleActivate} disabled={busy}>
                    Activar tarjeta
                  </button>
                )}
                {selectedCard.status !== "CANCELLED" && (
                  <button className="btn btn-danger" onClick={handleCancel} disabled={busy}>
                    Cancelar tarjeta
                  </button>
                )}
              </div>

              {selectedCard.status === "ACTIVE" && (
                <div className="amount-form">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Monto"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                  <button className="btn btn-secondary" onClick={handleRecharge} disabled={busy}>
                    Recargar
                  </button>
                  <button className="btn btn-secondary" onClick={handlePurchase} disabled={busy}>
                    Comprar
                  </button>
                </div>
              )}

              <h3>Historial</h3>
              {transactions.length === 0 && <p className="muted small">Sin movimientos.</p>}
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.created_at)}</td>
                      <td>{tx.type === "PURCHASE" ? "Compra" : "Recarga"}</td>
                      <td>${formatMoney(tx.amount)}</td>
                      <td>
                        <span className={`badge badge-tx-${tx.status.toLowerCase()}`}>
                          {tx.status === "COMPLETED" ? "Completada" : "Anulada"}
                        </span>
                      </td>
                      <td className="muted small">{tx.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
