import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import {
  type Item,
  type Field,
  tipos,
  estados,
  label,
  ownerId,
} from "../domain";
import Modal from "./Modal";

export default function Editor({
  resource,
  item,
  close,
  saved,
}: {
  resource: string;
  item: Item | null;
  close: () => void;
  saved: () => void;
}) {
  const [owners, setOwners] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    if (item)
      for (const [k, x] of Object.entries(item))
        if (typeof x !== "object") v[k] = String(x ?? "");
    if (resource === "propiedades") {
      const ops = item?.operaciones as string[] | undefined;
      v.operacion = ops?.length === 2 ? "AMBAS" : (ops?.[0] ?? "VENTA");
      v.propietario = ownerId(item?.propietario) ?? "";
      v.fotos = (item?.fotos as string[] | undefined)?.join("\n") ?? "";
      for (const name of ["precioVenta", "precioAlquiler"]) {
        const p = item?.[name] as { monto: number; moneda: string } | undefined;
        v[name] = String(p?.monto ?? "");
        v[`${name}Moneda`] = p?.moneda ?? "USD";
      }
      v.tipo ||= "CASA";
      v.estado ||= "DISPONIBLE";
    }
    v.rol ||= "EMPLEADO";
    v.activo ||= "true";
    return v;
  });
  useEffect(() => {
    if (resource !== "propiedades") return;
    let active = true;
    (async () => {
      const all: Item[] = [];
      let page = 1;
      while (true) {
        const r = await api(`/propietarios?page=${page}&limit=200`);
        all.push(...r.data);
        if (!r.more) break;
        page++;
      }
      if (active) setOwners(all.filter((x) => x.activo));
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [resource]);
  let fields: Field[] =
    resource === "propiedades"
      ? [
          {
            key: "titulo",
            label: "Título",
            required: true,
            wide: true,
            max: 200,
          },
          { key: "tipo", label: "Tipo", options: tipos },
          {
            key: "operacion",
            label: "Operación",
            options: ["VENTA", "ALQUILER", "AMBAS"],
          },
          { key: "estado", label: "Disponibilidad", options: estados },
          { key: "direccion", label: "Dirección", required: true },
          { key: "localidad", label: "Localidad", required: true },
          { key: "provincia", label: "Provincia", required: true },
          {
            key: "dormitorios",
            label: "Dormitorios",
            type: "number",
            min: 0,
            max: 100,
          },
          { key: "banos", label: "Baños", type: "number", min: 0, max: 100 },
          {
            key: "superficieTotal",
            label: "Superficie total (m²)",
            type: "number",
            min: 0,
          },
          {
            key: "superficieCubierta",
            label: "Superficie cubierta (m²)",
            type: "number",
            min: 0,
          },
          ...["precioVenta", "precioAlquiler"]
            .filter(
              (x) =>
                values.operacion === "AMBAS" ||
                (x === "precioVenta"
                  ? values.operacion === "VENTA"
                  : values.operacion === "ALQUILER"),
            )
            .flatMap((x) => [
              {
                key: x,
                label:
                  x === "precioVenta" ? "Precio de venta" : "Alquiler mensual",
                required: true,
                type: "number",
                min: 0.01,
              },
              { key: `${x}Moneda`, label: "Moneda", options: ["ARS", "USD"] },
            ]),
          {
            key: "descripcion",
            label: "Descripción",
            type: "textarea",
            wide: true,
            max: 5000,
          },
          {
            key: "notasInternas",
            label: "Notas internas",
            type: "textarea",
            wide: true,
            max: 5000,
          },
          {
            key: "fotos",
            label: "Fotos: una URL HTTPS por línea (máximo 20)",
            type: "textarea",
            wide: true,
          },
        ]
      : [
          { key: "nombre", label: "Nombre", required: true },
          ...(resource === "usuarios"
            ? [
                { key: "nombreUsuario", label: "Usuario", required: true },
                { key: "email", label: "Email", type: "email", required: true },
                { key: "rol", label: "Rol", options: ["ADMIN", "EMPLEADO"] },
                ...(!item
                  ? [
                      {
                        key: "password",
                        label: "Contraseña",
                        type: "password",
                        required: true,
                      },
                    ]
                  : []),
              ]
            : [
                { key: "telefono", label: "Teléfono", required: true },
                { key: "email", label: "Email", type: "email" },
                {
                  key: "notas",
                  label: "Notas internas",
                  type: "textarea",
                  wide: true,
                  max: 3000,
                },
                { key: "activo", label: "Activo", options: ["true", "false"] },
              ]),
        ];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    let body: Record<string, unknown>;
    if (resource === "propiedades") {
      body = Object.fromEntries(
        [
          "titulo",
          "tipo",
          "estado",
          "direccion",
          "localidad",
          "provincia",
          "descripcion",
          "notasInternas",
        ].map((k) => [k, values[k] || ""]),
      );
      body.propietario = values.propietario;
      body.operaciones =
        values.operacion === "AMBAS"
          ? ["VENTA", "ALQUILER"]
          : [values.operacion];
      for (const k of ["dormitorios", "banos"]) body[k] = values[k] || 0;
      for (const k of ["superficieTotal", "superficieCubierta"])
        body[k] = values[k] || null;
      for (const k of ["precioVenta", "precioAlquiler"])
        body[k] = { monto: values[k], moneda: values[`${k}Moneda`] };
      body.fotos = (values.fotos || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
    } else {
      body = Object.fromEntries(
        fields.map((f) => [f.key, values[f.key] || ""]),
      );
      if (resource === "propietarios") body.activo = values.activo === "true";
    }
    if (item && resource !== "usuarios") body.__v = item.__v;
    try {
      await api(
        `/${resource}${item ? `/${item._id}` : ""}`,
        item ? (resource === "usuarios" ? "PATCH" : "PUT") : "POST",
        body,
      );
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${item ? "Editar" : "Agregar"} ${resource === "propiedades" ? "propiedad" : resource === "propietarios" ? "propietario" : "usuario"}`}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          {resource === "propiedades" && (
            <label className="wide">
              Propietario
              <select
                required
                value={values.propietario}
                onChange={(e) =>
                  setValues((v) => ({ ...v, propietario: e.target.value }))
                }
              >
                <option value="">
                  {owners === null
                    ? "Cargando propietarios…"
                    : owners.length
                      ? "Seleccioná un propietario"
                      : "Primero cargá un propietario"}
                </option>
                {owners?.map((x) => (
                  <option key={x._id} value={x._id}>
                    {String(x.nombre)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {fields.map((f) => (
            <label key={f.key} className={f.wide ? "wide" : ""}>
              {f.label}
              {f.options ? (
                <select
                  value={values[f.key] || f.options[0]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                >
                  {f.options.map((x) => (
                    <option key={x} value={x}>
                      {x === "true" ? "Sí" : x === "false" ? "No" : label(x)}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  value={values[f.key] || ""}
                  rows={3}
                  maxLength={f.max}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                />
              ) : (
                <input
                  type={f.type || "text"}
                  required={f.required}
                  value={values[f.key] || ""}
                  min={f.min}
                  max={f.type === "number" ? f.max : undefined}
                  maxLength={f.type !== "number" ? (f.max ?? 254) : undefined}
                  step={
                    f.key === "dormitorios" || f.key === "banos" ? "1" : "any"
                  }
                  autoComplete={
                    f.type === "password" ? "new-password" : undefined
                  }
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                />
              )}
            </label>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <button type="button" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button
            className="primary"
            disabled={busy || (resource === "propiedades" && !owners?.length)}
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
