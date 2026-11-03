import { useEffect, useState } from "react";
import { api } from "../api";
import { estados, label } from "../domain";

export default function Summary({ onCatalog }: { onCatalog: () => void }) {
  const [data, setData] = useState<{
    total: number;
    estados: { _id: string; cantidad: number }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/resumen")
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p role="status">Cargando resumen…</p>;
  return (
    <>
      <section className="intro">
        <div>
          <h2>Una mirada a tu cartera</h2>
          <p>Consultá la disponibilidad y encontrá tu próxima operación.</p>
        </div>
        <button className="primary" onClick={onCatalog}>
          Ver propiedades →
        </button>
      </section>
      <div className="stats">
        <article>
          <span>Total de propiedades</span>
          <strong>{data.total}</strong>
        </article>
        {estados.map((x) => (
          <article key={x}>
            <span>{label(x)}</span>
            <strong>
              {data.estados.find((y) => y._id === x)?.cantidad ?? 0}
            </strong>
          </article>
        ))}
      </div>
      {data.total === 0 && (
        <div className="empty">
          <h2>Empezá por tu primera propiedad</h2>
          <p>Cargá al propietario y después completá la ficha del inmueble.</p>
          <button onClick={onCatalog}>Abrir catálogo</button>
        </div>
      )}
    </>
  );
}
