(() => {
  if (!document.querySelector('link[data-iron-codex-theme]')) {
    const theme = document.createElement("link");
    theme.rel = "stylesheet";
    theme.href = "/iron-codex.css?v=6";
    theme.dataset.ironCodexTheme = "true";
    document.head.append(theme);
  }
  if (!document.querySelector('link[data-nexus-overhaul-theme]')) {
    const overhaul = document.createElement("link");
    overhaul.rel = "stylesheet";
    overhaul.href = "/nexus-overhaul.css?v=10";
    overhaul.dataset.nexusOverhaulTheme = "true";
    document.head.append(overhaul);
  }

  const routeAliases = {
    "/furnace": "/extraction",
    "/furnace/": "/extraction",
    "/extraction/": "/extraction",
    "/builder/": "/builder",
    "/crafting/": "/crafting",
    "/refining/": "/refining",
    "/butchery/": "/butchery",
    "/alchemy/": "/alchemy",
    "/cooking/": "/cooking",
    "/reverse/": "/reverse",
    "/building/": "/building",
    "/spells/": "/spells",
    "/fishing/": "/fishing",
    "/guides/": "/guides",
    "/house-hunter/": "/house-hunter",
    "/pets": "/creatures",
    "/pets/": "/creatures",
    "/shambles": "/creatures",
    "/shambles/": "/creatures",
    "/creatures/": "/creatures",
    "/dungeons/": "/dungeons",
    "/updates/": "/updates",
  };
  const rawPath = window.location.pathname || "/";
  if (["/map", "/map/", "/myrland-map", "/myrland-map/", "/map-login", "/map-login/"].includes(rawPath)) return;
  const embedded = new URLSearchParams(window.location.search).get("embed") === "1";
  if (embedded) {
    const embeddedPath = routeAliases[rawPath] || (rawPath.length > 1 ? rawPath.replace(/\/$/, "") : "/reference");
    const normalizedEmbeddedPath = embeddedPath
      .replace(/\/index\.html$/i, "")
      .replace(/\.html$/i, "");
    const embeddedKey = (normalizedEmbeddedPath === "/" ? "reference" : normalizedEmbeddedPath.slice(1))
      .replace(/[^a-z0-9]+/g, "-") || "reference";
    document.body.classList.add("nexus-reforged", "nexus-embedded", `nexus-page-${embeddedKey}`);
    const embeddedSearchTargets = {
      reference: "#searchInput",
      loot: "#searchInput",
      spells: "#spellSearch",
      fishing: "#fishingSearch",
      builder: "#skillSearch",
      extraction: "#recipeSearch",
      refining: "#recipeSearch",
      butchery: "#carcassFilter",
      alchemy: "#recipeSearch",
      cooking: "#recipeSearch",
      reverse: "#routeSearch",
      building: "#catalogSearch",
      creatures: "#creatureSearch",
      dungeons: "#dungeonSearch",
      guides: "#guideSearch",
      "house-hunter": "#houseSearch",
    };
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== "nexus.search") return;
      const query = String(event.data.query || "");
      const selector = embeddedSearchTargets[embeddedKey] || "input[type='search']";
      const input = document.querySelector(selector) || document.querySelector("input[type='search']");
      if (!input) return;
      input.value = query;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const pageMain = document.querySelector("main");
    if (pageMain && !pageMain.querySelector(".marshal-footer") && !document.querySelector(".app-footer")) {
      pageMain.insertAdjacentHTML("beforeend", '<footer class="marshal-footer">By MarshalLaw</footer>');
    }
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    }
    return;
  }

  const sections = [
    {
      label: "Workspace",
      items: [
        { href: "/map", label: "Maps", icon: "map", color: "#34d399" },
        { href: "/loot", label: "Loot", icon: "package-search", color: "#f5b942" },
        { href: "/dungeons", label: "Dungeons", icon: "map-pinned", color: "#fb5d78" },
        { href: "/fishing", label: "Fishing", icon: "fish", color: "#4fc8e8" },
      ],
    },
    {
      label: "Build & Craft",
      items: [
        { href: "/builder", label: "Character", icon: "user-round-cog", color: "#b77cff" },
        { href: "/spells", label: "Spells", icon: "sparkles", color: "#4f9cff" },
        { href: "/crafting", label: "Crafting", icon: "hammer", color: "#ff754f" },
        { href: "/creatures", label: "Creatures", icon: "paw-print", color: "#9ee85b" },
      ],
    },
    {
      label: "Materials",
      items: [
        { href: "/extraction", label: "Extraction", icon: "factory", color: "#40d9ff" },
        { href: "/refining", label: "Refining", icon: "flame", color: "#ff8b3e" },
        { href: "/butchery", label: "Butchery", icon: "drumstick", color: "#ff5b72" },
        { href: "/alchemy", label: "Alchemy", icon: "flask-conical", color: "#52e184" },
        { href: "/cooking", label: "Cooking", icon: "chef-hat", color: "#ffc44f" },
        { href: "/reverse", label: "Reverse", icon: "route", color: "#48b9ff" },
        { href: "/building", label: "Building", icon: "landmark", color: "#f3b646" },
      ],
    },
    {
      label: "Knowledge",
      items: [
        { href: "/reference", label: "Game Reference", icon: "library-big", color: "#9b6cff" },
        { href: "/guides", label: "Field Guides", icon: "book-open-check", color: "#43c8ff" },
        { href: "/house-hunter", label: "House Hunter", icon: "home", color: "#ff617d" },
      ],
    },
    {
      label: "Application",
      items: [
        { href: "/map?module=macros", label: "Macros", icon: "zap", color: "#c879ff" },
        { href: "/map?module=settings", label: "Settings", icon: "settings", color: "#8aa0b3" },
      ],
    },
  ];

  const normalizeRoute = (value) => routeAliases[value] || (value.length > 1 ? value.replace(/\/$/, "") : value);
  const activePath = normalizeRoute(rawPath);
  const pageKey = (activePath === "/" ? "reference" : activePath.slice(1))
    .replace(/[^a-z0-9]+/g, "-") || "reference";
  document.body.classList.add("nexus-reforged", `nexus-page-${pageKey}`);
  const nativeHost = window.chrome?.webview || null;
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const navMarkup = sections.map((section) => `
    <section class="app-nav-section">
      <div class="app-nav-section-title">${section.label}</div>
      ${section.items.map((item) => {
        const active = normalizeRoute(item.href) === activePath;
        return `<a class="app-nav-link${active ? " active" : ""}" href="${item.href}" style="--nav-accent:${item.color}" title="${item.label}"${active ? ' aria-current="page"' : ""}>
          <span class="app-nav-icon">${icon(item.icon)}</span>
          <span class="app-nav-copy"><strong>${item.label}</strong></span>
        </a>`;
      }).join("")}
    </section>`).join("");

  document.body.insertAdjacentHTML("afterbegin", `
    <aside id="appSidebar" class="app-sidebar" aria-label="Main navigation">
      <div class="app-sidebar-head">
        <a class="app-sidebar-brand" href="/" aria-label="Mortal Nexus landing page">
          <span class="app-sidebar-brand-mark"><img src="/assets/mortal-nexus-app-icon-v2.png" alt="" /></span>
          <span class="app-sidebar-brand-copy"><strong>Mortal Nexus</strong><small class="brand-site-address">MortalNexus.com</small><small class="brand-description">Maps and tools</small></span>
        </a>
        <button class="app-sidebar-toggle" type="button" aria-label="Collapse navigation" title="Collapse navigation">${icon("panel-left-close")}</button>
      </div>
      <nav class="app-sidebar-body">${navMarkup}</nav>
      <div class="app-sidebar-foot">
        ${nativeHost ? `<button id="siteUpdateButton" class="app-update-button" type="button" data-state="idle" title="Check for updates and open the update log">
          <span class="app-nav-icon">${icon("refresh-cw")}</span>
          <span class="app-nav-copy"><strong>Updates</strong><small>Check status and view the log</small></span>
        </button>` : ""}
        <a class="app-nav-link" href="https://www.paypal.com/donate/?hosted_button_id=677CRL426BE9Q" target="_blank" rel="noreferrer" style="--nav-accent:#c9685d" title="Support Mortal Nexus">
          <span class="app-nav-icon">${icon("heart")}</span>
          <span class="app-nav-copy"><strong>Support the project</strong><small>Help keep the reference online</small></span>
        </a>
      </div>
    </aside>
    <button class="app-sidebar-overlay" type="button" aria-label="Close navigation"></button>`);

  const globalToolbar = document.createElement("div");
  globalToolbar.className = "site-global-toolbar";
  globalToolbar.innerHTML = `
    <div class="site-global-toolbar-start"></div>
    <div class="site-global-toolbar-actions"></div>`;
  document.body.insertAdjacentElement("afterbegin", globalToolbar);
  const toolbarStart = globalToolbar.querySelector(".site-global-toolbar-start");
  const toolbarActions = globalToolbar.querySelector(".site-global-toolbar-actions");

  const menuButton = document.createElement("button");
  menuButton.className = "site-menu-button";
  menuButton.type = "button";
  menuButton.setAttribute("aria-label", "Open navigation");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.title = "Open navigation";
  menuButton.innerHTML = icon("menu");
  toolbarStart.append(menuButton);
  toolbarStart.insertAdjacentHTML("beforeend", `
    <span class="site-global-toolbar-label">
      ${icon("command")}
      <span><strong>${sections.flatMap((section) => section.items).find((item) => normalizeRoute(item.href) === activePath)?.label || "Reference"}</strong></span>
    </span>`);

  const desktopToolLinks = document.createElement("nav");
  desktopToolLinks.className = "site-global-tool-links";
  desktopToolLinks.setAttribute("aria-label", "Desktop tools");
  desktopToolLinks.innerHTML = `
    <a href="/map" title="Open Live Map">${icon("map")}<span>Map</span></a>
    <a href="/map?module=macros" title="Open Macros">${icon("zap")}<span>Macros</span></a>
    <a href="/map?module=settings" title="Open Settings">${icon("settings")}<span>Settings</span></a>`;
  toolbarActions.append(desktopToolLinks);

  let secondScreenControl = null;
  let secondScreenToggle = null;
  let secondScreenResolution = null;
  let windowOpacityControl = null;
  let windowOpacitySlider = null;
  let windowOpacityValue = null;
  let applicationScaleControl = null;
  let applicationScaleSlider = null;
  let applicationScaleValue = null;
  if (false && nativeHost) {
    windowOpacityControl = document.createElement("label");
    windowOpacityControl.className = "site-window-opacity-control";
    windowOpacityControl.title = "Adjust transparency for the entire Mortal Nexus window";
    windowOpacityControl.innerHTML = `
      <i data-lucide="blend" aria-hidden="true"></i>
      <input type="range" min="20" max="100" step="1" value="100" aria-label="Application transparency" />
      <output>100%</output>`;
    windowOpacitySlider = windowOpacityControl.querySelector("input");
    windowOpacityValue = windowOpacityControl.querySelector("output");

    applicationScaleControl = document.createElement("label");
    applicationScaleControl.className = "site-application-scale-control";
    applicationScaleControl.title = "Shrink or enlarge the entire Mortal Nexus interface";
    applicationScaleControl.innerHTML = `
      <i data-lucide="scan-line" aria-hidden="true"></i>
      <input type="range" min="60" max="150" step="5" value="100" aria-label="Application scale" />
      <output>100%</output>`;
    applicationScaleSlider = applicationScaleControl.querySelector("input");
    applicationScaleValue = applicationScaleControl.querySelector("output");

    secondScreenControl = document.createElement("div");
    secondScreenControl.className = "site-second-screen-control";
    secondScreenControl.dataset.enabled = "false";
    secondScreenControl.innerHTML = `
      <label class="site-second-screen-toggle" title="Show Mortal Nexus as a borderless always-on-top overlay">
        <input type="checkbox" role="switch" aria-label="2nd Screen Mode" />
        <span class="site-second-screen-switch" aria-hidden="true"><span></span></span>
        <strong>2nd Screen Mode</strong>
      </label>
      <select aria-label="2nd Screen Mode resolution" title="Overlay size">
        <option value="fill">Fit display</option>
        <option value="2560x1440">2560 x 1440</option>
        <option value="1920x1080">1920 x 1080</option>
        <option value="1600x900">1600 x 900</option>
        <option value="1366x768">1366 x 768</option>
        <option value="1280x720">1280 x 720</option>
      </select>`;
    secondScreenToggle = secondScreenControl.querySelector("input");
    secondScreenResolution = secondScreenControl.querySelector("select");
    toolbarActions.append(windowOpacityControl, applicationScaleControl, secondScreenControl);

    const postSecondScreen = () => nativeHost.postMessage({
      type: "window.secondScreen",
      enabled: secondScreenToggle.checked,
      resolution: secondScreenResolution.value,
    });
    secondScreenToggle.addEventListener("change", postSecondScreen);
    secondScreenResolution.addEventListener("change", postSecondScreen);
    const postOpacity = (persist) => {
      const percent = Number(windowOpacitySlider.value);
      windowOpacityValue.textContent = `${percent}%`;
      nativeHost.postMessage({ type: "window.opacity", percent, persist });
    };
    windowOpacitySlider.addEventListener("input", () => postOpacity(false));
    windowOpacitySlider.addEventListener("change", () => postOpacity(true));
    applicationScaleSlider.addEventListener("input", () => {
      applicationScaleValue.textContent = `${applicationScaleSlider.value}%`;
    });
    applicationScaleSlider.addEventListener("change", () => {
      nativeHost.postMessage({ type: "window.scale", percent: Number(applicationScaleSlider.value) });
    });
    nativeHost.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.type !== "windowState") return;
      const payload = message.payload || {};
      const opacityPercent = Math.max(20, Math.min(100, Number(payload.opacityPercent) || 100));
      windowOpacitySlider.value = String(opacityPercent);
      windowOpacityValue.textContent = `${opacityPercent}%`;
      const scalePercent = Math.max(60, Math.min(150, Number(payload.scalePercent) || 100));
      applicationScaleSlider.value = String(scalePercent);
      applicationScaleValue.textContent = `${scalePercent}%`;
      secondScreenToggle.checked = Boolean(payload.enabled);
      secondScreenControl.dataset.enabled = String(Boolean(payload.enabled));
      if ([...secondScreenResolution.options].some((option) => option.value === payload.resolution)) {
        secondScreenResolution.value = payload.resolution;
      }
      const display = payload.screenWidth && payload.screenHeight
        ? `${payload.screenWidth} x ${payload.screenHeight}`
        : "current display";
      secondScreenControl.title = payload.enabled
        ? `Overlay active on ${display}. Switch off to restore the desktop window.`
        : `Open as a borderless always-on-top overlay on ${display}.`;
    });
    nativeHost.postMessage({ type: "window.state" });
  }

  if (nativeHost) {
    const updateButton = document.getElementById("siteUpdateButton");
    const renderUpdateStatus = (payload = {}) => {
      if (!updateButton) return;
      const updateState = payload.state || "idle";
      const title = updateButton.querySelector("strong");
      const detail = updateButton.querySelector("small");
      updateButton.dataset.state = updateState;
      updateButton.disabled = Boolean(payload.busy);
      updateButton.title = payload.message || "Check for updates and open the update log";
      title.textContent = updateState === "available" || updateState === "required"
        ? (updateState === "required"
          ? (payload.latestVersion ? `Required ${payload.latestVersion}` : "Update required")
          : (payload.latestVersion ? `Update ${payload.latestVersion}` : "Update available"))
        : updateState === "checking"
          ? "Checking for updates"
          : updateState === "downloading"
            ? "Downloading update"
            : updateState === "installing"
              ? "Installing update"
              : updateState === "current"
                ? "Mortal Nexus is current"
                : updateState === "error"
                  ? "Update check failed"
                  : "Updates";
      detail.textContent = payload.message || "Check status and view the log";
    };
    updateButton?.addEventListener("click", () => {
      nativeHost.postMessage({ type: "updates.check" });
      if (activePath !== "/updates") window.location.href = "/updates";
    });
    nativeHost.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.type === "updateStatus") renderUpdateStatus(message.payload || {});
    });
    nativeHost.postMessage({ type: "updates.state" });
  }

  const pageMain = document.querySelector("main");
  if (pageMain && !pageMain.querySelector(".marshal-footer") && !document.querySelector(".app-footer")) {
    pageMain.insertAdjacentHTML("beforeend", '<footer class="marshal-footer">By MarshalLaw</footer>');
  }

  const collapsed = localStorage.getItem("nave.sidebar.collapsed") === "1";
  document.body.classList.add("site-shell-enabled");
  document.body.classList.toggle("site-nav-collapsed", collapsed);

  const sidebar = document.getElementById("appSidebar");
  const sidebarToggle = sidebar.querySelector(".app-sidebar-toggle");
  const overlay = document.querySelector(".app-sidebar-overlay");
  const isMobile = () => window.matchMedia("(max-width: 1100px)").matches;
  if (collapsed) {
    sidebarToggle.setAttribute("aria-label", "Expand navigation");
    sidebarToggle.title = "Expand navigation";
    sidebarToggle.innerHTML = icon("panel-left-open");
  }

  function refreshIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
      return;
    }
    if (document.querySelector('script[data-site-lucide]')) return;
    const script = document.createElement("script");
    script.src = "/assets/vendor/lucide.min.js";
    script.dataset.siteLucide = "true";
    script.addEventListener("load", () => window.lucide?.createIcons({ attrs: { "aria-hidden": "true" } }));
    document.head.append(script);
  }

  function setMobileOpen(open) {
    document.body.classList.toggle("site-nav-mobile-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    menuButton.title = open ? "Close navigation" : "Open navigation";
  }

  function toggleNavigation() {
    if (isMobile()) {
      setMobileOpen(!document.body.classList.contains("site-nav-mobile-open"));
      return;
    }
    const nextCollapsed = !document.body.classList.contains("site-nav-collapsed");
    document.body.classList.toggle("site-nav-collapsed", nextCollapsed);
    localStorage.setItem("nave.sidebar.collapsed", nextCollapsed ? "1" : "0");
    sidebarToggle.setAttribute("aria-label", nextCollapsed ? "Expand navigation" : "Collapse navigation");
    sidebarToggle.title = nextCollapsed ? "Expand navigation" : "Collapse navigation";
    sidebarToggle.innerHTML = icon(nextCollapsed ? "panel-left-open" : "panel-left-close");
    refreshIcons();
  }

  sidebarToggle.addEventListener("click", toggleNavigation);
  menuButton.addEventListener("click", toggleNavigation);
  overlay.addEventListener("click", () => setMobileOpen(false));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setMobileOpen(false); });
  window.addEventListener("resize", () => { if (!isMobile()) setMobileOpen(false); });
  refreshIcons();

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="/"]');
    if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
    event.preventDefault();
    document.body.classList.add("nexus-page-leaving");
    window.setTimeout(() => { window.location.href = url.href; }, 120);
  });
})();
