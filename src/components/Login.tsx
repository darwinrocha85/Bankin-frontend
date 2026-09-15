import { useEffect, useState } from "react";
import { API_BASE_URL, ApiError, getClients } from "../api";
import type { Client } from "../types";

interface LoginProps {
  onLogin: (client: Client) => void;
}

/**
 * No hay login real (así lo acordamos para este demo): esta pantalla lista
 * los clientes existentes y "inicia sesión" como el que elijas. Si tiene
 * role=MANAGER, App.tsx lo manda a la vista de gerente; si no, a la vista
 * de cliente.
 */
export function Login({ onLogin }: LoginProps) {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? `No se pudo conectar con el backend (${err.message}). ¿Está corriendo en ${API_BASE_URL}?`
            : `No se pudo conectar con el backend. ¿Está corriendo en ${API_BASE_URL}?`
        );
      });
  }, []);

  return (
    <div className="screen login-screen">
      <div className="login-card">
        <h1>BankIn</h1>
        <p className="subtitle">Elige con qué usuario quieres entrar</p>

        {error && <div className="alert alert-error">{error}</div>}

        {!error && clients === null && <p className="muted">Cargando clientes...</p>}

        {!error && clients !== null && clients.length === 0 && (
          <p className="muted">
            No hay clientes todavía. Corre <code>python seed_data.py</code> en el backend para
            crear datos de prueba, o crea uno desde la API.
          </p>
        )}

        <ul className="client-list">
          {clients?.map((client) => (
            <li key={client.id}>
              <button className="client-list-item" onClick={() => onLogin(client)}>
                <span className="client-list-item-name">{client.name}</span>
                <span className={`badge badge-role-${client.role.toLowerCase()}`}>
                  {client.role === "MANAGER" ? "Gerente" : "Cliente"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
