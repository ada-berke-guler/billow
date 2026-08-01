"use strict";

export function register(app) {
  app.migrateKey = function migrateKey(newKey, legacyKey) {
    try {
      const current = localStorage.getItem(newKey);
      if (current != null) return current;
      const legacy = localStorage.getItem(legacyKey);
      if (legacy != null) {
        localStorage.setItem(newKey, legacy);
        return legacy;
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  app.loadSubscriptions = function loadSubscriptions() {
    try {
      const raw = app.migrateKey(app.STORAGE_KEY, app.STORAGE_KEY_LEGACY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((s) => s && typeof s.id === "string" && typeof s.name === "string")
        .map((s) => app.normalizeSub(s));
    } catch {
      return [];
    }
  };

  app.saveSubscriptions = function saveSubscriptions() {
    try {
      localStorage.setItem(app.STORAGE_KEY, JSON.stringify(app.subscriptions));
      return true;
    } catch {
      app.showToast("Kayıt yapılamadı — depolama dolu veya engelli.");
      return false;
    }
  };

  app.loadExpenses = function loadExpenses() {
    try {
      const raw = localStorage.getItem(app.EXPENSE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((e) => e && typeof e.id === "string")
        .map((e) => app.normalizeExpense(e))
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  app.saveExpenses = function saveExpenses() {
    try {
      localStorage.setItem(app.EXPENSE_KEY, JSON.stringify(app.expenses));
      return true;
    } catch {
      app.showToast("Kayıt yapılamadı — depolama dolu veya engelli.");
      return false;
    }
  };

  app.exportBackup = function exportBackup() {
    const payload = {
      app: "billow",
      version: 1,
      exportedAt: new Date().toISOString(),
      subscriptions: app.subscriptions,
      expenses: app.expenses,
      theme: app.getTheme(),
      activeYear: app.activeYear,
      appMode: app.appMode,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `billow-yedek-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    app.showToast("Yedek indirildi");
  };

  app.importBackupFromFile = function importBackupFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        if (!data || typeof data !== "object") throw new Error("invalid");
        const hasSubs = Array.isArray(data.subscriptions);
        const hasExpenses = Array.isArray(data.expenses);
        if (!hasSubs && !hasExpenses) throw new Error("empty");

        const nextSubs = hasSubs
          ? data.subscriptions
              .filter((s) => s && typeof s.id === "string" && typeof s.name === "string")
              .map((s) => app.normalizeSub(s))
          : null;
        const nextExpenses = hasExpenses
          ? data.expenses
              .filter((e) => e && typeof e.id === "string")
              .map((e) => app.normalizeExpense(e))
              .filter(Boolean)
          : null;

        const ok = window.confirm(
          "Yedek yüklensin mi? Mevcut abonelik ve harcama verilerinin üzerine yazılır."
        );
        if (!ok) return;

        if (hasSubs) app.subscriptions = nextSubs;
        if (hasExpenses) app.expenses = nextExpenses;
        if (!app.saveSubscriptions() || !app.saveExpenses()) return;

        if (data.theme) app.setTheme(app.normalizeThemeId(data.theme));
        if (data.appMode === "expenses" || data.appMode === "subs") {
          app.appMode = data.appMode;
          app.persistAppMode();
        }
        if (data.activeYear != null && Number.isFinite(Number(data.activeYear))) {
          const y = Math.round(Number(data.activeYear));
          if (y >= app.MIN_YEAR && y <= app.MAX_YEAR) {
            app.activeYear = y;
            app.persistActiveYear();
          }
        }

        app.currentMonth = app.initialMonth();
        app.selectedDay = null;
        app.syncModeChrome();
        app.updateYearLabels();
        app.showCalendarView();
        app.render();
        app.showToast("Yedek yüklendi");
      } catch {
        app.showToast("Yedek dosyası okunamadı.");
      }
    };
    reader.onerror = () => app.showToast("Yedek dosyası okunamadı.");
    reader.readAsText(file);
  };

  app.registerServiceWorker = function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* ignore */
      });
    });
  };

  app.loadAppMode = function loadAppMode() {
    try {
      const stored = localStorage.getItem(app.MODE_KEY);
      if (stored === "expenses" || stored === "subs") return stored;
    } catch {
      /* ignore */
    }
    return "subs";
  };

  app.persistAppMode = function persistAppMode() {
    try {
      localStorage.setItem(app.MODE_KEY, app.appMode);
    } catch {
      /* ignore */
    }
  };

  app.resolveInitialYear = function resolveInitialYear() {
    const nowYear = new Date().getFullYear();
    try {
      const raw = app.migrateKey(app.ACTIVE_YEAR_KEY, app.ACTIVE_YEAR_KEY_LEGACY);
      const stored = Number(raw);
      if (Number.isInteger(stored) && stored >= app.MIN_YEAR && stored <= app.MAX_YEAR) {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return nowYear;
  };

  app.persistActiveYear = function persistActiveYear() {
    try {
      localStorage.setItem(app.ACTIVE_YEAR_KEY, String(app.activeYear));
    } catch {
      /* ignore */
    }
  };

  app.initialMonth = function initialMonth() {
    const now = new Date();
    if (now.getFullYear() === app.activeYear) return now.getMonth();
    return 0;
  };

}
