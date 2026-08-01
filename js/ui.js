"use strict";

export function register(app) {
  app.buildMonthOptions = function buildMonthOptions(selectEl, selected) {
    selectEl.replaceChildren();
    app.MONTHS_TR.forEach((label, index) => {
      const opt = document.createElement("option");
      opt.value = String(index);
      opt.textContent = label;
      if (index === selected) opt.selected = true;
      selectEl.appendChild(opt);
    });
  };

  app.buildEndYearOptions = function buildEndYearOptions(selected) {
    if (!app.els.subEndYear) return;
    const sel = selected != null && Number.isFinite(Number(selected))
      ? Math.round(Number(selected))
      : app.activeYear;
    const start = Math.min(app.MIN_YEAR, sel);
    const end = Math.max(app.MAX_YEAR, sel);
    app.els.subEndYear.replaceChildren();
    for (let y = start; y <= end; y++) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      if (y === sel) opt.selected = true;
      app.els.subEndYear.appendChild(opt);
    }
  };

  app.applyFrequencyState = function applyFrequencyState() {
    app.els.endMonthWrap.hidden = !app.els.hasEnd.checked;
  };

  app.applyMonthAmountField = function applyMonthAmountField(sub = null) {
    if (!app.els.monthAmountWrap) return;
    const unknown = app.els.amountUnknown.checked;
    const editing = Boolean(app.els.editId.value);
    const show = unknown && editing;
    app.els.monthAmountWrap.hidden = !show;
    if (!show) {
      app.els.subMonthAmount.value = "";
      return;
    }
    app.els.monthAmountLabel.textContent = `${app.MONTHS_TR[app.currentMonth]} ${app.activeYear} tutarı (₺)`;
    if (sub && sub.amountUnknown) {
      const resolved = app.getResolvedAmount(sub, app.activeYear, app.currentMonth);
      app.els.subMonthAmount.value = resolved != null ? String(resolved) : "";
    }
  };

  app.applyAmountUnknownState = function applyAmountUnknownState() {
    const unknown = app.els.amountUnknown.checked;
    app.els.subAmount.disabled = unknown;
    app.els.subAmount.required = !unknown;
    if (unknown) {
      app.els.subAmount.value = "";
      app.els.subAmount.placeholder = "Belirsiz";
    } else {
      app.els.subAmount.placeholder = "149.90";
    }
    const existing = app.els.editId.value
      ? app.subscriptions.find((s) => s.id === app.els.editId.value)
      : null;
    app.applyMonthAmountField(existing || null);
  };

  app.syncModeChrome = function syncModeChrome() {
    const isExpenses = app.appMode === "expenses";
    app.els.addBtnLabel.textContent = isExpenses ? "Harcama ekle" : "Abonelik ekle";
    app.els.monthCountLabel.textContent = isExpenses ? "Kayıt" : "Abonelik";
    app.els.sidebarTitle.textContent = isExpenses ? "Harcamalar" : "Abonelikler";
    app.els.sidebarHint.textContent = isExpenses
      ? "Tarihe göre sıralı"
      : "Ödeme gününe göre";
    app.els.yearSub.textContent = isExpenses
      ? "Yıllık harcama özeti"
      : "Yıllık abonelik harcaması";
    app.els.modeDotSubs.classList.toggle("is-active", !isExpenses);
    app.els.modeDotExpenses.classList.toggle("is-active", isExpenses);
    app.els.modeDotSubs.setAttribute("aria-pressed", !isExpenses ? "true" : "false");
    app.els.modeDotExpenses.setAttribute("aria-pressed", isExpenses ? "true" : "false");
    app.els.expenseInsights.hidden = !isExpenses || !app.els.viewYear.hidden;
    if (!isExpenses) app.hideWeeklyPie();
    if (!isExpenses) {
      app.els.yearPiePanel.hidden = true;
    }
    document.title = `Billow — ${app.activeYear}`;
  };

  app.setAppMode = function setAppMode(mode) {
    app.appMode = mode === "expenses" ? "expenses" : "subs";
    app.persistAppMode();
    app.syncModeChrome();
  };

  app.switchAppMode = function switchAppMode(next) {
    if (app.modeSwitching || app.yearLoading) return;
    if (next !== "subs" && next !== "expenses") return;
    if (next === app.appMode) return;

    app.modeSwitching = true;
    if (app.els.mainLayout) {
      app.els.mainLayout.classList.add("is-fading");
    }

    window.setTimeout(() => {
      app.setAppMode(next);
      app.selectedDay = null;
      app.els.dayDetail.hidden = true;
      app.hideWeeklyPie();
      app.render();
      if (!app.els.viewYear.hidden) app.renderYearSummary();
      if (app.els.mainLayout) {
        app.els.mainLayout.classList.remove("is-fading");
      }
      app.modeSwitching = false;
    }, 200);
  };

  app.hideWeeklyPie = function hideWeeklyPie() {
    app.els.weeklyPiePanel.hidden = true;
    app.els.weeklyPieBody.replaceChildren();
  };

  app.polarToCartesian = function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  app.describeSlice = function describeSlice(cx, cy, r, startAngle, endAngle) {
    const start = app.polarToCartesian(cx, cy, r, endAngle);
    const end = app.polarToCartesian(cx, cy, r, startAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
  };

  app.renderPieInto = function renderPieInto(container, segments) {
    container.replaceChildren();
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    if (!segments.length || total <= 0) {
      const empty = document.createElement("p");
      empty.className = "pie-empty";
      empty.textContent = "Bu aralıkta harcama yok.";
      container.appendChild(empty);
      return;
    }

    const size = 140;
    const cx = size / 2;
    const cy = size / 2;
    const r = 62;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("class", "pie-chart");
    svg.setAttribute("aria-hidden", "true");

    if (segments.length === 1) {
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", segments[0].color);
      svg.appendChild(circle);
    } else {
      let angle = 0;
      segments.forEach((seg) => {
        const sweep = (seg.value / total) * 360;
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", app.describeSlice(cx, cy, r, angle, angle + sweep));
        path.setAttribute("fill", seg.color);
        svg.appendChild(path);
        angle += sweep;
      });
    }

    const legend = document.createElement("div");
    legend.className = "pie-legend";
    segments.forEach((seg) => {
      const row = document.createElement("div");
      row.className = "pie-legend-row";
      const dot = document.createElement("span");
      dot.className = "cat-dot";
      dot.style.background = seg.color;
      const name = document.createElement("span");
      name.className = "pie-legend-name";
      const pct = Math.round((seg.value / total) * 100);
      name.textContent = `${seg.name} · %${pct}`;
      const val = document.createElement("span");
      val.className = "pie-legend-value";
      val.textContent = app.formatMoney(seg.value);
      row.append(dot, name, val);
      legend.appendChild(row);
    });

    container.append(svg, legend);
  };

  app.showWeeklyPie = function showWeeklyPie() {
    const { start, end } = app.getMondayWeekRange(app.getWeekAnchorDate());
    const list = app.getExpensesBetween(start, end);
    app.els.weeklyPieTitle.textContent = `${app.formatShortDate(start)} – ${app.formatShortDate(end)}`;
    app.renderPieInto(app.els.weeklyPieBody, app.aggregateByCategory(list));
    app.els.weeklyPiePanel.hidden = false;
  };

  app.showCalendarView = function showCalendarView() {
    app.els.viewYear.hidden = true;
    app.els.viewCalendar.hidden = false;
    app.els.expenseInsights.hidden = app.appMode !== "expenses";
  };

  app.showYearView = function showYearView() {
    app.closeDayDetail();
    app.hideWeeklyPie();
    app.els.viewCalendar.hidden = true;
    app.els.viewYear.hidden = false;
    app.els.expenseInsights.hidden = true;
    app.renderYearSummary();
  };

  app.updateYearLabels = function updateYearLabels() {
    app.els.yearBrand.textContent = `${app.activeYear} özeti`;
    app.syncModeChrome();
  };

  app.openYearPrompt = function openYearPrompt(targetYear, landingMonth) {
    if (app.yearLoading) return;
    if (targetYear < app.MIN_YEAR || targetYear > app.MAX_YEAR) {
      app.showToast("Bu yıl aralığı desteklenmiyor.");
      return;
    }
    if (targetYear === app.activeYear) return;

    app.pendingYearLoad = { year: targetYear, month: landingMonth };
    const forward = targetYear > app.activeYear;
    app.els.yearPromptTitle.textContent = forward ? "Sonraki yıl" : "Önceki yıl";
    app.els.yearPromptText.textContent = forward
      ? `${app.activeYear} bitti. ${targetYear} takvimini yüklemek ister misin? Aboneliklerin ve harcamaların bu yılda da kayıtlı kalır.`
      : `${targetYear} takvimini yüklemek ister misin?`;
    app.els.yearPromptBackdrop.hidden = false;
  };

  app.closeYearPrompt = function closeYearPrompt() {
    app.els.yearPromptBackdrop.hidden = true;
    app.pendingYearLoad = null;
  };

  app.confirmYearLoad = function confirmYearLoad() {
    if (!app.pendingYearLoad || app.yearLoading) return;
    const { year, month } = app.pendingYearLoad;
    app.els.yearPromptBackdrop.hidden = true;
    app.pendingYearLoad = null;
    app.loadYear(year, month);
  };

  app.loadYear = function loadYear(year, landingMonth) {
    if (app.yearLoading) return;
    app.yearLoading = true;
    app.selectedDay = null;
    app.els.dayDetail.hidden = true;

    app.els.yearLoaderText.textContent = `${year} yükleniyor…`;
    app.els.yearLoader.hidden = false;

    window.setTimeout(() => {
      app.activeYear = year;
      app.currentMonth = app.clampMonth(landingMonth);
      app.persistActiveYear();
      app.updateYearLabels();
      app.showCalendarView();
      app.render();

      app.els.yearLoader.hidden = true;
      app.yearLoading = false;
      app.showToast(`${year} takvimi hazır`);
    }, 900);
  };

  app.maybePromptRealYearRollover = function maybePromptRealYearRollover() {
    const nowYear = new Date().getFullYear();
    if (nowYear > app.activeYear) {
      app.openYearPrompt(nowYear, new Date().getMonth());
    }
  };

  app.buildSwatches = function buildSwatches() {
    app.els.colorSwatches.replaceChildren();
    app.COLORS.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch";
      btn.style.background = color;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-label", `Renk ${color}`);
      btn.dataset.color = color;
      btn.addEventListener("click", () => app.selectColor(color));
      app.els.colorSwatches.appendChild(btn);
    });
  };

  app.selectColor = function selectColor(color) {
    app.selectedColor = color;
    app.els.subColor.value = color;
    app.els.colorSwatches.querySelectorAll(".swatch").forEach((el) => {
      el.setAttribute("aria-checked", el.dataset.color === color ? "true" : "false");
    });
  };

  app.openModal = function openModal(sub = null) {
    if (sub) {
      app.els.modalTitle.textContent = "Aboneliği düzenle";
      app.els.editId.value = sub.id;
      app.els.subName.value = sub.name;
      app.els.amountUnknown.checked = Boolean(sub.amountUnknown);
      app.els.subAmount.value = sub.amountUnknown ? "" : String(sub.amount);
      app.els.subDay.value = String(sub.day);
      app.els.subInterval.value = String(sub.intervalMonths || 1);
      app.els.hasEnd.checked = Boolean(sub.hasEnd);
      app.buildMonthOptions(app.els.subStartMonth, sub.startMonth ?? 0);
      app.buildMonthOptions(app.els.subEndMonth, sub.endMonth ?? 11);
      app.buildEndYearOptions(sub.endYear ?? app.activeYear);
      app.selectColor(sub.color);
      app.els.deleteBtn.hidden = !app.canCancelSub(sub);
    } else {
      app.els.modalTitle.textContent = "Yeni abonelik";
      app.els.editId.value = "";
      app.els.subForm.reset();
      app.els.amountUnknown.checked = false;
      app.els.subInterval.value = "1";
      app.els.hasEnd.checked = false;
      app.buildMonthOptions(app.els.subStartMonth, 0);
      app.buildMonthOptions(app.els.subEndMonth, 11);
      app.buildEndYearOptions(app.activeYear);
      app.selectColor(app.COLORS[app.subscriptions.length % app.COLORS.length]);
      app.els.deleteBtn.hidden = true;
    }
    app.applyAmountUnknownState();
    app.applyFrequencyState();
    app.applyMonthAmountField(sub);
    app.els.modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => app.els.subName.focus());
  };

  app.closeModal = function closeModal() {
    app.els.modalBackdrop.hidden = true;
    document.body.style.overflow = "";
  };

  app.populateExpenseCategories = function populateExpenseCategories() {
    app.els.expenseCategory.replaceChildren();
    app.EXPENSE_CATEGORIES.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      app.els.expenseCategory.appendChild(opt);
    });
  };

  app.openExpenseModal = function openExpenseModal(expense = null) {
    if (expense) {
      app.els.expenseTitle.textContent = "Harcamayı düzenle";
      app.els.expenseEditId.value = expense.id;
      app.els.expenseAmount.value = String(expense.amount);
      app.els.expenseCategory.value = expense.categoryId;
      app.els.expenseDate.value = expense.date;
      app.els.expenseNote.value = expense.note || "";
      app.els.expenseDeleteBtn.hidden = false;
    } else {
      app.els.expenseTitle.textContent = "Yeni harcama";
      app.els.expenseEditId.value = "";
      app.els.expenseForm.reset();
      app.els.expenseCategory.value = app.EXPENSE_CATEGORIES[0].id;
      app.els.expenseDate.value = app.defaultExpenseDate();
      app.els.expenseNote.value = "";
      app.els.expenseDeleteBtn.hidden = true;
    }
    app.els.expenseBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => app.els.expenseAmount.focus());
  };

  app.closeExpenseModal = function closeExpenseModal() {
    app.els.expenseBackdrop.hidden = true;
    document.body.style.overflow = "";
  };

  app.showToast = function showToast(message) {
    app.els.toast.textContent = message;
    app.els.toast.hidden = false;
    app.els.toast.classList.add("show");
    clearTimeout(app.toastTimer);
    app.toastTimer = setTimeout(() => {
      app.els.toast.classList.remove("show");
      setTimeout(() => {
        app.els.toast.hidden = true;
      }, 280);
    }, 2200);
  };

}
