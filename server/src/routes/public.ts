import { createRouter } from '../lib/asyncRouter';
import { prisma } from '../lib/prisma';
import { serializeCommunity } from '../lib/serialize';
import { validate } from '../lib/validate';
import { publicSchemas } from '../lib/schemas';
import { enquiryLimiter } from '../lib/security';

const router = createRouter();

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

/**
 * POST /api/enquiries — "register interest" from the property picker.
 *
 * The only write on this API that needs no session at all, which is why it
 * carries its own rate limit on top of the global write ceiling. A property
 * office fills this in once; anything past a handful an hour from one address
 * is not a property office.
 *
 * The response is deliberately empty of anything the submitter could use to
 * enumerate: no id, no echo of what was stored, and the same 201 whether or not
 * this property has enquired before.
 */
router.post(
  '/enquiries',
  enquiryLimiter,
  validate({ body: publicSchemas.propertyEnquiry }),
  async (req, res) => {
    await prisma.propertyEnquiry.create({ data: req.body });
    res.status(201).json({ ok: true });
  }
);

export default router;
