import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../constants/permissions.js";
import Usuario from "../models/Usuario.js";
import SesionRevocada from "../models/SesionRevocada.js";
import jwt from "jsonwebtoken";
process.env.JWT_SECRET = "test-secret-for-auth-middleware-32-chars-min";
const { protect } = await import("./auth.js");
const { config } = await import("../config.js");
test("empleados gestionan catálogo sin acceso a usuarios, auditoría ni configuración", () => {
  assert.equal(hasPermission("EMPLEADO", "CATALOG_WRITE"), true);
  for (const p of ["USERS_MANAGE", "SETTINGS_MANAGE", "AUDIT_READ"])
    assert.equal(hasPermission("EMPLEADO", p), false);
  assert.equal(hasPermission("ADMIN", "DESCONOCIDO"), false);
  assert.equal(hasPermission("CHEF", "CATALOG_READ"), false);
});
test("logout y cambio de versión invalidan JWT firmados correctamente", async () => {
  const find = Usuario.findById;
  const exists = SesionRevocada.exists;
  try {
    for (const [sv, revoked] of [
      [1, false],
      [0, true],
    ]) {
      Usuario.findById = async () => ({
        _id: "000000000000000000000001",
        activo: true,
        versionSesion: sv,
        rol: "EMPLEADO",
      });
      SesionRevocada.exists = async () => revoked;
      const token = jwt.sign(
        { id: "000000000000000000000001", sv: 0 },
        config.jwtSecret,
        { expiresIn: "1h" },
      );
      let error;
      await protect(
        { headers: { authorization: `Bearer ${token}` } },
        {},
        (e) => {
          error = e;
        },
      );
      assert.equal(error.statusCode, 401);
      assert.equal(error.details.reason, "REVOKED_SESSION");
    }
  } finally {
    Usuario.findById = find;
    SesionRevocada.exists = exists;
  }
});
