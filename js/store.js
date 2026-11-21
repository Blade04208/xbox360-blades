(() => {
  if (window.__x360Store) return;
  window.__x360Store = true;
  const tick = new Audio("https://steamloopback.host/sounds/x360_focus.wav");
  tick.preload = "auto";
  tick.volume = 0.6;
  let last = 0,
    current = null;
  function play(target) {
    const now = performance.now();
    if (!target || target === current || now - last < 60) return;
    current = target;
    last = now;
    try {
      tick.currentTime = 0;
      tick.play().catch(() => {});
    } catch {}
  }
  document.addEventListener("focusin", (event) => play(event.target), true);
  const RGB_PATTERN = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/;
  function parseColor(value) {
    const m = RGB_PATTERN.exec(value || "");
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  }
  const isNavy = (color) =>
    color &&
    color.a >= 0.25 &&
    color.r + color.g + color.b > 12 &&
    ((Math.max(color.r, color.g, color.b) <= 130 &&
      color.b >= color.r &&
      color.b >= color.g - 6 &&
      (color.b - color.r >= 5 || color.b < 60)) ||
      (color.a >= 0.5 && Math.max(color.r, color.g, color.b) <= 72));
  const isLight = (color) => color && color.a >= 0.6 && Math.min(color.r, color.g, color.b) >= 190;
  const isBarBlue = (color) =>
    color && color.a >= 0.5 && color.b >= 120 && color.b - color.r >= 60 && color.b >= color.g;
  const isBlue = (color) =>
    color &&
    color.a >= 0.5 &&
    color.b >= 170 &&
    color.r <= 130 &&
    color.g >= 90 &&
    color.b - color.r >= 80;
  const isDim = (color) =>
    color &&
    color.a >= 0.5 &&
    Math.max(color.r, color.g, color.b) >= 85 &&
    Math.max(color.r, color.g, color.b) <= 205 &&
    Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b) <= 70;
  function hasFloatingAncestor(element, style) {
    for (
      let node = element, style = style, depth = 0;
      node && node !== document.body && depth < 4;
      node = node.parentElement, depth++
    ) {
      style = depth ? getComputedStyle(node) : style;
      if (
        (style.position === "absolute" || style.position === "fixed") &&
        (+style.zIndex >= 2 ||
          node.getAttribute("role") === "menu" ||
          node.getAttribute("role") === "dialog")
      )
        return true;
    }
    return false;
  }
  function classify(element) {
    if (element.id === "x360-defs" || element.closest?.("[data-x360-skip]")) return;
    const style = getComputedStyle(element);
    if (style.display === "none") return;
    let backgroundColor = null;
    const image = style.backgroundImage;
    if (
      element.matches(
        "html, body, .responsive_page_frame, .responsive_page_content, .responsive_page_template_content, #application_root",
      )
    )
      return;
    if (image && image.includes("url(") && !element.hasAttribute("data-x360-bg")) {
      const box = element.getBoundingClientRect();
      if (box.width >= innerWidth * 0.9 && box.height >= innerHeight * 1.5) {
        element.setAttribute("data-x360-bg", "backdrop");
        return;
      }
    }
    if (image && image !== "none") {
      if (!image.includes("url(") && image.includes("gradient"))
        backgroundColor = parseColor(image);
    } else {
      backgroundColor = parseColor(style.backgroundColor);
    }
    if (backgroundColor && !element.hasAttribute("data-x360-bg")) {
      const rect = element.getBoundingClientRect();
      if (
        rect.height >= 3 &&
        rect.height <= 14 &&
        rect.width >= 6 &&
        isBarBlue(backgroundColor) &&
        !element.children.length
      ) {
        element.setAttribute("data-x360-bg", "fill");
      } else if (
        isLight(backgroundColor) &&
        rect.width >= 30 &&
        rect.width <= 420 &&
        rect.height >= 16 &&
        rect.height <= 90 &&
        !element.querySelector("img, video, picture, input") &&
        (element.textContent || "").trim()
      ) {
        element.setAttribute("data-x360-bg", "chip");
      } else if (
        rect.top + scrollY <= 4 &&
        rect.height >= 30 &&
        rect.height <= 90 &&
        rect.width >= innerWidth * 0.9 &&
        element !== document.body
      ) {
        element.setAttribute("data-x360-bg", "bar");
        element.style.setProperty("--x360-bar-h", Math.round(rect.height) + "px");
      } else if (isNavy(backgroundColor) && hasFloatingAncestor(element, style)) {
        element.setAttribute("data-x360-bg", "solid");
      } else if (isBlue(backgroundColor)) {
        const r = element.getBoundingClientRect();
        element.setAttribute("data-x360-bg", r.width <= 520 && r.height <= 90 ? "plate" : "glass");
      } else if (isNavy(backgroundColor)) {
        element.setAttribute("data-x360-bg", "glass");
      }
    }
    if (
      element.childNodes.length &&
      [...element.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    ) {
      const fg = parseColor(style.color);
      if (isBlue(fg)) element.setAttribute("data-x360-fg", "accent");
      else if (isDim(fg)) element.setAttribute("data-x360-fg", "dim");
    }
  }
  function highlight(element, attr, state) {
    if (
      !element ||
      element.nodeType !== 1 ||
      element.hasAttribute(attr) ||
      element === document.body ||
      element.closest('[data-x360-bg="bar"], [data-x360-skip]')
    )
      return;
    setTimeout(() => {
      if (!element.isConnected || !element.matches(state)) return;
      const rect = element.getBoundingClientRect();
      if (rect.height > 260 || rect.width < 30 || element.querySelector("img, video, picture"))
        return;
      const style = getComputedStyle(element);
      const image = style.backgroundImage;
      const backgroundColor =
        image && image !== "none"
          ? image.includes("url(")
            ? null
            : parseColor(image)
          : parseColor(style.backgroundColor);
      if (
        backgroundColor &&
        backgroundColor.a >= 0.25 &&
        (isLight(backgroundColor) || isBlue(backgroundColor) || isNavy(backgroundColor))
      )
        element.setAttribute(attr, "");
    }, 240);
  }
  document.addEventListener(
    "mouseover",
    (event) =>
      highlight(
        event.target?.closest?.(
          'a, button, [role="button"], [role="menuitem"], [role="tab"], [role="option"], .Focusable, .tab, li',
        ),
        "data-x360-hover",
        ":hover",
      ),
    true,
  );
  const seen = new WeakSet();
  let queue = [],
    scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    if (window.requestIdleCallback) window.requestIdleCallback(drain, { timeout: 400 });
    else setTimeout(drain, 16);
  }
  function enqueue(root) {
    if (!root || root.nodeType !== 1) return;
    queue.push(document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT));
    schedule();
  }
  function drain(deadline) {
    scheduled = false;
    let budget = 600;
    while (
      queue.length &&
      budget > 0 &&
      (!deadline?.timeRemaining || deadline.timeRemaining() > 2 || deadline.didTimeout)
    ) {
      const walker = queue[0];
      if (!walker.root.isConnected) {
        queue.shift();
        continue;
      }
      let element = walker.currentNode;
      while (
        element &&
        budget > 0 &&
        (!deadline?.timeRemaining || deadline.timeRemaining() > 2 || deadline.didTimeout)
      ) {
        if (!seen.has(element)) {
          seen.add(element);
          classify(element);
        }
        budget--;
        element = walker.nextNode();
      }
      if (!element) queue.shift();
    }
    if (queue.length) schedule();
  }
  function start() {
    enqueue(document.body);
    setTimeout(() => {
      for (const element of document.querySelectorAll(".gpfocus"))
        highlight(element, "data-x360-focus", ".gpfocus");
    }, 600);
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          const element = record.target;
          if (
            element.classList?.contains("gpfocus") &&
            !record.oldValue?.split(" ").includes("gpfocus")
          ) {
            play(element);
            highlight(element, "data-x360-focus", ".gpfocus");
          }
          continue;
        }
        for (const node of record.addedNodes) enqueue(node);
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
    });
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
