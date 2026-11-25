const STORAGE_KEY = 'divakar-portfolio-theme';

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
    // Ignore storage errors in restricted environments
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
    toggleBtn.textContent = isDark ? 'mode: lab' : 'mode: paper';
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
