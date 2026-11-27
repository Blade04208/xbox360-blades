(() => {
  window.__x360SelectionStop?.();
  const LIST = '.x360-dash-shortcuts, .PagedSettingsDialog_PageList';
  const ROW = '.x360-dash-row, .PagedSettingsDialog_PageListItem';
  const groups = new Map();
  let frame = 0, stopped = false;
  const schedule = () => {
    if (!stopped && !frame) frame = requestAnimationFrame(sync);
  };
  const resize = new ResizeObserver(schedule);
  function remove(group, state) {
    resize.unobserve(group);
    state.surface.remove();
    group.classList.remove('x360-selection-list');
    group.style.removeProperty('--x360-selection-y');
    group.style.removeProperty('--x360-selection-height');
    group.querySelectorAll('[data-x360-selected]').forEach(row => row.removeAttribute('data-x360-selected'));
    groups.delete(group);
  }
  function sync() {
    frame = 0;
    const enabled = document.querySelector('.BasicUiRoot:not([data-x360-off])');
    for (const [group, state] of groups) {
      if (!enabled?.contains(group) || !group.matches(LIST)) remove(group, state);
    }
    for (const group of enabled?.querySelectorAll(LIST) || []) {
      let state = groups.get(group);
      if (!state) {
        const surface = document.createElement('div');
        surface.className = 'x360-selection-surface';
        surface.setAttribute('aria-hidden', 'true');
        surface.setAttribute('data-x360-skip', '');
        const band = document.createElement('div');
        band.className = 'x360-selection-band';
        surface.append(band);
        surface.hidden = true;
        group.classList.add('x360-selection-list');
        group.prepend(surface);
        state = { surface, hover: null };
        groups.set(group, state);
        resize.observe(group);
      }
      const rows = [...group.children].filter(row => row.matches(ROW));
      const last = rows.at(-1);
      const extent = Math.max(group.clientHeight, last ? last.offsetTop + last.offsetHeight : 0) + 'px';
      if (state.surface.style.height !== extent) state.surface.style.height = extent;
      const target = rows.find(row => row === state.hover)
        || rows.find(row => row.matches('.gpfocus, :focus-visible'))
        || rows.find(row => row.matches('.PagedSettingsDialog_PageListItem.Active'));
      for (const row of rows) row.toggleAttribute('data-x360-selected', row === target);
      state.surface.hidden = !target;
      if (!target) continue;
      const y = target.offsetTop + 'px', height = target.offsetHeight + 'px';
      if (group.style.getPropertyValue('--x360-selection-y') !== y) group.style.setProperty('--x360-selection-y', y);
      if (group.style.getPropertyValue('--x360-selection-height') !== height) group.style.setProperty('--x360-selection-height', height);

    }
  }
  function pointer(event) {
    const group = event.target.closest?.(LIST), state = groups.get(group);
    if (!state) return;
    const row = event.target.closest(ROW);
    state.hover = row?.parentElement === group ? row : null;
    if (event.type === 'pointerout' && !group.contains(event.relatedTarget)) state.hover = null;
    schedule();
  }
  function focus() {
    for (const state of groups.values()) state.hover = null;
    schedule();
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true,
    attributes: true, attributeFilter: ['class', 'data-x360-off'] });
  document.addEventListener('pointerover', pointer);
  document.addEventListener('pointerout', pointer);
  document.addEventListener('vgp_onfocus', focus);
  document.addEventListener('focusin', focus);
  window.addEventListener('resize', schedule);
  window.__x360SelectionStop = () => {
    stopped = true;
    observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
    for (const [group, state] of groups) remove(group, state);
    document.removeEventListener('pointerover', pointer);
    document.removeEventListener('pointerout', pointer);
    document.removeEventListener('vgp_onfocus', focus);
    document.removeEventListener('focusin', focus);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('pagehide', stop);
    delete window.__x360SelectionStop;
  };
  const stop = () => window.__x360SelectionStop?.();
  window.addEventListener('pagehide', stop, { once: true });
  schedule();
})();
