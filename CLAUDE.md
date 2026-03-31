# CLAUDE.md — Anurag Kar's Personal Portfolio (Devon)

## Project Overview
Hugo-based static portfolio website for Anurag Kar, hosted on Netlify at `https://anuragkar.netlify.app/`. Custom-built (no external theme). Built with Bootstrap 5 + custom SCSS/JS.

## Architecture
- **Framework**: Hugo 0.105.0 (static site generator)
- **CSS**: SCSS compiled by Hugo (`assets/scss/site.scss` → minified CSS)
- **JS**: `assets/js/site.js` + `bootstrap.min.js` + `smtp.js` → minified bundle
- **Content**: All data in `data/*.toml` — never edit content here
- **Routing**: Hugo custom output formats (About → `/about/`, Blogs → `/blogs/`, Projects → `/projects/`)
- **PWA**: Service worker at `assets/service_worker.js`, manifest at `assets/metadata/manifest.json`

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
| `assets/js/site.js` | Scroll effects, IntersectionObserver, cookie consent, email |
| `layouts/partials/header.html` | `<head>` — CSS, fonts, meta |
| `layouts/partials/intro.html` | Hero section template |
| `layouts/index.project.html` | Projects page template |
| `layouts/index.blog.html` | Blog page template |

## Development Commands
```bash
hugo server          # local dev (runs on :1313)
hugo --gc --minify   # production build
npm install          # install Bootstrap, PostCSS dependencies
```

## Rules
- **Do not change TOML data files** — content is fixed
- **Do not change theme** — custom-built, no external theme
- **Bootstrap 5 SCSS** is imported partially in `site.scss` (not full bootstrap)
- **CSS custom properties** are defined in `_default.scss` — use vars, not hardcoded colors
- **Scroll animations**: use `.animate-on-scroll` class + IntersectionObserver in `site.js`
- **Glass cards**: use `.glass-card` utility or override `.card` within section scopes
- **No jQuery** — vanilla JS only (Bootstrap 5 uses Popper directly)
- Service worker in `assets/service_worker.js` must stay at root scope for PWA

## Known Issues
- `site.js` contains plaintext SMTP credentials — do not expose in server logs
- `index.project.html` uses `id="blog"` (copy-paste bug, corrected to `id="projects"`)
