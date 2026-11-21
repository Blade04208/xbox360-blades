(() => {
  if (window.__x360PagesStop) window.__x360PagesStop();
  const RGB_PATTERN = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/g;
  function parseColors(value) {
    const out = [];
    RGB_PATTERN.lastIndex = 0;
    for (let m; (m = RGB_PATTERN.exec(value || ""));)
      out.push({ r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] });
    return out;
  }
  const isNavy = (color) =>
    color.a >= 0.25 &&
    Math.max(color.r, color.g, color.b) <= 130 &&
    color.b >= color.r &&
    color.b >= color.g - 6 &&
    color.r + color.g + color.b > 12 &&
    (color.b - color.r >= 5 || color.b < 60);
  const isBlue = (color) =>
    color.a >= 0.5 && color.b >= 170 && color.r <= 130 && color.g >= 90 && color.b - color.r >= 80;
  const isDim = (color) =>
    color.a >= 0.5 &&
    Math.max(color.r, color.g, color.b) >= 85 &&
    Math.max(color.r, color.g, color.b) <= 205 &&
    Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b) <= 70;
  const SKIP =
    "#x360-blades, #x360-defs, #header, #Footer, .BackgroundGlass, .Toggle, .DialogButton, " +
    ".Tab, .TabHeaderRowWrapper, .PagedSettingsDialog_PageListItem, .MenuButton, .PlayButton, .BasicContextMenuContainer, .contextMenu, " +
    ".LibraryItemBox, .GreyBackground, .FocusRingRoot, .ModalOverlayBackground, #MainNavMenuContainer, .QuickAccessMenu > .Tabs, " +
    '[class*="VirtualKeyboard"], [class*="virtualkeyboard"], video, canvas, img, svg, iframe, [data-x360-skip]';
  const isLight = (color) => color.a >= 0.6 && Math.min(color.r, color.g, color.b) >= 190;
  const FRAME =
    "html, body, .BasicUiRoot, #MainNavMenu-Rest, #GamepadUI_Full_Root, #Main, #popup_target, #QuickAccess-Menu";
  function classify(element, win) {
    if (element.matches(FRAME)) return;
    const style = win.getComputedStyle(element);
    if (style.display === "none") return;
    const image = style.backgroundImage;
    let list = null;
    if (image && image !== "none") {
      if (!image.includes("url(") && image.includes("gradient")) list = parseColors(image);
    } else list = parseColors(style.backgroundColor);
    const painted = list ? list.filter((color) => color.a >= 0.25) : [];
    if (painted.length) {
      const rect = element.getBoundingClientRect();
      const blue = painted.every(isBlue);
      if (rect.height >= 3 && rect.width >= (blue ? 8 : 24)) {
        const doc = element.ownerDocument;
        const frame = (doc.getElementById("Main") || doc.documentElement).getBoundingClientRect();
        const thin = rect.height <= 14 && rect.width >= 40;
        let kind = "";
        if (painted.every(isLight)) {
          if (
            rect.width >= 60 &&
            rect.height >= 18 &&
            rect.height <= 220 &&
            element.matches(".gpfocus, .Focusable.Active, .Focusable.Selected")
          )
            kind = "focus";
        } else if (blue) {
          kind = thin ? "fill" : rect.width <= 520 && rect.height <= 90 ? "plate" : "glass";
        } else if (painted.every(isNavy)) {
          if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") kind = "field";
          else if (thin) kind = "track";
          else if (
            rect.width * rect.height >= frame.width * frame.height * 0.5 ||
            (rect.width >= frame.width * 0.95 && rect.height >= 150)
          )
            kind = "clear";
          else kind = "glass";
        }
        if (kind) element.setAttribute("data-x360-bg", kind);
      }
    }
    const textColor = parseColors(style.color)[0];
    if (
      textColor &&
      [...element.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    ) {
      if (isBlue(textColor)) element.setAttribute("data-x360-fg", "accent");
      else if (isDim(textColor)) element.setAttribute("data-x360-fg", "dim");
    }
  }
  const watched = new Map();
  let queue = [],
    scheduled = false,
    stopped = false;
  function schedule() {
    if (scheduled || stopped) return;
    scheduled = true;
    setTimeout(drain, 60);
  }
  function enqueue(root) {
    if (!root || root.nodeType !== 1 || !root.isConnected) return;
    if (root.closest(SKIP)) return;
    queue.push(
      root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (element) =>
          element.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      }),
    );
    schedule();
  }
  function drain() {
    scheduled = false;
    const started = performance.now();
    let budget = 700;
    while (queue.length && budget > 0 && performance.now() - started < 8) {
      const walker = queue[0];
      const win = walker.root.ownerDocument.defaultView;
      if (!walker.root.isConnected || !win) {
        queue.shift();
        continue;
      }
      let element = walker.currentNode;
      while (element && budget > 0 && performance.now() - started < 8) {
        if (!element.hasAttribute("data-x360-bg")) classify(element, win);
        budget--;
        element = walker.nextNode();
      }
      if (!element) queue.shift();
    }
    if (queue.length) schedule();
  }
  function recheck(element) {
    if (!element.isConnected) return;
    const win = element.ownerDocument.defaultView;
    if (!win) return;
    const before = element.style.getPropertyValue("transition"),
      priority = element.style.getPropertyPriority("transition");
    element.style.setProperty("transition", "none", "important");
    element.removeAttribute("data-x360-bg");
    element.removeAttribute("data-x360-fg");
    if (!element.closest(SKIP)) classify(element, win);
    void win.getComputedStyle(element).backgroundColor;
    if (before) element.style.setProperty("transition", before, priority);
    else element.style.removeProperty("transition");
  }
  function onHover(event) {
    const element = event.target?.closest?.('.Focusable, [role="button"], [role="menuitem"]');
    if (
      !element ||
      element.hasAttribute("data-x360-hover") ||
      element.closest(SKIP) ||
      element.matches(FRAME)
    )
      return;
    setTimeout(() => {
      if (!element.isConnected || !element.matches(":hover")) return;
      const win = element.ownerDocument.defaultView;
      if (!win) return;
      const rect = element.getBoundingClientRect();
      if (rect.height > 220 || rect.width < 40) return;
      const style = win.getComputedStyle(element);
      const image = style.backgroundImage;
      const list =
        image && image !== "none"
          ? image.includes("url(")
            ? []
            : parseColors(image)
          : parseColors(style.backgroundColor);
      const painted = list.filter((color) => color.a >= 0.25);
      if (
        painted.length &&
        (painted.every(isNavy) || painted.every(isLight) || painted.every(isBlue))
      )
        element.setAttribute("data-x360-hover", "");
    }, 260);
  }
  function watch(doc) {
    if (!doc?.body || watched.has(doc)) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          const element = record.target;
          if (
            element.hasAttribute?.("data-x360-bg") ||
            element.hasAttribute?.("data-x360-fg") ||
            element.classList?.contains("gpfocus")
          )
            recheck(element);
          continue;
        }
        for (const node of record.addedNodes) enqueue(node);
      }
    });
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    watched.set(doc, observer);
    doc.addEventListener("mouseover", onHover, true);
    enqueue(doc.body);
  }
  function watchPopups() {
    let trees = [];
    try {
      trees =
        (window.opener || window).SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance
          ?.m_FocusNavContext?.m_rgGamepadNavigationTrees || [];
    } catch {
      return;
    }
    for (const tree of trees) {
      let doc;
      try {
        doc = tree?.m_window?.document;
      } catch {
        continue;
      }
      if (doc && doc !== document) watch(doc);
    }
    for (const doc of watched.keys())
      if (!doc.defaultView) {
        watched.get(doc).disconnect();
        watched.delete(doc);
      }
  }
  watch(document);
  watchPopups();
  const timer = setInterval(watchPopups, 1500);
  window.__x360PagesStop = () => {
    stopped = true;
    clearInterval(timer);
    for (const [doc, observer] of watched) {
      observer.disconnect();
      try {
        doc.removeEventListener("mouseover", onHover, true);
      } catch {}
      try {
        for (const element of doc.querySelectorAll(
          "[data-x360-bg], [data-x360-fg], [data-x360-hover]",
        )) {
          element.removeAttribute("data-x360-bg");
          element.removeAttribute("data-x360-fg");
          element.removeAttribute("data-x360-hover");
        }
      } catch {}
    }
    watched.clear();
  };
  window.addEventListener("pagehide", () => window.__x360PagesStop?.(), { once: true });
})();
