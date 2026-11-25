function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function initRouter({ backdrop, panel, bodyEl, topbarLabelEl, closeBtn, projects, art }) {
  if (!backdrop || !panel || !bodyEl) {
    return { openProject: () => {}, openArtCollection: () => {} };
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  let lastTrigger = null;

  function getFocusable() {
    return Array.from(
      panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
  }

  function closePanel(updateHash = true) {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.style.overflow = '';

    if (updateHash && (window.location.hash.startsWith('#/work/') || window.location.hash === '#/art')) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }

    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
      lastTrigger = null;
    }
  }

  function renderProject(project) {
    if (topbarLabelEl) topbarLabelEl.textContent = 'case file';
    const cf = project.caseFile || {};
    const stack = (project.tags || []).join(' · ').toLowerCase();
    const outputs = Array.isArray(project.outputImages) && project.outputImages.length
      ? `
        <div class="case-section">
          <h3 class="case-section-label">05 / output</h3>
          <div class="case-output-grid">
            ${project.outputImages
              .map(
                (src) =>
                  `<img class="case-output-img" src="${escapeHtml(src)}" alt="${escapeHtml(project.title)} output" loading="lazy" />`
              )
              .join('')}
          </div>
        </div>
      `
      : '';

    bodyEl.innerHTML = `
      <div class="case-meta">
        <div>
          <span class="case-meta-label">year</span>
          <span class="case-meta-val">${escapeHtml(project.year)}</span>
        </div>
        <div>
          <span class="case-meta-label">source</span>
          <a class="case-meta-val case-meta-link" href="${escapeHtml(project.repo)}" target="_blank" rel="noopener noreferrer">github repo ↗</a>
        </div>
      </div>

      <h2 id="case-title" class="case-title">${escapeHtml(project.title)}</h2>
      <p class="mono">${escapeHtml(stack)}</p>

      <div class="case-section">
        <h3 class="case-section-label">01 / problem</h3>
        <p class="case-prose">${escapeHtml(cf.problem)}</p>
      </div>

      <div class="case-section">
        <h3 class="case-section-label">02 / approach</h3>
        <p class="case-prose">${escapeHtml(cf.approach)}</p>
      </div>

      <div class="case-section">
        <h3 class="case-section-label">03 / architecture</h3>
        <p class="case-prose">${escapeHtml(cf.architecture)}</p>
      </div>

      <div class="case-section">
        <h3 class="case-section-label">04 / what i learned</h3>
        <p class="case-prose">${escapeHtml(cf.learned)}</p>
      </div>

      ${outputs}
    `;
  }

  function renderArtCollection() {
    if (topbarLabelEl) topbarLabelEl.textContent = 'art collection';
    const cards = (art || [])
      .map(
        (item) => `
        <figure class="art-card">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" />
          <figcaption class="art-card-caption">
            <span class="art-card-title">${escapeHtml(item.title)}</span>
            <span class="mono">${escapeHtml(item.medium)}</span>
          </figcaption>
        </figure>
      `
      )
      .join('');

    bodyEl.innerHTML = `
      <h2 id="case-title" class="case-title">sketchbook &amp; <span class="serif-italic">drawings</span></h2>
      <p class="mono" style="margin-bottom: 24px;">pencil, ink, and watercolor studies.</p>
      <div class="art-gallery-grid">${cards}</div>
    `;
  }

  function openProject(id, triggerEl) {
    const project = projectMap.get(id);
    if (!project) return;
    lastTrigger = triggerEl || document.activeElement;
    renderProject(project);
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    const targetHash = `#/work/${encodeURIComponent(id)}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }

    if (closeBtn) closeBtn.focus();
  }

  function openArtCollection(triggerEl) {
    lastTrigger = triggerEl || document.activeElement;
    renderArtCollection();
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    if (window.location.hash !== '#/art') {
      window.location.hash = '#/art';
    }

    if (closeBtn) closeBtn.focus();
  }

  function syncFromHash() {
    const hash = window.location.hash;
    if (hash === '#/art') {
      renderArtCollection();
      backdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
      return;
    }
    if (hash.startsWith('#/work/')) {
      const id = decodeURIComponent(hash.slice('#/work/'.length));
      if (projectMap.has(id)) {
        renderProject(projectMap.get(id));
        backdrop.hidden = false;
        document.body.style.overflow = 'hidden';
        if (closeBtn) closeBtn.focus();
        return;
      }
    }
    closePanel(false);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closePanel(true));
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closePanel(true);
  });

  document.addEventListener('keydown', (e) => {
    if (backdrop.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closePanel(true);
      return;
    }
    if (e.key === 'Tab') {
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('hashchange', syncFromHash);
  syncFromHash();

  return { openProject, openArtCollection };
}
