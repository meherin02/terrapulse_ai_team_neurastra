import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { askAgent, periods } from './agent.js';

export function createAgentServer({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || 'gpt-5-mini', ask = askAgent } = {}) {
  let active = 0, count = 0, reset = Date.now();
  return createServer(async (req, res) => {
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    const url = new URL(req.url, 'http://127.0.0.1');
    // This server is a local prototype; only the local Vite UI may submit requests.
    if (req.headers.origin && !['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:4173', 'http://localhost:4173'].includes(req.headers.origin)) return reply(403, { error: 'Origin not allowed.' });
    if (req.method === 'GET' && url.pathname === '/api/agent/status') return reply(200, { configured: Boolean(apiKey), model: apiKey ? model : null });
    if (req.method !== 'POST' || url.pathname !== '/api/chat') return reply(404, { error: 'Not found.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'Send JSON.' });
    const chunks = []; let bytes = 0;
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 24000) return reply(413, { error: 'Question or conversation is too long.' });
        chunks.push(chunk);
      }
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { error: 'Invalid JSON.' }); }
      const { message, period, history = [] } = payload || {};
      if (typeof message !== 'string' || !message.trim() || message.length > 2000 || !periods.includes(period) || !Array.isArray(history) || history.length > 8 || history.some(item => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 4000)) return reply(400, { error: 'Provide a question up to 2,000 characters and a supported period.' });
      if (!apiKey) return reply(503, { error: 'Live AI is not configured. Add OPENAI_API_KEY to your local .env and restart the AI server. Guided explanations remain available.' });
      if (Date.now() - reset > 60000) { reset = Date.now(); count = 0; }
      if (active >= 2 || count >= 20) return reply(429, { error: 'Too many requests. Please wait a moment.' });
      active++; count++;
      try { reply(200, await ask({ message: message.trim(), period, history: history.map(({ role, content }) => ({ role, content })) }, { apiKey, model })); }
      catch (error) { reply(error.status || 502, { error: error.name === 'TimeoutError' ? 'AI request timed out. Try again.' : error.message || 'AI request failed.' }); }
      finally { active--; }
    } catch { if (!res.headersSent) reply(400, { error: 'Unable to read the request.' }); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createAgentServer().listen(3001, '127.0.0.1', () => console.log(`TerraAgent server: http://127.0.0.1:3001 | ${process.env.OPENAI_API_KEY ? 'API key configured' : 'No API key; guided fallback available'}`));
}
