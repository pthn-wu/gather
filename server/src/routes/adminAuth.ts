import { createRouter } from '../lib/asyncRouter';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AdminRole, signAdminToken } from '../lib/jwt';
import { serializeAdmin } from '../lib/serialize';
import { resolveCommunity } from '../lib/catalog';
import { validate } from '../lib/validate';
import { adminAuthSchemas } from '../lib/schemas';

const router = createRouter();

// POST /api/admin/login { username, password, communityId? }
// Shared by both consoles. `communityId` is the console picker's community: for an
// office login it must match the account's own community, otherwise the sign-in is
// refused (a Gems 2 password must not open the Gems 1 console).
router.post('/login', validate({ body: adminAuthSchemas.login }), async (req, res) => {
  const { username, password, communityId } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const admin = await prisma.adminUser.findUnique({
    where: { username: String(username).trim() },
    include: { community: true },
  });
  if (!admin) return res.status(401).json({ error: 'Invalid username or password' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

  if (communityId && admin.role === 'office') {
    const requested = await resolveCommunity(String(communityId));
    if (!requested || requested.id !== admin.communityId) {
      return res.status(401).json({ error: 'That account does not belong to the selected community' });
    }
  }

  const token = signAdminToken(admin.id, admin.role as AdminRole, admin.communityId);
  res.json({ token, admin: serializeAdmin(admin) });
});

export default router;
