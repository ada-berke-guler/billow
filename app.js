"use strict";

import * as constants from "./js/constants.js";
import { els } from "./js/dom.js";
import { register as registerUtils } from "./js/utils.js";
import { register as registerSubs } from "./js/subs.js";
import { register as registerExpenses } from "./js/expenses.js";
import { register as registerStorage } from "./js/storage.js";
import { register as registerTheme } from "./js/theme.js";
import { register as registerUi } from "./js/ui.js";
import { register as registerCalendar } from "./js/calendar.js";
import { register as registerTour } from "./js/tour.js";
import { register as registerOnboarding } from "./js/onboarding.js";

const app = {
  ...constants,
  els,
  activeYear: new Date().getFullYear(),
  currentMonth: 0,
  selectedDay: null,
  subscriptions: [],
  expenses: [],
  appMode: "subs",
  selectedColor: constants.COLORS[0],
  toastTimer: null,
  pendingYearLoad: null,
  yearLoading: false,
  modeSwitching: false,
  tourIndex: -1,
  tourTimer: null,
  tourRepositionHandler: null,
};

registerUtils(app);
registerSubs(app);
registerExpenses(app);
registerStorage(app);
registerTheme(app);
registerUi(app);
registerCalendar(app);
registerTour(app);
registerOnboarding(app);

app.activeYear = app.resolveInitialYear();
app.subscriptions = app.loadSubscriptions();
app.expenses = app.loadExpenses();
app.appMode = app.loadAppMode();
app.selectedColor = app.COLORS[0];

app.els.modeDotSubs.addEventListener("click", () => app.switchAppMode("subs"));
app.els.modeDotExpenses.addEventListener("click", () => app.switchAppMode("expenses"));
app.els.weeklyPieBtn.addEventListener("click", app.showWeeklyPie);
app.els.weeklyPieClose.addEventListener("click", app.hideWeeklyPie);
app.els.openYearFromInsights.addEventListener("click", app.showYearView);

app.els.prevMonth.addEventListener("click", () => {
  if (app.yearLoading) return;
  if (app.currentMonth > 0) {
    app.currentMonth -= 1;
    app.selectedDay = null;
    app.render();
    return;
  }
  app.openYearPrompt(app.activeYear - 1, 11);
});

app.els.nextMonth.addEventListener("click", () => {
  if (app.yearLoading) return;
  if (app.currentMonth < 11) {
    app.currentMonth += 1;
    app.selectedDay = null;
    app.render();
    return;
  }
  app.openYearPrompt(app.activeYear + 1, 0);
});

app.els.yearPromptYes.addEventListener("click", app.confirmYearLoad);
app.els.yearPromptNo.addEventListener("click", app.closeYearPrompt);
app.els.yearPromptClose.addEventListener("click", app.closeYearPrompt);
app.els.yearPromptBackdrop.addEventListener("click", (e) => {
  if (e.target === app.els.yearPromptBackdrop) app.closeYearPrompt();
});

app.els.addBtn.addEventListener("click", () => {
  if (app.appMode === "expenses") app.openExpenseModal();
  else app.openModal();
});
if (app.els.helpBtn) app.els.helpBtn.addEventListener("click", app.startTour);
if (app.els.tourNext) app.els.tourNext.addEventListener("click", app.advanceTour);
if (app.els.tourSkip) app.els.tourSkip.addEventListener("click", app.stopTour);
if (app.els.exportBtn) app.els.exportBtn.addEventListener("click", app.exportBackup);
if (app.els.importBtn) {
  app.els.importBtn.addEventListener("click", () => app.els.importFile && app.els.importFile.click());
}
if (app.els.importFile) {
  app.els.importFile.addEventListener("change", () => {
    const file = app.els.importFile.files && app.els.importFile.files[0];
    app.importBackupFromFile(file);
    app.els.importFile.value = "";
  });
}
app.els.yearBtn.addEventListener("click", app.showYearView);
app.els.themeBtn.addEventListener("click", app.toggleTheme);
app.els.themeBtnYear.addEventListener("click", app.toggleTheme);
app.els.backToCalendar.addEventListener("click", () => {
  app.showCalendarView();
  app.render();
});
app.els.closeDayDetail.addEventListener("click", app.closeDayDetail);
app.els.closeModal.addEventListener("click", app.closeModal);
app.els.cancelBtn.addEventListener("click", app.closeModal);

app.els.modalBackdrop.addEventListener("click", (e) => {
  if (e.target === app.els.modalBackdrop) app.closeModal();
});

app.els.closeExpense.addEventListener("click", app.closeExpenseModal);
app.els.expenseCancelBtn.addEventListener("click", app.closeExpenseModal);
app.els.expenseBackdrop.addEventListener("click", (e) => {
  if (e.target === app.els.expenseBackdrop) app.closeExpenseModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (app.yearLoading) return;
  if (app.tourIndex >= 0) {
    app.stopTour();
    return;
  }
  if (!app.els.yearPromptBackdrop.hidden) {
    app.closeYearPrompt();
    return;
  }
  if (!app.els.expenseBackdrop.hidden) {
    app.closeExpenseModal();
    return;
  }
  if (!app.els.modalBackdrop.hidden) {
    app.closeModal();
    return;
  }
  if (!app.els.viewYear.hidden) {
    app.showCalendarView();
    app.render();
    return;
  }
  if (app.selectedDay != null) app.closeDayDetail();
});

app.els.amountUnknown.addEventListener("change", app.applyAmountUnknownState);
app.els.hasEnd.addEventListener("change", () => {
  app.applyFrequencyState();
  if (app.els.hasEnd.checked) app.buildEndYearOptions(Number(app.els.subEndYear?.value) || app.activeYear);
});

app.els.subForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = app.els.subName.value.trim();
  const amountUnknown = app.els.amountUnknown.checked;
  const amount = amountUnknown ? 0 : Number(app.els.subAmount.value);
  const day = app.clampDay(Number(app.els.subDay.value));
  const color = app.els.subColor.value || app.selectedColor;
  const intervalMonths = app.normalizeInterval(app.els.subInterval.value);
  const hasEnd = app.els.hasEnd.checked;
  const startMonth = app.clampMonth(app.els.subStartMonth.value);
  const endMonth = hasEnd ? app.clampMonth(app.els.subEndMonth.value) : 11;
  const editId = app.els.editId.value;
  const existing = editId ? app.subscriptions.find((s) => s.id === editId) : null;
  const endYear = hasEnd
    ? Math.round(Number(app.els.subEndYear?.value) || existing?.endYear || app.activeYear)
    : null;

  if (hasEnd && endYear === app.activeYear && endMonth < startMonth) {
    app.showToast("Bitiş ayı, başlangıç ayından önce olamaz.");
    return;
  }

  if (!name) {
    app.showToast("Lütfen bir isim gir.");
    return;
  }

  if (!amountUnknown && (!(amount >= 0) || Number.isNaN(amount) || app.els.subAmount.value === "")) {
    app.showToast("Lütfen geçerli bir tutar gir veya ‘Tutar belli değil’i işaretle.");
    return;
  }

  let monthlyAmounts = amountUnknown
    ? app.normalizeMonthlyAmounts(existing?.monthlyAmounts)
    : {};
  if (amountUnknown && editId && app.els.subMonthAmount) {
    const raw = app.els.subMonthAmount.value.trim();
    const key = app.monthAmountKey(app.activeYear, app.currentMonth);
    if (raw === "") {
      delete monthlyAmounts[key];
    } else {
      const n = Number(raw);
      if (!(n >= 0) || Number.isNaN(n)) {
        app.showToast("Bu ay için geçerli bir tutar gir.");
        return;
      }
      monthlyAmounts[key] = n;
    }
  }

  const payload = app.normalizeSub({
    id: editId || "tmp",
    name,
    amount,
    amountUnknown,
    monthlyAmounts,
    day,
    color,
    intervalMonths,
    startMonth,
    hasEnd,
    endMonth,
    endYear,
  });
  delete payload.id;

  if (editId) {
    const idx = app.subscriptions.findIndex((s) => s.id === editId);
    if (idx !== -1) {
      app.subscriptions[idx] = { ...app.subscriptions[idx], ...payload };
      if (!app.saveSubscriptions()) return;
      app.showToast("Abonelik güncellendi");
    }
  } else {
    app.subscriptions.push({ id: app.uid(), ...payload });
    if (!app.saveSubscriptions()) {
      app.subscriptions.pop();
      return;
    }
    app.showToast("Abonelik eklendi");
  }

  app.closeModal();
  app.render();
  if (!app.els.viewYear.hidden) app.renderYearSummary();
});

app.els.deleteBtn.addEventListener("click", () => {
  const id = app.els.editId.value;
  if (!id) return;
  const idx = app.subscriptions.findIndex((s) => s.id === id);
  if (idx === -1) return;
  app.subscriptions[idx] = {
    ...app.subscriptions[idx],
    hasEnd: true,
    endMonth: app.currentMonth,
    endYear: app.activeYear,
  };
  if (!app.saveSubscriptions()) return;
  app.closeModal();
  app.render();
  if (!app.els.viewYear.hidden) app.renderYearSummary();
  app.showToast("İptal edildi — bu ay ve geçmiş yıllık özette kalır");
});

app.els.expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const amount = Number(app.els.expenseAmount.value);
  const categoryId = app.els.expenseCategory.value;
  const date = app.els.expenseDate.value;
  const note = app.els.expenseNote.value.trim();

  if (!(amount >= 0) || Number.isNaN(amount) || app.els.expenseAmount.value === "") {
    app.showToast("Lütfen geçerli bir tutar gir.");
    return;
  }

  if (!app.EXPENSE_CATEGORIES.some((c) => c.id === categoryId)) {
    app.showToast("Lütfen bir kategori seç.");
    return;
  }

  if (!app.isValidDateStr(date)) {
    app.showToast("Lütfen geçerli bir tarih seç.");
    return;
  }

  const editId = app.els.expenseEditId.value;
  const normalized = app.normalizeExpense({
    id: editId || "tmp",
    amount,
    categoryId,
    date,
    note,
  });

  if (!normalized) {
    app.showToast("Harcama kaydı geçersiz.");
    return;
  }

  const payload = { ...normalized };
  delete payload.id;

  if (editId) {
    const idx = app.expenses.findIndex((ex) => ex.id === editId);
    if (idx !== -1) {
      app.expenses[idx] = { ...app.expenses[idx], ...payload };
      if (!app.saveExpenses()) return;
      app.showToast("Harcama güncellendi");
    }
  } else {
    app.expenses.push({ id: app.uid(), ...payload });
    if (!app.saveExpenses()) {
      app.expenses.pop();
      return;
    }
    app.showToast("Harcama eklendi");
  }

  app.closeExpenseModal();
  app.render();
  if (!app.els.viewYear.hidden) app.renderYearSummary();
});

app.els.expenseDeleteBtn.addEventListener("click", () => {
  const id = app.els.expenseEditId.value;
  if (!id) return;
  const prev = app.expenses;
  app.expenses = app.expenses.filter((ex) => ex.id !== id);
  if (!app.saveExpenses()) {
    app.expenses = prev;
    return;
  }
  app.closeExpenseModal();
  app.render();
  if (!app.els.viewYear.hidden) app.renderYearSummary();
  app.showToast("Harcama silindi");
});

app.initThemeFromStorage();
app.persistActiveYear();
app.currentMonth = app.initialMonth();
app.buildMonthOptions(app.els.subStartMonth, 0);
app.buildMonthOptions(app.els.subEndMonth, 11);
app.buildEndYearOptions(app.activeYear);
app.buildSwatches();
app.selectColor(app.COLORS[0]);
app.populateExpenseCategories();
app.applyFrequencyState();
app.syncModeChrome();
app.updateYearLabels();
app.render();
app.registerServiceWorker();

app.runSplash().then(() => {
  app.maybePromptRealYearRollover();
});

