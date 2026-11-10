// Minimal headless-Chrome driver over the DevTools protocol, using Node's built-in WebSocket (Node 22+).
// From the headless-chrome-verify skill. CHROME_PATH overrides the macOS default.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch(port, profileDir) {
  fs.rmSync(profileDir, { recursive: true, force: true });
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir,
    '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  // A cold CI runner can take well over 10 s to start Chrome. If it exits or never answers, kill it and say why:
  // a Chrome left running keeps Node (and the CI job) alive until the job's timeout.
  let stderr = '', exited = null;
  proc.stderr.on('data', d => { stderr = (stderr + d).slice(-2000); });
  proc.on('exit', code => { exited = code; });
  proc.on('error', e => { exited = e.code; stderr += e.message; });
  let ver;
  for (const t0 = Date.now(); !ver && exited === null && Date.now() - t0 < 30000;) {
    try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); }
  }
  if (!ver) {
    proc.kill('SIGKILL');
    throw new Error(`Chrome didn't start (${exited === null ? 'no answer in 30 s' : 'exited with ' + exited}) at ${CHROME}\n${stderr}`);
  }
  proc.stderr.removeAllListeners('data').resume();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const handlers = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    else handlers.forEach(h => h(m));
  });
  // Every call has a timeout, and a closed socket rejects whatever is pending: a lost reply fails
  // with the method's name instead of hanging the run (the failure mode in QuizClash issue #34).
  ws.addEventListener('close', () => { for (const p of pending.values()) p.rej(new Error('CDP socket closed')); pending.clear(); });
  const send = (method, params = {}, sessionId, ms = 30000) => new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => { pending.delete(i); rej(new Error(`CDP ${method} got no reply in ${ms / 1000} s`)); }, ms);
    pending.set(i, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  async function newPage(name, w = 1280, h = 900, mobile = false) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const logs = [];
    handlers.push(m => {
      if (m.sessionId !== sessionId) return;
      if (m.method === 'Runtime.consoleAPICalled') logs.push(`[${name}] ${m.params.type}: ` + m.params.args.map(a => a.value !== undefined ? JSON.stringify(a.value) : (a.description || a.type)).join(' '));
      if (m.method === 'Runtime.exceptionThrown') logs.push(`[${name}] EXCEPTION: ` + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    });
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }, sessionId);
    const page = {
      name, logs, sessionId, targetId,
      async goto(url) { await send('Page.navigate', { url }, sessionId); await sleep(800); },
      async eval(expr) {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
        if (r.exceptionDetails) throw new Error(name + ' eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
        return r.result.value;
      },
      async waitFor(expr, timeout = 15000) {
        const t0 = Date.now();
        while (Date.now() - t0 < timeout) { try { if (await page.eval(expr)) return true; } catch {} await sleep(100); }
        throw new Error(`${name}: timeout waiting for ${expr}`);
      },
      async shot(file) { const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId); fs.writeFileSync(file, Buffer.from(data, 'base64')); },
      async resize(w, h, mobile = false) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }, sessionId); },
      async media(features) { await send('Emulation.setEmulatedMedia', { features }, sessionId); },
      async close() { await send('Target.closeTarget', { targetId }); },
    };
    return page;
  }
  return { send, newPage, close: () => { try { proc.kill(); } catch {} } };
}
module.exports = { launch, sleep };
