import { useState, type FormEvent } from "react";
import { api } from "../api";
import { type Item } from "../domain";
import Modal from "./Modal";
export default function PasswordEditor({
  item,
  close,
  saved,
}: {
  item: Item;
  close: () => void;
  saved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmacion")) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/usuarios/${item._id}/password`, "PATCH", {
        password: data.get("password"),
      });
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Contraseña de ${item.nombre}`}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Nueva contraseña
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </label>
          <label>
            Repetir contraseña
            <input
              name="confirmacion"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </label>
        </div>
        <p>El cambio cerrará las sesiones abiertas de este usuario.</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-footer">
          <button type="button" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
