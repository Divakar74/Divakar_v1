# divakar ramesh — knowledge graph portfolio

Personal portfolio for **Divakar Ramesh** ([Divakar74](https://github.com/Divakar74)), built with zero frameworks and zero build steps: plain HTML, CSS custom properties, and vanilla ES modules.

The site is designed as a **knowledge graph** crossed with a lab notebook:
- **Graph Hero (`/js/graph.js`)**: Hand-written force-directed canvas connecting projects and concepts with pointer/touch inspection and reduced-motion support.
- **Client-Side Retrieval Bar (`/js/search.js`)**: Weighted TF-IDF keyword index over `/data/projects.json` returning ranked "retrieved chunks" with highlighted tokens.
- **Case File Views (`/js/router.js`)**: Hash-routed (`#/work/<id>`) accessible slide-over panels with inline SVG architecture diagrams generated from project concept edges.

---

## Architecture

```
├── index.html          # Semantic landmarks, SEO/JSON-LD, noscript fallback
├── 404.html            # Custom disconnected-node 404 page
├── .nojekyll           # Bypasses Jekyll processing on GitHub Pages
├── assets/
│   └── favicon.svg
├── css/
│   ├── tokens.css      # Paper (light) & lab-at-night (dark) design tokens
│   ├── base.css        # Reset, grain overlay, reveals, accessibility
│   ├── layout.css      # 12-col grid, section headers, marginalia
│   └── components.css  # Nav, hero, search, index table, case-file panel
├── js/
│   ├── main.js         # Data hydration, Chennai IST clock, easter eggs
│   ├── graph.js        # Force-directed canvas graph
│   ├── search.js       # Client-side TF-IDF retrieval bar
│   ├── router.js       # Hash router + focus-trapped slide-over
│   └── theme.js        # prefers-color-scheme + localStorage theme toggle
└── data/
    ├── site.json       # Bio, concepts, contact links, metadata
    └── projects.json   # Single source of truth for projects & case files
```

---

## How to Add a Project

Everything—the hero graph, the search index, the editorial index table, and the case-file drawer—is generated from `/data/projects.json`. To add a new project, **only edit `/data/projects.json`**:

1. Append a new object to the JSON array:
   ```json
   {
     "id": "my-new-project",
     "index": "07",
     "title": "My New Project",
     "year": "2026",
     "status": "shipped",
     "role": "author",
     "summary": "one-line summary of what it does.",
     "tags": ["Python", "RAG"],
     "concepts": ["Python", "RAG", "Knowledge Graph"],
     "repo": "https://github.com/Divakar74/my-new-project",
     "demo": null,
     "caseFile": {
       "problem": "...",
       "approach": "...",
       "architecture": "...",
       "learned": "..."
     }
   }
   ```
2. If you introduce a new concept that isn't already in `/data/site.json`'s `"concepts"` array, add it there so it appears as a concept node in the hero graph.

---

## GitHub Pages Deploy Steps

1. Create a public repository named **`Divakar74.github.io`** under your GitHub account.
2. Push this directory to the `main` branch:
   ```bash
   git init -b main
   git add .
   git commit -m "feat: initial knowledge graph portfolio"
   git remote add origin https://github.com/Divakar74/Divakar74.github.io.git
   git push -u origin main
   ```
3. In GitHub → **Settings → Pages**, set **Source** to **Deploy from a branch**, select **`main`** and **`/ (root)`**, and save.
4. Your site will be live at **`https://divakar74.github.io/`**.
