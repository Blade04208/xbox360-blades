(() => {
  window.__x360DashboardStop?.();
  let preference = 'blades';
  let temporarySteam = false, previousPath = '', home, timer, stopped = false;
  let failedMain;
  const disposers = [];
  const host = () => window.opener || window;
  const gamepadWindow = () => host().SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
  const pathOf = () => gamepadWindow()?.m_history?.location?.pathname || '';
  const treeOf = () => gamepadWindow()?.m_FocusNavContext?.m_rgGamepadNavigationTrees
    ?.find(tree => tree.id === 'GamepadUI_Full_Root');

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function listen(target, type, callback, cleanup, options) {
    target.addEventListener(type, callback, options);
    cleanup.push(() => target.removeEventListener(type, callback, options));
  }
  function findNode(node, target) {
    if (node?.Element === target) return node;
    for (const child of node?.m_rgChildren || []) {
      const found = findNode(child, target);
      if (found) return found;
    }
  }
  function register(tree, parent, target, properties, cleanup) {
    const node = tree.CreateNode(parent, null);
    node.SetProperties({ noFocusRing: true, ...properties });
    cleanup.push(tree.RegisterNavigationItem(node, target));
    if (properties.focusable) {
      listen(target, 'vgp_onfocus', () => target.classList.add('gpfocus'), cleanup);
      listen(target, 'vgp_onblur', () => target.classList.remove('gpfocus'), cleanup);
    }
    return node;
  }
  function button(tree, parent, className, label, action, cleanup) {
    const target = element('button', 'x360-dash-button ' + className, label);
    target.type = 'button';
    const node = register(tree, parent, target, {
      focusable: true, actionDescriptionMap: { 1: 'Select' },
    }, cleanup);
    listen(target, 'click', action, cleanup);
    listen(target, 'vgp_onok', event => {
      event.preventDefault();
      event.stopPropagation();
      target.click();
    }, cleanup);
    return { target, node };
  }
  function showSteam() {
    temporarySteam = true;
    sync();
  }
  function returnToBlades(event) {
    if (!temporarySteam || preference !== 'blades' || pathOf() !== '/library/home') return;
    if (!event.target.closest?.('#Main')) return;
    if (event.type === 'keydown' && event.key !== 'Escape') return;
    if (event.target.closest?.('.FullModalOverlay, .ModalPosition, .BasicContextMenuContainer, .contextMenu')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    temporarySteam = false;
    sync();
  }
  function navigate(name) {
    const win = gamepadWindow();
    if (name === 'library') win.Navigate('/library');
    else if (name === 'friends') win.Navigator.Chat();
    else if (name === 'downloads') win.Navigator.Downloads();
    else if (name === 'profile') {
      const id = host().App?.GetCurrentUser?.()?.strSteamID;
      if (id && win.NavigateToSteamWeb) win.NavigateToSteamWeb('https://steamcommunity.com/profiles/' + id);
      else win.Navigator.Account();
    }
  }

  function mountHome(root, main, tree) {
    const cleanup = [], native = [...main.children];
    const mainNode = findNode(tree.Root, main);
    if (!mainNode || !tree.CreateNode || !tree.RegisterNavigationItem) return;
    const wrapper = element('section', 'x360-dashboard-host');
    wrapper.id = 'x360-dashboard';
    wrapper.setAttribute('data-x360-skip', '');
    wrapper.setAttribute('aria-label', 'Steam dashboard');
    main.prepend(wrapper);
    const state = { root, main, tree, wrapper, cleanup, native, blocked: new Map(), active: false };
    home = state;
    const nav = register(tree, mainNode, wrapper, { layout: 1 }, cleanup);
    state.nav = nav;
    const content = element('div', 'x360-dash-content');
    wrapper.append(content);
    state.content = content;
    const contentNav = register(tree, nav, content, { layout: 1 }, cleanup);
    state.contentNav = contentNav;
    const columns = element('div', 'x360-dash-columns');
    content.append(columns);
    const columnsNav = register(tree, contentNav, columns, { layout: 2 }, cleanup);
    const left = element('div', 'x360-dash-left');
    columns.append(left);
    const leftNav = register(tree, columnsNav, left, { layout: 1 }, cleanup);
    state.profile = button(tree, leftNav, 'x360-dash-profile', '', () => navigate('profile'), cleanup);
    left.append(state.profile.target);
    state.name = element('div', 'x360-dash-name', 'Steam');
    const profileBody = element('div', 'x360-dash-profile-body');
    state.avatar = element('img', 'x360-dash-avatar');
    state.avatar.alt = '';
    const details = element('div', 'x360-dash-profile-details');
    state.status = element('div', 'x360-dash-status', 'Steam account');
    state.count = element('div', 'x360-dash-count');
    details.append(state.status, state.count);
    profileBody.append(state.avatar, details);
    state.profile.target.append(state.name, profileBody);
    const shortcuts = [
      ['library', 'Games Library', 'games'],
      ['friends', 'Friends & Chat', 'friends'],
      ['downloads', 'Downloads', 'downloads'],
    ];
    const menu = element('div', 'x360-dash-shortcuts');
    left.append(menu);
    const menuNav = register(tree, leftNav, menu, { layout: 1 }, cleanup);
    for (const [action, label, icon] of shortcuts) {
      const shortcut = button(tree, menuNav, 'x360-dash-row', '', () => navigate(action), cleanup);
      const glyph = element('span', 'x360-dash-icon x360-dash-icon-' + icon);
      glyph.setAttribute('aria-hidden', 'true');
      shortcut.target.append(glyph, element('span', '', label));
      menu.append(shortcut.target);
    }
    state.feature = button(tree, leftNav, 'x360-dash-feature', '', () => {
      if (state.appid) gamepadWindow().Navigator.App(state.appid);
      else navigate('library');
    }, cleanup);
    state.art = element('img', 'x360-dash-game-art');
    state.art.alt = '';
    state.featureTitle = element('span', 'x360-dash-game-title', 'Explore your library');
    state.feature.target.append(state.art, state.featureTitle);
    left.append(state.feature.target);

    const right = element('div', 'x360-dash-right');
    const brand = element('div', 'x360-dash-brand');
    brand.append(element('span', '', 'STEAM'), element('span', '', 'Big Picture'));
    right.append(brand, element('div', 'x360-dash-rule'), element('h2', '', 'Welcome to Steam'));
    state.description = element('p', '', 'Your games. Your friends. Ready to play.');
    right.append(state.description);
    right.append(element('p', 'x360-dash-feed-description', 'Open Steam Home for recent games, What’s New, Friends, and Recommended.'));
    columns.append(right);
    const open = button(tree, contentNav, 'x360-dash-open', '', showSteam, cleanup);
    const glyph = element('span', 'x360-dash-icon x360-dash-icon-home');
    glyph.setAttribute('aria-hidden', 'true');
    open.target.append(glyph, element('span', '', 'Open Steam Home'));
    content.append(open.target);
    listen(wrapper, 'vgp_oncancel', event => {
      if (!state.active) return;
      event.preventDefault(); event.stopPropagation();
      showSteam();
    }, cleanup);
    listen(wrapper, 'keydown', event => {
      if (event.key !== 'Escape' || !state.active) return;
      event.preventDefault(); event.stopPropagation(); showSteam();
    }, cleanup);
    listen(state.art, 'error', () => { state.art.hidden = true; }, cleanup);
    listen(state.avatar, 'error', () => { state.avatar.hidden = true; }, cleanup);
    return state;
  }

  function updateData(state) {
    const source = host(), user = source.App?.GetCurrentUser?.();
    const persona = source.g_FriendsUIApp?.FriendStore?.self?.persona;
    const name = persona?.m_strPlayerName || 'Steam';
    if (state.name.textContent !== name) state.name.textContent = name;
    const avatar = persona?.avatar_url_full || document.querySelector('#header img.avatar')?.src;
    if (avatar && state.avatar.getAttribute('src') !== avatar) {
      state.avatar.src = avatar; state.avatar.hidden = false;
    } else if (!avatar) state.avatar.hidden = true;
    const online = user?.bIsOfflineMode ? 'Offline mode' : persona?.is_online ? 'Online' : 'Offline';
    if (state.status.textContent !== online) state.status.textContent = online;
    const apps = source.collectionStore?.allGamesCollection?.apps;
    const count = apps?.size ?? apps?.length;
    const text = count == null ? 'View profile' : 'Games   ' + count;
    if (state.count.textContent !== text) state.count.textContent = text;
    const ids = source.collectionStore?.recentAppsCollection?.apps;
    const recent = ids ? Array.from(ids).map(id => source.appStore?.GetAppOverviewByAppID?.(id))
      .filter(Boolean).sort((a, b) => (b.rt_last_time_played_or_installed || 0) - (a.rt_last_time_played_or_installed || 0)) : [];
    const app = recent[0];
    const title = app?.display_name || 'Explore your library';
    state.appid = app?.appid;
    if (state.featureTitle.textContent !== title) state.featureTitle.textContent = title;
    state.feature.target.setAttribute('aria-label', app ? 'Open ' + title : title);
    const url = app ? '/assets/' + app.appid + '/header.jpg' : '';
    if (url && state.art.getAttribute('src') !== url) {
      state.art.src = url; state.art.hidden = false;
    } else if (!url) { state.art.hidden = true; state.art.removeAttribute('src'); }
  }

  function setHomeMode(state, active) {
    const changed = state.active !== active;
    const oldFocus = state.tree.GetLastFocusedNode?.()?.Element;
    const transfer = changed && (!oldFocus || state.main.contains(oldFocus));
    state.active = active;
    state.root.dataset.x360Dashboard = active ? 'blades' : 'steam';
    state.content.hidden = !active;
    state.content.inert = !active;
    state.wrapper.hidden = !active;
    state.wrapper.inert = !active;
    state.contentNav.SetProperties({ noFocusRing: true, layout: 1, childFocusDisabled: !active });
    state.nav.SetProperties({ noFocusRing: true, layout: 1, childFocusDisabled: !active,
      actionDescriptionMap: active ? { 2: 'Steam Home' } : {} });
    const mainNode = state.nav.Parent;
    for (const child of mainNode.m_rgChildren) {
      if (child === state.nav) continue;
      if (active && !state.blocked.has(child)) {
        state.blocked.set(child, child.m_Properties);
        child.SetProperties({ ...child.m_Properties, fnCanTakeFocus: () => false });
      }
    }
    if (!active) {
      for (const [node, properties] of state.blocked) node.SetProperties(properties);
      state.blocked.clear();
    }
    for (const page of state.native) {
      if (active) page.setAttribute('data-x360-native-home', '');
      else page.removeAttribute('data-x360-native-home');
    }
    if (transfer) {
      if (active) state.profile.node.BTakeFocus();
      else {
        mainNode.m_rgChildren.find(n => n !== state.nav && n.BTakeFocus());
      }
      window.dispatchEvent(new Event('resize'));
    }
  }
  function unmountHome() {
    if (!home) return;
    for (const [node, props] of home.blocked) node.SetProperties(props);
    for (const page of home.native) page.removeAttribute('data-x360-native-home');
    delete home.root.dataset.x360Dashboard;
    if (pathOf() === '/library/home' && home.wrapper.contains(home.tree.GetLastFocusedNode?.()?.Element)) {
      home.nav.Parent.m_rgChildren.find(node => node !== home.nav && node.BTakeFocus());
    }
    home.cleanup.reverse().forEach(dispose => dispose());
    home.wrapper.remove(); home = undefined;
  }
  function sync() {
    if (stopped) return;
    const root = document.querySelector('.BasicUiRoot'), main = document.getElementById('Main');
    const path = pathOf(), tree = treeOf();
    const layout = getComputedStyle(document.documentElement).getPropertyValue('--x360-dashboard-layout').trim();
    const configured = layout === 'steam' ? 'steam' : 'blades';
    if (configured !== preference) { preference = configured; temporarySteam = false; }
    if (path !== previousPath) { temporarySteam = false; previousPath = path; }
    const isHome = path === '/library/home' && root && !root.hasAttribute('data-x360-off');
    if (home && (!isHome || home.main !== main || home.tree !== tree || !home.wrapper.isConnected)) unmountHome();
    if (isHome && main && tree && failedMain !== main) {
      try {
        const state = home || mountHome(root, main, tree);
        if (state) { updateData(state); setHomeMode(state, preference === 'blades' && !temporarySteam); }
      } catch (error) {
        unmountHome(); failedMain = main;
        console.warn('[Xbox 360 Blades] Dashboard unavailable; keeping Steam Home.', error);
      }
    }
    if (!isHome) failedMain = undefined;
  }
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    timer = setTimeout(() => { queued = false; sync(); }, 120);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const interval = setInterval(sync, 1500);
  window.__x360DashboardStop = () => {
    stopped = true; observer.disconnect(); clearInterval(interval); clearTimeout(timer);
    unmountHome(); disposers.reverse().forEach(dispose => dispose());
    delete window.__x360DashboardStop;
  };
  listen(document, 'vgp_oncancel', returnToBlades, disposers, true);
  listen(document, 'keydown', returnToBlades, disposers, true);
  listen(window, 'pagehide', () => window.__x360DashboardStop?.(), disposers);
  sync();
})();
