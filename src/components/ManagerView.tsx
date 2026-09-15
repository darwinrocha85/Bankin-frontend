import { useEffect, useState } from "react";
import { ApiError, getAllClients, getBankOverview, getClientOverview } from "../api";
import type { BankOverview, Client, ClientOverview } from "../types";
import { CARD_STATUS_LABEL, formatDate, formatMoney, maskCardId } from "../utils";

interface ManagerViewProps {
  manager: Client;
  onLogout: () => void;
}

export function ManagerView({ manager, onLogout }: ManagerViewProps) {
  const [overview, setOverview] = useState<BankOverview | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientOverview, setClientOverview] = useState<ClientOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBankOverview(manager.id), getAllClients(manager.id)])
      .then(([ov, cl]) => {
        setOverview(ov);
        setClients(cl.filter((c) => c.role === "CLIENT"));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error cargando datos"));
  }, [manager.id]);

  useEffect(() => {
    if (selectedClientId === null) {
      setClientOverview(null);
      return;
    }
    getClientOverview(manager.id, selectedClientId)
      .then(setClientOverview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error cargando cliente"));
  }, [manager.id, selectedClientId]);

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <h1>BankIn · Panel de Gerente</h1>
          <p className="subtitle">{manager.name}</p>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>
          Cambiar de usuario
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {overview && (
        <section className="stat-grid">
          <div className="stat-tile">
            <span className="stat-value">{overview.total_clients}</span>
            <span className="stat-label">Clientes</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{overview.total_cards}</span>
            <span className="stat-label">Tarjetas</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">${formatMoney(overview.total_balance_in_active_cards)}</span>
            <span className="stat-label">Balance en tarjetas activas</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{overview.total_transactions}</span>
            <span className="stat-label">Transacciones</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">${formatMoney(overview.total_recharged_amount)}</span>
            <span className="stat-label">Total recargado</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">${formatMoney(overview.total_purchased_amount)}</span>
            <span className="stat-label">Total comprado</span>
          </div>
        </section>
      )}

      <div className="layout-two-col">
        <section className="panel">
          <h2>Clientes</h2>
          <ul className="client-list">
            {clients.map((client) => (
              <li key={client.id}>
                <button
                  className={`client-list-item ${client.id === selectedClientId ? "selected" : ""}`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <span className="client-list-item-name">{client.name}</span>
                  <span className="muted small">@{client.username}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          {!clientOverview && <p className="muted">Selecciona un cliente para ver su detalle.</p>}

          {clientOverview && (
            <>
              <h2>{clientOverview.client.name}</h2>
              <p className="muted small">
                @{clientOverview.client.username} · producto #{clientOverview.client.product_id}
              </p>

              <h3>Tarjetas ({clientOverview.cards.length})</h3>
              {clientOverview.cards.length === 0 && (
                <p className="muted small">No tiene tarjetas.</p>
              )}
              <table className="table">
                <thead>
                  <tr>
                    <th>Tarjeta</th>
                    <th>Estado</th>
                    <th>Balance</th>
                    <th>Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {clientOverview.cards.map((card) => (
                    <tr key={card.card_id}>
                      <td className="mono">{maskCardId(card.card_id)}</td>
                      <td>
                        <span className={`badge badge-status-${card.status.toLowerCase()}`}>
                          {CARD_STATUS_LABEL[card.status]}
                        </span>
                      </td>
                      <td>${formatMoney(card.balance)}</td>
                      <td>{card.date_expires}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>Transacciones ({clientOverview.transactions.length})</h3>
              {clientOverview.transactions.length === 0 && (
                <p className="muted small">Sin movimientos.</p>
              )}
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tarjeta</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientOverview.transactions
                    .sort((a, b) => b.id - a.id)
                    .map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.created_at)}</td>
                        <td className="mono">{maskCardId(tx.card_id)}</td>
                        <td>{tx.type === "PURCHASE" ? "Compra" : "Recarga"}</td>
                        <td>${formatMoney(tx.amount)}</td>
                        <td>
                          <span className={`badge badge-tx-${tx.status.toLowerCase()}`}>
                            {tx.status === "COMPLETED" ? "Completada" : "Anulada"}
                          </span>
                        </td>
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
