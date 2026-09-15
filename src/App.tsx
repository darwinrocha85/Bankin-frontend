import { useState } from "react";
import { API_BASE_URL } from "./api";
import { ClientView } from "./components/ClientView";
import { Login } from "./components/Login";
import { ManagerView } from "./components/ManagerView";
import type { Client } from "./types";
import "./App.css";

// import.meta.env.MODE es "development" con "npm run dev" y "production"
// con "npm run build" (lo que usa "firebase deploy") -- lo pone Vite solo,
// no hace falta configurarlo.
const IS_PROD = import.meta.env.MODE === "production";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Client | null>(null);

  return (
    <>
      {!currentUser && <Login onLogin={setCurrentUser} />}
      {currentUser?.role === "MANAGER" && (
        <ManagerView manager={currentUser} onLogout={() => setCurrentUser(null)} />
      )}
      {currentUser && currentUser.role !== "MANAGER" && (
        <ClientView client={currentUser} onLogout={() => setCurrentUser(null)} />
      )}

      <footer className="env-badge">
        {IS_PROD ? "Producción" : "Local"} · API: {API_BASE_URL}
      </footer>
    </>
  );
}
