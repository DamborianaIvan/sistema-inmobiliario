import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import Usuario from "../models/Usuario.js";
import SesionRevocada from "../models/SesionRevocada.js";
import { ApiError } from "../utils/apiError.js";
import { texto } from "../utils/validaciones.js";
import {
  limitarLoginIp,
  limitarLoginCuenta,
  descontarAccesoExitoso,
} from "../middleware/loginLimiter.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();
router.post(
  "/login",
  limitarLoginIp,
  (req, res, next) => {
    try {
      req.body.nombreUsuario = texto(req.body.nombreUsuario, "nombreUsuario", {
        min: 1,
        max: 80,
      });
      texto(req.body.password, "password", { min: 1, max: 1024, trim: false });
      next();
    } catch (error) {
      next(error);
    }
  },
  limitarLoginCuenta,
  asyncHandler(async (req, res) => {
    const usuario = await Usuario.findOne({
      nombreUsuario: req.body.nombreUsuario,
    }).select("+password");
    if (!usuario?.activo || !(await usuario.matchPassword(req.body.password)))
      throw new ApiError(401, "Usuario o contraseña incorrectos");
    await descontarAccesoExitoso(req.intentoAccesoId);
    const token = jwt.sign(
      { id: usuario._id, sv: usuario.versionSesion ?? 0 },
      config.jwtSecret,
      {
        expiresIn: config.jwtExpiresIn,
        algorithm: "HS256",
        jwtid: randomUUID(),
      },
    );
    res.json({
      token,
      rol: usuario.rol,
      nombre: usuario.nombre,
      id: usuario._id,
    });
  }),
);
router.get("/me", protect, (req, res) => res.json(req.usuario));
router.post(
  "/logout",
  protect,
  asyncHandler(async (req, res) => {
    await SesionRevocada.updateOne(
      { _id: req.sesion.hash },
      { $setOnInsert: { expira: req.sesion.expira } },
      { upsert: true },
    );
    res.status(204).end();
  }),
);
export default router;
