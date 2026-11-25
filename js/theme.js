const STORAGE_KEY = 'divakar-portfolio-theme';

const SUN_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
const MOON_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

export function getPreferredTheme() {
  const stored = readStoredTheme();
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(theme, toggleBtn) {
  document.documentElement.setAttribute('data-theme', theme);
  if (toggleBtn) {
    const isDark = theme === 'dark';
    toggleBtn.setAttribute('aria-pressed', String(isDark));
    toggleBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    toggleBtn.innerHTML = isDark ? SUN_ICON : MOON_ICON;
  }
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export function initTheme(toggleBtn) {
  let current = getPreferredTheme();
  applyTheme(current, toggleBtn);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      current = current === 'dark' ? 'light' : 'dark';
      writeStoredTheme(current);
      applyTheme(current, toggleBtn);
    });
  }
}
