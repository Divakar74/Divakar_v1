import { initTheme } from './theme.js';
import { initGraph } from './graph.js';
import { initSearch } from './search.js';
import { initRouter } from './router.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function startChennaiClock(el, timeZone) {
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: timeZone || 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const update = () => {
    el.textContent = `chennai ${fmt.format(new Date())} ist`;
  };
  update();
  setInterval(update, 1000);
}

function initReveals() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  els.forEach((el) => io.observe(el));
}

function initNavAndMenus() {
  const nav = document.getElementById('site-nav');
  const menuBtn = document.getElementById('menu-toggle');
  const closeMenuBtn = document.getElementById('mobile-menu-close');
  const mobileMenu = document.getElementById('mobile-menu');

  const onScroll = () => {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenuOpen(open) {
    if (!mobileMenu || !menuBtn) return;
    mobileMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && closeMenuBtn) closeMenuBtn.focus();
    if (!open) menuBtn.focus();
  }

  if (menuBtn) menuBtn.addEventListener('click', () => setMenuOpen(true));
  if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => setMenuOpen(false));

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setMenuOpen(false));
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu && !mobileMenu.hidden) {
      setMenuOpen(false);
    }
  });
}

function initEasterEggs() {
  const gridOverlay = document.getElementById('grid-overlay');
  let buffer = '';

  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    if (e.key === 'g' && gridOverlay) {
      gridOverlay.classList.toggle('is-active');
    }

    if (/^[a-z]$/i.test(e.key)) {
      buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if (buffer === 'graph') {
        document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
        buffer = '';
      }
    }
  });
}

async function bootstrap() {
  initTheme(document.getElementById('theme-toggle'));
  initNavAndMenus();
  initEasterEggs();

  const [siteRes, projRes] = await Promise.all([
    fetch('./data/site.json'),
    fetch('./data/projects.json')
  ]);

  const site = await siteRes.json();
  const projects = await projRes.json();

  // Hydrate "now" strip
  const nowStatusEl = document.getElementById('now-status-text');
  if (nowStatusEl) nowStatusEl.textContent = `now: ${site.now.status}`;
  startChennaiClock(document.getElementById('now-clock'), site.now.timeZone);

  // Hydrate accessible hidden graph node list
  const srList = document.getElementById('graph-sr-list');
  if (srList) {
    srList.innerHTML = projects
      .map((p) => `<li><a href="#/work/${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a></li>`)
      .join('');
  }

  // Hydrate router first so openProject is available
  const router = initRouter({
    backdrop: document.getElementById('case-backdrop'),
    panel: document.getElementById('case-panel'),
    bodyEl: document.getElementById('case-body'),
    closeBtn: document.getElementById('case-close'),
    projects
  });

  // Hydrate editorial index table
  const indexEl = document.getElementById('projects-index');
  if (indexEl) {
    indexEl.innerHTML = projects
      .map((p) => {
        const preview = p.summary.startsWith('TODO:')
          ? 'open case file for notes & architecture diagram.'
          : p.summary;
        const tags = (p.tags || [])
          .map((t) => `<span class="tag">${escapeHtml(t.toLowerCase())}</span>`)
          .join('');
        return `
          <article class="index-row" tabindex="0" role="button" data-project-id="${escapeHtml(p.id)}" aria-label="Open case file for ${escapeHtml(p.title)}">
            <span class="index-num">${escapeHtml(p.index)}</span>
            <h3 class="index-title">${escapeHtml(p.title)}</h3>
            <div class="index-tags">${tags}</div>
            <span class="index-year">${escapeHtml(p.year)}</span>
            <p class="index-preview">${escapeHtml(preview)}</p>
          </article>
        `;
      })
      .join('');

    indexEl.querySelectorAll('.index-row').forEach((row) => {
      const open = () => router.openProject(row.dataset.projectId, row);
      row.addEventListener('click', open);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  // Hydrate About
  const aboutLead = document.getElementById('about-lead');
  const aboutBody = document.getElementById('about-body');
  const aboutFocus = document.getElementById('about-focus');
  if (aboutLead) aboutLead.textContent = site.about.lead;
  if (aboutBody) aboutBody.textContent = site.about.body;
  if (aboutFocus) {
    aboutFocus.innerHTML = site.about.focus
      .map((f) => `<span class="tag">${escapeHtml(f)}</span>`)
      .join('');
  }

  // Hydrate Contact
  const contactPrimary = document.getElementById('contact-primary');
  const contactNote = document.getElementById('contact-note');
  const contactSecondary = document.getElementById('contact-secondary');
  if (contactPrimary) {
    contactPrimary.href = site.contact.linkedin.url;
    contactPrimary.textContent = site.contact.linkedin.label;
  }
  if (contactNote) contactNote.textContent = site.contact.note;
  if (contactSecondary) {
    contactSecondary.innerHTML = `
      <a class="contact-link" href="${escapeHtml(site.contact.github.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.contact.github.label)} ↗</a>
      <a class="contact-link" href="${escapeHtml(site.contact.email.url)}">${escapeHtml(site.contact.email.label)}</a>
    `;
  }

  // Hydrate Footer marginalia
  const footerMeta = document.getElementById('footer-meta');
  if (footerMeta) {
    footerMeta.textContent = `${site.version} · last updated: ${site.buildDate}`;
  }

  // Initialize Graph & Search
  initGraph({
    canvas: document.getElementById('hero-canvas'),
    tooltip: document.getElementById('hero-tooltip'),
    projects,
    concepts: site.concepts,
    onSelectProject: (id) => router.openProject(id)
  });

  initSearch({
    input: document.getElementById('retrieval-input'),
    chipsEl: document.getElementById('retrieval-chips'),
    resultsEl: document.getElementById('retrieval-results'),
    projects,
    suggestions: site.searchSuggestions
  });

  initReveals();
}

bootstrap().catch((err) => {
  console.error('Failed to initialize portfolio:', err);
});
