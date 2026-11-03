import mongoose from "mongoose";
import {
  TIPOS,
  OPERACIONES,
  ESTADOS,
  MONEDAS,
} from "../constants/inmuebles.js";
const precio = new mongoose.Schema(
  {
    monto: { type: Number, required: true, min: 0.01, max: 1e12 },
    moneda: { type: String, enum: MONEDAS, required: true },
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    referencia: { type: String, required: true, unique: true, immutable: true },
    titulo: { type: String, required: true, maxlength: 200 },
    tipo: { type: String, enum: TIPOS, required: true },
    operaciones: [{ type: String, enum: OPERACIONES }],
    estado: { type: String, enum: ESTADOS, required: true },
    propietario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Propietario",
      required: true,
    },
    direccion: { type: String, required: true },
    localidad: { type: String, required: true },
    provincia: { type: String, required: true },
    descripcion: String,
    notasInternas: String,
    dormitorios: Number,
    banos: Number,
    superficieTotal: Number,
    superficieCubierta: Number,
    precioVenta: { type: precio, default: null },
    precioAlquiler: { type: precio, default: null },
    fotos: [String],
  },
  { timestamps: true, optimisticConcurrency: true },
);
schema.index({ estado: 1, createdAt: -1 });
schema.index({ propietario: 1 });
export default mongoose.model("Propiedad", schema);
