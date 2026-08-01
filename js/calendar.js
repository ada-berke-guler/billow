"use strict";

export function register(app) {
  app.createAmountEl = function createAmountEl(sub, year = app.activeYear, monthIndex = app.currentMonth) {
    const amount = document.createElement("span");
    const missing = sub.amountUnknown && app.getResolvedAmount(sub, year, monthIndex) == null;
    amount.className = "sub-amount" + (missing ? " is-unknown" : "");
    amount.textContent = app.formatSubAmount(sub, year, monthIndex);
    return amount;
  };

  app.createExpenseAmountEl = function createExpenseAmountEl(expense) {
    const amount = document.createElement("span");
    amount.className = "sub-amount";
    amount.textContent = app.formatMoney(expense.amount);
    return amount;
  };

  app.createExpenseListButton = function createExpenseListButton(expense, className) {
    const cat = app.getCategory(expense.categoryId);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.addEventListener("click", () => app.openExpenseModal(expense));

    const swatch = document.createElement("span");
    swatch.className = "sub-swatch";
    swatch.style.background = cat.color;

    const meta = document.createElement("div");
    meta.className = "sub-meta";

    const name = document.createElement("span");
    name.className = "sub-name";
    name.textContent = app.expenseTitle(expense);

    const rec = document.createElement("span");
    rec.className = "sub-recurrence";
    rec.innerHTML = `<span class="cat-chip"><span class="cat-dot" style="background:${cat.color}"></span>${cat.name}</span>`;

    meta.append(name, rec);
    btn.append(swatch, meta, app.createExpenseAmountEl(expense));
    return btn;
  };

  app.render = function render() {
    const daysInMonth = new Date(app.activeYear, app.currentMonth + 1, 0).getDate();
    if (app.selectedDay != null && (app.selectedDay < 1 || app.selectedDay > daysInMonth)) {
      app.selectedDay = null;
    }

    app.els.monthTitle.textContent = `${app.MONTHS_TR[app.currentMonth]} ${app.activeYear}`;
    app.els.prevMonth.disabled = false;
    app.els.nextMonth.disabled = false;
    app.updateYearLabels();
    app.els.expenseInsights.hidden = app.appMode !== "expenses" || !app.els.viewYear.hidden;
    app.renderCalendar();
    app.renderSidebar();
    app.renderDayDetail();
    if (app.appMode === "expenses" && !app.els.weeklyPiePanel.hidden) {
      app.showWeeklyPie();
    }
  };

  app.renderCalendar = function renderCalendar() {
    if (app.appMode === "expenses") {
      app.renderExpenseCalendar();
      return;
    }
    app.renderSubCalendar();
  };

  app.renderSubCalendar = function renderSubCalendar() {
    const daysInMonth = new Date(app.activeYear, app.currentMonth + 1, 0).getDate();
    const offset = app.startOfWeekMonday(app.activeYear, app.currentMonth);
    const byDay = new Map();

    for (const sub of app.getMonthOccurrences()) {
      if (!byDay.has(sub.actualDay)) byDay.set(sub.actualDay, []);
      byDay.get(sub.actualDay).push(sub);
    }

    const monthSubs = app.getMonthOccurrences();
    app.els.monthTotal.textContent = app.formatGroupTotal(monthSubs, app.activeYear, app.currentMonth);
    app.els.monthCount.textContent = String(monthSubs.length);

    const frag = document.createDocumentFragment();

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      empty.setAttribute("aria-hidden", "true");
      frag.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("button");
      cell.type = "button";
      const daySubs = byDay.get(day) || [];
      const has = daySubs.length > 0;
      cell.className =
        "day-cell" +
        (has ? " has-subs" : "") +
        (app.isToday(app.activeYear, app.currentMonth, day) ? " is-today" : "") +
        (app.selectedDay === day ? " is-selected" : "");
      cell.style.animationDelay = `${Math.min(day, 20) * 12}ms`;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", app.buildDayAria(day, daySubs));
      cell.setAttribute("aria-pressed", app.selectedDay === day ? "true" : "false");
      cell.addEventListener("click", () => app.selectDay(day));

      const num = document.createElement("span");
      num.className = "day-num";
      num.textContent = String(day);
      cell.appendChild(num);

      if (has) {
        const dots = document.createElement("div");
        dots.className = "day-dots";
        const shown = daySubs.slice(0, 5);
        for (const s of shown) {
          const dot = document.createElement("span");
          dot.className = "dot";
          dot.style.background = s.color;
          dot.title = s.name;
          dots.appendChild(dot);
        }
        if (daySubs.length > 5) {
          const more = document.createElement("span");
          more.className = "day-more";
          more.textContent = `+${daySubs.length - 5}`;
          dots.appendChild(more);
        }
        cell.appendChild(dots);

        const totalEl = document.createElement("span");
        totalEl.className = "day-total";
        totalEl.textContent = app.formatGroupTotal(daySubs);
        cell.appendChild(totalEl);
      }

      frag.appendChild(cell);
    }

    app.appendTrailingEmptyCells(frag, offset, daysInMonth);
    app.els.calendarGrid.replaceChildren(frag);
  };

  app.renderExpenseCalendar = function renderExpenseCalendar() {
    const daysInMonth = new Date(app.activeYear, app.currentMonth + 1, 0).getDate();
    const offset = app.startOfWeekMonday(app.activeYear, app.currentMonth);
    const byDay = new Map();
    const monthExpenses = app.getMonthExpenses();

    for (const expense of monthExpenses) {
      const day = app.parseDateParts(expense.date).day;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(expense);
    }

    const monthSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    app.els.monthTotal.textContent = app.formatMoney(monthSum);
    app.els.monthCount.textContent = String(monthExpenses.length);

    const frag = document.createDocumentFragment();

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      empty.setAttribute("aria-hidden", "true");
      frag.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("button");
      cell.type = "button";
      const dayExpenses = byDay.get(day) || [];
      const has = dayExpenses.length > 0;
      const daySum = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      cell.className =
        "day-cell" +
        (has ? " has-subs" : "") +
        (app.isToday(app.activeYear, app.currentMonth, day) ? " is-today" : "") +
        (app.selectedDay === day ? " is-selected" : "");
      cell.style.animationDelay = `${Math.min(day, 20) * 12}ms`;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", app.buildExpenseDayAria(day, dayExpenses, daySum));
      cell.setAttribute("aria-pressed", app.selectedDay === day ? "true" : "false");
      cell.addEventListener("click", () => app.selectDay(day));

      const num = document.createElement("span");
      num.className = "day-num";
      num.textContent = String(day);
      cell.appendChild(num);

      if (has) {
        const dots = document.createElement("div");
        dots.className = "day-dots";
        const shown = dayExpenses.slice(0, 5);
        for (const e of shown) {
          const cat = app.getCategory(e.categoryId);
          const dot = document.createElement("span");
          dot.className = "dot";
          dot.style.background = cat.color;
          dot.title = app.expenseTitle(e);
          dots.appendChild(dot);
        }
        if (dayExpenses.length > 5) {
          const more = document.createElement("span");
          more.className = "day-more";
          more.textContent = `+${dayExpenses.length - 5}`;
          dots.appendChild(more);
        }
        cell.appendChild(dots);

        const totalEl = document.createElement("span");
        totalEl.className = "day-total";
        totalEl.textContent = app.formatMoney(daySum);
        cell.appendChild(totalEl);
      }

      frag.appendChild(cell);
    }

    app.appendTrailingEmptyCells(frag, offset, daysInMonth);
    app.els.calendarGrid.replaceChildren(frag);
  };

  app.appendTrailingEmptyCells = function appendTrailingEmptyCells(frag, offset, daysInMonth) {
    const totalCells = offset + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder === 0) return;
    for (let i = 0; i < 7 - remainder; i++) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      empty.setAttribute("aria-hidden", "true");
      frag.appendChild(empty);
    }
  };

  app.buildDayAria = function buildDayAria(day, daySubs) {
    if (!daySubs.length) return `${day} ${app.MONTHS_TR[app.currentMonth]}`;
    const names = daySubs.map((s) => s.name).join(", ");
    return `${day} ${app.MONTHS_TR[app.currentMonth]}: ${names}. Toplam ${app.formatGroupTotal(daySubs)}`;
  };

  app.buildExpenseDayAria = function buildExpenseDayAria(day, dayExpenses, daySum) {
    if (!dayExpenses.length) return `${day} ${app.MONTHS_TR[app.currentMonth]}`;
    const titles = dayExpenses.map((e) => app.expenseTitle(e)).join(", ");
    return `${day} ${app.MONTHS_TR[app.currentMonth]}: ${titles}. Toplam ${app.formatMoney(daySum)}`;
  };

  app.selectDay = function selectDay(day) {
    app.selectedDay = app.selectedDay === day ? null : day;
    app.renderCalendar();
    app.renderDayDetail();
    if (app.selectedDay != null) {
      app.els.dayDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  app.closeDayDetail = function closeDayDetail() {
    app.selectedDay = null;
    app.els.dayDetail.hidden = true;
    app.renderCalendar();
  };

  app.renderDayDetail = function renderDayDetail() {
    if (app.selectedDay == null) {
      app.els.dayDetail.hidden = true;
      return;
    }

    if (app.appMode === "expenses") {
      app.renderExpenseDayDetail();
      return;
    }
    app.renderSubDayDetail();
  };

  app.renderSubDayDetail = function renderSubDayDetail() {
    const daySubs = app.getSubsForDay(app.selectedDay);

    app.els.dayDetail.hidden = false;
    app.els.dayDetailTitle.textContent = `${app.selectedDay} ${app.MONTHS_TR[app.currentMonth]} ${app.activeYear}`;

    if (!daySubs.length) {
      app.els.dayDetailSub.textContent = "Bu gün ödeme yok";
      app.els.dayDetailList.innerHTML =
        '<p class="day-detail-empty">Bu tarihte abonelik ödemesi görünmüyor.</p>';
      return;
    }

    app.els.dayDetailSub.textContent = `${daySubs.length} abonelik · ${app.formatGroupTotal(daySubs)}`;

    const frag = document.createDocumentFragment();
    daySubs.forEach((sub) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day-detail-item";
      btn.addEventListener("click", () => app.openModal(sub));

      const swatch = document.createElement("span");
      swatch.className = "sub-swatch";
      swatch.style.background = sub.color;

      const meta = document.createElement("div");
      meta.className = "sub-meta";
      const name = document.createElement("span");
      name.className = "sub-name";
      name.textContent = sub.name;
      const rec = document.createElement("span");
      rec.className = "sub-recurrence";
      rec.textContent = app.formatRecurrence(sub);
      meta.append(name, rec);

      btn.append(swatch, meta, app.createAmountEl(sub));
      frag.appendChild(btn);
    });

    app.els.dayDetailList.replaceChildren(frag);
  };

  app.renderExpenseDayDetail = function renderExpenseDayDetail() {
    const dayExpenses = app.getExpensesForDay(app.selectedDay);
    const daySum = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    app.els.dayDetail.hidden = false;
    app.els.dayDetailTitle.textContent = `${app.selectedDay} ${app.MONTHS_TR[app.currentMonth]} ${app.activeYear}`;

    if (!dayExpenses.length) {
      app.els.dayDetailSub.textContent = "Bu gün harcama yok";
      app.els.dayDetailList.innerHTML =
        '<p class="day-detail-empty">Bu tarihte harcama kaydı yok. Sağ üstten ekleyebilirsin.</p>';
      return;
    }

    app.els.dayDetailSub.textContent = `${dayExpenses.length} kayıt · ${app.formatMoney(daySum)}`;

    const frag = document.createDocumentFragment();
    dayExpenses.forEach((expense) => {
      frag.appendChild(app.createExpenseListButton(expense, "day-detail-item"));
    });
    app.els.dayDetailList.replaceChildren(frag);
  };

  app.renderSidebar = function renderSidebar() {
    if (app.appMode === "expenses") {
      app.renderExpenseSidebar();
      return;
    }
    app.renderSubSidebar();
  };

  app.renderSubSidebar = function renderSubSidebar() {
    const list = app.getMonthOccurrences();

    if (!list.length) {
      app.els.subList.innerHTML = app.subscriptions.length
        ? '<p class="sub-empty">Bu ay ödeme yok.<br />Başka aya geç veya abonelik ekle.</p>'
        : '<p class="sub-empty">Henüz abonelik yok.<br />Sağ üstten ekleyerek başla.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    list.forEach((sub, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sub-item";
      btn.style.animationDelay = `${index * 35}ms`;
      btn.addEventListener("click", () => app.openModal(sub));

      const badge = document.createElement("div");
      badge.className = "sub-day-badge";
      badge.innerHTML = `<span class="d">${sub.actualDay}</span><span class="u">gün</span>`;

      const meta = document.createElement("div");
      meta.className = "sub-meta";

      const nameRow = document.createElement("div");
      nameRow.className = "sub-name-row";

      const swatch = document.createElement("span");
      swatch.className = "sub-swatch";
      swatch.style.background = sub.color;

      const name = document.createElement("span");
      name.className = "sub-name";
      name.textContent = sub.name;

      nameRow.append(swatch, name);

      const rec = document.createElement("span");
      rec.className = "sub-recurrence";
      rec.textContent = app.formatRecurrence(sub);

      meta.append(nameRow, rec);

      btn.append(badge, meta, app.createAmountEl(sub));
      frag.appendChild(btn);
    });

    app.els.subList.replaceChildren(frag);
  };

  app.renderExpenseSidebar = function renderExpenseSidebar() {
    const list = app.getMonthExpenses();

    if (!list.length) {
      app.els.subList.innerHTML =
        '<p class="sub-empty">Henüz harcama yok.<br />Sağ üstten ekleyerek başla.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    list.forEach((expense, index) => {
      const cat = app.getCategory(expense.categoryId);
      const day = app.parseDateParts(expense.date).day;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sub-item";
      btn.style.animationDelay = `${index * 35}ms`;
      btn.addEventListener("click", () => app.openExpenseModal(expense));

      const badge = document.createElement("div");
      badge.className = "sub-day-badge";
      badge.innerHTML = `<span class="d">${day}</span><span class="u">gün</span>`;

      const meta = document.createElement("div");
      meta.className = "sub-meta";

      const nameRow = document.createElement("div");
      nameRow.className = "sub-name-row";

      const swatch = document.createElement("span");
      swatch.className = "sub-swatch";
      swatch.style.background = cat.color;

      const name = document.createElement("span");
      name.className = "sub-name";
      name.textContent = app.expenseTitle(expense);

      nameRow.append(swatch, name);

      const rec = document.createElement("span");
      rec.className = "sub-recurrence";
      rec.innerHTML = `<span class="cat-chip"><span class="cat-dot" style="background:${cat.color}"></span>${cat.name}</span>`;

      meta.append(nameRow, rec);

      btn.append(badge, meta, app.createExpenseAmountEl(expense));
      frag.appendChild(btn);
    });

    app.els.subList.replaceChildren(frag);
  };

  app.renderYearSummary = function renderYearSummary() {
    if (app.appMode === "expenses") {
      app.renderExpenseYearSummary();
      return;
    }
    app.renderSubYearSummary();
  };

  app.renderSubYearSummary = function renderSubYearSummary() {
    app.els.yearPiePanel.hidden = true;
    app.els.yearPieBody.replaceChildren();

    const totals = app.MONTHS_TR.map((_, i) => app.monthTotal(i));
    const unknowns = app.MONTHS_TR.map((_, i) => app.monthHasUnknown(i));
    const yearSum = totals.reduce((a, b) => a + b, 0);
    const yearHasUnknown = unknowns.some(Boolean);
    const max = Math.max(...totals, 0);
    const hasAnySub = app.subscriptions.length > 0;

    app.els.yearTotal.textContent = yearHasUnknown && yearSum === 0
      ? "Değişken"
      : yearHasUnknown
        ? `${app.formatMoney(yearSum)}+`
        : app.formatMoney(yearSum);

    if (!hasAnySub) {
      app.els.yearCostliest.textContent = "Henüz veri yok";
      app.els.yearBars.innerHTML =
        '<p class="year-empty">Abonelik ekledikçe aylık kırılım burada görünür.</p>';
      return;
    }

    let peakIndex = 0;
    for (let i = 1; i < totals.length; i++) {
      if (totals[i] > totals[peakIndex]) peakIndex = i;
    }

    const peakLabel = unknowns[peakIndex] && totals[peakIndex] === 0
      ? "Değişken"
      : unknowns[peakIndex]
        ? `${app.formatMoney(totals[peakIndex])}+`
        : app.formatMoney(totals[peakIndex]);

    app.els.yearCostliest.textContent =
      max === 0 && yearHasUnknown
        ? "Belirsiz tutarlar var"
        : `${app.MONTHS_TR[peakIndex]} · ${peakLabel}`;

    app.renderYearBars(totals, unknowns, peakIndex, max);
  };

  app.renderExpenseYearSummary = function renderExpenseYearSummary() {
    const totals = app.MONTHS_TR.map((_, i) => app.expenseMonthTotal(i));
    const yearSum = totals.reduce((a, b) => a + b, 0);
    const max = Math.max(...totals, 0);
    const yearExpenses = app.getYearExpenses();
    const hasAny = yearExpenses.length > 0;

    app.els.yearTotal.textContent = app.formatMoney(yearSum);

    if (!hasAny) {
      app.els.yearCostliest.textContent = "Henüz veri yok";
      app.els.yearPiePanel.hidden = true;
      app.els.yearPieBody.replaceChildren();
      app.els.yearBars.innerHTML =
        '<p class="year-empty">Harcama ekledikçe aylık kırılım burada görünür.</p>';
      return;
    }

    let peakIndex = 0;
    for (let i = 1; i < totals.length; i++) {
      if (totals[i] > totals[peakIndex]) peakIndex = i;
    }

    app.els.yearCostliest.textContent =
      max === 0
        ? "Henüz tutar yok"
        : `${app.MONTHS_TR[peakIndex]} · ${app.formatMoney(totals[peakIndex])}`;

    app.els.yearPiePanel.hidden = false;
    app.renderPieInto(app.els.yearPieBody, app.aggregateByCategory(yearExpenses));
    app.renderYearBars(totals, app.MONTHS_TR.map(() => false), peakIndex, max);
  };

  app.renderYearBars = function renderYearBars(totals, unknowns, peakIndex, max) {
    const frag = document.createDocumentFragment();
    totals.forEach((total, index) => {
      const display = unknowns[index] && total === 0
        ? "Değişken"
        : unknowns[index]
          ? `${app.formatMoney(total)}+`
          : app.formatMoney(total);

      const row = document.createElement("button");
      row.type = "button";
      row.className = "year-row" + (index === peakIndex && max > 0 ? " is-peak" : "");
      row.setAttribute("role", "listitem");
      row.setAttribute("aria-label", `${app.MONTHS_TR[index]}: ${display}. Takvime git`);
      row.addEventListener("click", () => {
        app.currentMonth = index;
        app.selectedDay = null;
        app.showCalendarView();
        app.render();
      });

      const monthLabel = document.createElement("span");
      monthLabel.className = "year-row-month";
      monthLabel.textContent = app.MONTHS_TR[index];

      const track = document.createElement("div");
      track.className = "year-bar-track";
      const fill = document.createElement("div");
      fill.className = "year-bar-fill";
      track.appendChild(fill);

      const amount = document.createElement("span");
      amount.className = "year-row-amount" + (unknowns[index] && total === 0 ? " is-unknown" : "");
      amount.textContent = display;

      row.append(monthLabel, track, amount);
      frag.appendChild(row);

      requestAnimationFrame(() => {
        fill.style.width = max > 0 ? `${(total / max) * 100}%` : "0%";
      });
    });

    app.els.yearBars.replaceChildren(frag);
  };

}
