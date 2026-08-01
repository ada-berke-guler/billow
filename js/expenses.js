"use strict";

export function register(app) {
  app.getCategory = function getCategory(categoryId) {
    return app.EXPENSE_CATEGORIES.find((c) => c.id === categoryId) || app.EXPENSE_CATEGORIES[app.EXPENSE_CATEGORIES.length - 1];
  };

  app.normalizeExpense = function normalizeExpense(e) {
    if (!app.isValidDateStr(e.date)) return null;
    const amount = Number(e.amount);
    if (!(amount >= 0) || Number.isNaN(amount)) return null;
    const cat = app.getCategory(e.categoryId);
    return {
      id: e.id,
      amount,
      categoryId: cat.id,
      date: e.date,
      note: String(e.note || "").slice(0, 60),
    };
  };

  app.expenseTitle = function expenseTitle(expense) {
    const note = expense.note.trim();
    return note || app.getCategory(expense.categoryId).name;
  };

  app.getExpensesForMonth = function getExpensesForMonth(monthIndex) {
    const prefix = `${app.activeYear}-${app.pad2(monthIndex + 1)}-`;
    return app.expenses
      .filter((e) => e.date.startsWith(prefix))
      .slice()
      .sort((a, b) => {
        const da = app.parseDateParts(a.date).day;
        const db = app.parseDateParts(b.date).day;
        return da - db || a.amount - b.amount || app.expenseTitle(a).localeCompare(app.expenseTitle(b), "tr");
      });
  };

  app.getMonthExpenses = function getMonthExpenses() {
    return app.getExpensesForMonth(app.currentMonth);
  };

  app.getExpensesForDay = function getExpensesForDay(day) {
    const dateStr = app.toDateStr(app.activeYear, app.currentMonth, day);
    return app.getMonthExpenses().filter((e) => e.date === dateStr);
  };

  app.expenseMonthTotal = function expenseMonthTotal(monthIndex) {
    return app.getExpensesForMonth(monthIndex).reduce((sum, e) => sum + e.amount, 0);
  };

  app.defaultExpenseDate = function defaultExpenseDate() {
    const daysInMonth = new Date(app.activeYear, app.currentMonth + 1, 0).getDate();
    if (app.selectedDay != null && app.selectedDay >= 1 && app.selectedDay <= daysInMonth) {
      return app.toDateStr(app.activeYear, app.currentMonth, app.selectedDay);
    }
    const now = new Date();
    if (now.getFullYear() === app.activeYear && now.getMonth() === app.currentMonth) {
      return app.toDateStr(app.activeYear, app.currentMonth, now.getDate());
    }
    return app.toDateStr(app.activeYear, app.currentMonth, 1);
  };

  app.getYearExpenses = function getYearExpenses() {
    return app.expenses.filter((e) => app.parseDateParts(e.date).year === app.activeYear);
  };

  app.getExpensesBetween = function getExpensesBetween(start, end) {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return app.expenses.filter((e) => {
      const t = new Date(`${e.date}T12:00:00`).getTime();
      return t >= startMs && t <= endMs;
    });
  };

  app.getMondayWeekRange = function getMondayWeekRange(anchor) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  app.getWeekAnchorDate = function getWeekAnchorDate() {
    if (app.selectedDay != null) {
      return new Date(app.activeYear, app.currentMonth, app.selectedDay);
    }
    const now = new Date();
    if (now.getFullYear() === app.activeYear && now.getMonth() === app.currentMonth) {
      return now;
    }
    return new Date(app.activeYear, app.currentMonth, 1);
  };

  app.aggregateByCategory = function aggregateByCategory(list) {
    const map = new Map();
    list.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return app.EXPENSE_CATEGORIES
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        value: map.get(cat.id) || 0,
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  };

}
