import mongoose from 'mongoose';
import 'dotenv/config';
// Kết nối MongoDB
const MONGODB_URI = process.env.MONGODB_URI || '';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

import express, { Request, Response } from 'express';
import cors from 'cors';
import userRouter from './user/user.router';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());


// User API router
app.use('/api/users', userRouter);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    server: 'Node.js Express',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Example API routes
app.get('/api/data', (req: Request, res: Response) => {
  res.json({ data: 'Sample data from server' });
});

app.post('/api/data', (req: Request, res: Response) => {
  const { data } = req.body;
  res.json({ message: 'Data received', data });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});

export default app;
