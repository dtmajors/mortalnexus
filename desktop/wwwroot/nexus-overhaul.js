(() => {
  document.body.classList.add("nexus-overhaul");
  const standaloneMode = true;

  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const premiumIcon = "";
  const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const communityAssetUrl = (url) => !url || /^(?:https?:|data:|blob:)/i.test(url)
    ? String(url || "")
    : `/api/nexus-community/${String(url).replace(/^\//, "").replace(/^api\//, "")}`;
  const isMapPopout = new URLSearchParams(window.location.search).get("popout") === "1";
  let accountLogoutPending = false;
  const requestAccountLogout = () => {
    if (accountLogoutPending) return;
    if (!window.confirm("Reset the saved Mortal Nexus license? The app will close and ask for a key next time.")) return;
    if (!window.chrome?.webview) {
      window.alert("Sign out is available inside the Mortal Nexus desktop app.");
      return;
    }
    accountLogoutPending = true;
    for (const button of document.querySelectorAll("[data-account-logout]")) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
    window.chrome.webview.postMessage({ type: "account.logout" });
  };

  if (isMapPopout) {
    document.body.classList.add("nexus-popout");
    document.title = "Mortal Nexus - Live Map";
    const controls = document.createElement("div");
    controls.className = "map-popout-controls";
    controls.innerHTML = `
      <div class="map-popout-title">${icon("map")}<strong>Live Map</strong></div>
      <label class="map-popout-toggle" title="Keep the map above other windows">
        <input id="popoutTopmost" type="checkbox" checked />
        <span>Always on top</span>
      </label>
      <label class="map-popout-range" title="Adjust map window transparency">
        ${icon("blend")}<span>Opacity</span>
        <input id="popoutOpacity" type="range" min="25" max="100" value="96" />
        <output id="popoutOpacityValue">96%</output>
      </label>
      <label class="map-popout-range" title="Adjust map interface scale">
        ${icon("scan-line")}<span>Scale</span>
        <input id="popoutScale" type="range" min="65" max="135" step="5" value="100" />
        <output id="popoutScaleValue">100%</output>
      </label>
      <button id="closeMapPopout" type="button" title="Close live map">${icon("x")}</button>`;
    document.body.append(controls);

    const postPopout = (type, payload = {}) => window.chrome?.webview?.postMessage({ type, ...payload });
    const opacity = document.getElementById("popoutOpacity");
    const scale = document.getElementById("popoutScale");
    opacity.addEventListener("input", () => {
      document.getElementById("popoutOpacityValue").textContent = `${opacity.value}%`;
      postPopout("popout.opacity", { percent: Number(opacity.value) });
    });
    scale.addEventListener("input", () => {
      document.getElementById("popoutScaleValue").textContent = `${scale.value}%`;
      postPopout("popout.scale", { percent: Number(scale.value) });
    });
    document.getElementById("popoutTopmost").addEventListener("change", (event) => {
      postPopout("popout.topmost", { enabled: event.currentTarget.checked });
    });
    document.getElementById("closeMapPopout").addEventListener("click", () => postPopout("popout.close"));
    window.lucide?.createIcons();
    return;
  }

  const brandSubline = document.getElementById("brandSubline");
  if (brandSubline) brandSubline.textContent = "Maps, tools, and reference";
  const brandImage = document.querySelector(".brand img");
  if (brandImage) brandImage.src = "/assets/mortal-nexus-app-icon-v2.png";
  document.querySelector(".local-preview-stamp")?.remove();
  document.querySelector(".brand")?.remove();

  const masterHotkeyButton = document.getElementById("hotkeysMasterButton");
  if (masterHotkeyButton) {
    masterHotkeyButton.classList.add("hotkeys-header-switch");
    masterHotkeyButton.setAttribute("role", "switch");
    masterHotkeyButton.setAttribute("aria-checked", "true");
    masterHotkeyButton.innerHTML = '<span class="hotkeys-switch-track" aria-hidden="true"><span></span></span><span class="hotkeys-master-label">Hotkeys on</span>';
  }

  const navigation = document.querySelector(".module-tabs");
  if (navigation) {
    navigation.classList.add("compact-primary-nav");
    navigation.innerHTML = `
      <a class="compact-sidebar-brand" href="https://github.com/dtmajors/mortalnexus/releases/latest" target="_blank" rel="noreferrer" title="Open GitHub Releases">
        <img src="/assets/mortal-nexus-app-icon-v2.png" alt="" />
        <span><strong>Mortal Nexus</strong><small class="brand-site-address">Free &amp; open source</small><small class="brand-description">Maps and tools</small></span>
      </a>
      <div class="compact-nav-label">Explore</div>
      <button class="module-tab is-active" type="button" data-module-target="map" title="Live map">${icon("map")}<span>Map</span></button>
      <button class="module-tab" type="button" data-frame-route="/loot" data-frame-title="Loot" data-premium-feature="Loot intelligence" title="Loot database">${icon("package-search")}<span>Loot</span>${premiumIcon}</button>
      <button class="module-tab" type="button" data-frame-route="/dungeons" data-frame-title="Dungeons" data-premium-feature="Dungeon intelligence" title="Dungeons">${icon("map-pinned")}<span>Dungeons</span>${premiumIcon}</button>
      <button class="module-tab" type="button" data-frame-route="/spells" data-frame-title="Spells" data-premium-feature="Spell planner" title="Spell planner">${icon("sparkles")}<span>Spells</span>${premiumIcon}</button>
      <button class="module-tab" type="button" data-frame-route="/fishing" data-frame-title="Fishing" data-premium-feature="Fishing intelligence" title="Fishing intelligence">${icon("fish")}<span>Fishing</span>${premiumIcon}</button>
      <div class="compact-nav-label">Tools</div>
      <div class="compact-nav-group" data-nav-group="character">
        <button class="module-tab compact-nav-toggle is-open" type="button" data-nav-toggle="character" data-premium-feature="Character Builder" title="Character builder" aria-expanded="true">${icon("user-round-cog")}<span>Character</span>${premiumIcon}${icon("chevron-down")}</button>
        <div class="compact-subnav" data-nav-menu="character">
          <button class="crafting-subitem" type="button" data-frame-route="/builder" data-frame-title="Character Builder" data-premium-feature="Character Builder">${icon("sliders-horizontal")}<span>Builder</span></button>
        </div>
      </div>
      <div class="compact-nav-group" data-nav-group="crafting">
        <button class="module-tab compact-nav-toggle is-open" type="button" data-nav-toggle="crafting" data-premium-feature="Crafting calculators" title="Crafting calculators" aria-expanded="true">${icon("hammer")}<span>Crafting</span>${premiumIcon}${icon("chevron-down")}</button>
        <div class="compact-subnav" data-nav-menu="crafting">
          <button class="crafting-subitem" type="button" data-frame-route="/crafting" data-frame-title="Item Crafting" data-premium-feature="Crafting calculators">${icon("anvil")}<span>Item Crafting</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/extraction" data-frame-title="Extraction" data-premium-feature="Crafting calculators">${icon("factory")}<span>Extraction</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/refining" data-frame-title="Refining" data-premium-feature="Crafting calculators">${icon("flask-conical")}<span>Refining</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/alchemy" data-frame-title="Alchemy" data-premium-feature="Crafting calculators">${icon("sparkles")}<span>Alchemy</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/cooking" data-frame-title="Cooking" data-premium-feature="Crafting calculators">${icon("cooking-pot")}<span>Cooking</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/building" data-frame-title="Building" data-premium-feature="Crafting calculators">${icon("house")}<span>Building</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/butchery" data-frame-title="Butchery" data-premium-feature="Crafting calculators">${icon("beef")}<span>Butchery</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/reverse" data-frame-title="Reverse Search" data-premium-feature="Crafting calculators">${icon("scan-search")}<span>Reverse Search</span></button>
        </div>
      </div>
      <button class="module-tab" type="button" data-frame-route="/creatures" data-frame-title="Creatures" data-premium-feature="Creature codex" title="Creature codex">${icon("paw-print")}<span>Creatures</span>${premiumIcon}</button>
      <button class="module-tab" type="button" data-module-target="macros" data-premium-feature="Automation and macros" title="Macros">${icon("zap")}<span>Macros</span>${premiumIcon}</button>
      <div class="compact-nav-group" data-nav-group="guides">
        <button class="module-tab compact-nav-toggle is-open" type="button" data-nav-toggle="guides" data-premium-feature="Guide library" title="Guides" aria-expanded="true">${icon("book-open-check")}<span>Guides</span>${premiumIcon}${icon("chevron-down")}</button>
        <div class="compact-subnav" data-nav-menu="guides">
          <button class="crafting-subitem" type="button" data-frame-route="/reference" data-frame-title="Game Reference" data-premium-feature="Game reference">${icon("library-big")}<span>Game Reference</span></button>
          <button class="crafting-subitem" type="button" data-frame-route="/guides" data-frame-title="Guide Library" data-premium-feature="Guide library">${icon("library")}<span>Guide Library</span></button>
        </div>
      </div>
      <div class="compact-nav-spacer"></div>
      <button class="module-tab" type="button" data-module-target="settings" title="Settings">${icon("settings")}<span>Settings</span></button>
      <div class="compact-sidebar-footer">
        <div id="sidebarUpdateMount"></div>
        <small class="sidebar-support-note">Free for everyone. Backed by players.</small>
        <a class="sidebar-support-link" href="https://www.paypal.com/donate/?hosted_button_id=677CRL426BE9Q" target="_blank" rel="noreferrer" title="Support Mortal Nexus development">${icon("heart")}<span>Support development</span></a>
      </div>`;
  }

  document.body.classList.add("nexus-premium", "nexus-open-source");
  for (const element of document.querySelectorAll("[data-premium-feature]")) {
    element.removeAttribute("data-premium-feature");
    element.removeAttribute("aria-disabled");
  }

  const mapWorkspace = document.getElementById("mapWorkspace");
  if (mapWorkspace && !document.getElementById("embeddedWorkspace")) {
    const workspace = document.createElement("section");
    workspace.id = "embeddedWorkspace";
    workspace.className = "module-panel embedded-workspace";
    workspace.dataset.modulePanel = "embedded";
    workspace.innerHTML = '<iframe id="embeddedFrame" class="embedded-frame" title="Mortal Nexus workspace"></iframe>';
    mapWorkspace.insertAdjacentElement("afterend", workspace);
  }

  const craftPanel = document.querySelector('[data-module-panel="craft"]');
  const trainingPanel = document.querySelector('[data-module-panel="training"]');
  if (craftPanel && trainingPanel) {
    craftPanel.dataset.modulePanel = "macros";
    craftPanel.classList.add("unified-macros-page");

    const craftHeading = craftPanel.querySelector(".tool-page-heading");
    const craftLayout = craftPanel.querySelector(".tool-layout");
    const trainingTabs = trainingPanel.querySelector(".combat-tabs");
    const emergencyControls = trainingPanel.querySelector(".emergency-stop-group");
    const craftPhase = document.getElementById("craftPhase");
    const craftCardHeading = craftPanel.querySelector(".craft-controls-card .tool-card-heading");
    if (craftPhase && craftCardHeading) craftCardHeading.append(craftPhase);

    if (craftHeading) {
      craftHeading.querySelector(".eyebrow")?.remove();
      const title = craftHeading.querySelector("h1");
      const description = craftHeading.querySelector("p");
      if (title) title.textContent = "Macros";
      if (description) description.textContent = "Crafting and training controls in one place.";
      if (emergencyControls) craftHeading.append(emergencyControls);
    }

    const macroTabs = document.createElement("nav");
    macroTabs.className = "combat-tabs unified-macro-tabs";
    macroTabs.setAttribute("aria-label", "Macro type");
    macroTabs.innerHTML = `<button class="is-active" type="button" data-combat-target="crafting">${icon("hammer")} Crafting</button>`;
    if (trainingTabs) {
      for (const button of [...trainingTabs.querySelectorAll("button")]) {
        button.classList.remove("is-active");
        macroTabs.append(button);
      }
    }

    const craftSection = document.createElement("section");
    craftSection.className = "combat-panel is-active";
    craftSection.dataset.combatPanel = "crafting";
    if (craftLayout) craftSection.append(craftLayout);
    craftPanel.append(macroTabs, craftSection);

    for (const panel of [...trainingPanel.querySelectorAll("[data-combat-panel]")]) {
      panel.classList.remove("is-active");
      craftPanel.append(panel);
    }
    trainingPanel.remove();
  }

  const commandsPanel = document.querySelector('[data-module-panel="commands"]');
  const historyPanel = document.querySelector('[data-module-panel="history"]');
  if (commandsPanel && historyPanel) {
    commandsPanel.dataset.modulePanel = "settings";
    commandsPanel.classList.add("unified-settings-page");

    const heading = commandsPanel.querySelector(".tool-page-heading");
    if (heading) {
      heading.querySelector(".eyebrow")?.remove();
      const title = heading.querySelector("h1");
      const description = heading.querySelector("p");
      if (title) title.textContent = "Settings";
      if (description) description.textContent = "Display, support, commands, and application controls.";
    }

    const settingsTabs = document.createElement("nav");
    settingsTabs.className = "settings-tabs";
    settingsTabs.setAttribute("aria-label", "Settings sections");
    settingsTabs.innerHTML = `
      <button class="is-active" type="button" data-settings-target="general">${icon("monitor-cog")} General</button>
      <button type="button" data-settings-target="license">${icon("heart")} About &amp; Support</button>
      <button type="button" data-settings-target="commands">${icon("square-terminal")} Commands</button>`;

    const generalPanel = document.createElement("section");
    generalPanel.className = "settings-panel is-active";
    generalPanel.dataset.settingsPanel = "general";
    generalPanel.innerHTML = `
      <div class="settings-grid">
        <section class="settings-card display-settings-card">
          <div class="settings-card-heading">${icon("monitor-cog")}<div><h2>Display</h2><p>Window size, scale, and overlay behavior.</p></div></div>
          <label class="settings-switch-row">
            <input id="automaticScaleToggle" type="checkbox" checked />
            <span><strong>Automatic scale</strong><small id="automaticScaleHint">Uses your display resolution.</small></span>
          </label>
          <div id="displayControlMount" class="display-control-mount"></div>
        </section>
        <section class="settings-card application-settings-card">
          <div class="settings-card-heading">${icon("sliders-horizontal")}<div><h2>Application</h2><p>Global controls and update status.</p></div></div>
          <div id="applicationControlMount" class="application-control-mount"></div>
        </section>
      </div>`;

    const accountPanel = document.createElement("section");
    accountPanel.className = "settings-panel";
    accountPanel.dataset.settingsPanel = "license";
    accountPanel.innerHTML = `
      <section class="settings-card account-access-card">
        <div class="settings-card-heading">${icon("heart")}<div><h2>Mortal Nexus is free</h2><p>No keys, accounts, or subscriptions. Donations help keep the maps, tools, and development moving.</p></div></div>
        <div class="account-access-row">
          <div><span>Community edition</span><strong>Mortal Nexus 1.18.0</strong></div>
          <small>Made by Marshal Law. Supported by players.</small>
        </div>
        <div class="account-signout-row">
          <div class="account-signout-copy">${icon("heart")}<span><strong>Help keep Mortal Nexus going</strong><small>Every donation supports ongoing work. All tools remain free whether you donate or not.</small></span></div>
          <a class="account-signout-button" href="https://www.paypal.com/donate/?hosted_button_id=677CRL426BE9Q" target="_blank" rel="noreferrer">${icon("heart")} Donate</a>
        </div>
        <p class="open-source-links"><a href="https://github.com/dtmajors/mortalnexus" target="_blank" rel="noreferrer">Source code</a> &middot; <a href="https://github.com/dtmajors/mortalnexus/releases/latest" target="_blank" rel="noreferrer">Downloads</a> &middot; <a href="https://discord.gg/MmV7gNV5ZG" target="_blank" rel="noreferrer">Discord</a></p>
      </section>`;
    const historyLayout = historyPanel.querySelector(".tool-layout");
    if (historyLayout) accountPanel.append(historyLayout);

    const commandSettingsPanel = document.createElement("section");
    commandSettingsPanel.className = "settings-panel";
    commandSettingsPanel.dataset.settingsPanel = "commands";
    const commandLayout = commandsPanel.querySelector(".tool-layout");
    const macroStatus = document.getElementById("macroStatus");
    if (commandLayout) commandSettingsPanel.append(commandLayout);
    if (macroStatus) commandSettingsPanel.append(macroStatus);

    commandsPanel.append(settingsTabs, generalPanel, accountPanel, commandSettingsPanel);
    historyPanel.remove();

    const displayMount = document.getElementById("displayControlMount");
    for (const control of [
      document.getElementById("applicationScaleControl"),
      document.getElementById("windowOpacityControl"),
    ]) {
      if (control && displayMount) displayMount.append(control);
    }

    const sidebarUpdateMount = document.getElementById("sidebarUpdateMount");
    const updateButton = document.getElementById("updateButton");
    if (sidebarUpdateMount && updateButton) {
      updateButton.classList.add("sidebar-update-button");
      sidebarUpdateMount.append(updateButton);
    }

    for (const button of settingsTabs.querySelectorAll("[data-settings-target]")) {
      button.addEventListener("click", () => {
        const target = button.dataset.settingsTarget;
        for (const tab of settingsTabs.querySelectorAll("[data-settings-target]")) {
          tab.classList.toggle("is-active", tab === button);
        }
        for (const panel of commandsPanel.querySelectorAll("[data-settings-panel]")) {
          panel.classList.toggle("is-active", panel.dataset.settingsPanel === target);
        }
      });
    }
  }

  const editorButton = document.getElementById("editorButton");
  if (editorButton) {
    editorButton.hidden = true;
  }

  const syncBadge = document.getElementById("syncBadge");
  if (syncBadge) syncBadge.hidden = true;
  const routesMapButton = document.getElementById("routesMapBtn");
  if (routesMapButton) routesMapButton.hidden = true;
  const fitButton = document.getElementById("fitBtn");
  if (fitButton) {
    fitButton.classList.add("retired-map-action");
  }
  const exportButton = document.getElementById("exportBtn");
  if (exportButton) {
    exportButton.classList.add("retired-map-action");
  }
  const importButton = document.getElementById("importBtn");
  if (importButton) {
    importButton.classList.add("retired-map-action");
  }
  document.getElementById("importInput")?.classList.add("retired-map-action");

  const mapTitle = document.getElementById("mapIntelTitle");
  if (mapTitle) mapTitle.textContent = mapTitle.textContent.replace(/\s+intelligence$/i, "");
  const mapToolbarEyebrow = document.querySelector(".sidebar-toolbar .eyebrow");
  if (mapToolbarEyebrow) mapToolbarEyebrow.textContent = "Map filters";
  const layerHeading = document.querySelector(".layer-section h2");
  if (layerHeading) layerHeading.textContent = "Filters";
  document.querySelector(".layer-section .eyebrow")?.remove();

  const topActions = document.querySelector(".top-actions");
  const search = document.querySelector(".global-search");
  if (topActions && search) {
    const searchGroup = search.closest(".search-tools") || search;
    const donateButton = document.createElement("a");
    donateButton.className = "topbar-donate-button";
    donateButton.href = "https://www.paypal.com/donate/?hosted_button_id=677CRL426BE9Q";
    donateButton.target = "_blank";
    donateButton.rel = "noreferrer";
    donateButton.title = "Support Mortal Nexus development";
    donateButton.innerHTML = `${icon("heart")}<span>Support development</span>`;
    searchGroup.after(donateButton, topActions);
  }

  if (topActions && !standaloneMode) {
    const profileButton = document.createElement("button");
    profileButton.id = "accountProfileButton";
    profileButton.className = "account-profile-button";
    profileButton.type = "button";
    profileButton.title = "Open your player profile";
    profileButton.setAttribute("aria-label", "Open your player profile");
    profileButton.innerHTML = `<span class="account-profile-avatar">${icon("user-round")}</span><span class="account-profile-premium" hidden>${icon("badge-check")}</span>`;
    topActions.append(profileButton);

    const profileDialog = document.createElement("dialog");
    profileDialog.id = "accountProfileDialog";
    profileDialog.className = "account-profile-dialog";
    profileDialog.innerHTML = `
      <form id="accountProfileForm">
        <header class="account-profile-header">
          <div class="account-profile-heading">
            <span class="account-profile-large-avatar" data-profile-avatar>${icon("user-round")}</span>
            <div><span class="profile-eyebrow">Signed-in player</span><h2 data-profile-name>Your profile</h2><p data-profile-discord>Discord connected</p></div>
          </div>
          <button class="profile-close-button" type="button" title="Close profile" aria-label="Close profile">${icon("x")}</button>
        </header>
        <div class="account-profile-badges"><span class="profile-premium-badge" data-profile-premium hidden>${icon("badge-check")} Mortal Nexus Premium</span><span class="profile-editor-badge" data-profile-editor hidden>${icon("pencil-line")} Map editor</span></div>
        <div class="account-profile-fields">
          <label class="profile-avatar-upload profile-full-field"><span>Profile picture</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp" /><span class="profile-avatar-upload-control">${icon("image-plus")}<span><strong>Choose a profile picture</strong><small>Square PNG, JPG, or WEBP</small></span></span></label>
          <label><span>In-game name</span><input name="inGameName" maxlength="60" required /></label>
          <label><span>Guild</span><input name="guildName" maxlength="60" placeholder="No guild set" /></label>
          <label><span>Timezone</span><input name="timezone" maxlength="80" list="accountTimezoneOptions" placeholder="Choose a timezone or type your own" /><datalist id="accountTimezoneOptions"></datalist></label>
          <label class="profile-full-field"><span>Message status</span><input name="messageStatus" maxlength="120" placeholder="When and why players should message you" /></label>
          <label class="profile-full-field"><span>Bio</span><textarea name="bio" maxlength="500" rows="4" placeholder="Tell other Mortal Nexus players a little about yourself"></textarea></label>
        </div>
        <footer class="account-profile-footer"><span data-profile-email></span><div><button type="button" class="profile-signout-button" data-account-logout>${icon("log-out")} Sign out</button><button type="button" class="profile-cancel-button">Cancel</button><button type="submit" class="profile-save-button">${icon("save")} Save profile</button></div></footer>
      </form>`;
    document.body.append(profileDialog);
    profileDialog.querySelector("[data-account-logout]")?.addEventListener("click", requestAccountLogout);

    const timezoneList = profileDialog.querySelector("#accountTimezoneOptions");
    let timezoneOptions = [];
    try {
      timezoneOptions = Intl.supportedValuesOf("timeZone");
    } catch (_error) {
      timezoneOptions = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"];
    }
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (localTimezone && !timezoneOptions.includes(localTimezone)) timezoneOptions.unshift(localTimezone);
    for (const timezone of timezoneOptions) {
      const option = document.createElement("option");
      option.value = timezone;
      option.label = timezone.replaceAll("_", " ");
      timezoneList.append(option);
    }

    let currentProfile = null;
    const profileAvatarMarkup = (profile, large = false) => profile.avatarUrl
      ? `<img src="${escapeHtml(communityAssetUrl(profile.avatarUrl))}" alt="" />`
      : `<span>${escapeHtml(String(profile.name || "P").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase())}</span>`;
    const renderProfile = (profile) => {
      currentProfile = profile;
      profileButton.querySelector(".account-profile-avatar").innerHTML = profileAvatarMarkup(profile);
      profileButton.querySelector(".account-profile-premium").hidden = !profile.premium;
      profileButton.dataset.premium = String(Boolean(profile.premium));
      profileButton.title = `${profile.name || "Your profile"}${profile.premium ? " - Premium" : ""}`;
      profileDialog.querySelector("[data-profile-avatar]").innerHTML = profileAvatarMarkup(profile, true);
      profileDialog.querySelector("[data-profile-name]").textContent = profile.name || "Your profile";
      profileDialog.querySelector("[data-profile-discord]").textContent = profile.discordUsername ? `@${profile.discordUsername}` : "Discord connected";
      profileDialog.querySelector("[data-profile-email]").textContent = profile.email || "";
      profileDialog.querySelector("[data-profile-premium]").hidden = !profile.premium;
      profileDialog.querySelector("[data-profile-editor]").hidden = !profile.canEdit;
      const accessTier = document.getElementById("accountAccessTier");
      const accessHint = document.getElementById("accountAccessHint");
      if (accessTier) accessTier.textContent = profile.premium ? "Mortal Nexus Premium" : "Mortal Nexus Free";
      if (accessHint) accessHint.textContent = profile.premium
        ? "Premium was activated from the license attached to this account."
        : "Add or purchase a license from your website account to unlock Premium.";
      const form = profileDialog.querySelector("form");
      form.elements.image.value = "";
      form.elements.inGameName.value = profile.name || "";
      form.elements.guildName.value = profile.guildName || "";
      form.elements.timezone.value = profile.timezone || "";
      form.elements.messageStatus.value = profile.messageStatus || "";
      form.elements.bio.value = profile.bio || "";
      window.lucide?.createIcons?.({ attrs: { "aria-hidden": "true" } });
    };
    const loadProfile = async () => {
      const response = await fetch("/api/nexus-community/profile", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Your profile could not be loaded.");
      renderProfile(data.profile);
      return data.profile;
    };
    const showProfileNotice = (message) => {
      const toast = document.getElementById("toast");
      if (!toast) return;
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(showProfileNotice.timer);
      showProfileNotice.timer = setTimeout(() => { toast.hidden = true; }, 4000);
    };

    profileButton.addEventListener("click", async () => {
      try {
        if (!currentProfile) await loadProfile();
        profileDialog.showModal();
      } catch (error) {
        showProfileNotice(error.message);
      }
    });
    profileDialog.querySelector(".profile-close-button").addEventListener("click", () => profileDialog.close());
    profileDialog.querySelector(".profile-cancel-button").addEventListener("click", () => profileDialog.close());
    profileDialog.querySelector('input[name="image"]').addEventListener("change", (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      const avatar = profileDialog.querySelector("[data-profile-avatar]");
      const previewUrl = URL.createObjectURL(file);
      avatar.innerHTML = `<img src="${escapeHtml(previewUrl)}" alt="" />`;
    });
    profileDialog.addEventListener("click", (event) => { if (event.target === profileDialog) profileDialog.close(); });
    profileDialog.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const saveButton = form.querySelector(".profile-save-button");
      const body = new FormData(form);
      saveButton.disabled = true;
      try {
        const response = await fetch("/api/nexus-community/profile", { method: "PATCH", body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Your profile could not be saved.");
        renderProfile(data.profile);
        profileDialog.close();
        embeddedFrame?.contentWindow?.postMessage({ type: "nexus.profile-updated" }, window.location.origin);
        showProfileNotice("Profile saved.");
      } catch (error) {
        showProfileNotice(error.message);
      } finally {
        saveButton.disabled = false;
      }
    });
    loadProfile().catch(() => {});
  }

  const embeddedFrame = document.getElementById("embeddedFrame");
  const frameButtons = [...document.querySelectorAll("[data-frame-route]")];
  const characterToggle = document.querySelector('[data-nav-toggle="character"]');
  const characterMenu = document.querySelector('[data-nav-menu="character"]');
  const craftingToggle = document.querySelector('[data-nav-toggle="crafting"]');
  const craftingMenu = document.querySelector('[data-nav-menu="crafting"]');
  const guidesToggle = document.querySelector('[data-nav-toggle="guides"]');
  const guidesMenu = document.querySelector('[data-nav-menu="guides"]');
  let activeFrameRoute = "";
  const routeSearchLabels = {
    "/reference": "Search the reference...",
    "/loot": "Search creatures, containers, or drops...",
    "/dungeons": "Search dungeons...",
    "/spells": "Search spells or reagents...",
    "/fishing": "Search fish, bait, or water...",
    "/cooking": "Search tested recipes or ingredients...",
    "/creatures": "Search creatures...",
    "/house-hunter": "Search houses or locations...",
    "/market": "Search market listings or players...",
  };
  const setCraftingMenu = (open) => {
    if (!craftingToggle || !craftingMenu) return;
    craftingToggle.setAttribute("aria-expanded", String(open));
    craftingToggle.classList.toggle("is-open", open);
    craftingMenu.hidden = !open;
  };

  const setCharacterMenu = (open) => {
    if (!characterToggle || !characterMenu) return;
    characterToggle.setAttribute("aria-expanded", String(open));
    characterToggle.classList.toggle("is-open", open);
    characterMenu.hidden = !open;
  };

  const setGuidesMenu = (open) => {
    if (!guidesToggle || !guidesMenu) return;
    guidesToggle.setAttribute("aria-expanded", String(open));
    guidesToggle.classList.toggle("is-open", open);
    guidesMenu.hidden = !open;
  };

  const clearFrameSelection = () => {
    for (const button of frameButtons) button.classList.remove("is-active");
    characterToggle?.classList.remove("is-active");
    craftingToggle?.classList.remove("is-active");
    guidesToggle?.classList.remove("is-active");
  };

  const openFrameRoute = (route, title, selectedButton) => {
    if (!embeddedFrame) return;
    const target = new URL(route, window.location.origin);
    const premiumRoutes = new Map([
      ["/loot", "Loot intelligence"], ["/dungeons", "Dungeon intelligence"], ["/spells", "Spell planner"], ["/fishing", "Fishing intelligence"],
      ["/crafting", "Crafting calculators"], ["/extraction", "Crafting calculators"], ["/refining", "Crafting calculators"],
      ["/alchemy", "Crafting calculators"], ["/cooking", "Crafting calculators"], ["/building", "Crafting calculators"],
      ["/butchery", "Crafting calculators"], ["/reverse", "Crafting calculators"], ["/creatures", "Creature codex"],
      ["/reference", "Game reference"], ["/guides", "Guide library"], ["/house-hunter", "House Hunter"]
    ]);
    target.searchParams.set("embed", "1");
    embeddedFrame.title = `${title || "Mortal Nexus"} workspace`;
    if (embeddedFrame.src !== target.href) embeddedFrame.src = target.href;
    activeFrameRoute = target.pathname;
    if (search) {
      search.querySelector("input").value = "";
      search.querySelector("input").placeholder = target.searchParams.get("view") === "friends"
        ? "Search friends or players..."
        : target.searchParams.get("view") === "messages"
          ? "Search messages or players..."
          : routeSearchLabels[target.pathname] || `Search ${title || "this page"}...`;
    }
    clearFrameSelection();
    selectedButton?.classList.add("is-active");
    if (selectedButton?.closest("[data-nav-menu='character']")) {
      characterToggle?.classList.add("is-active");
      setCharacterMenu(true);
    }
    if (selectedButton?.closest("[data-nav-menu='crafting']")) {
      craftingToggle?.classList.add("is-active");
      setCraftingMenu(true);
    }
    if (selectedButton?.closest("[data-nav-menu='guides']")) {
      guidesToggle?.classList.add("is-active");
      setGuidesMenu(true);
    }
    window.mortalNexusSetModule?.("embedded", true);
  };

  characterToggle?.addEventListener("click", () => {
    setCharacterMenu(characterToggle.getAttribute("aria-expanded") !== "true");
  });
  craftingToggle?.addEventListener("click", () => {
    setCraftingMenu(craftingToggle.getAttribute("aria-expanded") !== "true");
  });
  guidesToggle?.addEventListener("click", () => {
    setGuidesMenu(guidesToggle.getAttribute("aria-expanded") !== "true");
  });
  for (const button of frameButtons) {
    button.addEventListener("click", async () => {
      openFrameRoute(button.dataset.frameRoute, button.dataset.frameTitle, button);
    });
  }
  for (const button of document.querySelectorAll("[data-module-target]")) {
    button.addEventListener("click", () => {
      clearFrameSelection();
      activeFrameRoute = "";
      const input = search?.querySelector("input");
      if (input) input.placeholder = "Search and pulse places, creatures, drops, lore, resources...";
    });
  }

  search?.querySelector("input")?.addEventListener("input", (event) => {
    if (!activeFrameRoute || !document.getElementById("embeddedWorkspace")?.classList.contains("is-active")) return;
    event.stopImmediatePropagation();
    embeddedFrame?.contentWindow?.postMessage({ type: "nexus.search", query: event.currentTarget.value }, window.location.origin);
  }, true);

  embeddedFrame?.addEventListener("load", () => {
    try {
      const frameUrl = new URL(embeddedFrame.contentWindow.location.href);
      if (frameUrl.origin === window.location.origin && frameUrl.searchParams.get("embed") !== "1") {
        frameUrl.searchParams.set("embed", "1");
        embeddedFrame.contentWindow.location.replace(frameUrl.href);
        return;
      }
      const input = search?.querySelector("input");
      embeddedFrame.contentWindow?.postMessage({ type: "nexus.search", query: input?.value || "" }, window.location.origin);
      embeddedFrame.contentDocument?.addEventListener("click", (event) => {
        const link = event.target.closest('a[href^="/"]');
        if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const url = new URL(link.href, window.location.origin);
        if (url.pathname === "/map" || url.pathname === "/myrland-map") {
          event.preventDefault();
          window.location.href = url.href;
          return;
        }
        event.preventDefault();
        openFrameRoute(`${url.pathname}${url.search}${url.hash}`, link.textContent.trim() || "Mortal Nexus", null);
      });
    } catch {
      // External links are allowed to leave the embedded workspace normally.
    }
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const badge = event.data?.type === "nexus.market-unread"
      ? document.querySelector("[data-market-unread]")
      : event.data?.type === "nexus.friend-requests"
        ? document.querySelector("[data-friend-requests]")
        : null;
    if (!badge) return;
    const count = Math.max(0, Number(event.data.count) || 0);
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });

  if (!standaloneMode) {
  const socialAlert = document.createElement("button");
  socialAlert.type = "button";
  socialAlert.className = "nexus-social-alert";
  socialAlert.hidden = true;
  socialAlert.innerHTML = `<span class="nexus-social-alert-icon">${icon("bell-ring")}</span><span><strong>Social alert</strong><small></small></span>${icon("chevron-right")}`;
  document.body.append(socialAlert);
  let socialAlertTimer = 0;
  let socialAudio = null;
  let socialBaseline = null;
  const guildReminderKey = "mortalNexus.guildInviteReminder.v1";
  const guildReminderInterval = 2 * 60 * 60 * 1000;
  const ensureSocialAudio = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      socialAudio ||= new AudioContext();
      if (socialAudio.state === "suspended") await socialAudio.resume();
      return socialAudio;
    } catch { return null; }
  };
  const playSocialAlert = async (kind) => {
    const audio = await ensureSocialAudio();
    if (!audio) return;
    const notes = kind === "message" ? [659, 880, 988, 1318] : kind === "friend" ? [523, 659, 784, 1047] : kind === "market" ? [440, 659, 880, 1175] : [392, 523, 659, 784];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + index * .12;
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(.16, start + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .22);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + .24);
    });
  };
  const showSocialAlert = (kind, title, message) => {
    socialAlert.dataset.kind = kind;
    socialAlert.querySelector("strong").textContent = title;
    socialAlert.querySelector("small").textContent = message;
    socialAlert.hidden = false;
    socialAlert.classList.remove("is-visible");
    requestAnimationFrame(() => socialAlert.classList.add("is-visible"));
    window.clearTimeout(socialAlertTimer);
    socialAlertTimer = window.setTimeout(() => { socialAlert.classList.remove("is-visible"); socialAlert.hidden = true; }, 9000);
    void playSocialAlert(kind);
  };
  const pollSocialAlerts = async () => {
    try {
      const [messageResponse, friendsResponse, guildResponse, listingsResponse] = await Promise.all([
        fetch("/api/nexus-community/market/notifications", { cache: "no-store" }),
        fetch("/api/nexus-community/friends", { cache: "no-store" }),
        fetch("/api/nexus-community/guild", { cache: "no-store" }),
        fetch("/api/nexus-community/market/listings?sort=newest", { cache: "no-store" }),
      ]);
      if (![messageResponse, friendsResponse, guildResponse, listingsResponse].every((response) => response.ok)) return;
      const [messages, friends, guild, listings] = await Promise.all([messageResponse.json(), friendsResponse.json(), guildResponse.json(), listingsResponse.json()]);
      const newestListing = listings.listings?.[0] || null;
      const next = { messages: Number(messages.unreadCount || 0), friends: (friends.incoming || []).length, guilds: (guild.invitations || []).length, listingId: newestListing?.id || "" };
      const messageBadge = document.querySelector("[data-market-unread]");
      const friendBadge = document.querySelector("[data-friend-requests]");
      if (messageBadge) { messageBadge.textContent = String(next.messages); messageBadge.hidden = next.messages === 0; }
      const socialCount = next.friends + next.guilds;
      if (friendBadge) { friendBadge.textContent = String(socialCount); friendBadge.hidden = socialCount === 0; }
      let alertShown = false;
      let shownKind = "";
      if (socialBaseline) {
        if (next.messages > socialBaseline.messages) { showSocialAlert("message", "New message", `${messages.messages?.[0]?.senderName || "A player"} sent you a message.`); alertShown = true; shownKind = "message"; }
        else if (next.friends > socialBaseline.friends) { showSocialAlert("friend", "Friend request", `${friends.incoming?.[0]?.name || "A player"} wants to add you.`); alertShown = true; shownKind = "friend"; }
        else if (next.guilds > socialBaseline.guilds) { showSocialAlert("guild", "Guild invitation", `${guild.invitations?.[0]?.name || "A guild"} invited you to join.`); alertShown = true; shownKind = "guild"; }
        else if (next.listingId && next.listingId !== socialBaseline.listingId) { showSocialAlert("market", "New market listing", `${newestListing.seller?.inGameName || "A player"} posted ${newestListing.itemName}.`); alertShown = true; shownKind = "market"; }
      }
      const invitationSignature = (guild.invitations || []).map((invitation) => invitation.id).sort().join(",");
      if (invitationSignature) {
        let reminder = {};
        try { reminder = JSON.parse(localStorage.getItem(guildReminderKey) || "{}"); } catch { reminder = {}; }
        const due = reminder.signature !== invitationSignature || Date.now() - Number(reminder.remindedAt || 0) >= guildReminderInterval;
        if (!alertShown && due) {
          showSocialAlert("guild", "Guild invitation waiting", `${guild.invitations[0].name || "A guild"} is waiting for your response.`);
          localStorage.setItem(guildReminderKey, JSON.stringify({ signature: invitationSignature, remindedAt: Date.now() }));
        } else if (shownKind === "guild") {
          localStorage.setItem(guildReminderKey, JSON.stringify({ signature: invitationSignature, remindedAt: Date.now() }));
        }
      } else {
        localStorage.removeItem(guildReminderKey);
      }
      socialBaseline = next;
    } catch { /* Retry on the next polling cycle. */ }
  };
  document.addEventListener("pointerdown", () => { void ensureSocialAudio(); }, { once: true, capture: true });
  socialAlert.addEventListener("click", () => {
    socialAlert.hidden = true;
    const route = socialAlert.dataset.kind === "message" ? "/market?view=messages" : socialAlert.dataset.kind === "market" ? "/market" : "/market?view=friends";
    const button = document.querySelector(`[data-frame-route="${route}"]`) || document.querySelector('[data-frame-route^="/market"]');
    openFrameRoute(route, socialAlert.dataset.kind === "message" ? "Messages" : socialAlert.dataset.kind === "market" ? "Market" : "Friends", button);
  });
  const marketStartButton = document.querySelector('[data-frame-route="/market"]');
  if (marketStartButton) openFrameRoute("/market", "Market", marketStartButton);
  void pollSocialAlerts();
  window.setInterval(pollSocialAlerts, 12000);
  }

  const updateIcons = () => window.lucide?.createIcons?.({ attrs: { "aria-hidden": "true" } });
  updateIcons();

  window.mortalNexusOpenFrameRoute = openFrameRoute;
})();
