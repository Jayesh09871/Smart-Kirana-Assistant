import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  merchantId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  lastRestocked?: Date;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    name: { type: String, required: true },
    category: { type: String, default: 'General' },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    minStock: { type: Number, default: 5 },
    unit: { type: String, default: 'pcs' },
    lastRestocked: { type: Date },
  },
  { timestamps: true }
);

ProductSchema.index({ merchantId: 1, category: 1 });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
