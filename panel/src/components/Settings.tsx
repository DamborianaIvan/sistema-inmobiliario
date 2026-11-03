import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { type Item } from "../domain";

export default function Settings({
  onSave,
}: {
  onSave: (name: string, logo: string) => void;
}) {
  const [data, setData] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/configuracion")
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const body = {
        ...Object.fromEntries(new FormData(e.currentTarget)),
        __v: data?.__v,
      };
      const r = await api("/configuracion", "PUT", body);
      setData(r.data);
      onSave(r.data.nombre, r.data.logoUrl || "");
      setSuccess("Configuración guardada");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <p role="status">{error || "Cargando configuración…"}</p>;
  return (
    <form className="settings" onSubmit={submit}>
      <h2>Datos de la inmobiliaria</h2>
      <p>Personalizá la identidad de esta instalación.</p>
      {[
        ["nombre", "Nombre"],
        ["telefono", "Teléfono"],
        ["email", "Email"],
        ["direccion", "Dirección"],
        ["logoUrl", "Logo (URL HTTPS)"],
      ].map(([k, l]) => (
        <label key={k}>
          {l}
          <input
            name={k}
            defaultValue={String(data[k] || "")}
            type={k === "email" ? "email" : k === "logoUrl" ? "url" : "text"}
            required={k === "nombre"}
            maxLength={k === "logoUrl" ? 2048 : 254}
          />
        </label>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      <button className="primary" disabled={busy}>
        {busy ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
