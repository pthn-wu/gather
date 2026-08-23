import 'dotenv/config';
import app from './app';

/**
 * Local development entrypoint. On Vercel the app is served by api/index.ts as a
 * serverless function instead — a serverless runtime supplies the listener, so
 * calling listen() there would hang the invocation.
 */
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Gather API listening on http://localhost:${PORT}`);
});
