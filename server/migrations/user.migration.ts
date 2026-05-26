import mongoose from 'mongoose';
import { UserSchema } from '../user/user.model';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || '';

const User = mongoose.model('User', UserSchema, 'users');

async function migrate() {
  await mongoose.connect(MONGODB_URI);

  // Tạo một user mẫu để tạo collection nếu chưa tồn tại
  const exists = await User.findOne();
  if (!exists) {
    await User.create({
      username: 'Sample User',
      password: 'hashed_password',
      mac_id: '00:00:00:00:00:00',
      ip_address: '0.0.0.0'
    });
    console.log('User collection created with a sample user.');
  } else {
    console.log('User collection already exists.');
  }

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});