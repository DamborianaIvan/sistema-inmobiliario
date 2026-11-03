import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";
import { type User, label } from "./domain";
import Summary from "./components/Summary";
import Catalog from "./components/Catalog";
import Settings from "./components/Settings";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState("resumen");
  const [brand, setBrand] = useState("Mi inmobiliaria");
  const [logo, setLogo] = useState("");
  useEffect(() => {
    const expire = () => {
      sessionStorage.removeItem("inmobiliaria.token");
      setUser(null);
      setError("La sesión finalizó. Iniciá sesión nuevamente.");
    };
    window.addEventListener("sesion-expirada", expire);
    if (sessionStorage.getItem("inmobiliaria.token"))
      api("/auth/me")
        .then((r) => setUser(r.data))
        .catch((e) => setError(e.message))
        .finally(() => setChecking(false));
    else setChecking(false);
    return () => window.removeEventListener("sesion-expirada", expire);
  }, []);
  useEffect(() => {
    if (user)
      api("/configuracion")
        .then((r) => {
          setBrand(r.data.nombre);
          setLogo(r.data.logoUrl || "");
        })
        .catch((e) => setError(e.message));
  }, [user]);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await api("/auth/login", "POST", Object.fromEntries(form));
      sessionStorage.setItem("inmobiliaria.token", r.data.token);
      setUser(r.data);
      setPage("resumen");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("/auth/logout", "POST");
      sessionStorage.removeItem("inmobiliaria.token");
      setUser(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <main className="login">
        <p role="status">Verificando sesión…</p>
      </main>
    );
  if (!user)
    return (
      <main className="login">
        <form className="login-card" onSubmit={login}>
          <span className="eyebrow">GESTIÓN INMOBILIARIA</span>
          <h1>
            Tu cartera,
            <br />
            en un solo lugar.
          </h1>
          <p>Ingresá al espacio privado de tu inmobiliaria.</p>
          <label>
            Usuario
            <input
              name="nombreUsuario"
              required
              autoComplete="username"
              maxLength={80}
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </main>
    );
  const pages = [
    "resumen",
    "propiedades",
    "propietarios",
    ...(user.rol === "ADMIN" ? ["usuarios", "configuracion", "auditoria"] : []),
  ];
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          {logo ? (
            <img
              className="brand-logo"
              src={logo}
              alt="Logo de la inmobiliaria"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="brand-icon">⌂</span>
          )}
          <strong>{brand}</strong>
        </div>
        <span className="eyebrow">ESPACIO DE TRABAJO</span>
        <nav aria-label="Principal">
          {pages.map((x) => (
            <button
              key={x}
              className={page === x ? "active" : ""}
              onClick={() => {
                setPage(x);
                setError("");
              }}
            >
              {label(x)}
            </button>
          ))}
        </nav>
        <div className="profile">
          <strong>{user.nombre}</strong>
          <small>{label(user.rol)}</small>
          <button onClick={logout} disabled={busy}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content">
        <header>
          <div>
            <span className="eyebrow">CATÁLOGO PRIVADO</span>
            <h1>{label(page)}</h1>
          </div>
          <span className="private">● Acceso interno</span>
        </header>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {page === "resumen" ? (
          <Summary onCatalog={() => setPage("propiedades")} />
        ) : page === "configuracion" ? (
          <Settings
            onSave={(name, url) => {
              setBrand(name);
              setLogo(url);
            }}
          />
        ) : (
          <Catalog key={page} resource={page} />
        )}
      </main>
    </div>
  );
}
