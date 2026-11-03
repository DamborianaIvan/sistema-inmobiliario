import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
process.env.JWT_SECRET = "test-secret-for-auth-middleware-32-chars-min";
const { default: app } = await import("../server.js");
test("la API protege recursos y rechaza cuerpos inválidos sin consultar la base", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const path of [
      "/propiedades",
      "/propietarios",
      "/usuarios",
      "/resumen",
      "/auditoria",
      "/configuracion",
    ]) {
      await t.test(`${path} requiere sesión`, async () =>
        assert.equal((await fetch(url + path)).status, 401),
      );
    }
    await t.test("rechaza JSON mal formado", async () =>
      assert.equal(
        (
          await fetch(url + "/propiedades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          })
        ).status,
        400,
      ),
    );
    await t.test("rechaza arrays como cuerpo de solicitud", async () =>
      assert.equal(
        (
          await fetch(url + "/propiedades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "[]",
          })
        ).status,
        400,
      ),
    );
    await t.test("limita el tamaño del cuerpo", async () =>
      assert.equal(
        (
          await fetch(url + "/propiedades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: "a".repeat(1100000) }),
          })
        ).status,
        413,
      ),
    );
    await t.test(
      "no expone framework y fija cabeceras de seguridad",
      async () => {
        const r = await fetch(url + "/health");
        assert.equal(r.headers.get("x-powered-by"), null);
        assert.equal(r.headers.get("x-frame-options"), "DENY");
        assert.equal(r.status, 503);
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
