import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { ApplicationStatus } from '@prisma/client';

const router = Router();

const applicationSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  communityId: z.string().uuid().optional(),
  communityName: z.string().optional(),
  businessName: z.string().min(2),
  businessType: z.string().min(2),
  description: z.string().min(10),
  vision: z.string().min(5),
  mission: z.string().min(5),
  targetCustomers: z.string().min(3),
  operatingArea: z.string().min(3),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

router.post('/', async (req, res) => {
  const parse = applicationSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten() });
  }

  const { communityName, ...rest } = parse.data;
  let communityId = rest.communityId;

  if (!communityId && communityName) {
    const community = await prisma.community.upsert({
      where: { name: communityName },
      update: {},
      create: { name: communityName }
    });
    communityId = community.id;
  }

  const application = await prisma.hustlerApplication.create({
    data: { ...rest, communityId }
  });

  res.status(201).json(application);
});

router.get('/', authMiddleware(['FACILITATOR', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  const rawStatus = (req.query.status as string)?.toUpperCase();
  const normalizedStatus =
    rawStatus === 'APPROVED' || rawStatus === 'REJECTED' || rawStatus === 'PENDING'
      ? rawStatus
      : 'PENDING';
  const status = normalizedStatus as ApplicationStatus;

  let communityId: string | undefined;
  if (Array.isArray(req.query.communityId)) {
    communityId = req.query.communityId[0];
  } else {
    communityId = req.query.communityId as string | undefined;
  }

  const applications = await prisma.hustlerApplication.findMany({
    where: {
      status,
      communityId: communityId ?? undefined
    },
    orderBy: { submittedAt: 'desc' },
    include: { community: true }
  });
  res.json(applications);
});

const decisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  facilitatorNotes: z.string().optional()
});

router.patch('/:id/decision', authMiddleware(['FACILITATOR', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parse = decisionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten() });
  }

  let status: ApplicationStatus | undefined;
  if (Object.values(ApplicationStatus).includes(req.body.status as ApplicationStatus)) {
    status = req.body.status as ApplicationStatus;
  }

  if (!status) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  const application = await prisma.hustlerApplication.update({
    where: { id: req.params.id },
    data: {
      status,
      facilitatorNotes: parse.data.facilitatorNotes,
      facilitatorId: req.user?.id,
      decidedAt: new Date()
    },
    include: { community: true }
  });

  if (status === 'APPROVED' && application.communityId) {
    await prisma.businessProfile.upsert({
      where: { applicationId: application.id },
      update: {
        status: 'APPROVED'
      },
      create: {
        applicationId: application.id,
        communityId: application.communityId,
        businessName: application.businessName,
        businessType: application.businessType,
        description: application.description,
        mission: application.mission,
        vision: application.vision,
        targetCustomers: application.targetCustomers,
        operatingArea: application.operatingArea,
        latitude: application.latitude,
        longitude: application.longitude,
        status: 'APPROVED'
      }
    });
  }

  res.json(application);
});

export default router;
