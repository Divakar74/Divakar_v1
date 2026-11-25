function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.#-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightTokens(text, queryTokens) {
  const safe = escapeHtml(text);
  if (!queryTokens.length) return safe;
  const pattern = new RegExp(
    `(${queryTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  return safe.replace(pattern, '<mark class="hl">$1</mark>');
}

export function initSearch({ input, chipsEl, resultsEl, projects, suggestions }) {
  if (!input || !resultsEl) return;

  // Build weighted TF-IDF-style document vectors
  const docs = projects.map((p) => {
    const fields = [
      { text: p.title, weight: 3.2 },
      { text: (p.tags || []).join(' '), weight: 2.6 },
      { text: (p.concepts || []).join(' '), weight: 2.6 },
      { text: p.summary, weight: 1.8 },
      {
        text: Object.values(p.caseFile || {})
          .filter((v) => v && !String(v).startsWith('TODO:'))
          .join(' '),
        weight: 1.0
      }
    ];

    const tf = new Map();
    fields.forEach(({ text, weight }) => {
      tokenize(text).forEach((tok) => {
        tf.set(tok, (tf.get(tok) || 0) + weight);
      });
    });

    return { project: p, tf };
  });

  const df = new Map();
  docs.forEach(({ tf }) => {
    tf.forEach((_, tok) => df.set(tok, (df.get(tok) || 0) + 1));
  });

  const N = docs.length || 1;

  function scoreQuery(query) {
    const qTokens = tokenize(query);
    if (!qTokens.length) return { qTokens: [], matches: [] };

    const scored = docs.map(({ project, tf }) => {
      let raw = 0;
      let maxPossible = 0;

      qTokens.forEach((qt) => {
        const idf = Math.log(1 + N / (1 + (df.get(qt) || 0)));
        maxPossible += 3.2 * idf;

        // Exact or prefix token match
        let bestTokWeight = 0;
        tf.forEach((w, docTok) => {
          if (docTok === qt) {
            bestTokWeight = Math.max(bestTokWeight, w);
          } else if (docTok.includes(qt) || qt.includes(docTok)) {
            bestTokWeight = Math.max(bestTokWeight, w * 0.65);
          }
        });
        raw += bestTokWeight * idf;
      });

      const norm = maxPossible > 0 ? Math.min(0.99, raw / (maxPossible * 0.85)) : 0;
      return { project, score: norm };
    });

    const matches = scored
      .filter((m) => m.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return { qTokens, matches };
  }

  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = `<span class="mono">try:</span>` + (suggestions || [])
      .map((s) => `<button type="button" class="chip-btn" data-query="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
      .join('');

    chipsEl.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.query || '';
        runSearch(input.value);
        input.focus();
      });
    });
  }

  function runSearch(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      resultsEl.innerHTML = '';
      if (chipsEl) chipsEl.hidden = false;
      return;
    }

    if (chipsEl) chipsEl.hidden = true;
    const { qTokens, matches } = scoreQuery(trimmed);

    if (!matches.length) {
      resultsEl.innerHTML = `<p class="mono">no nearest neighbours found. try 'graph'.</p>`;
      return;
    }

    resultsEl.innerHTML = matches
      .map(({ project, score }) => {
        const snippet = project.summary.startsWith('TODO:')
          ? (project.tags || []).join(' · ').toLowerCase()
          : project.summary;
        return `
          <a class="chunk-card" href="#/work/${encodeURIComponent(project.id)}">
            <span class="chunk-score">${score.toFixed(2)}</span>
            <div>
              <div class="chunk-title">${highlightTokens(project.title, qTokens)}</div>
              <p class="chunk-snippet">${highlightTokens(snippet, qTokens)}</p>
            </div>
            <span class="chunk-link">case file →</span>
          </a>
        `;
      })
      .join('');
  }

  let timer = null;
  input.addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(e.target.value), 150);
  });

  renderChips();
}
