import mongoose from "mongoose";
import { ApiError } from "./apiError.js";
import { texto, numero } from "./validaciones.js";
import {
  TIPOS,
  OPERACIONES,
  ESTADOS,
  MONEDAS,
} from "../constants/inmuebles.js";

export const objeto = (valor, campo) => {
  if (!valor || typeof valor !== "object" || Array.isArray(valor))
    throw new ApiError(400, `${campo} debe ser un objeto`);
  return valor;
};
export const campos = (valor, permitidos) => {
  objeto(valor, "datos");
  if (Object.keys(valor).some((k) => !permitidos.includes(k)))
    throw new ApiError(400, "Hay campos desconocidos en la solicitud");
};
export const opcion = (valor, opciones, campo) => {
  if (!opciones.includes(valor)) throw new ApiError(400, `${campo} inválido`);
  return valor;
};
export const idValido = (valor) => {
  if (typeof valor !== "string" || !mongoose.isObjectIdOrHexString(valor))
    throw new ApiError(400, "Identificador inválido");
  return valor;
};
export const version = (valor) =>
  numero(valor, "__v", { entero: true, max: Number.MAX_SAFE_INTEGER });
export const urlHttps = (valor) => {
  const cadena = texto(valor, "URL", { max: 2048, min: 1 });
  try {
    const url = new URL(cadena);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error();
    return url.href;
  } catch {
    throw new ApiError(400, "Las imágenes deben tener una URL HTTPS válida");
  }
};
const importe = (valor, campo) => {
  campos(valor, ["monto", "moneda"]);
  return {
    monto: numero(valor.monto, campo, { min: 0.01, max: 1000000000000 }),
    moneda: opcion(valor.moneda, MONEDAS, "moneda"),
  };
};
export const validarPropiedad = (datos) => {
  campos(datos, [
    "titulo",
    "tipo",
    "operaciones",
    "estado",
    "propietario",
    "direccion",
    "localidad",
    "provincia",
    "descripcion",
    "notasInternas",
    "dormitorios",
    "banos",
    "superficieTotal",
    "superficieCubierta",
    "precioVenta",
    "precioAlquiler",
    "fotos",
  ]);
  const resultado = {};
  for (const campo of ["titulo", "direccion", "localidad", "provincia"])
    resultado[campo] = texto(datos[campo], campo, { min: 1, max: 200 });
  for (const campo of ["descripcion", "notasInternas"])
    resultado[campo] = texto(datos[campo] ?? "", campo, { max: 5000 });
  resultado.tipo = opcion(datos.tipo, TIPOS, "tipo");
  resultado.estado = opcion(datos.estado, ESTADOS, "estado");
  if (
    !Array.isArray(datos.operaciones) ||
    !datos.operaciones.length ||
    datos.operaciones.length > 2 ||
    new Set(datos.operaciones).size !== datos.operaciones.length
  )
    throw new ApiError(400, "Seleccioná venta, alquiler o ambas operaciones");
  resultado.operaciones = datos.operaciones.map((x) =>
    opcion(x, OPERACIONES, "operación"),
  );
  resultado.propietario = idValido(datos.propietario);
  for (const [operacion, campo] of [
    ["VENTA", "precioVenta"],
    ["ALQUILER", "precioAlquiler"],
  ]) {
    resultado[campo] = resultado.operaciones.includes(operacion)
      ? importe(datos[campo], campo)
      : null;
  }
  if (
    resultado.estado === "VENDIDA" &&
    !resultado.operaciones.includes("VENTA")
  )
    throw new ApiError(
      400,
      "Una propiedad sin venta no puede marcarse vendida",
    );
  if (
    resultado.estado === "ALQUILADA" &&
    !resultado.operaciones.includes("ALQUILER")
  )
    throw new ApiError(
      400,
      "Una propiedad sin alquiler no puede marcarse alquilada",
    );
  for (const campo of ["dormitorios", "banos"])
    resultado[campo] = numero(datos[campo] ?? 0, campo, {
      entero: true,
      max: 100,
    });
  for (const campo of ["superficieTotal", "superficieCubierta"])
    resultado[campo] =
      datos[campo] == null || datos[campo] === ""
        ? null
        : numero(datos[campo], campo, { max: 100000000 });
  if (
    resultado.superficieTotal !== null &&
    resultado.superficieCubierta !== null &&
    resultado.superficieCubierta > resultado.superficieTotal
  )
    throw new ApiError(400, "La superficie cubierta no puede superar la total");
  if (!Array.isArray(datos.fotos ?? []) || (datos.fotos ?? []).length > 20)
    throw new ApiError(400, "Se permiten hasta 20 fotos");
  resultado.fotos = (datos.fotos ?? []).map(urlHttps);
  return resultado;
};
export const validarPropietario = (datos) => {
  campos(datos, ["nombre", "telefono", "email", "notas", "activo"]);
  const resultado = {
    nombre: texto(datos.nombre, "nombre", { min: 1, max: 150 }),
    telefono: texto(datos.telefono, "telefono", { min: 1, max: 50 }),
    email: texto(datos.email ?? "", "email", { max: 254 }).toLowerCase(),
    notas: texto(datos.notas ?? "", "notas", { max: 3000 }),
    activo: datos.activo ?? true,
  };
  if (resultado.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resultado.email))
    throw new ApiError(400, "Email inválido");
  if (typeof resultado.activo !== "boolean")
    throw new ApiError(400, "activo debe ser booleano");
  return resultado;
};
export const filtroTexto = (valor) =>
  new RegExp(
    texto(valor, "búsqueda", { max: 100 }).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    ),
    "i",
  );
