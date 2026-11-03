import mongoose from "mongoose";
export default mongoose.model(
  "Configuracion",
  new mongoose.Schema(
    {
      _id: String,
      nombre: String,
      telefono: String,
      email: String,
      direccion: String,
      logoUrl: String,
    },
    { timestamps: true, optimisticConcurrency: true },
  ),
);
