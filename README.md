# Devon

> Anurag Kar's personal website — built to showcase projects, blogs, and the story behind the work.

A multi-page personal portfolio site built with Hugo. Clean minimalist design, responsive layout, and multiple content sections powered by Hugo's custom output formats — no JavaScript framework, no build pipeline.

Live at [anuragkar.netlify.app](https://anuragkar.netlify.app)

---

## Preview

```
┌─────────────────────────────────────────┐
│  anuragdevon                            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │   Hi, I'm Anurag.                 │  │
│  │   Software engineer.              │  │
│  │   I build things.                 │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  About · Projects · Blogs              │
└─────────────────────────────────────────┘
```

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Site generator | Hugo | Multi-output format config for section pages |
| Styling | SCSS | Custom themes, responsive layout |
| Deploy | Netlify | Auto-deploy on push |

---

## Project Structure

```
devon/
├── assets/
│   ├── css/               ← SCSS stylesheets
│   └── js/                ← Vanilla JavaScript
├── layouts/
│   └── _default/
│       ├── baseof.html    ← Base HTML shell
│       ├── index.html     ← Home page
│       ├── index.about.html     ← About page (/about)
│       ├── index.blog.html      ← Blog listing (/blogs)
│       ├── index.project.html   ← Projects listing (/projects)
│       └── index.andromedablog.html  ← Andromeda Rice blog
├── data/                  ← YAML/JSON data files (projects, blog posts)
├── static/                ← Static assets (images, icons, fonts)
├── config.toml            ← Hugo config with custom output formats
└── netlify.toml           ← Build settings
```

---

## Pages

| Page | Path | Content |
|---|---|---|
| Home | `/` | Hero, intro, links to all sections |
| About | `/about` | Background, skills, and story |
| Projects | `/projects` | Portfolio of open-source and personal projects |
| Blogs | `/blogs` | Writing — engineering, productivity, and more |
| Andromeda Rice | `/blogs/andromeda-rice` | Dedicated blog section |

---

## Local Development

```bash
hugo server
```

Open `http://localhost:1313`.

---

## Deploy to Netlify

**1. Import the repo** — [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git → select `anuragdevon/devon`.

**2. Build settings** (picked up from `netlify.toml`):

| Setting | Value |
|---|---|
| Build command | `hugo --minify` |
| Publish directory | `public` |

**3. Deploy** — every push to `main` triggers a redeploy.

---

## License

MIT
