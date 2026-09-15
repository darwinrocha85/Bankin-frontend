import { useState } from "react";
import { displayCardId } from "../utils";

interface CardIdTextProps {
  cardId: string;
}

// Bloque autocontenido: número de tarjeta arriba (enmascarado por defecto) y,
// debajo, dos íconos pequeños -- uno para mostrar/ocultar ese número y otro
// para copiarlo al portapapeles (siempre copia el número completo, esté
// visible o no). Cada tarjeta lleva su propio estado: mostrar una no muestra
// las demás.
//
// Importante: este componente renderiza <button>, así que nunca debe
// quedar anidado dentro de OTRO <button> (rompe el HTML y el navegador lo
// "arregla" reordenando el DOM, lo que se veía como un ícono gigante y mal
// alineado). Debe ir siempre como hermano de cualquier botón clicable, no
// como hijo.
export function CardIdText({ cardId }: CardIdTextProps) {
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cardId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // La API de portapapeles puede fallar (contexto no seguro, permiso
      // denegado). No hay mucho que hacer aquí salvo dejar que el usuario
      // copie el texto a mano.
    }
  }

  return (
    <div className="card-id-block">
      <span className="mono card-id-number">{displayCardId(cardId, showFull)}</span>
      <div className="card-id-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowFull((s) => !s)}
          title={showFull ? "Ocultar número" : "Mostrar número completo"}
          aria-label={showFull ? "Ocultar número" : "Mostrar número completo"}
          aria-pressed={showFull}
        >
          {showFull ? "🙈" : "👁"}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={handleCopy}
          title="Copiar número completo"
          aria-label="Copiar número de tarjeta"
        >
          {copied ? "✅" : "📋"}
        </button>
      </div>
    </div>
  );
}
