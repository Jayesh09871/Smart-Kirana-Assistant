import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  merchantId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  type: 'payment' | 'restock' | 'general';
  message: string;
  dueDate: Date;
  sent: boolean;
  createdAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    type: { type: String, enum: ['payment', 'restock', 'general'], default: 'general' },
    message: { type: String, required: true },
    dueDate: { type: Date, required: true },
    sent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ReminderSchema.index({ merchantId: 1, dueDate: 1 });

export default mongoose.models.Reminder || mongoose.model<IReminder>('Reminder', ReminderSchema);
