"use strict";

export function register(app) {
  app.clampDay = function clampDay(day) {
    return Math.min(31, Math.max(1, Math.round(day)));
  };

  app.clampMonth = function clampMonth(month) {
    return Math.min(11, Math.max(0, Math.round(Number(month) || 0)));
  };

  app.normalizeInterval = function normalizeInterval(value) {
    const n = Number(value);
    return app.INTERVALS.includes(n) ? n : 1;
  };

  app.uid = function uid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  app.formatMoney = function formatMoney(amount) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  app.pad2 = function pad2(n) {
    return String(n).padStart(2, "0");
  };

  app.toDateStr = function toDateStr(year, monthIndex, day) {
    return `${year}-${app.pad2(monthIndex + 1)}-${app.pad2(day)}`;
  };

  app.parseDateParts = function parseDateParts(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return { year: y, month: m - 1, day: d };
  };

  app.wait = function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  };

  app.isValidColor = function isValidColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
  };

  app.isValidDateStr = function isValidDateStr(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  };

  app.startOfWeekMonday = function startOfWeekMonday(year, monthIndex) {
    const dow = new Date(year, monthIndex, 1).getDay();
    return dow === 0 ? 6 : dow - 1;
  };

  app.isToday = function isToday(year, monthIndex, day) {
    const now = new Date();
    return (
      now.getFullYear() === year &&
      now.getMonth() === monthIndex &&
      now.getDate() === day
    );
  };

  app.billingDayInMonth = function billingDayInMonth(preferredDay, year, monthIndex) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(preferredDay, daysInMonth);
  };

  app.formatShortDate = function formatShortDate(date) {
    return `${date.getDate()} ${app.MONTHS_TR[date.getMonth()]}`;
  };

}
