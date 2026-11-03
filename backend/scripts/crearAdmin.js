import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { config, validateConfig } from "../config.js";
import Usuario from "../models/Usuario.js";
import ControlOperacion from "../models/ControlOperacion.js";
import { datosUsuario, validarPassword } from "../utils/validaciones.js";
import { transaccion } from "../utils/transaccion.js";
import { registrarAuditoria } from "../services/auditoriaService.js";

export const crearAdmin = async (entrada) => {
  const datos = datosUsuario(entrada);
  const password = validarPassword(entrada.password);
  return transaccion(async (session) => {
    await ControlOperacion.updateOne(
      { _id: "usuarios" },
      { $inc: { revision: 1 } },
      { upsert: true, session },
    );
    if (await Usuario.exists({}).session(session))
      throw new Error(
        "Ya existen usuarios; usá el panel para administrar cuentas",
      );
    const [usuario] = await Usuario.create(
      [{ ...datos, password, rol: "ADMIN" }],
      { session },
    );
    await registrarAuditoria(
      {
        accion: "USUARIO_CREADO",
        entidad: "USUARIO",
        entidadId: usuario._id,
        usuario: { id: usuario._id, nombre: usuario.nombre },
        metadata: { origen: "INSTALACION" },
      },
      { session },
    );
    return usuario._id;
  });
};
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    validateConfig();
    const entrada = JSON.parse(await readFile(0, "utf8"));
    await mongoose.connect(config.mongoUri);
    await Promise.all([Usuario.init(), ControlOperacion.init()]);
    await crearAdmin(entrada);
    console.log("Administrador inicial creado");
  } catch (error) {
    console.error(
      "No se pudo crear el administrador:",
      error.code === 11000 ? "Ya existe el administrador" : error.message,
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
