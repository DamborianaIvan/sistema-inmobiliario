import test from "node:test";
import assert from "node:assert/strict";
import {
  validarPropiedad,
  validarPropietario,
  filtroTexto,
} from "./inmuebles.js";
const base = () => ({
  titulo: "Casa centro",
  tipo: "CASA",
  estado: "DISPONIBLE",
  operaciones: ["VENTA"],
  precioVenta: { monto: 90000, moneda: "USD" },
  propietario: "000000000000000000000001",
  direccion: "Calle 1",
  localidad: "Balcarce",
  provincia: "Buenos Aires",
});
test("venta y alquiler conservan precios y monedas independientes", () => {
  const p = validarPropiedad({
    ...base(),
    operaciones: ["VENTA", "ALQUILER"],
    precioAlquiler: { monto: 400000, moneda: "ARS" },
  });
  assert.equal(p.precioVenta.moneda, "USD");
  assert.equal(p.precioAlquiler.monto, 400000);
});
test("la referencia la genera el servidor y se rechazan objetos como IDs", () => {
  assert.throws(() => validarPropiedad({ ...base(), referencia: "INM-1" }));
  assert.throws(() =>
    validarPropiedad({ ...base(), propietario: { $ne: null } }),
  );
});
test("validaciones inmobiliarias rechazan estados y medidas incompatibles", () => {
  for (const extra of [
    { estado: "ALQUILADA" },
    { superficieTotal: 50, superficieCubierta: 60 },
    { dormitorios: 1.5 },
    { operaciones: ["VENTA", "VENTA"] },
    { precioVenta: { monto: -1, moneda: "USD" } },
    { precioVenta: { monto: 1, moneda: "EUR" } },
  ])
    assert.throws(() => validarPropiedad({ ...base(), ...extra }));
});
test("fotos solo HTTPS y cantidad acotada; no se aceptan campos adicionales", () => {
  for (const fotos of [
    ["javascript:alert(1)"],
    ["http://a.com/a.jpg"],
    ["https://user:pass@a.com/a"],
    Array(21).fill("https://a.com/a.jpg"),
  ])
    assert.throws(() => validarPropiedad({ ...base(), fotos }));
  assert.equal(
    validarPropiedad({ ...base(), fotos: ["https://a.com/a.jpg"] }).fotos
      .length,
    1,
  );
});
test("las búsquedas interpretan texto literal, no expresiones regulares", () => {
  assert.equal(filtroTexto(".*").test("Casa"), false);
  assert.equal(filtroTexto(".*").test("Casa .*"), true);
  assert.throws(() => filtroTexto({ $ne: null }));
});
test("propietarios requieren contacto y estado booleano", () => {
  assert.throws(() => validarPropietario({ nombre: "Ana", telefono: "" }));
  assert.throws(() =>
    validarPropietario({ nombre: "Ana", telefono: "123", activo: "false" }),
  );
});
