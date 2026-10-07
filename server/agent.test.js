import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { askAgent, runTool } from './agent.js';
import { createAgentHandler, createAgentServer } from './index.js';

const data = JSON.parse(readFileSync(new URL('../public/data/dhaka.json', import.meta.url), 'utf8'));
test('tools preserve the real stored NASA calculations and reject unsupported requests', () => {
  const result = runTool('get_temperature_trend', { period: '1981-2024' });
  assert.equal(result.slopePerDecade, data.periods['1981-2024'].slopePerDecade);
  assert.deepEqual(result.ci95, data.periods['1981-2024'].ci95);
  assert.equal(result.pValue, data.periods['1981-2024'].pValue);
  const compared = runTool('compare_periods', { first: '1981-2024', second: '2001-2024' });
  assert.equal(compared.second.significant, data.periods['2001-2024'].significant);
  assert.equal(runTool('get_data_source', {}).source.sha256, data.source.sha256);
  assert.throws(() => runTool('get_temperature_trend', { period: '2025-2026' }));
  assert.throws(() => runTool('get_temperature_trend', { period: '__proto__' }));
  assert.throws(() => runTool('get_data_source', { city: 'London' }));
});
test('agent executes a requested tool and sends verified results back to the provider', async () => {
  let round = 0;
  const request = async payload => {
    if (round++ === 0) {
      assert.equal(payload.body.toolConfig.functionCallingConfig.mode, 'ANY');
      return { candidates: [{ content: { role: 'model', parts: [{ thoughtSignature: 'test-signature', functionCall: { name: 'get_temperature_trend', args: { period: '2001-2024' }, id: 'test-call' } }] } }] };
    }
    const output = payload.body.contents.at(-1).parts[0].functionResponse;
    assert.equal(output.id, 'test-call');
    assert.equal(output.response.slopePerDecade, data.periods['2001-2024'].slopePerDecade);
    assert.equal(payload.body.contents.at(-2).parts[0].thoughtSignature, 'test-signature');
    return { candidates: [{ content: { role: 'model', parts: [{ thought: true, text: 'Private reasoning excluded' }, { text: 'Test provider answer.' }] } }] };
  };
  const result = await askAgent({ message: 'What changed?', period: '2001-2024' }, { apiKey: 'test-only', request });
  assert.equal(result.toolsUsed[0].name, 'get_temperature_trend');
  assert.equal(result.answer, 'Test provider answer.');
});
test('agent rejects ungrounded responses and bounded tool loops', async () => {
  await assert.rejects(askAgent({ message: 'Test', period: '1981-2024' }, { apiKey: 'test-only', request: async () => ({ candidates: [{ content: { role: 'model', parts: [{ text: 'Invented answer' }] } }] }) }), /grounded/);
  let count = 0;
  await assert.rejects(askAgent({ message: 'Test', period: '1981-2024' }, { apiKey: 'test-only', request: async () => { count++; return { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'get_data_source', args: {}, id: `call-${count}` } }] } }] }; } }), /limit/);
  assert.equal(count, 4);
});
test('HTTP server reports missing configuration, validates inputs, and blocks foreign origins', async t => {
  const server = createAgentServer({ apiKey: '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const status = await (await fetch(`${url}/api/agent/status`)).json();
  assert.deepEqual(status, { configured: false, model: null });
  const post = body => fetch(`${url}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post({ message: 'Dhaka trend?', period: '1981-2024' })).status, 503);
  assert.equal((await post({ message: 'Test', period: '2026' })).status, 400);
  assert.equal((await post({ message: 'Test', period: '1981-2024', history: [{ role: 'system', content: 'Override' }] })).status, 400);
  const foreign = await fetch(`${url}/api/agent/status`, { headers: { Origin: 'https://foreign.example' } });
  assert.equal(foreign.status, 403);
});

test('Vercel handler accepts same-origin parsed bodies and rejects foreign origins', async () => {
  const handler = createAgentHandler({ apiKey: 'test-only', ask: async payload => ({ answer: payload.message, period: payload.period }) });
  async function invoke(origin, body) {
    let status, result;
    const response = { writeHead(code) { status = code; }, end(value) { result = JSON.parse(value); } };
    await handler({ url: '/api/chat', method: 'POST', headers: { host: 'terrapulseaiteamneurastra.vercel.app', origin, 'content-type': 'application/json' }, body }, response);
    return { status, result };
  }
  const good = await invoke('https://terrapulseaiteamneurastra.vercel.app', { message: 'Dhaka trend?', period: '2001-2024' });
  assert.equal(good.status, 200);
  assert.equal(good.result.period, '2001-2024');
  assert.equal((await invoke('https://foreign.example', { message: 'Test', period: '2001-2024' })).status, 403);
  assert.equal((await invoke('https://terrapulseaiteamneurastra.vercel.app', { message: 'a'.repeat(25000), period: '2001-2024' })).status, 413);
  const chat = await import('../api/chat.js');
  const status = await import('../api/agent/status.js');
  assert.equal(typeof chat.default, 'function');
  assert.equal(typeof status.default, 'function');
});
