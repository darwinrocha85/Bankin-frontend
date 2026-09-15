import { useEffect, useState } from "react";
import {
  ApiError,
  annulTransaction,
  getAllCards,
  getAllClients,
  getAllTransactions,
  getBankOverview,
  getClientOverview,
} from "../api";
import type { BankOverview, Card, Client, ClientOverview, Transaction } from "../types";
import { CARD_STATUS_LABEL, formatDate, formatMoney } from "../utils";
import { CardIdText } from "./CardId";

interface ManagerViewProps {
  manager: Client;
  onLogout: () => void;
}

type DetailPanel =
  | { kind: "clients" }
  | { kind: "cards"; filter?: "ACTIVE" }
  | { kind: "transactions"; filter?: "PURCHASE" | "RECHARGE" };

function panelTitle(panel: DetailPanel): string {
  if (panel.kind === "clients") return "Todos los clientes";
  if (panel.kind === "cards") return panel.filter === "ACTIVE" ? "Tarjetas activas" : "Todas las tarjetas";
  if (panel.filter === "PURCHASE") return "Transacciones · Compras";
  if (panel.filter === "RECHARGE") return "Transacciones · Recargas";
  return "Todas las transacciones";
}

export function ManagerView({ manager, onLogout }: ManagerViewProps) {
  const [overview, setOverview] = useState<BankOverview | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [allClientsById, setAllClientsById] = useState<Map<number, Client>>(new Map());
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientOverview, setClientOverview] = useState<ClientOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);
  const [allCards, setAllCards] = useState<Card[] | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[] | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [busyTxId, setBusyTxId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getBankOverview(manager.id), getAllClients(manager.id)])
      .then(([ov, cl]) => {
        setOverview(ov);
        setClients(cl.filter((c) => c.role === "CLIENT"));
        setAllClientsById(new Map(cl.map((c) => [c.id, c])));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error cargando datos"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function ownerNameForCard(cardId: string): string {
    const card = (allCards ?? []).find((c) => c.card_id === cardId);
    if (!card) return "—";
    return allClientsById.get(card.client_id)?.name ?? `#${card.client_id}`;
  }

  async function openPanel(panel: DetailPanel) {
    setDetailPanel(panel);
    setPanelError(null);
    setPanelLoading(true);
    try {
      if (panel.kind === "cards" && allCards === null) {
        setAllCards(await getAllCards(manager.id));
      }
      if (panel.kind === "transactions") {
        const needCards = allCards === null;
        const [cards, txs] = await Promise.all([
          needCards ? getAllCards(manager.id) : Promise.resolve(allCards!),
          allTransactions === null ? getAllTransactions(manager.id) : Promise.resolve(allTransactions),
        ]);
        if (needCards) setAllCards(cards);
        if (allTransactions === null) setAllTransactions(txs);
      }
    } catch (err) {
      setPanelError(err instanceof ApiError ? err.message : "Error cargando el detalle");
    } finally {
      setPanelLoading(false);
    }
  }

  async function refreshAfterAnnul() {
    const tasks: Promise<unknown>[] = [getBankOverview(manager.id).then(setOverview)];
    tasks.push(getAllCards(manager.id).then(setAllCards));
    if (allTransactions !== null) tasks.push(getAllTransactions(manager.id).then(setAllTransactions));
    if (selectedClientId !== null) {
      tasks.push(getClientOverview(manager.id, selectedClientId).then(setClientOverview));
    }
    await Promise.all(tasks);
  }

  async function handleAnul(transactionId: number) {
    setActionError(null);
    setBusyTxId(transactionId);
    try {
      await annulTransaction(transactionId, manager.id);
      await refreshAfterAnnul();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Error anulando la transacción");
    } finally {
      setBusyTxId(null);
    }
  }

  function AnulButton({ tx }: { tx: Transaction }) {
    if (tx.status !== "COMPLETED") return null;
    return (
      <button
        className="btn btn-danger small"
        disabled={busyTxId === tx.id}
        onClick={() => handleAnul(tx.id)}
      >
        {busyTxId === tx.id ? "Anulando..." : "Anular"}
      </button>
    );
  }

  const visibleCards =
    detailPanel?.kind === "cards" && detailPanel.filter === "ACTIVE"
      ? (allCards ?? []).filter((c) => c.status === "ACTIVE")
      : allCards ?? [];

  const visibleTransactions =
    detailPanel?.kind === "transactions" && detailPanel.filter
      ? (allTransactions ?? []).filter((t) => t.type === detailPanel.filter)
      : allTransactions ?? [];

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
      {actionError && <div className="alert alert-error">{actionError}</div>}

      {overview && (
        <section className="stat-grid">
          <button className="stat-tile" onClick={() => openPanel({ kind: "clients" })}>
            <span className="stat-value">{overview.total_clients}</span>
            <span className="stat-label">Clientes</span>
          </button>
          <button className="stat-tile" onClick={() => openPanel({ kind: "cards" })}>
            <span className="stat-value">{overview.total_cards}</span>
            <span className="stat-label">Tarjetas</span>
          </button>
          <button className="stat-tile" onClick={() => openPanel({ kind: "cards", filter: "ACTIVE" })}>
            <span className="stat-value">${formatMoney(overview.total_balance_in_active_cards)}</span>
            <span className="stat-label">Balance en tarjetas activas</span>
          </button>
          <button className="stat-tile" onClick={() => openPanel({ kind: "transactions" })}>
            <span className="stat-value">{overview.total_transactions}</span>
            <span className="stat-label">Transacciones</span>
          </button>
          <button
            className="stat-tile"
            onClick={() => openPanel({ kind: "transactions", filter: "RECHARGE" })}
          >
            <span className="stat-value">${formatMoney(overview.total_recharged_amount)}</span>
            <span className="stat-label">Total recargado</span>
          </button>
          <button
            className="stat-tile"
            onClick={() => openPanel({ kind: "transactions", filter: "PURCHASE" })}
          >
            <span className="stat-value">${formatMoney(overview.total_purchased_amount)}</span>
            <span className="stat-label">Total comprado</span>
          </button>
        </section>
      )}

      {detailPanel && (
        <section className="panel detail-panel">
          <div className="panel-header">
            <h2>{panelTitle(detailPanel)}</h2>
            <button className="btn btn-ghost" onClick={() => setDetailPanel(null)}>
              Cerrar
            </button>
          </div>

          {panelLoading && <p className="muted">Cargando...</p>}
          {panelError && <div className="alert alert-error">{panelError}</div>}

          {!panelLoading && detailPanel.kind === "clients" && (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Producto</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(allClientsById.values()).map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>@{c.username}</td>
                    <td>#{c.product_id}</td>
                    <td>
                      <span className={`badge badge-role-${c.role.toLowerCase()}`}>
                        {c.role === "MANAGER" ? "Gerente" : "Cliente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!panelLoading && detailPanel.kind === "cards" && (
            <>
              {visibleCards.length === 0 && <p className="muted small">No hay tarjetas.</p>}
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tarjeta</th>
                    <th>Estado</th>
                    <th>Balance</th>
                    <th>Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCards.map((card) => (
                    <tr key={card.card_id}>
                      <td>{allClientsById.get(card.client_id)?.name ?? `#${card.client_id}`}</td>
                      <td>
                        <CardIdText cardId={card.card_id} />
                      </td>
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
            </>
          )}

          {!panelLoading && detailPanel.kind === "transactions" && (
            <>
              {visibleTransactions.length === 0 && <p className="muted small">Sin movimientos.</p>}
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Tarjeta</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Origen</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.created_at)}</td>
                        <td>{ownerNameForCard(tx.card_id)}</td>
                        <td>
                          <CardIdText cardId={tx.card_id} />
                        </td>
                        <td>{tx.type === "PURCHASE" ? "Compra" : "Recarga"}</td>
                        <td>${formatMoney(tx.amount)}</td>
                        <td>
                          <span className={`badge badge-tx-${tx.status.toLowerCase()}`}>
                            {tx.status === "COMPLETED" ? "Completada" : "Anulada"}
                          </span>
                        </td>
                        <td className="muted small">{tx.note ?? "—"}</td>
                        <td>
                          <AnulButton tx={tx} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
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
                      <td>
                        <CardIdText cardId={card.card_id} />
                      </td>
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
                    <th>Origen</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clientOverview.transactions
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.created_at)}</td>
                        <td>
                          <CardIdText cardId={tx.card_id} />
                        </td>
                        <td>{tx.type === "PURCHASE" ? "Compra" : "Recarga"}</td>
                        <td>${formatMoney(tx.amount)}</td>
                        <td>
                          <span className={`badge badge-tx-${tx.status.toLowerCase()}`}>
                            {tx.status === "COMPLETED" ? "Completada" : "Anulada"}
                          </span>
                        </td>
                        <td className="muted small">{tx.note ?? "—"}</td>
                        <td>
                          <AnulButton tx={tx} />
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
