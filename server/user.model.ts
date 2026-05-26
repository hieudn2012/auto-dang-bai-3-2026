import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  mac_id: string;
  password: string;
  ip_address: string;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  mac_id: { type: String, required: true },
  password: { type: String, required: true },
  ip_address: { type: String, required: true },
});

export const User = mongoose.model<IUser>('User', UserSchema);
