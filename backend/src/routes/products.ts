import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const productSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().min(5),
  price: z.number().nonnegative(),
  mediaUrl: z.string().url().optional()
});

router.post('/', authMiddleware(['HUSTLER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parse = productSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten() });
  }

  if (req.user?.role === 'HUSTLER') {
    const business = await prisma.businessProfile.findFirst({
      where: { id: parse.data.businessId, ownerId: req.user.id }
    });
    if (!business) {
      return res.status(403).json({ message: 'Business not found or not owned by you' });
    }
  }

  const product = await prisma.product.create({ data: parse.data });
  res.status(201).json(product);
});

router.get('/', async (req, res) => {
  const communityId = req.query.communityId as string | undefined;
  const products = await prisma.product.findMany({
    where: {
      business: communityId ? { communityId } : undefined
    },
    include: {
      business: {
        select: {
          businessName: true,
          community: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(products);
});

export default router;
