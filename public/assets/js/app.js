/**
 * Report Toys - Application initialization
 * Handles theme switching, Chart.js setup, and API communication
 */

// Theme management
const ThemeManager = {
  save(theme) {
    localStorage.setItem('report-theme', theme);
    document.documentElement.dataset.bsTheme = theme;
  },

  load() {
    const saved = localStorage.getItem('report-theme') || 'light';
    document.documentElement.dataset.bsTheme = saved;
    return saved;
  },

  toggle() {
    const current = document.documentElement.dataset.bsTheme || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    this.save(next);
    return next;
  },

  init() {
    this.load();
    // Setup theme toggle button if exists
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggle());
    }
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager };
}
