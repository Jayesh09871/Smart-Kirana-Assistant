
import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessage extends Document {
  merchantId: mongoose.Types.ObjectId;
  fromPhone: string;
  toPhone: string;
  messageBody: string;
  messageId: string;
  status: 'received' | 'processed' | 'reviewed' | 'failed';
  parsedOrder?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    fromPhone: { type: String, required: true },
    toPhone: { type: String, required: true },
    messageBody: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    status: { 
      type: String, 
      enum: ['received', 'processed', 'reviewed', 'failed'], 
      default: 'received' 
    },
    parsedOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

WhatsAppMessageSchema.index({ merchantId: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ merchantId: 1, fromPhone: 1 });

export default mongoose.models.WhatsAppMessage || mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);
