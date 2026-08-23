/**
 * Vercel serverless entrypoint. Express apps are valid Node request handlers, so
 * the app is exported directly and Vercel supplies the server.
 */
import app from '../src/app';

export default app;
