import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signUserToken } from '../lib/jwt';
import { serializeCommunity, serializeUser } from '../lib/serialize';
import { requireUser } from '../middleware/auth';
import { validate } from '../lib/validate';
import { authSchemas } from '../lib/schemas';

const router = Router();

// POST /api/auth/login
router.post('/login', validate({ body: authSchemas.login }), async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
  const token = signUserToken(user.id);
  res.json({ token, user: serializeUser(user), mustSetPassword: user.mustSetPassword });
});

// GET /api/auth/me
router.get('/me', requireUser, async (req, res) => {
  const user = req.user!;
  const { community, ...userFields } = user as any;
  // The cycle block (cutoff, delivery day, collection point + window) comes straight
  // off the community record the property office edits in Cycle setup.
  res.json({ user: serializeUser(userFields), community: serializeCommunity(community) });
});

// POST /api/auth/setup — first-run setup, clears mustSetPassword
router.post('/setup', requireUser, validate({ body: authSchemas.setup }), async (req, res) => {
  const { displayName, username, password, avatarIndex, avatarPhoto } = req.body || {};
  if (!displayName || !username || !password) {
    return res.status(400).json({ error: 'displayName, username and password are required' });
  }
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== req.user!.id) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      displayName,
      username,
      passwordHash,
      mustSetPassword: false,
      tempPassword: null,
      accountState: 'active',
      ...(avatarIndex !== undefined ? { avatarIndex } : {}),
      ...(avatarPhoto !== undefined ? { avatarPhoto } : {}),
    },
  });
  res.json({ user: serializeUser(updated) });
});

// PATCH /api/auth/profile
router.patch('/profile', requireUser, validate({ body: authSchemas.profile }), async (req, res) => {
  const { displayName, username, avatarIndex, avatarPhoto } = req.body || {};
  if (username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== req.user!.id) {
      return res.status(409).json({ error: 'Username already taken' });
    }
  }
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(username !== undefined ? { username } : {}),
      ...(avatarIndex !== undefined ? { avatarIndex } : {}),
      ...(avatarPhoto !== undefined ? { avatarPhoto } : {}),
    },
  });
  res.json({ user: serializeUser(updated) });
});

// POST /api/auth/password
router.post('/password', requireUser, validate({ body: authSchemas.password }), async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'password is required' });
  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash, mustSetPassword: false, tempPassword: null, accountState: 'active' },
  });
  res.json({ user: serializeUser(updated) });
});

export default router;
