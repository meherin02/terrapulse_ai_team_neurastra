import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { askAgent, periods } from './agent.js';

export function createAgentHandler({ apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', ask = askAgent } = {}) {
  let active = 0, count = 0, reset = Date.now();
  return async (req, res) => {
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    const url = new URL(req.url, 'http://127.0.0.1');
    // Accept the same hosted origin and the local Vite UI; do not enable wildcard CORS.
    const localOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:4173', 'http://localhost:4173'];
    let sameOrigin = false;
    try { sameOrigin = new URL(req.headers.origin).host === req.headers.host && new URL(req.headers.origin).protocol === 'https:'; } catch {}
    if (req.headers.origin && !sameOrigin && !localOrigins.includes(req.headers.origin)) return reply(403, { error: 'Origin not allowed.' });
    if (req.method === 'GET' && url.pathname === '/api/agent/status') return reply(200, { configured: Boolean(apiKey), model: apiKey ? model : null });
    if (req.method !== 'POST' || url.pathname !== '/api/chat') return reply(404, { error: 'Not found.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'Send JSON.' });
    const chunks = []; let bytes = 0;
    try {
      if (req.body === undefined) {
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 24000) return reply(413, { error: 'Question or conversation is too long.' });
          chunks.push(Buffer.from(chunk));
        }
      }
      let payload;
      try {
        const body = req.body === undefined ? Buffer.concat(chunks).toString('utf8') : typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
        if (Buffer.byteLength(body) > 24000) return reply(413, { error: 'Question or conversation is too long.' });
        payload = JSON.parse(body);
      } catch { return reply(400, { error: 'Invalid JSON.' }); }
      const { message, period, history = [] } = payload || {};
      if (typeof message !== 'string' || !message.trim() || message.length > 2000 || !periods.includes(period) || !Array.isArray(history) || history.length > 8 || history.some(item => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 4000)) return reply(400, { error: 'Provide a question up to 2,000 characters and a supported period.' });
      if (!apiKey) return reply(503, { error: process.env.VERCEL ? 'Live AI is not configured on Vercel. Add GEMINI_API_KEY in Project Settings → Environment Variables for Production, then redeploy.' : 'Live AI is not configured. Add GEMINI_API_KEY to your local .env and restart the AI server. Guided explanations remain available.' });
      if (Date.now() - reset > 60000) { reset = Date.now(); count = 0; }
      if (active >= 2 || count >= 20) return reply(429, { error: 'Too many requests. Please wait a moment.' });
      active++; count++;
      try { reply(200, await ask({ message: message.trim(), period, history: history.map(({ role, content }) => ({ role, content })) }, { apiKey, model })); }
      catch (error) { reply(error.status || 502, { error: error.name === 'TimeoutError' ? 'AI request timed out. Try again.' : error.message || 'AI request failed.' }); }
      finally { active--; }
    } catch { if (!res.headersSent) reply(400, { error: 'Unable to read the request.' }); }
  };
}

export function createAgentServer(options = {}) {
  return createServer(createAgentHandler(options));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createAgentServer().listen(3001, '127.0.0.1', () => console.log(`TerraAgent server: http://127.0.0.1:3001 | ${process.env.GEMINI_API_KEY ? 'API key configured' : 'No API key; guided fallback available'}`));
}
