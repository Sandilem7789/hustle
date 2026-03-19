import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './prisma';
import authRouter from './routes/auth';
import communityRouter from './routes/communities';
import hustlerRouter from './routes/hustlers';
import productRouter from './routes/products';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database unreachable', error });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/communities', communityRouter);
app.use('/api/hustlers', hustlerRouter);
app.use('/api/products', productRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error', details: err?.message });
});

app.listen(port, () => {
  console.log(`Hustle Economy API running on http://localhost:${port}`);
});
