# CLAUDE.md — Anurag Kar's Personal Portfolio (Devon)

## Project Overview
Hugo-based static portfolio website for Anurag Kar, hosted on Netlify at `https://anuragkar.netlify.app/`. Custom-built (no external theme). Built with Bootstrap 5 + custom SCSS/JS.

## Architecture
- **Framework**: Hugo 0.163.3 extended (pinned in `netlify.toml` and `.github/workflows/ci.yml`; keep them equal)
- **CSS**: SCSS compiled by Hugo (`assets/scss/site.scss` → minified CSS)
- **JS**: `assets/js/site.js` + `blog.js` → minified, fingerprinted bundle with SRI; `theme-init.js` loads blocking in `<head>` (pre-paint theme). No Bootstrap JS.
- **Content**: All data in `data/*.toml`; blog post sources in `blog-src/*.html` (rendered by `layouts/partials/blog-post.html`)
- **Study notes**: Markdown in `content/study/<track>/*.md` (front matter: title, subtitle, description, date, track, weight). Tracks are listed in `content/study/_index.md`. `layouts/study/` renders them in the blog-post look; the render hooks in `layouts/_markup/` turn `##` into numbered sections, `> [!TIP] Title` alerts into callouts, plain quotes into "say it like this" examples, and code fences into copyable code blocks. Adding a note = one Markdown file
- **Routing**: Hugo custom output formats (About → `/about/`, Blogs → `/blogs/`, Projects → `/projects/`); `/study/` is a normal Hugo section
- **PWA**: Service worker at `static/service_worker.js` (network-first pages, cache-first fingerprinted assets), manifest at `assets/metadata/manifest.json`
- **Security**: CSP + security/cache headers in `static/_headers`. Contact form uses Netlify Forms (no credentials client-side)

## Design System
- **Theme**: Dark glassmorphism — deep navy (`#080c14`) background, glass cards with `backdrop-filter: blur`
- **Primary accent**: `#149ddd` (cyan)
- **CSS variables**: Defined in `_default.scss` under `:root { ... }`
- **Typography**: Inter (Google Fonts) + Open Sans fallback; monospace for typing animations
- **Animations**: CSS typing (hero), float (laptop), scroll-reveal via IntersectionObserver (JS)

## Key Files
| File | Purpose |
|------|---------|
| `assets/scss/_default.scss` | CSS variables, global styles, buttons, scroll-reveal |
| `assets/scss/_navbar.scss` | Glass navbar |
| `assets/scss/_profile.scss` | Hero section, typing animation |
| `assets/scss/_about.scss` | About + resume/timeline |
| `assets/scss/_blog.scss` | Blog glass cards |
| `assets/scss/_project.scss` | Project glass cards |
| `assets/scss/_contact.scss` | Glass contact form popup |
| `assets/scss/_footer.scss` | Footer |
| `assets/js/site.js` | Theme toggle, nav, scroll effects, scroll reveal, contact form (Netlify Forms), SW registration |
| `assets/js/blog.js` | Blog post progress bar, section reveal, TOC, copy buttons |
| `static/_headers` | CSP, security and cache headers |
| `tools/check-build.mjs` | Static checks on a build (CSP, SRI, no inline scripts, no secrets) |
| `tests/browser/` | Headless-Chrome tests of the build served with the real headers |
| `layouts/partials/header.html` | `<head>` — CSS, fonts, meta |
| `layouts/partials/intro.html` | Hero section template |
| `layouts/index.project.html` | Projects page template |
| `layouts/index.blog.html` | Blog page template |
| `layouts/study/` | Study notes list and note templates |
| `layouts/_markup/` | Markdown render hooks (headings, callouts, code, tables) |

## Development Commands
```bash
hugo server          # local dev (runs on :1313)
hugo --gc --minify   # production build
npm install          # install Bootstrap (SCSS source only)
npm test             # build (.build/, --panicOnWarning) + check-build + browser tests (needs Chrome, Node 22+)
```
`hugo server` doesn't send `static/_headers`, so CSP problems only show in `npm test`.

## Rules
- **Do not change TOML data files** — content is fixed
- **Do not change theme** — custom-built, no external theme
- **Bootstrap 5 SCSS** is imported partially in `site.scss` (not full bootstrap)
- **CSS custom properties** are defined in `_default.scss` — use vars, not hardcoded colors
- **Scroll animations**: use `.animate-on-scroll` class + IntersectionObserver in `site.js`
- **Glass cards**: use `.glass-card` utility or override `.card` within section scopes
- **No jQuery, no Bootstrap JS** — vanilla JS only
- **No inline `<script>` or `on…=` handlers** — CSP is `script-src 'self'`; attach listeners in `assets/js/`. New third-party hosts need a CSP entry in `static/_headers`
- **Local CSS/JS must go through `minify | fingerprint`** and carry `integrity` (SRI); `/css/*` and `/js/*` are cached immutable
- Run `npm test` before committing; extend `tools/check-build.mjs` / `tests/browser` when adding a rule or feature
- **Study notes stay generic**: no employer names, personal stories or real metrics (`check-build` rejects company names)
- Service worker `static/service_worker.js` must stay at `/service_worker.js` (root scope); bump `CACHE` when its rules change

## Known Issues
- The old SmtpJS Gmail password (removed) is still in git history — it must be rotated
- Netlify Forms must be enabled for the site (Forms → enable form detection) for the contact form to receive submissions
- `public/` is tracked in git but Netlify builds its own; tests build to `.build/` (gitignored)
