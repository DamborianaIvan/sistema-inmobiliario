import express from "express";
import Propiedad from "../models/Propiedad.js";
import Propietario from "../models/Propietario.js";
import Contador from "../models/Contador.js";
import { protect, requirePermission } from "../middleware/auth.js";
import { asyncHandler as h } from "../middleware/asyncHandler.js";
import { transaccion } from "../utils/transaccion.js";
import { registrarAuditoria } from "../services/auditoriaService.js";
import { paginacion, cabecerasPagina } from "../utils/paginacion.js";
import {
  validarPropiedad,
  validarPropietario,
  idValido,
  version,
  opcion,
  filtroTexto,
} from "../utils/inmuebles.js";
import { ESTADOS, OPERACIONES, TIPOS } from "../constants/inmuebles.js";
import { ApiError } from "../utils/apiError.js";

const router = express.Router();
router.use(protect, requirePermission("CATALOG_READ"));
for (const [ruta, Modelo, validar, entidad] of [
  ["propiedades", Propiedad, validarPropiedad, "PROPIEDAD"],
  ["propietarios", Propietario, validarPropietario, "PROPIETARIO"],
]) {
  router.get(
    `/${ruta}`,
    h(async (req, res) => {
      const pagina = paginacion(
        req.query,
        20,
        ruta === "propiedades"
          ? ["q", "estado", "tipo", "operacion", "propietario"]
          : ["q"],
      );
      const filtro = {};
      if (req.query.q !== undefined) {
        const regex = filtroTexto(req.query.q);
        filtro.$or = (
          ruta === "propiedades"
            ? ["titulo", "referencia", "direccion", "localidad"]
            : ["nombre", "telefono", "email"]
        ).map((campo) => ({ [campo]: regex }));
      }
      if (ruta === "propiedades") {
        if (req.query.estado !== undefined)
          filtro.estado = opcion(req.query.estado, ESTADOS, "estado");
        if (req.query.tipo !== undefined)
          filtro.tipo = opcion(req.query.tipo, TIPOS, "tipo");
        if (req.query.operacion !== undefined)
          filtro.operaciones = opcion(
            req.query.operacion,
            OPERACIONES,
            "operación",
          );
        if (req.query.propietario !== undefined)
          filtro.propietario = idValido(req.query.propietario);
      }
      let consulta = Modelo.find(filtro)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagina.skip)
        .limit(pagina.limit);
      if (ruta === "propiedades")
        consulta = consulta.populate("propietario", "nombre telefono");
      const [datos, total] = await Promise.all([
        consulta,
        Modelo.countDocuments(filtro),
      ]);
      cabecerasPagina(res, pagina, total);
      res.json(datos);
    }),
  );
  router.get(
    `/${ruta}/:id`,
    h(async (req, res) => {
      const documento = await Modelo.findById(idValido(req.params.id));
      if (!documento) throw new ApiError(404, "Registro no encontrado");
      res.json(documento);
    }),
  );
  const guardar = (crear) =>
    h(async (req, res) => {
      const { __v, ...entrada } = req.body;
      const datos = validar(entrada);
      if (crear && ruta === "propiedades") {
        // Asegura la existencia fuera de la transacción antes de incrementar en ella.
        try {
          await Contador.updateOne(
            { _id: "propiedades" },
            { $setOnInsert: { valor: 0 } },
            { upsert: true },
          );
        } catch (error) {
          if (error.code !== 11000) throw error;
        }
      }
      const resultado = await transaccion(async (session) => {
        // Serializa la vinculación/archivo de propietarios para evitar carreras.
        if (ruta === "propiedades") {
          const propietario = await Propietario.findOneAndUpdate(
            { _id: datos.propietario, activo: true },
            { $inc: { __v: 1 } },
            { session, new: true },
          );
          if (!propietario)
            throw new ApiError(409, "Seleccioná un propietario activo");
        }
        let documento,
          antes = null;
        if (crear) {
          if (ruta === "propiedades") {
            const contador = await Contador.findOneAndUpdate(
              { _id: "propiedades" },
              { $inc: { valor: 1 } },
              { session, upsert: true, new: true },
            );
            datos.referencia = `INM-${String(contador.valor).padStart(6, "0")}`;
          }
          [documento] = await Modelo.create([datos], { session });
        } else {
          documento = await Modelo.findById(idValido(req.params.id)).session(
            session,
          );
          if (!documento) throw new ApiError(404, "Registro no encontrado");
          if (documento.__v !== version(__v))
            throw new ApiError(
              409,
              "El registro cambió. Actualizá antes de guardar",
            );
          if (
            ruta === "propietarios" &&
            !datos.activo &&
            (await Propiedad.exists({ propietario: documento._id }).session(
              session,
            ))
          )
            throw new ApiError(
              409,
              "No se puede archivar un propietario con propiedades vinculadas",
            );
          antes = documento.toObject();
          documento.set(datos);
          await documento.save({ session });
        }
        await registrarAuditoria(
          {
            accion: `${entidad}_${crear ? (entidad === "PROPIEDAD" ? "CREADA" : "CREADO") : entidad === "PROPIEDAD" ? "ACTUALIZADA" : "ACTUALIZADO"}`,
            entidad,
            entidadId: documento._id,
            usuario: req.usuario,
            antes,
            despues: documento.toObject(),
          },
          { session },
        );
        return documento;
      });
      res.status(crear ? 201 : 200).json(resultado);
    });
  router.post(`/${ruta}`, requirePermission("CATALOG_WRITE"), guardar(true));
  router.put(
    `/${ruta}/:id`,
    requirePermission("CATALOG_WRITE"),
    guardar(false),
  );
}
export default router;
