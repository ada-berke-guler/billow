"use strict";

export function register(app) {
  app.normalizeThemeId = function normalizeThemeId(theme) {
    if (theme === "light" || theme === "sunger") return "duotone";
    if (theme === "dark" || theme === "sunger-dark") return "duotone-dark";
    return app.THEME_ORDER.includes(theme) ? theme : "duotone";
  };

  app.getTheme = function getTheme() {
    return app.normalizeThemeId(document.documentElement.getAttribute("data-theme"));
  };

  app.syncThemeButtons = function syncThemeButtons() {
    const label = app.getTheme() === "duotone-dark" ? "Gündüz moduna geç" : "Gece moduna geç";
    [app.els.themeBtn, app.els.themeBtnYear].forEach((btn) => {
      if (!btn) return;
      btn.setAttribute("aria-label", label);
      btn.title = label;
    });
  };

  app.setTheme = function setTheme(theme) {
    const next = app.normalizeThemeId(theme);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(app.THEME_KEY, next);
    } catch {
      /* ignore */
    }
    app.syncThemeButtons();
  };

  app.toggleTheme = function toggleTheme() {
    app.setTheme(app.getTheme() === "duotone" ? "duotone-dark" : "duotone");
  };

  app.initThemeFromStorage = function initThemeFromStorage() {
    try {
      const stored = app.migrateKey(app.THEME_KEY, app.THEME_KEY_LEGACY);
      if (stored) {
        app.setTheme(app.normalizeThemeId(stored));
        return;
      }
    } catch {
      /* ignore */
    }
    app.setTheme("duotone");
  };

}
