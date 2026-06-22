
import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId?: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  price?: number;
}

export interface IOrder extends Document {
  merchantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  items: IOrderItem[];
  totalAmount: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  whatsappMessageId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unit: { type: String, default: 'pcs' },
  price: { type: Number },
});

const OrderSchema = new Schema<IOrder>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, default: 0 },
    notes: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'cancelled'], 
      default: 'pending' 
    },
    whatsappMessageId: { type: Schema.Types.ObjectId, ref: 'WhatsAppMessage' },
  },
  { timestamps: true }
);

OrderSchema.index({ merchantId: 1, createdAt: -1 });
OrderSchema.index({ merchantId: 1, status: 1 });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
