"use strict";

export function register(app) {
  app.getTourSteps = function getTourSteps() {
    return [
      {
        getEl: () => document.querySelector(".mode-dots"),
        title: "İki mod",
        text: "Bu noktalarla abonelikler ve harcamalar arasında geçiş yaparsın.",
      },
      {
        getEl: () => document.querySelector(".month-nav"),
        title: "Ay gezintisi",
        text: "Oklarla aylar arasında dolaş. Yıl değişince onay istenir.",
      },
      {
        getEl: () => app.els.addBtn,
        title: "Yeni kayıt",
        text: "Buradan abonelik veya harcama eklersin. Aktif moda göre form açılır.",
      },
      {
        getEl: () => app.els.monthSummary,
        title: "Bu ay",
        text: "Seçili ayın toplam tutarı ve kayıt sayısı burada görünür.",
      },
      {
        getEl: () => document.getElementById("calendarBlock") || app.els.calendarGrid,
        title: "Takvim",
        text: "Ödeme veya harcama günlerinde nokta ve tutar çıkar. Güne basınca detay açılır.",
      },
      {
        getEl: () => document.querySelector(".sidebar"),
        title: "Liste",
        text: "Ayın tüm kayıtları burada sıralı. Birine basarak düzenleyebilirsin.",
      },
      {
        getEl: () => app.els.yearBtn,
        title: "Yıllık özet",
        text: "Yılın aylık kırılımını ve toplamını buradan görürsün.",
      },
    ];
  };

  app.clearTourTimer = function clearTourTimer() {
    if (app.tourTimer != null) {
      window.clearTimeout(app.tourTimer);
      app.tourTimer = null;
    }
  };

  app.stopTour = function stopTour() {
    app.clearTourTimer();
    app.tourIndex = -1;
    if (app.tourRepositionHandler) {
      window.removeEventListener("resize", app.tourRepositionHandler);
      window.removeEventListener("scroll", app.tourRepositionHandler, true);
      app.tourRepositionHandler = null;
    }
    if (app.els.tour) app.els.tour.hidden = true;
    if (app.els.tourBubble) {
      app.els.tourBubble.classList.remove("is-below", "is-above", "is-last");
    }
    document.body.classList.remove("is-touring");
  };

  app.placeTourStep = function placeTourStep() {
    const steps = app.getTourSteps();
    const step = steps[app.tourIndex];
    if (!step || !app.els.tourSpotlight || !app.els.tourBubble) return;

    const target = step.getEl();
    if (!target) {
      app.advanceTour();
      return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 8;
    const top = rect.top - pad;
    const left = rect.left - pad;
    const width = rect.width + pad * 2;
    const height = rect.height + pad * 2;

    app.els.tourSpotlight.style.top = `${top}px`;
    app.els.tourSpotlight.style.left = `${left}px`;
    app.els.tourSpotlight.style.width = `${width}px`;
    app.els.tourSpotlight.style.height = `${height}px`;

    const bubble = app.els.tourBubble;
    const bubbleWidth = Math.min(300, window.innerWidth - 32);
    bubble.style.width = `${bubbleWidth}px`;
    const bubbleHeight = bubble.offsetHeight || 150;

    const visTop = Math.max(rect.top, 12);
    const visBottom = Math.min(rect.bottom, window.innerHeight - 12);
    const visCenterX = (Math.max(rect.left, 0) + Math.min(rect.right, window.innerWidth)) / 2;
    const spaceBelow = window.innerHeight - visBottom;
    const spaceAbove = visTop;
    const placeBelow = spaceBelow >= bubbleHeight + 20 || spaceBelow >= spaceAbove;

    bubble.classList.toggle("is-below", placeBelow);
    bubble.classList.toggle("is-above", !placeBelow);

    let bubbleLeft = visCenterX - bubbleWidth / 2;
    bubbleLeft = Math.max(16, Math.min(bubbleLeft, window.innerWidth - bubbleWidth - 16));
    let bubbleTop = placeBelow
      ? visBottom + 14
      : visTop - 14 - bubbleHeight;
    bubbleTop = Math.max(12, Math.min(bubbleTop, window.innerHeight - bubbleHeight - 12));

    bubble.style.left = `${bubbleLeft}px`;
    bubble.style.top = `${bubbleTop}px`;

    const arrowX = visCenterX - bubbleLeft;
    bubble.style.setProperty("--tour-arrow-x", `${Math.max(18, Math.min(arrowX, bubbleWidth - 18))}px`);
  };

  app.showTourStep = function showTourStep(index) {
    const steps = app.getTourSteps();
    if (index < 0 || index >= steps.length) {
      app.stopTour();
      return;
    }

    app.clearTourTimer();
    app.tourIndex = index;
    const step = steps[index];
    const isLast = index === steps.length - 1;
    const target = step.getEl();

    app.els.tourStepLabel.textContent = `${index + 1} / ${steps.length}`;
    app.els.tourTitle.textContent = step.title;
    app.els.tourText.textContent = step.text;
    app.els.tourBubble.classList.toggle("is-last", isLast);
    if (app.els.tourNext) app.els.tourNext.hidden = isLast;
    if (app.els.tourSkip) {
      app.els.tourSkip.textContent = isLast ? "Kapat" : "Geç";
    }

    app.els.tourBubble.style.animation = "none";
    void app.els.tourBubble.offsetWidth;
    app.els.tourBubble.style.animation = "";

    if (target) {
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    }

    requestAnimationFrame(() => {
      app.placeTourStep();
      requestAnimationFrame(app.placeTourStep);
    });

    if (isLast) {
      app.tourTimer = window.setTimeout(() => app.stopTour(), 2800);
    }
  };

  app.advanceTour = function advanceTour() {
    const steps = app.getTourSteps();
    if (app.tourIndex >= steps.length - 1) {
      app.stopTour();
      return;
    }
    app.showTourStep(app.tourIndex + 1);
  };

  app.startTour = function startTour() {
    if (!app.els.tour || app.yearLoading || app.modeSwitching) return;
    if (!app.els.viewYear.hidden) {
      app.showCalendarView();
      app.render();
    }
    app.stopTour();
    document.body.classList.add("is-touring");
    app.els.tour.hidden = false;
    app.tourRepositionHandler = () => {
      if (app.tourIndex >= 0) app.placeTourStep();
    };
    window.addEventListener("resize", app.tourRepositionHandler);
    window.addEventListener("scroll", app.tourRepositionHandler, true);
    app.showTourStep(0);
  };

}
