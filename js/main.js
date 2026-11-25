import { initTheme } from './theme.js';
import { initRouter } from './router.js';
import { initSamurai } from './samurai.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function renderProjectsTable(indexEl, projects, onOpen) {
  if (!indexEl) return;

  indexEl.innerHTML = projects
    .map((p) => {
      const tags = (p.tags || [])
        .map((t) => `<span class="tag">${escapeHtml(t.toLowerCase())}</span>`)
        .join('');
      return `
        <article class="index-row" tabindex="0" role="button" data-project-id="${escapeHtml(p.id)}" aria-label="Open case file for ${escapeHtml(p.title)}">
          <span class="index-num">${escapeHtml(p.index)}</span>
          <h3 class="index-title">${escapeHtml(p.title)}</h3>
          <div class="index-tags">${tags}</div>
          <span class="index-year">${escapeHtml(p.year)}</span>
          <p class="index-preview">${escapeHtml(p.summary)}</p>
        </article>
      `;
    })
    .join('');

  indexEl.querySelectorAll('.index-row').forEach((row) => {
    const open = () => onOpen(row.dataset.projectId, row);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

async function bootstrap() {
  initTheme(document.getElementById('theme-toggle'));
  initNavAndMenus();

  const [siteRes, projRes] = await Promise.all([
    fetch('./data/site.json'),
    fetch('./data/projects.json')
  ]);

  const site = await siteRes.json();
  const projects = await projRes.json();

  // Hydrate Hero copy
  const heroEyebrow = document.getElementById('hero-eyebrow');
  const heroLead = document.getElementById('hero-lead');
  if (heroEyebrow) heroEyebrow.textContent = site.tagline;
  if (heroLead) heroLead.textContent = site.heroLead;

  // Hydrate Router (Case Files + Art Collection)
  const router = initRouter({
    backdrop: document.getElementById('case-backdrop'),
    panel: document.getElementById('case-panel'),
    bodyEl: document.getElementById('case-body'),
    topbarLabelEl: document.getElementById('case-topbar-label'),
    closeBtn: document.getElementById('case-close'),
    projects,
    art: site.art || []
  });

  // 01 · Hydrate Experience & Education
  const expEduGrid = document.getElementById('exp-edu-grid');
  if (expEduGrid && site.experience?.length && site.education) {
    const exp = site.experience[0];
    const edu = site.education;
    expEduGrid.innerHTML = `
      <article class="exp-card">
        <div class="exp-meta">
          <span class="mono">${escapeHtml(exp.period.toLowerCase())}</span>
          <span class="mono">${escapeHtml(exp.location.toLowerCase())}</span>
        </div>
        <h3 class="exp-title">${escapeHtml(exp.role)}</h3>
        <p class="exp-org">${escapeHtml(exp.org)}</p>
        <p class="exp-desc">${escapeHtml(exp.summary)}</p>
      </article>

      <article class="exp-card">
        <div class="exp-meta">
          <span class="mono">${escapeHtml(edu.period.toLowerCase())}</span>
          <span class="mono">${escapeHtml(edu.metric.toLowerCase())}</span>
        </div>
        <h3 class="exp-title">${escapeHtml(edu.degree)}</h3>
        <p class="exp-org">${escapeHtml(edu.institution)}</p>
        <ul class="exp-list">
          <li>${escapeHtml(edu.location.toLowerCase())}</li>
          <li>${escapeHtml(edu.achievement.toLowerCase())}</li>
        </ul>
      </article>
    `;
  }

  // 02 · Hydrate Personal Projects
  renderProjectsTable(
    document.getElementById('projects-index'),
    projects,
    (id, el) => router.openProject(id, el)
  );

  // 03 · Hydrate About & Skills
  const aboutLead = document.getElementById('about-lead');
  const aboutBody = document.getElementById('about-body');
  const aboutSkills = document.getElementById('about-skills');
  if (aboutLead) aboutLead.textContent = site.about.lead;
  if (aboutBody) aboutBody.textContent = site.about.body;
  if (aboutSkills) {
    aboutSkills.innerHTML = (site.about.skills || [])
      .map((s) => `<span class="tag">${escapeHtml(s.toLowerCase())}</span>`)
      .join('');
  }

  // 04 · Hydrate Art Preview + Explore Collection
  const artPreviewGrid = document.getElementById('art-preview-grid');
  const exploreArtBtn = document.getElementById('explore-art-btn');
  if (artPreviewGrid && Array.isArray(site.art)) {
    artPreviewGrid.innerHTML = site.art
      .slice(0, 3)
      .map(
        (item) => `
        <figure class="art-card" tabindex="0" role="button" aria-label="View ${escapeHtml(item.title)} in art collection">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <figcaption class="art-card-caption">
            <span class="art-card-title">${escapeHtml(item.title)}</span>
            <span class="mono">${escapeHtml(item.medium)}</span>
          </figcaption>
        </figure>
      `
      )
      .join('');

    artPreviewGrid.querySelectorAll('.art-card').forEach((card) => {
      card.addEventListener('click', () => router.openArtCollection(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.openArtCollection(card);
        }
      });
    });
  }

  if (exploreArtBtn) {
    exploreArtBtn.addEventListener('click', () => router.openArtCollection(exploreArtBtn));
  }

  // Initialize Wandering Samurai Duo
  initSamurai(
    document.getElementById('samurai-a'),
    document.getElementById('samurai-b'),
    document.getElementById('site-footer')
  );

  initReveals();
}

bootstrap().catch((err) => {
  console.error('Failed to initialize portfolio:', err);
});
