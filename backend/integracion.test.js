import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

test(
  "circuito real: instalación, permisos, catálogo, concurrencia, auditoría y revocación",
  { skip: process.env.RUN_INTEGRATION !== "1", timeout: 180000 },
  async () => {
    const { MongoMemoryReplSet } = await import("mongodb-memory-server");
    const db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.JWT_SECRET = "test-secret-for-auth-middleware-32-chars-min";
    process.env.MONGODB_URI = db.getUri("inmobiliaria_test");
    const mongoose = (await import("mongoose")).default;
    const { config } = await import("./config.js");
    // Otro test puede haber importado config; esta prueba debe ejecutarse en su propio proceso.
    assert.equal(config.mongoUri, process.env.MONGODB_URI);
    const { default: app } = await import("./server.js");
    const { crearAdmin } = await import("./scripts/crearAdmin.js");
    let server;
    try {
      await mongoose.connect(config.mongoUri);
      await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
      await crearAdmin({
        nombre: "Admin QA",
        nombreUsuario: "admin",
        email: "admin@example.test",
        password: "ClaveQA1234",
      });
      await assert.rejects(() =>
        crearAdmin({
          nombre: "Intruso",
          nombreUsuario: "otro",
          email: "otro@example.test",
          password: "ClaveQA1234",
        }),
      );
      server = app.listen(0, "127.0.0.1");
      await once(server, "listening");
      const url = `http://127.0.0.1:${server.address().port}/api`;
      const call = async (
        path,
        method = "GET",
        body,
        token,
        expected = 200,
      ) => {
        const res = await fetch(url + path, {
          method,
          headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = res.status === 204 ? null : await res.json();
        assert.equal(
          res.status,
          expected,
          `${method} ${path}: ${JSON.stringify(data)}`,
        );
        return data;
      };
      const admin = await call("/auth/login", "POST", {
        nombreUsuario: "admin",
        password: "ClaveQA1234",
      });
      const token = admin.token;
      await call("/propiedades", "GET", undefined, undefined, 401);
      await call("/auth/register", "POST", {}, undefined, 401);
      const empleado = await call(
        "/usuarios",
        "POST",
        {
          nombre: "Empleado",
          nombreUsuario: "empleado",
          email: "empleado@example.test",
          password: "ClaveQA1234",
          rol: "EMPLEADO",
        },
        token,
        201,
      );
      const sesionEmpleado = await call("/auth/login", "POST", {
        nombreUsuario: "empleado",
        password: "ClaveQA1234",
      });
      for (const ruta of ["/usuarios", "/auditoria"])
        await call(ruta, "GET", undefined, sesionEmpleado.token, 403);
      await call(
        "/configuracion",
        "PUT",
        { nombre: "Intento", __v: 0 },
        sesionEmpleado.token,
        403,
      );
      const owner = await call(
        "/propietarios",
        "POST",
        { nombre: "Propietaria QA", telefono: "2266 123456" },
        sesionEmpleado.token,
        201,
      );
      const ficha = {
        titulo: "Casa QA",
        tipo: "CASA",
        operaciones: ["VENTA", "ALQUILER"],
        precioVenta: { monto: 80000, moneda: "USD" },
        precioAlquiler: { monto: 400000, moneda: "ARS" },
        estado: "DISPONIBLE",
        propietario: owner._id,
        direccion: "Calle 1",
        localidad: "Balcarce",
        provincia: "Buenos Aires",
      };
      const propiedades = await Promise.all(
        Array.from({ length: 4 }, () =>
          call("/propiedades", "POST", ficha, token, 201),
        ),
      );
      assert.equal(new Set(propiedades.map((p) => p.referencia)).size, 4);
      assert.ok(propiedades.every((p) => /^INM-\d{6}$/.test(p.referencia)));
      let p = propiedades[0];
      p = await call(
        `/propiedades/${p._id}`,
        "PUT",
        { ...ficha, __v: p.__v, estado: "RESERVADA" },
        token,
      );
      await call(
        `/propiedades/${p._id}`,
        "PUT",
        { ...ficha, __v: 0 },
        token,
        409,
      );
      const o = await call(
        `/propietarios/${owner._id}`,
        "GET",
        undefined,
        token,
      );
      await call(
        `/propietarios/${owner._id}`,
        "PUT",
        { nombre: o.nombre, telefono: o.telefono, activo: false, __v: o.__v },
        token,
        409,
      );
      const encontrados = await call(
        "/propiedades?q=Casa&operacion=ALQUILER&estado=RESERVADA",
        "GET",
        undefined,
        token,
      );
      assert.equal(encontrados.length, 1);
      await call("/propiedades?q%5B%24ne%5D=x", "GET", undefined, token, 400);
      await call(
        `/propiedades/${p._id}`,
        "PUT",
        { ...ficha, __v: p.__v, precioVenta: { monto: -1, moneda: "USD" } },
        token,
        400,
      );
      const resumen = await call("/resumen", "GET", undefined, token);
      assert.equal(resumen.total, 4);
      await call(
        "/configuracion",
        "PUT",
        { nombre: "Inmobiliaria QA", __v: 0 },
        token,
      );
      const logs = await call("/auditoria", "GET", undefined, token);
      assert.ok(logs.some((x) => x.accion === "PROPIEDAD_CREADA"));
      assert.ok(!JSON.stringify(logs).includes("ClaveQA"));
      await call(
        `/usuarios/${empleado._id}/password`,
        "PATCH",
        { password: "OtraClaveQA123" },
        token,
      );
      await call("/auth/me", "GET", undefined, sesionEmpleado.token, 401);
      await call(
        `/usuarios/${admin.id}/estado`,
        "PATCH",
        { activo: false },
        token,
        403,
      );
      await call("/auth/logout", "POST", undefined, token, 204);
      await call("/auth/me", "GET", undefined, token, 401);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await db.stop();
    }
  },
);
