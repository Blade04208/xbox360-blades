(() => {
  if (window.__x360Blades) return;
  window.__x360Blades = true;
  const BASE = "https://millennium.host/v1/themes/X360-Blades/css/";
  const POPUP_SHEETS = ["font.css", "glyphs.css", "keyboard.css", "guide.css"];
  const BLADES = [
    {
      label: "marketplace",
      color: 5,
      web: "https://store.steampowered.com/",
      match: /^\/(store|steamweb|browser)/,
    },
    { label: "Steam Big Picture", color: 1, path: "/library/home", match: /^\/library\/home/ },
    { label: "games", color: 2, path: "/library", match: /^\/library/ },
    { label: "media", color: 3, path: "/media/grid", match: /^\/media/ },
    { label: "system", color: 4, path: "/settings", match: /^\/settings/ },
  ];
  const TRIGGER_LEFT = 7,
    TRIGGER_RIGHT = 8;
  let nav,
    title,
    jewel,
    active = -1,
    root;
  function getGamepadWindow() {
    try {
      const store = (window.opener || window).SteamUIStore || window.SteamUIStore;
      return store?.WindowStore?.GamepadUIMainWindowInstance;
    } catch {
      return undefined;
    }
  }
  function getCurrentPath() {
    const gamepadWindow = getGamepadWindow();
    return gamepadWindow?.m_history?.location?.pathname || gamepadWindow?.m_locationPathname || "";
  }
  function getBladeIndex(path) {
    return BLADES.findIndex((b) => b.match.test(path));
  }
  function selectBlade(index, hold) {
    if (index < 0 || !root) return;
    if (active >= 0 && index !== active) {
      if (hold) hideContent();
      else slide(index > active ? "right" : "left");
    }
    active = index;
    root.dataset.blade = String(BLADES[index].color);
    root.style.setProperty("--x360-left-count", String(index));
    root.style.setProperty("--x360-right-count", String(BLADES.length - 1 - index));
    title.textContent = BLADES[index].label;
    [...nav.querySelectorAll("button")].forEach((button, i) => {
      const side = i < index ? "left" : i > index ? "right" : "open";
      button.dataset.side = side;
      button.style.setProperty("--depth", String(Math.abs(i - index)));
      button.style.setProperty("--slot", String(side === "right" ? BLADES.length - 1 - i : i));
      button.tabIndex = side === "open" ? -1 : 0;
      if (side === "open") button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    jewel.style.setProperty("--slot", String(index));
  }
  let pendingUntil = 0;
  function navigateToBlade(index) {
    index = Math.max(0, Math.min(BLADES.length - 1, index));
    if (index === active) return;
    const gamepadWindow = getGamepadWindow();
    if (!gamepadWindow?.Navigate) return;
    const blade = BLADES[index];
    const direction = index > active ? "right" : "left";
    selectBlade(index, true);
    pendingUntil = performance.now() + 900;
    setTimeout(() => {
      const pageOf = () => document.querySelector("#Main .TopLevelTransitionSwitch > *");
      const oldPage = pageOf();
      if (blade.web && gamepadWindow.NavigateToSteamWeb)
        gamepadWindow.NavigateToSteamWeb(blade.web);
      else gamepadWindow.Navigate(blade.path);
      const started = performance.now();
      (function wait() {
        const current = pageOf();
        const swapped =
          (current && current !== oldPage && (!oldPage || !oldPage.isConnected)) ||
          (blade.web && document.querySelector("#Main .BrowserContainer"));
        if (swapped || performance.now() - started > 1000) slide(direction);
        else setTimeout(wait, 16);
      })();
    }, 24);
  }
  let slideTimer;
  function hideContent() {
    root.dataset.x360Slide = "out";
    clearTimeout(slideTimer);
    slideTimer = setTimeout(() => {
      if (root?.dataset.x360Slide === "out") delete root.dataset.x360Slide;
    }, 1200);
  }
  function slide(direction) {
    root.dataset.x360Slide = direction;
    clearTimeout(slideTimer);
    slideTimer = setTimeout(() => {
      if (root) delete root.dataset.x360Slide;
      try {
        window.dispatchEvent(new Event("resize"));
      } catch { }
    }, 420);
  }
  function bladeAt(x, fallback) {
    let best = fallback,
      distance = Infinity;
    [...nav.querySelectorAll("button")].forEach((button, i) => {
      if (button.dataset.side === "open") return;
      const box = button.querySelector("span")?.getBoundingClientRect();
      if (!box || !box.width) return;
      const d = Math.abs(box.left + box.width / 2 - x);
      if (d < distance) {
        distance = d;
        best = i;
      }
    });
    return best;
  }
  function build() {
    nav = document.createElement("nav");
    nav.id = "x360-blades";
    nav.setAttribute("aria-label", "Dashboard blades");
    const background = document.createElement("div");
    background.className = "x360-blade-background";
    background.setAttribute("aria-hidden", "true");
    const bands = document.createElement("div");
    bands.className = "x360-bands";
    bands.setAttribute("aria-hidden", "true");
    nav.append(background, bands);
    jewel = document.createElement("div");
    jewel.className = "x360-jewel";
    nav.append(jewel);
    BLADES.forEach((blade, i) => {
      const button = document.createElement("button");
      button.type = "button";
      const text = document.createElement("span");
      text.textContent = blade.label;
      button.append(text);
      button.addEventListener("click", (event) =>
        navigateToBlade(event.detail ? bladeAt(event.clientX, i) : i),
      );
      nav.append(button);
    });
    nav.addEventListener("mousemove", (event) => {
      const hot = event.target?.closest?.("button") ? bladeAt(event.clientX, -1) : -1;
      [...nav.querySelectorAll("button")].forEach((button, i) =>
        button.toggleAttribute("data-x360-hot", i === hot),
      );
    });
    nav.addEventListener("mouseleave", () =>
      nav
        .querySelectorAll("button[data-x360-hot]")
        .forEach((button) => button.removeAttribute("data-x360-hot")),
    );
    title = document.createElement("div");
    title.className = "x360-title";
    nav.append(title);
  }
  function sync() {
    const found = document.querySelector(".BasicUiRoot");
    if (!found) return;
    if (!nav) build();
    ensureDefs(document);
    if (found !== root || nav.parentElement !== found) {
      root = found;
      root.prepend(nav);
      active = -1;
    }
    const path = getCurrentPath();
    const off =
      !path ||
      /^\/(login|init|oobe|update|shutdown|welcome)/.test(path) ||
      !!getGamepadWindow()?.BViewingPreLoginRoute?.();
    root.toggleAttribute("data-x360-off", off);
    nav.hidden = off;
    const detail = /^\/library\/app\/[^/]+/.test(path) ||
      !!root.querySelector("#header .SearchAndTitleContainer.ShowingTitle");
    root.toggleAttribute("data-x360-detail", detail);
    nav.inert = detail;
    const next = getBladeIndex(path);
    if (performance.now() < pendingUntil) {
      if (next === active) pendingUntil = 0;
      return;
    }
    // A detail page takes its library color, but the rails retract from their current slots.
    if (detail && active >= 0) {
      const blade = BLADES[next >= 0 ? next : active];
      root.dataset.blade = String(blade.color);
      if (title.textContent !== blade.label) title.textContent = blade.label;
      return;
    }
    if (next >= 0 && (next !== active || root.dataset.blade !== String(BLADES[next].color))) selectBlade(next);
    else if (active < 0) selectBlade(1);
  }
  function ensureDefs(doc) {
    if (!doc?.body || doc.getElementById("x360-defs")) return;
    const holder = doc.createElement("div");
    holder.innerHTML =
      '<svg id="x360-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<linearGradient id="x360-gloss-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".48" stop-color="#f1f5f6"/><stop offset=".52" stop-color="#cfd9dd"/><stop offset="1" stop-color="#9fb0b8"/></linearGradient>' +
      '<linearGradient id="x360-gloss-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b7d87"/><stop offset=".48" stop-color="#43535c"/><stop offset=".52" stop-color="#2c3a42"/><stop offset="1" stop-color="#141d22"/></linearGradient>' +
      "</defs></svg>";
    doc.body.append(holder.firstChild);
  }
  function stylePopups() {
    const trees = getGamepadWindow()?.m_FocusNavContext?.m_rgGamepadNavigationTrees || [];
    for (const tree of trees) {
      let doc;
      try {
        doc = tree?.m_window?.document;
      } catch {
        continue;
      }
      if (!doc?.head || doc === document) continue;
      const menu = doc.querySelector("#MainNavMenuContainer .Menu");
      const clock = document.querySelector("#header .Clock")?.textContent;
      if (menu && clock && menu.dataset.x360Time !== clock) menu.dataset.x360Time = clock;
      ensureDefs(doc);
      addStylesheets(doc, POPUP_SHEETS);
      doc.documentElement.dataset.x360Popup = (doc.title || "").replace(/_uid\d+$/, "");
    }
  }
  const TOAST_SHEETS = ["font.css", "achievements.css"];
  function addStylesheets(doc, files) {
    for (const file of files) {
      const href = BASE + file;
      if (doc.querySelector('link[data-x360="' + file + '"], link[href="' + href + '"]')) continue;
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.x360 = file;
      doc.head.append(link);
    }
  }
  function styleToasts() {
    let sources = [];
    try {
      sources =
        (window.opener || window).SteamUIStore?.m_GamepadNavigationManager
          ?.m_rgGamepadInputSources || [];
    } catch {
      return;
    }
    for (const source of sources) {
      let doc;
      try {
        doc = source?.m_targetWindow?.document;
      } catch {
        continue;
      }
      if (!doc?.head || !/^notificationtoasts/i.test(doc.title || "")) continue;
      addStylesheets(doc, TOAST_SHEETS);
    }
  }
  window.addEventListener(
    "vgp_onbuttondown",
    (event) => {
      const button = event.detail?.button;
      if (button !== TRIGGER_LEFT && button !== TRIGGER_RIGHT) return;
      if (!event.target?.closest?.("#GamepadUI_Full_Root") || active < 0) return;
      navigateToBlade(active + (button === TRIGGER_LEFT ? -1 : 1));
    },
    true,
  );
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      sync();
    }, 120);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(() => {
    sync();
    stylePopups();
    styleToasts();
  }, 1000);
  window.addEventListener(
    "pagehide",
    () => {
      observer.disconnect();
      clearInterval(timer);
    },
    { once: true },
  );
  sync();
  stylePopups();
})();
