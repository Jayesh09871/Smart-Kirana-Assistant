import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  merchantId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  totalUdhar: number;
  totalPaid: number;
  balance: number;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    name: { type: String, required: true },
    phone: { type: String },
    totalUdhar: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CustomerSchema.index({ merchantId: 1, name: 1 });

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
