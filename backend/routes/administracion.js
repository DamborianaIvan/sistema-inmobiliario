import express from "express";
import Configuracion from "../models/Configuracion.js";
import Propiedad from "../models/Propiedad.js";
import AuditLog from "../models/AuditLog.js";
import { protect, requirePermission } from "../middleware/auth.js";
import { asyncHandler as h } from "../middleware/asyncHandler.js";
import { campos, urlHttps, version } from "../utils/inmuebles.js";
import { texto } from "../utils/validaciones.js";
import { transaccion } from "../utils/transaccion.js";
import { registrarAuditoria } from "../services/auditoriaService.js";
import { ApiError } from "../utils/apiError.js";
import { paginacion, cabecerasPagina } from "../utils/paginacion.js";
const router = express.Router();
router.use(protect);
router.get(
  "/resumen",
  requirePermission("CATALOG_READ"),
  h(async (req, res) => {
    const estados = await Propiedad.aggregate([
      { $group: { _id: "$estado", cantidad: { $sum: 1 } } },
    ]);
    res.json({ total: estados.reduce((n, x) => n + x.cantidad, 0), estados });
  }),
);
router.get(
  "/configuracion",
  h(async (req, res) =>
    res.json(
      (await Configuracion.findById("general")) ?? {
        nombre: "Mi inmobiliaria",
        __v: 0,
      },
    ),
  ),
);
router.put(
  "/configuracion",
  requirePermission("SETTINGS_MANAGE"),
  h(async (req, res) => {
    campos(req.body, [
      "nombre",
      "telefono",
      "email",
      "direccion",
      "logoUrl",
      "__v",
    ]);
    const datos = {};
    for (const campo of ["nombre", "telefono", "email", "direccion"])
      datos[campo] = texto(req.body[campo] ?? "", campo, {
        min: campo === "nombre" ? 1 : 0,
        max: 254,
      });
    if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email))
      throw new ApiError(400, "Email inválido");
    datos.logoUrl = req.body.logoUrl ? urlHttps(req.body.logoUrl) : "";
    const revision = version(req.body.__v);
    const resultado = await transaccion(async (session) => {
      let doc = await Configuracion.findById("general").session(session);
      const antes = doc?.toObject() ?? null;
      if ((doc?.__v ?? 0) !== revision)
        throw new ApiError(
          409,
          "La configuración cambió. Actualizá antes de guardar",
        );
      if (!doc) {
        [doc] = await Configuracion.create([{ _id: "general", ...datos }], {
          session,
        });
      } else {
        doc.set(datos);
        await doc.save({ session });
      }
      await registrarAuditoria(
        {
          accion: "CONFIGURACION_ACTUALIZADA",
          entidad: "CONFIGURACION",
          usuario: req.usuario,
          antes,
          despues: doc.toObject(),
        },
        { session },
      );
      return doc;
    });
    res.json(resultado);
  }),
);
router.get(
  "/auditoria",
  requirePermission("AUDIT_READ"),
  h(async (req, res) => {
    const pagina = paginacion(req.query, 20);
    const [datos, total] = await Promise.all([
      AuditLog.find()
        .sort({ fecha: -1, _id: -1 })
        .skip(pagina.skip)
        .limit(pagina.limit),
      AuditLog.countDocuments(),
    ]);
    cabecerasPagina(res, pagina, total);
    res.json(datos);
  }),
);
export default router;
