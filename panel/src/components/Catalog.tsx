import { useEffect, useState } from "react";
import { api } from "../api";
import { type Item, tipos, estados, label, precio } from "../domain";
import Editor from "./Editor";
import PasswordEditor from "./PasswordEditor";
import Modal from "./Modal";
import AuditDetail from "./AuditDetail";

export default function Catalog({ resource }: { resource: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [operacion, setOperacion] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<Item | null | undefined>();
  const [passwordFor, setPasswordFor] = useState<Item | null>(null);
  const [detail, setDetail] = useState<Item | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setItems(null);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search && ["propiedades", "propietarios"].includes(resource))
      params.set("q", search);
    if (resource === "propiedades") {
      if (estado) params.set("estado", estado);
      if (tipo) params.set("tipo", tipo);
      if (operacion) params.set("operacion", operacion);
    }
    api(
      `/${resource}${resource === "usuarios" ? "" : `?${params}`}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((r) => {
        setItems(r.data);
        setTotal(resource === "usuarios" ? r.data.length : r.total);
        setMore(r.more);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [resource, page, search, estado, tipo, operacion, refresh]);
  const reload = () => setRefresh((x) => x + 1);
  async function userAction(item: Item, action: string) {
    if (action === "password") {
      setPasswordFor(item);
      return;
    }
    if (
      !confirm(`¿${item.activo ? "Desactivar" : "Activar"} a ${item.nombre}?`)
    )
      return;
    setError("");
    try {
      await api(`/usuarios/${item._id}/estado`, "PATCH", {
        activo: !item.activo,
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <section className="toolbar">
        <div>
          <h2>
            {resource === "propiedades"
              ? "Tu cartera de inmuebles"
              : label(resource)}
          </h2>
          <p>{total} registros</p>
        </div>
        {resource !== "auditoria" && (
          <button className="primary" onClick={() => setEditing(null)}>
            +{" "}
            {resource === "propiedades"
              ? "Nueva propiedad"
              : resource === "propietarios"
                ? "Nuevo propietario"
                : "Nuevo usuario"}
          </button>
        )}
      </section>
      {["propiedades", "propietarios"].includes(resource) && (
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q);
          }}
        >
          <input
            aria-label="Buscar"
            placeholder={
              resource === "propiedades"
                ? "Referencia, título, dirección o localidad"
                : "Nombre, teléfono o email"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={100}
          />
          <button>Buscar</button>
          {resource === "propiedades" && (
            <>
              <select
                aria-label="Estado"
                value={estado}
                onChange={(e) => {
                  setPage(1);
                  setEstado(e.target.value);
                }}
              >
                <option value="">Todos los estados</option>
                {estados.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                aria-label="Tipo"
                value={tipo}
                onChange={(e) => {
                  setPage(1);
                  setTipo(e.target.value);
                }}
              >
                <option value="">Todos los tipos</option>
                {tipos.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                aria-label="Operación"
                value={operacion}
                onChange={(e) => {
                  setPage(1);
                  setOperacion(e.target.value);
                }}
              >
                <option value="">Venta y alquiler</option>
                <option>VENTA</option>
                <option>ALQUILER</option>
              </select>
            </>
          )}
        </form>
      )}
      {error ? (
        <div className="error" role="alert">
          {error} <button onClick={reload}>Reintentar</button>
        </div>
      ) : items === null ? (
        <p role="status">Cargando {resource}…</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <h2>No hay registros para mostrar</h2>
          <p>
            {search || estado || tipo || operacion
              ? "Probá con otros filtros."
              : "Los registros que cargues aparecerán acá."}
          </p>
        </div>
      ) : (
        <div className={resource === "propiedades" ? "cards" : "rows"}>
          {items.map((item) => (
            <article
              key={item._id}
              className={resource === "propiedades" ? "property" : "row"}
            >
              {resource === "propiedades" ? (
                <>
                  {Array.isArray(item.fotos) && item.fotos[0] ? (
                    <img
                      src={String(item.fotos[0])}
                      alt={String(item.titulo)}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="photo-placeholder">Sin fotografía</div>
                  )}
                  <div className="card-body">
                    <div className="card-meta">
                      <span>{String(item.referencia)}</span>
                      <span className="badge">{label(item.estado)}</span>
                    </div>
                    <h3>{String(item.titulo)}</h3>
                    <p>
                      {label(item.tipo)} · {String(item.localidad)}
                    </p>
                    <p>{String(item.direccion)}</p>
                    {item.precioVenta ? (
                      <strong>Venta · {precio(item.precioVenta)}</strong>
                    ) : null}
                    {item.precioAlquiler ? (
                      <strong>Alquiler · {precio(item.precioAlquiler)}</strong>
                    ) : null}
                    <div className="actions">
                      <button onClick={() => setDetail(item)}>Ver ficha</button>
                      <button onClick={() => setEditing(item)}>Editar</button>
                    </div>
                  </div>
                </>
              ) : resource === "auditoria" ? (
                <>
                  <div>
                    <strong>{label(item.accion)}</strong>
                    <p>
                      {String(item.usuarioNombreSnapshot || "Sistema")} ·{" "}
                      {new Date(String(item.fecha)).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <button onClick={() => setDetail(item)}>Ver cambios</button>
                </>
              ) : (
                <>
                  <div>
                    <h3>{String(item.nombre)}</h3>
                    <p>
                      {resource === "usuarios"
                        ? `${item.nombreUsuario} · ${item.rol}`
                        : `${item.telefono} · ${item.email || ""}`}
                    </p>
                    <span className="badge">
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="actions">
                    <button onClick={() => setEditing(item)}>Editar</button>
                    {resource === "usuarios" && (
                      <>
                        <button onClick={() => userAction(item, "estado")}>
                          {item.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button onClick={() => userAction(item, "password")}>
                          Contraseña
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
      {resource !== "usuarios" && (
        <div className="pagination">
          <button
            disabled={page === 1 || items === null}
            onClick={() => setPage((x) => x - 1)}
          >
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            disabled={!more || items === null}
            onClick={() => setPage((x) => x + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
      {passwordFor && (
        <PasswordEditor
          item={passwordFor}
          close={() => setPasswordFor(null)}
          saved={() => {
            setPasswordFor(null);
            reload();
          }}
        />
      )}
      {editing !== undefined && (
        <Editor
          resource={resource}
          item={editing}
          close={() => setEditing(undefined)}
          saved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
      {detail && (
        <Modal
          title={String(detail.titulo || "Detalle de cambios")}
          close={() => setDetail(null)}
        >
          {resource === "auditoria" ? (
            <>
              <h3>Antes</h3>
              <AuditDetail value={detail.antes} />
              <h3>Después</h3>
              <AuditDetail value={detail.despues} />
            </>
          ) : (
            <>
              <p>
                <strong>{String(detail.referencia)}</strong> ·{" "}
                {label(detail.estado)}
              </p>
              <p>
                {String(detail.direccion)}, {String(detail.localidad)},{" "}
                {String(detail.provincia)}
              </p>
              <p>{String(detail.descripcion || "Sin descripción")}</p>
              <p>
                Dormitorios: {String(detail.dormitorios)} · Baños:{" "}
                {String(detail.banos)}
              </p>
              <p>
                Superficie total:{" "}
                {String(detail.superficieTotal ?? "Sin especificar")} m² ·
                Cubierta:{" "}
                {String(detail.superficieCubierta ?? "Sin especificar")} m²
              </p>
              <p>
                Propietario:{" "}
                {String((detail.propietario as Item)?.nombre ?? "")} ·{" "}
                {String((detail.propietario as Item)?.telefono ?? "")}
              </p>
              <h3>Notas internas</h3>
              <p className="multiline">
                {String(detail.notasInternas || "Sin notas")}
              </p>
              <div className="gallery">
                {(detail.fotos as string[]).map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt="Foto de la propiedad"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
