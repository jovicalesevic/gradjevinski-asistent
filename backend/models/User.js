import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
    },
  ],
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

export default mongoose.model('User', userSchema);
