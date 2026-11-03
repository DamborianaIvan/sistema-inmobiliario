import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { config, validateConfig } from "./config.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { requestBody } from "./middleware/requestBody.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import auth from "./routes/auth.js";
import usuarios from "./routes/usuarios.js";
import catalogo from "./routes/catalogo.js";
import administracion from "./routes/administracion.js";
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);
app.use(securityHeaders, requestLogger);
app.use(
  cors({
    origin: config.corsOrigins,
    exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit", "X-Has-More"],
  }),
);
app.use(
  express.json({ limit: "1mb", strict: true, inflate: false }),
  requestBody,
);
app.get("/api/health", (req, res) =>
  res
    .status(mongoose.connection.readyState === 1 ? 200 : 503)
    .json({
      status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
    }),
);
app.use("/api/auth", auth);
app.use("/api/usuarios", usuarios);
app.use("/api", catalogo);
app.use("/api", administracion);
app.use(notFound, errorHandler);
export const startServer = async () => {
  validateConfig();
  await mongoose.connect(config.mongoUri);
  // Los índices únicos y TTL deben existir antes de aceptar tráfico.
  await Promise.all(
    Object.values(mongoose.models).map((modelo) => modelo.init()),
  );
  console.log("MongoDB conectado");
  return app.listen(config.port, () =>
    console.log(`API inmobiliaria en puerto ${config.port}`),
  );
};
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar la API:", error.message);
    process.exitCode = 1;
    mongoose.disconnect();
  });
}
export default app;
