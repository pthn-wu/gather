import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { serializeCommunity } from '../lib/serialize';

const router = Router();

// GET /api/communities
router.get('/communities', async (req, res) => {
  const communities = await prisma.community.findMany({ orderBy: { name: 'asc' } });
  const data = await Promise.all(
    communities.map(async (c) => {
      const householdsCount = await prisma.user.count({ where: { communityId: c.id } });
      return serializeCommunity(c, { householdsCount });
    })
  );
  res.json({ data });
});

export default router;
