import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
