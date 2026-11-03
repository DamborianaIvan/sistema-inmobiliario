import mongoose from "mongoose";
export default mongoose.model(
  "Contador",
  new mongoose.Schema({ _id: String, valor: { type: Number, default: 0 } }),
);
