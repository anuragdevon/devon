// The production build (.build/) in headless Chrome, served with the real static/_headers
// (CSP enforced). Run `npm test` (builds, runs tools/check-build.mjs, then this file).
// Needs Chrome (CHROME_PATH on Linux) and Node 22+. SITE_DIR overrides the build directory.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { launch, sleep } = createRequire(import.meta.url)('./cdp.cjs');

const SITE = path.resolve(process.env.SITE_DIR || '.build');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml', '.pdf': 'application/pdf',
};

// ---- static server applying _headers the way Netlify does (a path gets every matching block)
function parseHeaders() {
  const rules = [];
  for (const line of fs.readFileSync(path.join(SITE, '_headers'), 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: [] });
    else { const i = line.indexOf(':'); rules.at(-1).headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
  }
  return rules.map(r => ({ ...r, re: new RegExp('^' + r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$') }));
}

function serve() {
  const rules = parseHeaders();
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    // Netlify Forms stand-in: the contact form POSTs to /.
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => { server.posts.push({ url, type: req.headers['content-type'], body }); res.writeHead(200); res.end('ok'); });
      return;
    }
    let file = path.join(SITE, url.endsWith('/') ? url + 'index.html' : url);
    let status = 200;
    if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { file = path.join(SITE, '404.html'); status = 404; }
    // The upgrade-insecure-requests directive would send the browser to https on this
    // plain-http test server; everything else in the policy is enforced as deployed.
    for (const r of rules) if (r.re.test(url)) for (const [k, v] of r.headers) {
      res.setHeader(k, k === 'Content-Security-Policy' ? v.replace(/;\s*upgrade-insecure-requests/, '') : v);
    }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.writeHead(status);
    fs.createReadStream(file).pipe(res);
  });
  server.posts = [];
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Records CSP violations on the page before any of its scripts run.
const WATCH_CSP = `window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));`;
const problems = p => p.logs.filter(l => /EXCEPTION|\berror:/i.test(l));

let server, browser, origin;
before(async () => {
  assert.ok(fs.existsSync(path.join(SITE, 'index.html')), `${SITE} has no build; run npm run build:test`);
  server = await serve();
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await launch(9300 + Math.floor(Math.random() * 600), fs.mkdtempSync(path.join(os.tmpdir(), 'devon-chrome-')));
});
after(() => { browser?.close(); server?.close(); });

async function open(name, width, height, mobile, url = '/') {
  const p = await browser.newPage(name, width, height, mobile);
  await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: WATCH_CSP }, p.sessionId);
  await p.goto(origin + url);
  await p.waitFor("document.readyState === 'complete'");
  return p;
}

async function assertClean(p, label) {
  assert.deepEqual(await p.eval('window.__csp'), [], `${label}: CSP violations`);
  assert.deepEqual(problems(p), [], `${label}: console errors`);
}

const SERIES = ['/blogs/quizclash-server/', '/blogs/quizclash-rooms/', '/blogs/realtime-testing/', '/blogs/one-team-five-apps/', '/blogs/sync-data-loss/'];
const PAGES = ['/', '/about/', '/projects/', '/blogs/', '/blogs/cascade/', '/blogs/andromeda-rice/', ...SERIES];

for (const [size, width, height, mobile] of [['phone', 375, 812, true], ['desktop', 1280, 900, false]]) {
  test(`every page at ${size} width: no overflow in dark or light, everything revealed, no errors or CSP violations`, async () => {
    for (const url of PAGES) {
      const p = await open(`${size} ${url}`, width, height, mobile, url);
      for (const theme of ['dark', 'light']) {
        await p.eval(`document.documentElement.dataset.theme = '${theme}'; scrollTo(0, 0); true`);
        await sleep(150);
        // clientWidth, not innerWidth: desktop Chrome on Linux draws a classic scrollbar inside innerWidth.
        assert.equal(await p.eval('document.documentElement.scrollWidth - document.documentElement.clientWidth'), 0, `${url}: horizontal overflow in ${theme}`);
      }
      await p.eval(`(async () => { for (let y = 0; y <= document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } })()`);
      await p.waitFor("[...document.querySelectorAll('.animate-on-scroll, .animate-fade')].every(e => e.classList.contains('is-visible'))", 5000);
      await assertClean(p, url);
      await p.close();
    }
  });
}

test('404 page is served with status 404 and the site chrome', async () => {
  const res = await fetch(origin + '/no-such-page');
  assert.equal(res.status, 404);
  const p = await open('404', 375, 812, true, '/no-such-page');
  assert.match(await p.eval("document.querySelector('#not-found h1')?.textContent || ''"), /Page not found/);
  assert.ok(await p.eval("!!document.getElementById('theme-toggle')"), 'no theme toggle on the 404 page');
  await assertClean(p, '404');
  await p.close();
});

test('security headers are sent on every page', async () => {
  for (const url of ['/', '/about/', '/blogs/cascade/']) {
    const res = await fetch(origin + url);
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /script-src 'self';/, `${url}: script-src`);
    assert.match(csp, /frame-ancestors 'none'/, `${url}: frame-ancestors`);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.equal((await fetch(origin + '/service_worker.js')).headers.get('cache-control'), 'no-cache');
});

test('theme toggle switches and persists across a reload', async () => {
  const p = await open('toggle', 1280, 900, false);
  await p.eval("localStorage.removeItem('theme'); true");
  await p.goto(origin + '/');
  await p.waitFor("document.readyState === 'complete'");
  assert.equal(await p.eval('document.documentElement.dataset.theme'), 'dark', 'default theme should be dark');
  await p.eval("document.getElementById('theme-toggle').click(); true");
  assert.equal(await p.eval('document.documentElement.dataset.theme'), 'light');
  await p.goto(origin + '/about/');
  await p.waitFor("document.readyState === 'complete'");
  assert.equal(await p.eval('document.documentElement.dataset.theme'), 'light', 'theme not restored on the next page');
  await p.eval("localStorage.setItem('theme', '<img src=x>'); true");
  await p.goto(origin + '/');
  await p.waitFor("document.readyState === 'complete'");
  assert.equal(await p.eval('document.documentElement.dataset.theme'), 'dark', 'a junk stored theme should fall back to dark');
  await assertClean(p, 'toggle');
  await p.close();
});

test('mobile nav opens and closes, and reports its state', async () => {
  const p = await open('nav', 375, 812, true);
  const state = () => p.eval("[document.getElementById('nav-mobile').classList.contains('hidden'), document.getElementById('nav-hamburger').getAttribute('aria-expanded')]");
  assert.deepEqual(await state(), [true, 'false']);
  await p.eval("document.getElementById('nav-hamburger').click(); true");
  assert.deepEqual(await state(), [false, 'true']);
  await p.eval("document.getElementById('nav-hamburger').click(); true");
  assert.deepEqual(await state(), [true, 'false']);
  await assertClean(p, 'nav');
  await p.close();
});

test('contact form: opens, validates, posts to Netlify Forms, closes on Escape', async () => {
  server.posts.length = 0;
  const p = await open('contact', 375, 812, true);
  const isOpen = () => p.eval("document.getElementById('contact-popup').classList.contains('is-open')");
  assert.equal(await isOpen(), false);
  await p.eval("document.getElementById('contact').click(); true");
  assert.equal(await isOpen(), true, 'popup did not open');
  assert.equal(await p.eval("document.getElementById('contact').getAttribute('aria-expanded')"), 'true');

  // Invalid email: nothing is sent.
  await p.eval(`{ const f = document.getElementById('contactme'); f.elements.email.value = 'not-an-email'; f.elements.message.value = 'hi';
    f.requestSubmit(); } true`);
  await sleep(300);
  assert.equal(server.posts.length, 0, 'invalid form was submitted');

  // Valid: posted urlencoded to / with the Netlify form-name, and the honeypot left empty.
  await p.eval(`{ const f = document.getElementById('contactme'); f.elements.email.value = 'visitor@example.com'; f.elements.message.value = 'Hello & welcome';
    f.requestSubmit(); } true`);
  await p.waitFor("/Thanks/.test(document.getElementById('contact-status').textContent)", 5000);
  assert.equal(server.posts.length, 1);
  const { url, type, body } = server.posts[0];
  assert.equal(url, '/');
  assert.match(type, /application\/x-www-form-urlencoded/);
  const sent = new URLSearchParams(body);
  assert.equal(sent.get('form-name'), 'contact');
  assert.equal(sent.get('email'), 'visitor@example.com');
  assert.equal(sent.get('message'), 'Hello & welcome');
  assert.equal(sent.get('bot-field'), '');

  await p.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true");
  assert.equal(await isOpen(), false, 'Escape did not close the popup');
  await assertClean(p, 'contact');
  await p.close();
});

test('contact form shows an error when the post fails', async () => {
  const p = await open('contact-fail', 375, 812, true);
  await p.eval(`window.fetch = () => Promise.resolve(new Response('', { status: 500 }));
    document.getElementById('contact').click();
    { const f = document.getElementById('contactme'); f.elements.email.value = 'a@b.co'; f.elements.message.value = 'x'; f.requestSubmit(); } true`);
  await p.waitFor("/Couldn't send/.test(document.getElementById('contact-status').textContent)", 5000);
  assert.equal(await p.eval("document.querySelector('#contactme button[type=submit]').disabled"), false, 'submit stays disabled after a failure');
  await p.close();
});

test('projects: the five Auragika apps come first and link to their live sites', async () => {
  const p = await open('projects', 1280, 900, false, '/projects/');
  const cards = await p.eval("[...document.querySelectorAll('.proj-card')].map(c => [c.querySelector('.proj-title').textContent.trim(), c.querySelector('.proj-link').getAttribute('href')])");
  assert.deepEqual(cards.slice(0, 5), [
    ['QuizClash', 'https://quizclash.auragika.com/'],
    ['Auragika', 'https://auragika.com/'],
    ['Cadence', 'https://cadence.auragika.com/'],
    ['Pebble', 'https://pebble.auragika.com/'],
    ['Grove', 'https://grove.auragika.com/'],
  ]);
  assert.ok(!cards.some(([t]) => /Anuragika Routine|Finance Tracker|Auragika Universe/.test(t)), 'old project names still listed');
  await p.close();
});

test('about: no Student headline, Auragika is the current role above Swiggy', async () => {
  const p = await open('about', 1280, 900, false, '/about/');
  const text = await p.eval('document.body.innerText');
  assert.doesNotMatch(text, /Student/);
  const items = await p.eval("[...document.querySelectorAll('.resume-item')].filter(e => e.querySelector('h5')).map(e => [e.querySelector('h4').textContent.trim(), e.querySelector('h5').textContent.trim()])");
  assert.deepEqual(items.slice(0, 2), [
    ['Auragika · Domain Partner', 'Jul 2026 – Present'],
    ['Swiggy · Instamart Supply Chain', 'May 2023 – Jun 2026'],
  ]);
  await p.close();
});

test('home: the Tinkering link goes to auragika.com', async () => {
  const p = await open('home', 1280, 900, false);
  assert.equal(await p.eval("[...document.querySelectorAll('.hero-cta a')].find(a => /Tinkering/.test(a.textContent))?.getAttribute('href')"), 'https://auragika.com/');
  await p.close();
});

test('blog post: reading progress follows the scroll, copy buttons and TOC work without inline scripts', async () => {
  const p = await open('blog', 1280, 900, false, '/blogs/andromeda-rice/');
  assert.equal(await p.eval("document.querySelectorAll('script:not([src])').length"), 0, 'inline script on a blog page');
  await p.eval('scrollTo(0, document.body.scrollHeight / 2); true');
  await p.waitFor("parseFloat(document.getElementById('progress-fill').style.width) > 10", 3000);
  await p.waitFor("document.querySelectorAll('.andromeda-blog-content .section.visible').length > 0", 3000);
  await assertClean(p, 'blog');
  await p.close();
});

test('Building Auragika series: listed newest first, every part renders, links between parts resolve', async () => {
  const p = await open('series-index', 1280, 900, false, '/blogs/');
  const links = await p.eval("[...document.querySelectorAll('.blog-card')].slice(0, 5).map(a => new URL(a.href).pathname)");
  assert.deepEqual(links, [...SERIES].reverse(), 'the five parts should lead the blog list, Part 5 first');
  await p.close();
  for (const [i, url] of SERIES.entries()) {
    const page = await open(`series ${i + 1}`, 375, 812, true, url);
    assert.match(await page.eval("document.querySelector('.hero-meta')?.textContent || ''"), new RegExp(`Part ${i + 1} of 5`));
    // Every diagram has an accessible title, and every in-series link points at a real page.
    assert.equal(await page.eval("[...document.querySelectorAll('.diagram svg')].filter(s => !s.querySelector('title')).length"), 0, `${url}: diagram without a title`);
    const internal = await page.eval("[...new Set([...document.querySelectorAll('.andromeda-blog-content a')].map(a => new URL(a.href)).filter(u => u.origin === location.origin && u.pathname.startsWith('/blogs/')).map(u => u.pathname))]");
    assert.ok(internal.length >= 4, `${url}: expected links to the other parts, found ${internal.length}`);
    for (const href of internal) assert.equal((await fetch(origin + href)).status, 200, `${url} links to missing ${href}`);
    await page.close();
  }
});
