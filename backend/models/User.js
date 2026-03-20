import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    unit: { type: String, default: '' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  savedCalculations: [
    {
      title: { type: String, required: true },
      totalAmount: { type: Number, required: true },
      items: { type: mongoose.Schema.Types.Mixed, default: [] },
      createdAt: { type: Date, default: Date.now },
      location: { type: String, default: '' },
      paymentStatus: { type: String, enum: ['U planu', 'Plaćeno'], default: 'U planu' },
      materials: { type: [materialSchema], default: [] },
    },
  ],
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

export default mongoose.model('User', userSchema);
