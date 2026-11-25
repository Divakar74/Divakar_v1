function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderProseOrTodo(text) {
  const val = String(text || '').trim();
  if (!val || val.startsWith('TODO:')) {
    return `<p class="case-todo">${escapeHtml(val || 'TODO: add section notes')}</p>`;
  }
  return `<p class="case-prose">${escapeHtml(val)}</p>`;
}

function renderArchitectureSvg(project) {
  const concepts = project.concepts || [];
  const width = 560;
  const height = Math.max(160, concepts.length * 36 + 24);
  const rootX = 115;
  const rootY = height / 2;
  const targetX = 410;

  const lines = concepts
    .map((c, idx) => {
      const y = ((idx + 1) / (concepts.length + 1)) * height;
      return `
        <line x1="${rootX}" y1="${rootY}" x2="${targetX}" y2="${y}" stroke="var(--line)" stroke-width="1.2" />
        <circle cx="${targetX}" cy="${y}" r="4.5" fill="var(--muted)" />
        <text x="${targetX + 12}" y="${y + 4}" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11">${escapeHtml(c.toLowerCase())}</text>
      `;
    })
    .join('');

  return `
    <div class="case-arch-diagram" aria-label="Architecture node diagram for ${escapeHtml(project.title)}">
      <svg viewBox="0 0 ${width} ${height}" role="img">
        ${lines}
        <circle cx="${rootX}" cy="${rootY}" r="9" fill="var(--accent)" />
        <text x="${rootX}" y="${rootY + 24}" text-anchor="middle" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11">${escapeHtml(project.id)}</text>
      </svg>
    </div>
  `;
}

export function initRouter({ backdrop, panel, bodyEl, closeBtn, projects }) {
  if (!backdrop || !panel || !bodyEl) return { openProject: () => {} };

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

    if (updateHash && window.location.hash.startsWith('#/work/')) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }

    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
      lastTrigger = null;
    }
  }

  function renderProject(project) {
    const cf = project.caseFile || {};
    const stack = (project.tags || []).join(' · ').toLowerCase();

    bodyEl.innerHTML = `
      <div class="case-meta">
        <div>
          <span class="case-meta-label">year</span>
          <span class="case-meta-val">${escapeHtml(project.year)}</span>
        </div>
        <div>
          <span class="case-meta-label">role</span>
          <span class="case-meta-val">${escapeHtml(project.role)}</span>
        </div>
        <div>
          <span class="case-meta-label">status</span>
          <span class="case-meta-val">${escapeHtml(project.status)}</span>
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
        ${renderProseOrTodo(cf.problem)}
      </div>

      <div class="case-section">
        <h3 class="case-section-label">02 / approach</h3>
        ${renderProseOrTodo(cf.approach)}
      </div>

      <div class="case-section">
        <h3 class="case-section-label">03 / architecture</h3>
        ${renderProseOrTodo(cf.architecture)}
        ${renderArchitectureSvg(project)}
      </div>

      <div class="case-section">
        <h3 class="case-section-label">04 / what i learned</h3>
        ${renderProseOrTodo(cf.learned)}
      </div>
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

  function syncFromHash() {
    const hash = window.location.hash;
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

  return { openProject };
}
