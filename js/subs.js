"use strict";

export function register(app) {
  app.normalizeMonthlyAmounts = function normalizeMonthlyAmounts(raw) {
    if (!raw || typeof raw !== "object") return {};
    const out = {};
    Object.keys(raw).forEach((key) => {
      if (!/^\d{4}-\d{2}$/.test(key)) return;
      const n = Number(raw[key]);
      if (Number.isFinite(n) && n >= 0) out[key] = n;
    });
    return out;
  };

  app.normalizeSub = function normalizeSub(s) {
    const amountUnknown = Boolean(s.amountUnknown);
    const intervalMonths = app.normalizeInterval(s.intervalMonths);
    const startMonth = app.clampMonth(s.startMonth ?? 0);
    const hasEnd = Boolean(s.hasEnd);
    let endMonth = app.clampMonth(s.endMonth ?? 11);
    let endYear = null;
    if (hasEnd && s.endYear != null && Number.isFinite(Number(s.endYear))) {
      endYear = Math.round(Number(s.endYear));
    }
    // Legacy: bitiş ayı vardı, yıl yoktu → bu takvim yılına sabitle
    if (hasEnd && endYear == null) {
      endYear = new Date().getFullYear();
    }
    return {
      id: s.id,
      name: String(s.name).slice(0, 40),
      amount: amountUnknown ? 0 : Number(s.amount) || 0,
      amountUnknown,
      monthlyAmounts: amountUnknown ? app.normalizeMonthlyAmounts(s.monthlyAmounts) : {},
      day: app.clampDay(Number(s.day) || 1),
      color: app.isValidColor(s.color) ? s.color : app.COLORS[0],
      intervalMonths,
      startMonth,
      hasEnd,
      endMonth,
      endYear: hasEnd ? endYear : null,
    };
  };

  app.occursInMonth = function occursInMonth(sub, monthIndex, year = app.activeYear) {
    if (monthIndex < sub.startMonth) return false;

    if (sub.hasEnd && sub.endYear != null) {
      if (year > sub.endYear) return false;
      if (year === sub.endYear && monthIndex > sub.endMonth) return false;
    } else if (sub.hasEnd && monthIndex > sub.endMonth) {
      return false;
    }

    const interval = sub.intervalMonths || 1;
    return (monthIndex - sub.startMonth) % interval === 0;
  };

  app.canCancelSub = function canCancelSub(sub) {
    if (!sub) return false;
    if (!sub.hasEnd || sub.endYear == null) return true;
    if (sub.endYear < app.activeYear) return false;
    if (sub.endYear === app.activeYear && sub.endMonth <= app.currentMonth) return false;
    return true;
  };

  app.monthAmountKey = function monthAmountKey(year = app.activeYear, monthIndex = app.currentMonth) {
    return `${year}-${app.pad2(monthIndex + 1)}`;
  };

  app.getResolvedAmount = function getResolvedAmount(sub, year = app.activeYear, monthIndex = app.currentMonth) {
    if (!sub.amountUnknown) return Number(sub.amount) || 0;
    const key = app.monthAmountKey(year, monthIndex);
    const raw = sub.monthlyAmounts && sub.monthlyAmounts[key];
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  app.formatRecurrence = function formatRecurrence(sub) {
    const freq = app.INTERVAL_LABELS[sub.intervalMonths] || "Her ay";
    let text =
      sub.day !== sub.actualDay
        ? `${freq}, ${sub.day}. gün → bu ay ${sub.actualDay}`
        : `${freq}, ${sub.day}. gün`;

    if (sub.startMonth > 0) {
      text += ` · ${app.MONTHS_TR[sub.startMonth]}’den`;
    }
    if (sub.endYear != null) {
      text += ` · ${app.MONTHS_TR[sub.endMonth]} ${sub.endYear}’e kadar`;
    } else if (sub.hasEnd) {
      text += ` · ${app.MONTHS_TR[sub.endMonth]}’e kadar`;
    }
    return text;
  };

  app.formatSubAmount = function formatSubAmount(sub, year = app.activeYear, monthIndex = app.currentMonth) {
    if (!sub.amountUnknown) return app.formatMoney(sub.amount);
    const resolved = app.getResolvedAmount(sub, year, monthIndex);
    return resolved == null ? "Tutar gir" : app.formatMoney(resolved);
  };

  app.knownAmount = function knownAmount(sub, year = app.activeYear, monthIndex = app.currentMonth) {
    const resolved = app.getResolvedAmount(sub, year, monthIndex);
    return resolved == null ? 0 : resolved;
  };

  app.formatGroupTotal = function formatGroupTotal(subs, year = app.activeYear, monthIndex = app.currentMonth) {
    const known = subs.reduce((sum, s) => sum + app.knownAmount(s, year, monthIndex), 0);
    const hasUnknown = subs.some(
      (s) => s.amountUnknown && app.getResolvedAmount(s, year, monthIndex) == null
    );
    if (!subs.length) return app.formatMoney(0);
    if (hasUnknown && known === 0) return "Değişken";
    if (hasUnknown) return `${app.formatMoney(known)}+`;
    return app.formatMoney(known);
  };

  app.getOccurrencesForMonth = function getOccurrencesForMonth(monthIndex) {
    return app.subscriptions
      .filter((sub) => app.occursInMonth(sub, monthIndex))
      .map((sub) => ({
        ...sub,
        actualDay: app.billingDayInMonth(sub.day, app.activeYear, monthIndex),
      }))
      .sort((a, b) => a.actualDay - b.actualDay || a.name.localeCompare(b.name, "tr"));
  };

  app.getMonthOccurrences = function getMonthOccurrences() {
    return app.getOccurrencesForMonth(app.currentMonth);
  };

  app.getSubsForDay = function getSubsForDay(day) {
    return app.getMonthOccurrences().filter((s) => s.actualDay === day);
  };

  app.monthTotal = function monthTotal(monthIndex) {
    return app.getOccurrencesForMonth(monthIndex).reduce(
      (sum, s) => sum + app.knownAmount(s, app.activeYear, monthIndex),
      0
    );
  };

  app.monthHasUnknown = function monthHasUnknown(monthIndex) {
    return app.getOccurrencesForMonth(monthIndex).some(
      (s) => s.amountUnknown && app.getResolvedAmount(s, app.activeYear, monthIndex) == null
    );
  };

}
