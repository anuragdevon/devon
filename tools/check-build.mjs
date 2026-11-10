// Static checks on a production build. Run a build first, then:
//   node tools/check-build.mjs [dir]        (dir defaults to .build; `npm test` does both)
// Checks:
//   - the pages and files a Netlify deploy needs are there
//   - static/_headers carries a strict CSP, the security headers and the cache rules
//   - no inline <script> and no on…= handlers, so the CSP can stay script-src 'self'
//   - every local CSS/JS file is fingerprinted and has SRI (the immutable cache rule and the
//     service worker's cache-first rule depend on the hash)
//   - no credentials or dead third-party scripts (SMTP, Google Analytics UA) in the output
//   - target=_blank links carry rel=noopener, images carry alt
//   - the contact form is a Netlify form with a honeypot
// Zero dependencies.
import fs from 'node:fs';
import path from 'node:path';

const PUB = path.resolve(process.argv[2] || '.build');
const problems = [];
const read = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const exists = f => fs.existsSync(path.join(PUB, f));

if (!fs.existsSync(PUB)) {
  console.error(`check-build: ${PUB} doesn't exist; build first (npm run build:test)`);
  process.exit(1);
}

for (const f of ['index.html', '404.html', 'about/index.html', 'projects/index.html', 'blogs/index.html',
  '_headers', 'service_worker.js', 'robots.txt', 'sitemap.xml', 'metadata/manifest.json']) {
  if (!exists(f)) problems.push(`${f} is missing`);
}

// ---- headers
if (exists('_headers')) {
  const headers = read('_headers');
  const csp = (headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m) || [])[1] || '';
  if (!csp) problems.push('_headers has no Content-Security-Policy');
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"]) {
    if (!csp.includes(d)) problems.push(`CSP lacks ${d}`);
  }
  const scriptSrc = (csp.match(/script-src ([^;]+)/) || [])[1] || '';
  if (scriptSrc.trim() !== "'self'") problems.push(`CSP script-src must be exactly 'self' (is "${scriptSrc.trim()}")`);
  for (const h of ['X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff', 'Referrer-Policy:', 'Permissions-Policy:', 'Strict-Transport-Security:']) {
    if (!headers.includes(h)) problems.push(`_headers lacks ${h}`);
  }
  for (const dir of ['css', 'js']) {
    if (!new RegExp(`^/${dir}/\\*\\s*\\n\\s*Cache-Control: public, max-age=31536000, immutable`, 'm').test(headers)) {
      problems.push(`_headers lacks the immutable cache rule for /${dir}/*`);
    }
  }
  if (!/^\/service_worker\.js\s*\n\s*Cache-Control: no-cache/m.test(headers)) problems.push('_headers lacks Cache-Control: no-cache for /service_worker.js');
}

// ---- pages
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')) || []).slice(1).find(v => v !== undefined);
const isLocal = u => !!u && !/^(https?:)?\/\//i.test(u) && !/^(data|mailto|tel):/i.test(u);
const HASHED = /\.[0-9a-f]{32,}\.(css|js)$/;
const pages = fs.readdirSync(PUB, { recursive: true }).filter(f => f.endsWith('.html'));

for (const page of pages) {
  const html = read(page);
  for (const tag of html.match(/<script\b[^>]*>/gi) || []) {
    const src = attr(tag, 'src');
    if (!src) { problems.push(`${page}: inline <script> (move it to assets/js)`); continue; }
    if (isLocal(src)) {
      if (!HASHED.test(src)) problems.push(`${page}: ${src} isn't fingerprinted`);
      if (!attr(tag, 'integrity')) problems.push(`${page}: ${src} has no integrity (SRI)`);
    } else if (!/^https:\/\/fonts\.googleapis\.com\//.test(src)) {
      problems.push(`${page}: third-party script ${src} (not allowed by the CSP)`);
    }
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const href = attr(tag, 'href') || '';
    if (attr(tag, 'rel') !== 'stylesheet' || !isLocal(href)) continue;
    if (!HASHED.test(href)) problems.push(`${page}: ${href} isn't fingerprinted`);
    if (!attr(tag, 'integrity')) problems.push(`${page}: ${href} has no integrity (SRI)`);
  }
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) problems.push(`${page}: inline event handler (on…=); add a listener in assets/js`);
  for (const tag of html.match(/<a\b[^>]*target=["']?_blank[^>]*>/gi) || []) {
    if (!/noopener|noreferrer/.test(attr(tag, 'rel') || '')) problems.push(`${page}: target=_blank link without rel=noopener: ${tag.slice(0, 120)}`);
  }
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    if (attr(tag, 'alt') === undefined) problems.push(`${page}: <img> without alt: ${tag.slice(0, 120)}`);
  }
}

// ---- secrets and dead third parties, in every page and script we ship
const shipped = fs.readdirSync(PUB, { recursive: true }).filter(f => /\.(html|js|json)$/.test(f));
for (const f of shipped) {
  const text = read(f);
  if (/smtpjs\.com|smtp\.gmail\.com/i.test(text)) problems.push(`${f}: SmtpJS / SMTP host in shipped output (mail credentials leak)`);
  // Scripts only: blog posts legitimately quote things like CTF flags after "Password:".
  if (f.endsWith('.js') && /\b(Password|apiKey|secret)\s*:\s*['"][^'"]+['"]/i.test(text)) problems.push(`${f}: hard-coded credential in a shipped script`);
  if (/UA-\d{4,}-\d+|google-analytics\.com\/analytics\.js/.test(text)) problems.push(`${f}: Universal Analytics (shut down in 2023)`);
}

// ---- contact form
if (exists('index.html')) {
  const form = (read('index.html').match(/<form\b[^>]*id=["']?contactme[^>]*>/i) || [])[0] || '';
  if (!form) problems.push('index.html: contact form missing');
  else {
    if (attr(form, 'data-netlify') !== 'true') problems.push('contact form lacks data-netlify=true');
    if (attr(form, 'netlify-honeypot') !== 'bot-field') problems.push('contact form lacks the netlify-honeypot');
  }
}

if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s)\n- ` + problems.join('\n- '));
  process.exit(1);
}
console.log(`check-build: ok (${pages.length} pages, headers in place, no inline scripts, no secrets)`);
