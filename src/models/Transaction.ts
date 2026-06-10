import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  merchantId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  type: 'udhar' | 'payment';
  amount: number;
  description?: string;
  items?: string[];
  date: Date;
  synced: boolean;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: { type: String, enum: ['udhar', 'payment'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    items: [{ type: String }],
    date: { type: Date, default: Date.now },
    synced: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TransactionSchema.index({ merchantId: 1, customerId: 1, date: -1 });
TransactionSchema.index({ merchantId: 1, date: -1 });

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
