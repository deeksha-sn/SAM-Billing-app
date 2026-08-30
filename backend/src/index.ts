import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', business: 'Smart Agro Machinerys Business Management System', time: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', apiRouter);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Smart Agro Machinerys Backend API running on http://localhost:${PORT}`);
});
