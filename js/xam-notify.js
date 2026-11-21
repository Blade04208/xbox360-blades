(async () => {
  const selector =
    "._3YTh805w3-xgPkHE_22XcA:has(.mJ3Nu2ja1CSqf_qU1GD_b):not(:has(._6MT2UJrz5bk1FX-saHB-i))";
  const assetBase = "https://millennium.host/v1/themes/X360-Blades/assets/notifications/";
  let tracks;
  const sprites = new Map();
  try {
    const response = await fetch(assetBase + "animation.json");
    if (!response.ok) throw new Error("Notification animation: " + response.status);
    tracks = await response.json();
    const files = [
      ...new Set(
        tracks
          .flatMap((track) => track.draw)
          .filter((operation) => operation.kind === "IMAGE")
          .map((operation) => operation.file),
      ),
    ];
    await Promise.all(
      files.map(async (name) => {
        const image = new Image();
        image.src = assetBase + name;
        await image.decode();
        sprites.set(name, image);
      }),
    );
  } catch (error) {
    console.warn("Xbox 360 notification assets could not load", error);
    return;
  }
  let lastToast, lastTitle;
  function eased(t, key) {
    if (key.easing !== "ease" || t <= 0 || t >= 1) return t;
    const initialSpeed = 1 + key.easeIn / 100,
      finalSpeed = 1 - key.easeOut / 100,
      easeWeight = key.easeWeight / 100;
    const area = (easeWeight * (initialSpeed + 1) + (1 - easeWeight) * (finalSpeed + 1)) / 2;
    if (!area) return t;
    if (t <= easeWeight)
      return (initialSpeed * t + ((1 - initialSpeed) * t * t) / (2 * easeWeight)) / area;
    const remainingProgress = t - easeWeight;
    return (
      ((easeWeight * (initialSpeed + 1)) / 2 +
        remainingProgress +
        ((finalSpeed - 1) * remainingProgress * remainingProgress) / (2 * (1 - easeWeight))) /
      area
    );
  }
  const sceneWidth = (460 * 2) / 3;
  const removedLength = 460 - sceneWidth;
  function drawShortPill(context, image, x, y, width, height) {
    const join = 96;
    const pixelsPerUnit = image.naturalWidth / width;
    const sourceRight = (join + removedLength) * pixelsPerUnit;
    context.drawImage(image, 0, 0, join * pixelsPerUnit, image.naturalHeight, x, y, join, height);
    context.drawImage(
      image,
      sourceRight,
      0,
      image.naturalWidth - sourceRight,
      image.naturalHeight,
      x + join,
      y,
      width - join - removedLength,
      height,
    );
  }
  function fitTitle(context, text, maxWidth) {
    if (context.measureText(text).width <= maxWidth) return text;
    const chars = Array.from(text);
    while (chars.length && context.measureText(chars.join("") + "…").width > maxWidth) chars.pop();
    return chars.join("") + "…";
  }
  const orderedTracks = (() => {
    const list = tracks.slice();
    const logo = list.findIndex((t) => t.name === "xenonLogo1");
    const ring = list.findIndex((t) => t.name === "bg");
    if (logo > ring && ring >= 0) list.splice(ring, 0, list.splice(logo, 1)[0]);
    return list;
  })();
  function attach(toast, title) {
    toast.querySelector("canvas[data-xam]")?.remove();
    const canvas = document.createElement("canvas");
    canvas.dataset.xam = "";
    canvas.setAttribute("aria-hidden", "true");
    toast.append(canvas);
    const context = canvas.getContext("2d");
    document.fonts.load('16px "NXE Convection"');
    const started = performance.now();
    const cssDuration = getComputedStyle(toast).getPropertyValue("--toast-duration").trim();
    const seconds = parseFloat(cssDuration) / (cssDuration.endsWith("ms") ? 1000 : 1);
    const endFrame = Math.max(240, Math.round((seconds || 5) * 60));
    function draw(now) {
      if (!canvas.isConnected || !toast.matches(selector)) {
        canvas.remove();
        return;
      }
      const elapsed = Math.min(endFrame, (now - started) * 0.06);
      let frame =
        elapsed < 186
          ? elapsed
          : elapsed < endFrame - 54
            ? 65 + ((elapsed - 186) % 120)
            : 186 + elapsed - (endFrame - 54);
      if (matchMedia("(prefers-reduced-motion:reduce)").matches) frame = 90;
      const width = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio));
      const height = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(width / sceneWidth, 0, 0, height / 87, 0, 0);
      context.clearRect(0, 0, sceneWidth, 87);
      const gameIcon = toast.querySelector("._1-CP3jNFd252Y0uV_Ua0VE img");
      for (const track of orderedTracks) {
        const keys = track.keys;
        let keyIndex = 0;
        while (keyIndex + 1 < keys.length && keys[keyIndex + 1].frame <= frame) keyIndex++;
        const startKey = keys[keyIndex],
          endKey = keys[keyIndex + 1] || startKey;
        if (!startKey.visible) continue;
        const progress =
          endKey === startKey || startKey.easing === "none"
            ? 0
            : eased((frame - startKey.frame) / (endKey.frame - startKey.frame), startKey);
        const interpolate = (property) =>
          startKey[property] + progress * (endKey[property] - startKey[property]);
        const [originX, originY] = track.origin;
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, interpolate("opacity")));
        context.translate(originX - 196.6665 + interpolate("x"), originY - 345 + interpolate("y"));
        context.scale(interpolate("scaleX"), interpolate("scaleY"));
        context.translate(-originX, -originY);
        for (const operation of track.draw) {
          const [x, y, w, h] = operation.rect;
          if (operation.kind === "IMAGE") {
            const image =
              operation.file === "Achievement.png" && gameIcon?.naturalWidth
                ? gameIcon
                : sprites.get(operation.file);
            if (image?.naturalWidth) {
              if (track.name === "bgCurve1") drawShortPill(context, image, x, y, w, h);
              else context.drawImage(image, x, y, w, h);
            }
          } else if (operation.kind === "GRADIENT_RECT") {
            const grad = context.createRadialGradient(
              x + w / 2,
              y + h / 2,
              0,
              x + w / 2,
              y + h / 2,
              w / 2,
            );
            for (const [offset, color] of operation.stops) grad.addColorStop(offset, color);
            context.fillStyle = grad;
            context.fillRect(x, y, w, h);
          } else {
            context.fillStyle = "#ebebeb";
            context.font = operation.size + 'px "NXE Convection", "Segoe UI", sans-serif';
            context.textBaseline = "middle";
            context.fillText(
              fitTitle(
                context,
                operation.label === "Achievement unlocked" ? operation.label : title,
                w - removedLength,
              ),
              x,
              y + h / 2,
            );
          }
        }
        context.restore();
      }
      if (elapsed < endFrame) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }
  function update() {
    const toast = document.querySelector(selector);
    const title =
      toast?.querySelector("._18PwvOcpWfW3M8j2-bEPPJ")?.textContent ||
      toast?.querySelector(".mJ3Nu2ja1CSqf_qU1GD_b")?.textContent;
    if (toast && title && (toast !== lastToast || title !== lastTitle)) attach(toast, title);
    lastToast = toast;
    lastTitle = title;
  }
  new MutationObserver(update).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  update();
})();
