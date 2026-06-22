import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchant extends Document {
  name: string;
  phone: string;
  shopName: string;
  language: 'en' | 'hi';
  businessType: string;
  password: string;
  whatsappPhoneNumber?: string;
  createdAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    shopName: { type: String, required: true },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    businessType: { type: String, default: 'grocery' },
    password: { type: String, default: '' },
    whatsappPhoneNumber: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.models.Merchant || mongoose.model<IMerchant>('Merchant', MerchantSchema);
