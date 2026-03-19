import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  const communities = await prisma.community.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { hustlers: true, applications: true } } }
  });
  res.json(communities);
});

const communitySchema = z.object({
  name: z.string().min(2),
  region: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

router.post('/', authMiddleware(['ADMIN']), async (req, res) => {
  const parse = communitySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten() });
  }

  const community = await prisma.community.create({ data: parse.data });
  res.status(201).json(community);
});

router.get('/:id/hustlers', async (req, res) => {
  const hustlers = await prisma.businessProfile.findMany({
    where: { communityId: req.params.id, status: 'APPROVED' },
    include: { products: true }
  });
  res.json(hustlers);
});

export default router;
