import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from '@jest/globals';
import { Firecrawl } from '../../../index';

async function fixture(run: (url: string, seen: any[], mode: (value: number) => void, delay: (ms: number | null) => void) => Promise<void>) {
  const seen: any[] = [];
  let status = 502;
  let delayMs: number | null = 0;
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    seen.push({ method: req.method, path: req.url, authorization: req.headers.authorization, body: raw ? JSON.parse(raw) : null });
    if (delayMs === null) return;
    if (delayMs > 0) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, delayMs!);
        res.once('close', () => { clearTimeout(timer); resolve(); });
      });
      if (res.destroyed) return;
    }
    res.setHeader('content-type', 'application/json');
    if (req.url === '/sink') { res.end(JSON.stringify({ success: true, id: 'sink', cdpUrl: 'ws://127.0.0.1:1', webSocketDebuggerUrl: 'ws://127.0.0.1:1' })); return; }
    res.statusCode = status;
    if (status === 302) res.setHeader('location', '/sink');
    res.end(JSON.stringify(status === 200 ? (req.method === 'DELETE' ? { success: true } : { success: true, id: 'owned', cdpUrl: 'ws://127.0.0.1:1', webSocketDebuggerUrl: 'ws://127.0.0.1:1' }) : { success: false, error: 'inert fixture' }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  try { await run(`http://127.0.0.1:${address.port}`, seen, value => { status = value; }, value => { delayMs = value; }); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
const bounded = { maxRetries: 1, maxRedirects: 0, timeoutMs: 1000 } as const;
const session = { ttl: 600, activityTtl: 60, streamWebView: false, profile: { name: 'owned-profile', saveChanges: true }, integration: 'inert-contract' };

test('SDK: default three attempts; opt-in single attempt; 503 remains one attempt', async () => fixture(async (apiUrl, seen, mode) => {
  await assert.rejects(new Firecrawl({ apiKey: 'inert', apiUrl, backoffFactor: 0 }).browser());
  assert.equal(seen.length, 3);
  seen.length = 0;
  await assert.rejects(new Firecrawl({ apiKey: 'inert', apiUrl, ...bounded }).browser());
  assert.equal(seen.length, 1);
  seen.length = 0; mode(503);
  await assert.rejects(new Firecrawl({ apiKey: 'inert', apiUrl, ...bounded }).browser());
  assert.equal(seen.length, 1);
}));

test('SDK: defaults follow owned 302; opt-in zero redirects never reaches sink', async () => fixture(async (apiUrl, seen, mode) => {
  mode(302);
  await new Firecrawl({ apiKey: 'inert', apiUrl }).browser(session);
  assert.deepEqual(seen.map(x => x.path), ['/v2/browser', '/sink']);
  seen.length = 0;
  await assert.rejects(new Firecrawl({ apiKey: 'inert', apiUrl, ...bounded }).browser(session));
  assert.deepEqual(seen.map(x => x.path), ['/v2/browser']);
}));

test('SDK: invalid runtime redirect values fail before send', async () => fixture(async (apiUrl, seen) => {
  for (const maxRedirects of [1, -1, NaN, null, '0']) {
    assert.throws(() => new Firecrawl({ apiKey: 'inert', apiUrl, maxRedirects } as any), /maxRedirects/);
  }
  assert.equal(seen.length, 0);
}));

test('SDK: delayed response succeeds inside timeout; hung response times out once', async () => fixture(async (apiUrl, seen, mode, delay) => {
  mode(200); delay(40);
  assert.equal((await new Firecrawl({ apiKey: 'inert', apiUrl, ...bounded, timeoutMs: 500 }).browser()).success, true);
  assert.equal(seen.length, 1);
  seen.length = 0; delay(null);
  const started = performance.now();
  await assert.rejects(new Firecrawl({ apiKey: 'inert', apiUrl, ...bounded, timeoutMs: 40 }).browser(), (error: any) => error.code === 'ETIMEDOUT');
  assert.equal(seen.length, 1);
  assert.ok(performance.now() - started < 1500);
}));
