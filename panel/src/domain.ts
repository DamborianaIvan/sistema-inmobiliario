export type Item = { _id: string; __v: number; [key: string]: unknown };
export type User = { id: string; nombre: string; rol: string };
export type Field = {
  key: string;
  label: string;
  options?: string[];
  type?: string;
  required?: boolean;
  wide?: boolean;
  min?: number;
  max?: number;
};
export const tipos = [
  "CASA",
  "DEPARTAMENTO",
  "TERRENO",
  "LOCAL",
  "OFICINA",
  "GALPON",
  "OTRO",
];
export const estados = [
  "DISPONIBLE",
  "RESERVADA",
  "VENDIDA",
  "ALQUILADA",
  "RETIRADA",
];
export const label = (x: unknown) => String(x ?? "").replaceAll("_", " ");
export const precio = (x: unknown) => {
  const p = x as { monto: number; moneda: string } | null;
  return p
    ? `${p.moneda} ${new Intl.NumberFormat("es-AR").format(p.monto)}`
    : "";
};
export const ownerId = (x: unknown) =>
  typeof x === "string" ? x : (x as Item)?._id;
