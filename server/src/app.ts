import 'dotenv/config';
import express from 'express';
import { confidentialityGuard } from './lib/confidential';
import {
  authLimiter, corsMiddleware, errorHandler, generalLimiter, hardenApp, securityHeaders, writeLimiter,
} from './lib/security';
import publicRoutes from './routes/public';
import authRoutes from './routes/auth';
import productsRoutes from './routes/products';
import ordersRoutes from './routes/orders';
import socialRoutes from './routes/social';
import adminAuthRoutes from './routes/adminAuth';
import adminOfficeRoutes from './routes/adminOffice';
import adminRetailRoutes from './routes/adminRetail';

const app = express();

hardenApp(app);
app.use(securityHeaders());
app.use(corsMiddleware());

// Body limit sized to the largest legitimate payload: a 2 MB avatar data URL
// plus base64 overhead. Anything larger is rejected by body-parser as 413.
app.use(express.json({ limit: '3mb' }));

app.use(generalLimiter);

// Margin confidentiality (CONTRACT.md §1): scrub cost/margin from every response
// that is not authenticated as a Capital Retail admin. Deny-by-default.
app.use(confidentialityGuard);

app.get('/health', (req, res) => res.json({ ok: true }));

// Credential endpoints are the ones worth brute-forcing — tighter limit.
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', authLimiter);

// Every mutating route shares a write ceiling.
app.use((req, res, next) =>
  req.method === 'GET' || req.method === 'OPTIONS' ? next() : writeLimiter(req, res, next)
);

app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api', socialRoutes); // wishlist, splits, activity, alerts
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/office', adminOfficeRoutes);
app.use('/api/admin/retail', adminRetailRoutes);

app.use((req, res) => {
  // Echo the method but not the raw path — the path is attacker-controlled and
  // reflecting it invites log/response injection games.
  res.status(404).json({ error: `Not found: ${req.method}` });
});

app.use(errorHandler);

export default app;
