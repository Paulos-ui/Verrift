// Standalone Vercel Function. Do not import or start the local HTTP server here.
import {createHandler} from '../lib/app.js';

let cachedHandler;

export default async function handler(req, res) {
  try {
    // Initialize inside the request so a missing Vercel variable results in a
    // helpful 503 response instead of an uncaught cold-start exception.
    if (!cachedHandler) cachedHandler = createHandler();
    const url = new URL(req.url || '/', 'http://internal');
    const routed = url.searchParams.get('__route');
    if (routed) {
      url.searchParams.delete('__route');
      req.url = (routed === '__healthz' ? '/healthz' : '/api/' + routed) + (url.search || '');
    }
    return await cachedHandler(req, res);
  } catch (error) {
    console.error('VERRIFT API startup or invocation failed:', error.message);
    if (res.headersSent) {
      if (!res.writableEnded) res.end();
      return;
    }
    res.writeHead(503, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify({
      error: 'VERRIFT API is not configured or is temporarily unavailable. Check Vercel Runtime Logs and environment variables.'
    }));
  }
}
