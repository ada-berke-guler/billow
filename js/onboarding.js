"use strict";

export function register(app) {
  app.typeBrandName = function typeBrandName() {
    return new Promise((resolve) => {
      const target = app.els.onboardingType;
      const brand = app.els.onboardingBrand;
      if (!target || !brand) {
        resolve();
        return;
      }
      target.textContent = "";
      brand.classList.remove("is-typed");
      let i = 0;
      const tick = () => {
        target.textContent = app.BRAND_NAME.slice(0, i);
        if (i >= app.BRAND_NAME.length) {
          brand.classList.add("is-typed");
          resolve();
          return;
        }
        i += 1;
        window.setTimeout(tick, 95);
      };
      window.setTimeout(tick, 180);
    });
  };

  app.revealApp = function revealApp() {
    return new Promise((resolve) => {
      if (app.els.appShell) {
        app.els.appShell.hidden = false;
        app.els.appShell.classList.add("is-entering");
      }
      document.body.classList.remove("is-booting");

      if (!app.els.onboarding) {
        resolve();
        return;
      }

      app.els.onboarding.classList.add("is-leaving");
      window.setTimeout(() => {
        app.els.onboarding.hidden = true;
        app.els.onboarding.classList.remove("is-leaving");
        app.els.onboarding.setAttribute("aria-hidden", "true");
        resolve();
      }, 560);
    });
  };

  app.runSplash = async function runSplash() {
    if (!app.els.onboarding) {
      if (app.els.appShell) app.els.appShell.hidden = false;
      document.body.classList.remove("is-booting");
      return;
    }

    app.els.onboarding.hidden = false;
    if (app.els.onboardingSplash) app.els.onboardingSplash.hidden = false;
    app.els.onboardingTagline.classList.remove("is-visible");

    await app.typeBrandName();
    app.els.onboardingTagline.classList.add("is-visible");
    await app.wait(850);
    await app.revealApp();
  };

}
