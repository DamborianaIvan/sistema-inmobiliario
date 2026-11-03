import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, maxlength: 150 },
    telefono: { type: String, required: true, maxlength: 50 },
    email: { type: String, maxlength: 254 },
    notas: { type: String, maxlength: 3000 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);
export default mongoose.model("Propietario", schema);
