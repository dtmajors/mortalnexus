const byId = (id) => document.getElementById(id);

const nativeHost = window.chrome?.webview || null;
const validModules = new Set(["map", "embedded", "macros", "settings"]);
const state = {
  module: "map",
  premium: false,
  macrosEnabled: false,
  settings: null,
  safeIndices: new Set(),
  craftSafetyArmed: false,
  editor: { isEditor: false, username: "" },
  history: [],
  capturingHotkey: "",
  clickMacro: null,
  magic: null,
  melee: null,
  afk: null,
  combatMode: "crafting",
  window: { enabled: false, resolution: "fill", opacityPercent: 100, scalePercent: 100 },
  update: { state: "idle", message: "Check for updates", busy: false },
};

const hotkeyElements = {
  craftToggle: byId("hotkeyCraftToggle"),
  craftStop: byId("hotkeyCraftStop"),
  loot: byId("hotkeyLoot"),
  bank: byId("hotkeyBank"),
  overlayToggle: byId("hotkeyOverlayToggle"),
  clickMacroToggle: byId("hotkeyClickMacroToggle"),
  clickMacroRegen: byId("hotkeyClickMacroRegen"),
  magicToggle: byId("hotkeyMagicToggle"),
  magicAction: byId("hotkeyMagicAction"),
  magicRecovery: byId("hotkeyMagicRecovery"),
  meleeToggle: byId("hotkeyMeleeToggle"),
  meleeRest: byId("hotkeyMeleeRest"),
  afkToggle: byId("hotkeyAfkToggle"),
  afkFirst: byId("hotkeyAfkFirst"),
  afkSecond: byId("hotkeyAfkSecond"),
  emergencyStop: byId("hotkeyEmergencyStop"),
};

function post(type, payload = {}) {
  if (!nativeHost) {
    showToolMessage("This feature is available in the Mortal Nexus desktop application.");
    return false;
  }
  nativeHost.postMessage({ type, ...payload });
  return true;
}

function setModule(moduleName, syncUrl = false) {
  if (moduleName === "craft" || moduleName === "training") moduleName = "macros";
  if (moduleName === "commands" || moduleName === "history") moduleName = "settings";
  if (moduleName === "macros" && !state.premium) {
    window.dispatchEvent(new CustomEvent("mortal-nexus:premium-required", { detail: { feature: "Automation and macros" } }));
    moduleName = "map";
  }
  if (!validModules.has(moduleName)) moduleName = "map";
  state.module = moduleName;
  byId("toolsWorkspace").classList.toggle("is-active", moduleName === "macros" || moduleName === "settings");
  byId("embeddedWorkspace")?.classList.toggle("is-active", moduleName === "embedded");
  for (const tab of document.querySelectorAll("[data-module-target]")) {
    tab.classList.toggle("is-active", tab.dataset.moduleTarget === moduleName);
  }
  for (const panel of document.querySelectorAll("[data-module-panel]")) {
    panel.classList.toggle("is-active", panel.dataset.modulePanel === moduleName);
  }
  for (const action of document.querySelectorAll(".map-only-action")) {
    action.hidden = moduleName !== "map";
  }
  byId("searchInput").closest(".global-search").classList.toggle("is-tool-mode", moduleName !== "map");
  if (moduleName === "map") {
    window.setTimeout(() => window.mortalNexusMapResize?.(), 80);
  }
  if (syncUrl) {
    const url = new URL(window.location.href);
    if (moduleName === "map") url.searchParams.delete("module");
    else url.searchParams.set("module", moduleName);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}
window.mortalNexusSetModule = setModule;

function setCombatMode(mode) {
  state.combatMode = mode;
  for (const tab of document.querySelectorAll("[data-combat-target]")) {
    tab.classList.toggle("is-active", tab.dataset.combatTarget === mode);
  }
  for (const panel of document.querySelectorAll("[data-combat-panel]")) {
    panel.classList.toggle("is-active", panel.dataset.combatPanel === mode);
  }
}

function showToolMessage(message, duration = 4200) {
  const toast = byId("toast");
  clearTimeout(showToolMessage.timer);
  toast.textContent = message;
  toast.hidden = false;
  showToolMessage.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

function renderCraftSafety(armed) {
  state.craftSafetyArmed = Boolean(armed);
  const control = byId("craftSafetyControl");
  const input = byId("craftSafetyArm");
  const startButton = byId("craftStartBtn");
  const hotkeyRow = byId("craftStartHotkeyRow");
  control.dataset.armed = String(state.craftSafetyArmed);
  input.checked = state.craftSafetyArmed;
  input.setAttribute("aria-checked", String(state.craftSafetyArmed));
  startButton.disabled = !state.craftSafetyArmed || !state.macrosEnabled;
  hotkeyRow.classList.toggle("is-safety-disabled", !state.craftSafetyArmed);
  byId("craftSafetyTitle").textContent = state.craftSafetyArmed
    ? "ARMED - INVENTORY ACTIONS ENABLED"
    : "SAFE - CRAFT & CLICK OFF";
  byId("craftSafetyDescription").textContent = state.craftSafetyArmed
    ? "Start controls and the craft hotkey are live. Switch this off when finished."
    : "Start controls and inventory hotkeys are disabled.";
}

function renderMacrosEnabled(enabled) {
  state.macrosEnabled = Boolean(enabled);
  if (!state.macrosEnabled) state.craftSafetyArmed = false;
  const control = byId("macrosMasterControl");
  const toggle = byId("macrosMasterToggle");
  const craftSafetyToggle = byId("craftSafetyArm");
  if (control) control.dataset.enabled = String(state.macrosEnabled);
  if (toggle) {
    toggle.checked = state.macrosEnabled;
    toggle.setAttribute("aria-checked", String(state.macrosEnabled));
  }
  if (craftSafetyToggle) craftSafetyToggle.disabled = !state.macrosEnabled;
  byId("macrosMasterTitle").textContent = state.macrosEnabled ? "Macros enabled" : "Macros disabled";
  byId("macrosMasterDescription").textContent = state.macrosEnabled
    ? "Only bindings you assign can run."
    : "No routine or macro command can run.";
  document.querySelector(".unified-macros-page")?.classList.toggle("macros-disabled", !state.macrosEnabled);
  for (const id of ["magicStartBtn", "meleeStartBtn", "clickMacroStartBtn", "afkStartBtn"]) {
    byId(id).disabled = !state.macrosEnabled;
  }
  for (const button of document.querySelectorAll("[data-send-command]")) {
    button.disabled = !state.macrosEnabled;
  }
  renderCraftSafety(state.craftSafetyArmed);
}

function renderSecondScreenState(payload = {}) {
  const opacityPercent = Math.max(20, Math.min(100, Number(payload.opacityPercent) || 100));
  const scalePercent = Math.max(60, Math.min(150, Number(payload.scalePercent) || 100));
  state.window = {
    enabled: Boolean(payload.enabled),
    resolution: payload.resolution || "fill",
    opacityPercent,
    scalePercent,
    screenWidth: Number(payload.screenWidth) || 0,
    screenHeight: Number(payload.screenHeight) || 0,
  };
  const control = byId("secondScreenControl");
  const toggle = byId("secondScreenToggle");
  const resolution = byId("secondScreenResolution");
  const opacitySlider = byId("windowOpacitySlider");
  const opacityValue = byId("windowOpacityValue");
  const scaleSlider = byId("applicationScaleSlider");
  const scaleValue = byId("applicationScaleValue");
  const automaticScaleToggle = byId("automaticScaleToggle");
  const automaticScaleHint = byId("automaticScaleHint");
  if (opacitySlider) opacitySlider.value = String(opacityPercent);
  if (opacityValue) opacityValue.textContent = `${opacityPercent}%`;
  if (scaleSlider) scaleSlider.value = String(scalePercent);
  if (scaleValue) scaleValue.textContent = `${scalePercent}%`;
  if (automaticScaleToggle) automaticScaleToggle.checked = payload.automaticScale !== false;
  if (scaleSlider) scaleSlider.disabled = payload.automaticScale !== false;
  if (automaticScaleHint) {
    const display = payload.screenWidth && payload.screenHeight
      ? `${payload.screenWidth} x ${payload.screenHeight}`
      : "your current display";
    automaticScaleHint.textContent = payload.automaticScale !== false
      ? `${display} · ${scalePercent}% selected automatically.`
      : `${display} · manual scale enabled.`;
  }
  if (!control || !toggle || !resolution) return;
  control.dataset.enabled = String(state.window.enabled);
  toggle.checked = state.window.enabled;
  resolution.value = [...resolution.options].some((option) => option.value === state.window.resolution)
    ? state.window.resolution
    : "fill";
  const display = state.window.screenWidth && state.window.screenHeight
    ? `${state.window.screenWidth} x ${state.window.screenHeight}`
    : "current display";
  control.title = state.window.enabled
    ? `Overlay active on ${display}. Switch off to restore the desktop window.`
    : `Open as a borderless always-on-top overlay on ${display}.`;
}

function renderUpdateStatus(payload = {}) {
  state.update = payload;
  const button = byId("updateButton");
  if (!button) return;

  const updateState = payload.state || "idle";
  button.dataset.state = updateState;
  button.disabled = Boolean(payload.busy);
  button.title = payload.message || "Check for Mortal Nexus updates";

  const label = button.querySelector("span");
  if (!label) return;
  if (updateState === "available" || updateState === "required") {
    label.textContent = updateState === "required"
      ? (payload.latestVersion ? `Required ${payload.latestVersion}` : "Update required")
      : (payload.latestVersion ? `Update ${payload.latestVersion}` : "Update ready");
  } else if (updateState === "checking") {
    label.textContent = "Checking";
  } else if (updateState === "downloading") {
    label.textContent = Number.isFinite(payload.progressPercent)
      ? `Downloading ${payload.progressPercent}%`
      : "Downloading";
  } else if (updateState === "installing") {
    label.textContent = "Installing";
  } else if (updateState === "private") {
    label.textContent = "Private build";
  } else {
    label.textContent = "Updates";
  }
}

function formatPoint(point) {
  return point ? `(${point.x}, ${point.y})` : "Not set";
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function hotkeyRow(action) {
  return document.querySelector(`[data-record-hotkey="${action}"]`)?.closest(".hotkey-row, .sequence-key-row");
}

function beginHotkeyCapture(action) {
  state.capturingHotkey = action;
  document.querySelectorAll(".hotkey-row.is-capturing, .sequence-key-row.is-capturing")
    .forEach((row) => row.classList.remove("is-capturing"));
  hotkeyRow(action)?.classList.add("is-capturing");
  showToolMessage("Press the new key, mouse button, or modifier combination. Esc cancels.", 8000);
  post("hotkey.capture", { action });
}

function renderClickMacroSequence(settings) {
  const container = byId("clickMacroSequence");
  const steps = Array.isArray(settings?.steps) ? settings.steps.slice(0, 10) : [];
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 10; index += 1) {
    const step = steps[index] || { enabled: false, key: { display: "Not set" } };
    const action = `clickMacroStep${index}`;
    const row = document.createElement("div");
    row.className = "sequence-key-row";
    row.classList.toggle("is-disabled", step.enabled === false);
    row.dataset.stepIndex = String(index);

    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = step.enabled !== false;
    enabled.title = `Enable rotation slot ${index + 1}`;
    enabled.addEventListener("change", () => {
      row.classList.toggle("is-disabled", !enabled.checked);
      postClickMacroConfiguration();
    });

    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    const value = document.createElement("strong");
    value.textContent = step.key?.display || "Not set";
    hotkeyElements[action] = value;

    const record = document.createElement("button");
    record.type = "button";
    record.dataset.recordHotkey = action;
    record.textContent = "Record";
    record.addEventListener("click", () => beginHotkeyCapture(action));

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "icon-button";
    clear.dataset.clearHotkey = action;
    clear.title = `Clear rotation slot ${index + 1}`;
    clear.innerHTML = '<i data-lucide="x"></i>';
    clear.addEventListener("click", () => post("hotkey.clear", { action }));

    row.append(enabled, number, value, record, clear);
    fragment.append(row);
  }
  container.replaceChildren(fragment);
  lucide.createIcons();
}

function clickMacroEnabledKeys() {
  return (state.clickMacro?.steps || [])
    .filter((step) => step.enabled !== false && Number(step.key?.virtualKey) > 0)
    .map((step) => step.key?.display || "Not set");
}

function clickMacroKeyAt(index) {
  const keys = clickMacroEnabledKeys();
  return keys.length ? keys[Math.max(0, Number(index) || 0) % keys.length] : "Not set";
}

function updateClickMacroRestKeyState() {
  const enabled = byId("clickMacroUseRestKey").checked;
  const row = byId("clickMacroRestKeyRow");
  row.classList.toggle("is-disabled", !enabled);
  for (const button of row.querySelectorAll("button")) button.disabled = !enabled;
}

function updateMagicRecoveryKeyState() {
  const enabled = byId("magicUseRecoveryKey").checked;
  const row = byId("magicRecoveryKeyRow");
  row.classList.toggle("is-disabled", !enabled);
  for (const button of row.querySelectorAll("button")) button.disabled = !enabled;
}

function updateMeleeRestKeyState() {
  const enabled = byId("meleeUseRestCycle").checked;
  const row = byId("meleeRestKeyRow");
  row.classList.toggle("is-disabled", !enabled);
  for (const button of row.querySelectorAll("button")) button.disabled = !enabled;
}

function renderSafeGrid() {
  const container = byId("safeCellGrid");
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 36; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(index + 1);
    button.title = `Inventory cell ${index + 1}${state.safeIndices.has(index) ? " (protected)" : ""}`;
    button.classList.toggle("is-safe", state.safeIndices.has(index));
    button.addEventListener("click", () => {
      if (state.safeIndices.has(index)) state.safeIndices.delete(index);
      else state.safeIndices.add(index);
      if (state.safeIndices.size > 35) state.safeIndices.delete(index);
      renderSafeGrid();
      postCraftConfiguration();
    });
    fragment.append(button);
  }
  container.replaceChildren(fragment);
  byId("craftTargetCount").textContent = `${36 - state.safeIndices.size} targets`;
}

function postCraftConfiguration() {
  post("craft.configure", {
    safeMode: byId("craftSafeMode").checked,
    craftHoldSeconds: Number(byId("craftHoldSeconds").value),
    safeIndices: [...state.safeIndices].sort((a, b) => a - b),
  });
}

function postClickMacroConfiguration() {
  post("clickMacro.configure", {
    shootDurationSeconds: Number(byId("clickMacroShootSeconds").value),
    shootIntervalMs: Number(byId("clickMacroShootIntervalMs").value),
    clickHoldMs: Number(byId("clickMacroClickHoldMs").value),
    postShootDelayMs: Number(byId("clickMacroPostShootMs").value),
    keyToRegenDelayMs: 0,
    restDurationSeconds: Number(byId("clickMacroRestSeconds").value),
    useRestKey: byId("clickMacroUseRestKey").checked,
    enabledSteps: [...document.querySelectorAll("#clickMacroSequence .sequence-key-row input")]
      .map((input) => input.checked),
  });
}

function postMagicConfiguration() {
  post("magic.configure", {
    pressHoldMs: Number(byId("magicPressHoldMs").value),
    pressIntervalMs: Number(byId("magicPressIntervalMs").value),
    pressesPerBatch: Number(byId("magicPressesPerBatch").value),
    batchRestMs: Number(byId("magicBatchRestMs").value),
    useRecoveryKey: byId("magicUseRecoveryKey").checked,
  });
}

function postMeleeConfiguration() {
  post("melee.configure", {
    clickHoldMs: Number(byId("meleeClickHoldMs").value),
    clickIntervalMs: Number(byId("meleeClickIntervalMs").value),
    attackDurationSeconds: Number(byId("meleeAttackSeconds").value),
    restDurationSeconds: Number(byId("meleeRestSeconds").value),
    useRestCycle: byId("meleeUseRestCycle").checked,
  });
}

function postAfkConfiguration() {
  post("afk.configure", {
    delayBetweenKeysMs: Number(byId("afkDelayMs").value),
    repeatIntervalSeconds: Number(byId("afkRepeatSeconds").value),
  });
}

function hotkeyDisplay(settings, action) {
  if (action === "magicAction") return settings.magic?.actionKey?.display || "Not set";
  if (action === "magicRecovery") return settings.magic?.recoveryKey?.display || "Not set";
  if (action === "clickMacroRegen") return settings.clickMacro?.regenKey?.display || "Not set";
  if (action === "meleeRest") return settings.melee?.restKey?.display || "Not set";
  if (action === "afkFirst") return settings.afk?.firstKey?.display || "Not set";
  if (action === "afkSecond") return settings.afk?.secondKey?.display || "Not set";
  if (action.startsWith("clickMacroStep")) {
    const index = Number(action.slice("clickMacroStep".length));
    return settings.clickMacro?.steps?.[index]?.key?.display || "Not set";
  }
  return settings.hotkeys?.[action]?.display || "Not set";
}

function applySnapshot(snapshot) {
  state.premium = Boolean(snapshot?.entitlement?.premium ?? snapshot?.entitlement?.Premium);
  if (!state.premium && state.module === "macros") setModule("map", true);
  const settings = snapshot?.settings;
  if (!settings) return;
  state.settings = settings;
  renderMacrosEnabled(settings.macrosEnabled === true);
  const masterButton = byId("hotkeysMasterButton");
  const hotkeysEnabled = settings.hotkeysEnabled !== false;
  masterButton.dataset.enabled = String(hotkeysEnabled);
  masterButton.setAttribute("aria-checked", String(hotkeysEnabled));
  const masterLabel = masterButton.querySelector(".hotkeys-master-label") || masterButton.querySelector("span");
  masterLabel.textContent = hotkeysEnabled ? "Hotkeys on" : "Hotkeys off";
  masterButton.title = hotkeysEnabled ? "Disable every global hotkey" : "Enable global hotkeys";
  for (const [action, element] of Object.entries(hotkeyElements)) {
    if (element) element.textContent = hotkeyDisplay(settings, action);
  }

  const craft = settings.craft || {};
  byId("craftGridValue").textContent = craft.inventoryGrid
    ? `${craft.inventoryGrid.width || craft.inventoryGrid.right - craft.inventoryGrid.left} x ${craft.inventoryGrid.height || craft.inventoryGrid.bottom - craft.inventoryGrid.top} · PID ${craft.targetProcessId || "--"}`
    : "Not positioned";
  byId("craftButtonValue").textContent = formatPoint(craft.craftButton);
  byId("deletePositionValue").textContent = formatPoint(craft.deletePosition);
  byId("yesButtonValue").textContent = formatPoint(craft.yesButton);
  byId("craftSafeMode").checked = craft.safeMode !== false;
  byId("craftHoldSeconds").value = craft.craftHoldSeconds || 63;
  state.safeIndices = new Set(craft.safeIndices || []);
  renderSafeGrid();
  renderCraftSafety(snapshot.craft?.safetyArmed === true);

  const clickMacro = settings.clickMacro || {};
  state.clickMacro = clickMacro;
  byId("clickMacroShootSeconds").value = clickMacro.shootDurationSeconds || 45;
  byId("clickMacroShootIntervalMs").value = clickMacro.shootIntervalMs ?? 200;
  byId("clickMacroClickHoldMs").value = clickMacro.clickHoldMs ?? 30;
  byId("clickMacroPostShootMs").value = clickMacro.postShootDelayMs ?? 0;
  byId("clickMacroRestSeconds").value = clickMacro.restDurationSeconds ?? 27;
  byId("clickMacroUseRestKey").checked = clickMacro.useRestKey === true;
  updateClickMacroRestKeyState();
  renderClickMacroSequence(clickMacro);
  const runtime = snapshot.clickMacro || {};
  const phase = runtime.paused ? "PAUSED" : runtime.running ? "RUNNING" : "READY";
  setPhase(byId("clickMacroPhase"), phase);
  byId("clickMacroStepLabel").textContent = `Next: ${clickMacroKeyAt(runtime.stepIndex)}`;
  byId("clickMacroStartBtn").classList.toggle("is-active", Boolean(runtime.running));

  const magic = settings.magic || {};
  state.magic = magic;
  byId("magicPressHoldMs").value = magic.pressHoldMs ?? 30;
  byId("magicPressIntervalMs").value = magic.pressIntervalMs ?? 1000;
  byId("magicPressesPerBatch").value = magic.pressesPerBatch ?? 10;
  byId("magicBatchRestMs").value = magic.batchRestMs ?? 5000;
  byId("magicUseRecoveryKey").checked = magic.useRecoveryKey === true;
  updateMagicRecoveryKeyState();
  const magicRuntime = snapshot.magic || {};
  const magicPhase = magicRuntime.paused ? "PAUSED" : magicRuntime.running ? "CASTING" : "READY";
  setPhase(byId("magicPhase"), magicPhase);
  byId("magicProgress").textContent = `${magicRuntime.pressIndex || 0} / ${magic.pressesPerBatch || 10}`;
  byId("magicStartBtn").classList.toggle("is-active", Boolean(magicRuntime.running));

  const melee = settings.melee || {};
  state.melee = melee;
  byId("meleeClickHoldMs").value = melee.clickHoldMs ?? 30;
  byId("meleeClickIntervalMs").value = melee.clickIntervalMs ?? 250;
  byId("meleeAttackSeconds").value = melee.attackDurationSeconds ?? 30;
  byId("meleeRestSeconds").value = melee.restDurationSeconds ?? 10;
  byId("meleeUseRestCycle").checked = melee.useRestCycle === true;
  updateMeleeRestKeyState();
  const meleeRuntime = snapshot.melee || {};
  setPhase(byId("meleePhase"), meleeRuntime.running ? "ATTACKING" : "READY");
  byId("meleeStartBtn").classList.toggle("is-active", Boolean(meleeRuntime.running));

  const afk = settings.afk || {};
  state.afk = afk;
  byId("afkDelayMs").value = afk.delayBetweenKeysMs ?? 50;
  byId("afkRepeatSeconds").value = afk.repeatIntervalSeconds ?? 60;
  const afkRuntime = snapshot.afk || {};
  setPhase(byId("afkPhase"), afkRuntime.running ? "RUNNING" : "READY");
  byId("afkStartBtn").classList.toggle("is-active", Boolean(afkRuntime.running));
  lucide.createIcons();
}

function setPhase(element, phase) {
  element.textContent = phase;
  element.dataset.phase = phase;
}

function renderClickMacroStatus(payload) {
  const phase = payload.phase || "READY";
  setPhase(byId("clickMacroPhase"), phase);
  byId("clickMacroStatus").textContent = payload.message || "";
  byId("clickMacroStepLabel").textContent = `${payload.running ? "Current" : "Next"}: ${clickMacroKeyAt(payload.stepIndex)}`;
  byId("clickMacroCountdown").textContent = payload.remainingSeconds > 0
    ? formatDuration(payload.remainingSeconds)
    : phase === "STOPPED" || phase === "READY" || phase === "BLOCKED"
      ? "--:--"
      : "00:00";
  byId("clickMacroStartBtn").classList.toggle("is-active", Boolean(payload.running));
  for (const item of document.querySelectorAll("[data-click-phase]")) {
    item.classList.toggle("is-active", item.dataset.clickPhase === phase);
  }
}

function renderMagicStatus(payload) {
  const phase = payload.phase || "READY";
  setPhase(byId("magicPhase"), phase);
  byId("magicStatus").textContent = payload.message || "";
  byId("magicProgress").textContent = `${payload.pressIndex || 0} / ${payload.pressTotal || state.magic?.pressesPerBatch || 0}`;
  const remainingMs = Math.max(0, Number(payload.remainingMs) || 0);
  byId("magicCountdown").textContent = remainingMs > 0
    ? remainingMs < 1000 ? `${remainingMs} ms` : formatDuration(Math.ceil(remainingMs / 1000))
    : phase === "STOPPED" || phase === "READY" || phase === "BLOCKED" ? "--" : "NOW";
  byId("magicStartBtn").classList.toggle("is-active", Boolean(payload.running));
}

function renderMeleeStatus(payload) {
  const phase = payload.phase || "READY";
  setPhase(byId("meleePhase"), phase);
  byId("meleeStatus").textContent = payload.message || "";
  const remainingMs = Math.max(0, Number(payload.remainingMs) || 0);
  byId("meleeCountdown").textContent = remainingMs > 0
    ? formatDuration(Math.ceil(remainingMs / 1000))
    : phase === "STOPPED" || phase === "READY" || phase === "BLOCKED" ? "--" : "NOW";
  byId("meleeStartBtn").classList.toggle("is-active", Boolean(payload.running));
}

function renderAfkStatus(payload) {
  const phase = payload.phase || "READY";
  setPhase(byId("afkPhase"), phase);
  byId("afkStatus").textContent = payload.message || "";
  const remainingMs = Math.max(0, Number(payload.remainingMs) || 0);
  byId("afkCountdown").textContent = remainingMs > 0
    ? formatDuration(Math.ceil(remainingMs / 1000))
    : phase === "STOPPED" || phase === "READY" || phase === "BLOCKED" ? "--" : "NOW";
  byId("afkStartBtn").classList.toggle("is-active", Boolean(payload.running));
}

function onNativeMessage(event) {
  const message = event.data || {};
  const payload = message.payload || {};
  switch (message.type) {
    case "toolsSnapshot":
      applySnapshot(payload);
      break;
    case "windowState":
      renderSecondScreenState(payload);
      break;
    case "craftStatus":
      setPhase(byId("craftPhase"), payload.phase || "READY");
      byId("craftStatus").textContent = payload.message || "";
      break;
    case "craftSafetyBlocked":
      renderCraftSafety(false);
      showToolMessage(payload.message || "Craft & Click is disabled.", 5200);
      break;
    case "clickMacroStatus":
      renderClickMacroStatus(payload);
      break;
    case "magicStatus":
      renderMagicStatus(payload);
      break;
    case "meleeStatus":
      renderMeleeStatus(payload);
      break;
    case "afkStatus":
      renderAfkStatus(payload);
      break;
    case "updateStatus":
      renderUpdateStatus(payload);
      if (payload.state === "available") {
        showToolMessage(payload.message || "A Mortal Nexus update is available.", 6500);
      }
      break;
    case "automationStopped":
      showToolMessage(payload.message || "All automation stopped.");
      break;
    case "macrosState":
      renderMacrosEnabled(payload.enabled === true);
      showToolMessage(payload.message || (payload.enabled ? "Macros enabled." : "Macros disabled."));
      break;
    case "macrosDisabled":
      renderMacrosEnabled(false);
      showToolMessage(payload.message || "Macros are disabled.", 5200);
      break;
    case "captureStatus":
      showToolMessage(payload.message || "Capture updated.");
      break;
    case "hotkeyCaptured":
      if (hotkeyElements[payload.action]) {
        hotkeyElements[payload.action].textContent = payload.binding?.display || "Not set";
      }
      state.capturingHotkey = "";
      document.querySelectorAll(".hotkey-row.is-capturing, .sequence-key-row.is-capturing").forEach((row) => row.classList.remove("is-capturing"));
      showToolMessage(`${payload.binding?.display || "Hotkey"} assigned.`);
      break;
    case "hotkeyCaptureCancelled":
      state.capturingHotkey = "";
      document.querySelectorAll(".hotkey-row.is-capturing, .sequence-key-row.is-capturing").forEach((row) => row.classList.remove("is-capturing"));
      showToolMessage("Hotkey capture cancelled.");
      break;
    case "hotkeyRejected":
      state.capturingHotkey = "";
      document.querySelectorAll(".hotkey-row.is-capturing, .sequence-key-row.is-capturing").forEach((row) => row.classList.remove("is-capturing"));
      showToolMessage(payload.message || "That hotkey is already assigned.", 5200);
      break;
    case "macroStatus":
      byId("macroStatus").textContent = payload.message || "Command sent.";
      break;
    case "premiumRequired":
      window.dispatchEvent(new CustomEvent("mortal-nexus:premium-required", { detail: { feature: payload.feature || "This feature" } }));
      showToolMessage(payload.message || "Mortal Nexus Premium is required.", 5200);
      break;
    case "nativeError":
      showToolMessage(payload.message || "The native tool could not complete that action.", 6200);
      break;
  }
}

function renderEditorState(detail) {
  state.editor = {
    isEditor: Boolean(detail?.isEditor),
    username: detail?.username || "",
  };
  const button = byId("editorButton");
  button.dataset.editor = String(state.editor.isEditor);
  button.querySelector("span").textContent = state.editor.isEditor ? "Edit" : "Viewer";
  button.title = state.editor.isEditor
    ? `Editing as ${state.editor.username}`
    : "Open editor sign in";
  button.querySelector("svg")?.remove();
  button.querySelector("i")?.remove();
  button.insertAdjacentHTML("afterbegin", `<i data-lucide="${state.editor.isEditor ? "shield-check" : "lock-keyhole"}"></i>`);
  const editorPhase = byId("editorPhase");
  if (editorPhase) {
    editorPhase.textContent = state.editor.isEditor ? "EDITOR" : "VIEWER";
    editorPhase.dataset.phase = state.editor.isEditor ? "EDITOR" : "VIEWER";
  }
  const editorLoginForm = byId("editorLoginForm");
  const editorSession = byId("editorSession");
  const editorSessionName = byId("editorSessionName");
  const accountHeading = byId("accountHeading");
  const loginStatus = byId("loginStatus");
  if (editorLoginForm) editorLoginForm.hidden = state.editor.isEditor;
  if (editorSession) editorSession.hidden = !state.editor.isEditor;
  if (editorSessionName) editorSessionName.textContent = state.editor.username;
  if (accountHeading) accountHeading.textContent = state.editor.isEditor ? "Editor session" : "Editor sign in";
  if (loginStatus) {
    loginStatus.textContent = state.editor.isEditor
      ? "Shared map editing is unlocked. Every change is attributed to this account."
      : "Viewer mode is read-only.";
  }
  for (const element of document.querySelectorAll(".editor-only")) {
    element.classList.toggle("is-locked", !state.editor.isEditor);
  }
  renderHistory(state.history);
  lucide.createIcons();
}

function canUndoHistoryEntry(entry) {
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, "before")) return false;
  if (/^(?:catalogEdits|customMarkers)\/[^/]+$/.test(String(entry.targetPath || ""))) return true;
  const action = String(entry.action || "");
  return (action.startsWith("catalog-") || action.startsWith("shared-marker-")) && Boolean(entry.targetId);
}

function renderHistory(records) {
  state.history = Array.isArray(records) ? records : [];
  byId("historyCount").textContent = `${state.history.length.toLocaleString()} records`;
  if (!state.history.length) {
    byId("historyList").innerHTML = `<div class="history-empty">No shared edits have been recorded yet.</div>`;
    return;
  }

  byId("historyList").innerHTML = state.history
    .slice()
    .reverse()
    .map((entry, index) => {
      const date = new Date(Number(entry.timestamp) || entry.atIso || Date.now());
      const action = String(entry.action || "updated").replaceAll("-", " ");
      const undoButton = state.editor.isEditor && index < 50 && canUndoHistoryEntry(entry)
        ? `<button class="history-undo-button" type="button" data-undo-history="${escapeText(entry.historyId)}" title="Restore the state before this edit"><i data-lucide="undo-2"></i> Undo</button>`
        : "";
      return `
        <article class="history-entry">
          <time datetime="${date.toISOString()}">${date.toLocaleString()}</time>
          <div><strong>${escapeText(entry.targetLabel || entry.targetId || "Map data")}</strong><span>${escapeText(action)}</span></div>
          <span class="history-actor">${escapeText(entry.actorUsername || "editor")}</span>
          ${undoButton}
        </article>`;
    })
    .join("");
  lucide.createIcons();
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

for (const control of document.querySelectorAll("[data-module-target]")) {
  control.addEventListener("click", () => setModule(control.dataset.moduleTarget, true));
}

for (const control of document.querySelectorAll("[data-combat-target]")) {
  control.addEventListener("click", () => setCombatMode(control.dataset.combatTarget));
}

for (const button of document.querySelectorAll("[data-record-hotkey]")) {
  button.addEventListener("click", () => beginHotkeyCapture(button.dataset.recordHotkey));
}

for (const button of document.querySelectorAll("[data-clear-hotkey]")) {
  button.addEventListener("click", () => post("hotkey.clear", { action: button.dataset.clearHotkey }));
}

for (const input of [
  byId("craftSafeMode"),
  byId("craftHoldSeconds"),
]) {
  input.addEventListener("change", postCraftConfiguration);
}
byId("captureGridBtn").addEventListener("click", () => post("craft.captureGrid"));
for (const button of document.querySelectorAll("[data-capture-point]")) {
  button.addEventListener("click", () => post("craft.capturePoint", { target: button.dataset.capturePoint }));
}
byId("craftStartBtn").addEventListener("click", () => {
  if (!state.craftSafetyArmed) {
    showToolMessage("Craft & Click is disabled. Turn on the large safety switch first.", 5200);
    return;
  }
  postCraftConfiguration();
  post("craft.start");
});
byId("craftStopBtn").addEventListener("click", () => post("craft.stop"));
byId("craftSafetyArm").addEventListener("change", (event) => {
  const armed = event.currentTarget.checked === true;
  renderCraftSafety(armed);
  post("craft.safety", { armed });
});

for (const input of [
  byId("clickMacroShootSeconds"),
  byId("clickMacroShootIntervalMs"),
  byId("clickMacroClickHoldMs"),
  byId("clickMacroPostShootMs"),
  byId("clickMacroRestSeconds"),
]) {
  input.addEventListener("change", postClickMacroConfiguration);
}
byId("clickMacroUseRestKey").addEventListener("change", () => {
  updateClickMacroRestKeyState();
  postClickMacroConfiguration();
});
byId("clickMacroStartBtn").addEventListener("click", () => {
  postClickMacroConfiguration();
  post("clickMacro.start");
});
byId("clickMacroStopBtn").addEventListener("click", () => post("clickMacro.stop"));

for (const input of [
  byId("magicPressHoldMs"),
  byId("magicPressIntervalMs"),
  byId("magicPressesPerBatch"),
  byId("magicBatchRestMs"),
]) {
  input.addEventListener("change", postMagicConfiguration);
}
byId("magicStartBtn").addEventListener("click", () => {
  postMagicConfiguration();
  post("magic.start");
});
byId("magicStopBtn").addEventListener("click", () => post("magic.stop"));
byId("magicUseRecoveryKey").addEventListener("change", () => {
  updateMagicRecoveryKeyState();
  postMagicConfiguration();
});

for (const input of [
  byId("meleeClickHoldMs"),
  byId("meleeClickIntervalMs"),
  byId("meleeAttackSeconds"),
  byId("meleeRestSeconds"),
]) {
  input.addEventListener("change", postMeleeConfiguration);
}
byId("meleeUseRestCycle").addEventListener("change", () => {
  updateMeleeRestKeyState();
  postMeleeConfiguration();
});
byId("meleeStartBtn").addEventListener("click", () => {
  postMeleeConfiguration();
  post("melee.start");
});
byId("meleeStopBtn").addEventListener("click", () => post("melee.stop"));

for (const input of [byId("afkDelayMs"), byId("afkRepeatSeconds")]) {
  input.addEventListener("change", postAfkConfiguration);
}
byId("afkStartBtn").addEventListener("click", () => {
  postAfkConfiguration();
  post("afk.start");
});
byId("afkStopBtn").addEventListener("click", () => post("afk.stop"));
byId("stopAllAutomationBtn").addEventListener("click", () => post("automation.stopAll"));
byId("macrosMasterToggle").addEventListener("change", (event) => {
  const enabled = event.currentTarget.checked === true;
  renderMacrosEnabled(enabled);
  post("macros.toggle", { enabled });
});

byId("hotkeysMasterButton").addEventListener("click", () => {
  const enabled = byId("hotkeysMasterButton").dataset.enabled !== "true";
  post("hotkeys.toggle", { enabled });
});
byId("updateButton").addEventListener("click", () => {
  post("updates.check");
  window.mortalNexusOpenFrameRoute?.("/updates", "Updates", null);
});
byId("popoutMapBtn")?.addEventListener("click", () => post("map.popout", { route: location.pathname }));

byId("secondScreenToggle").addEventListener("change", () => {
  post("window.secondScreen", {
    enabled: byId("secondScreenToggle").checked,
    resolution: byId("secondScreenResolution").value,
  });
});
byId("secondScreenResolution").addEventListener("change", () => {
  post("window.secondScreen", {
    enabled: byId("secondScreenToggle").checked,
    resolution: byId("secondScreenResolution").value,
  });
});

const postWindowOpacity = (persist) => {
  const percent = Number(byId("windowOpacitySlider").value);
  byId("windowOpacityValue").textContent = `${percent}%`;
  post("window.opacity", { percent, persist });
};
byId("windowOpacitySlider").addEventListener("input", () => postWindowOpacity(false));
byId("windowOpacitySlider").addEventListener("change", () => postWindowOpacity(true));

const scaleSlider = byId("applicationScaleSlider");
scaleSlider.addEventListener("input", () => {
  byId("applicationScaleValue").textContent = `${scaleSlider.value}%`;
});
scaleSlider.addEventListener("change", () => {
  post("window.scale", { percent: Number(scaleSlider.value) });
});
byId("automaticScaleToggle")?.addEventListener("change", (event) => {
  post("window.autoScale", { enabled: event.currentTarget.checked });
});

for (const button of document.querySelectorAll("[data-send-command]")) {
  button.addEventListener("click", () => post("macro.send", { command: button.dataset.sendCommand }));
}

byId("editorLoginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = byId("editorUsername").value.trim();
  const password = byId("editorPassword").value;
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  const submitMarkup = submitButton?.innerHTML || "Sign in";
  byId("loginStatus").textContent = "Signing in...";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";
  }
  try {
    if (!window.mortalNexusEditor?.login) throw new Error("Firebase editor access is still loading.");
    await window.mortalNexusEditor.login(username, password);
    byId("editorPassword").value = "";
  } catch (error) {
    byId("loginStatus").textContent = error?.message || "Sign-in failed.";
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = submitMarkup;
      window.lucide?.createIcons();
    }
  }
});
byId("editorLogoutBtn")?.addEventListener("click", () => window.mortalNexusEditor?.logout());
byId("historyList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-undo-history]");
  if (!button) return;
  const entry = state.history.find((candidate) => candidate.historyId === button.dataset.undoHistory);
  if (!entry || !canUndoHistoryEntry(entry)) return;
  if (!state.editor.isEditor) {
    showToolMessage("Sign in with an editor account before restoring history.", 5000);
    return;
  }
  const label = entry.targetLabel || entry.targetId || "this edit";
  if (!window.confirm(`Undo the selected edit to "${label}" and restore its previous state?`)) return;
  button.disabled = true;
  try {
    await window.mortalNexusEditor.undo(entry);
    showToolMessage(`Restored ${label}. The undo was added to the audit history.`, 5200);
  } catch (error) {
    showToolMessage(error?.message || "That edit could not be restored.", 6200);
    button.disabled = false;
  }
});

window.addEventListener("mortal-nexus:editor-state", (event) => renderEditorState(event.detail));
window.addEventListener("mortal-nexus:history", (event) => renderHistory(event.detail));
window.addEventListener("mortal-nexus:open-editor", () => setModule("settings", true));
window.addEventListener("mortal-nexus:editor-api-ready", () => {
  renderEditorState(window.mortalNexusEditor?.state?.() || {});
});

if (nativeHost) {
  nativeHost.addEventListener("message", onNativeMessage);
  post("tools.init");
  post("window.state");
} else {
  byId("craftStatus").textContent = "Native automation is available in the packaged desktop application.";
}

renderSafeGrid();
renderClickMacroSequence({
  steps: Array.from({ length: 10 }, () => ({
    enabled: true,
    key: { virtualKey: 0, modifiers: 0, display: "Not set" },
  })),
});
renderMacrosEnabled(false);
updateClickMacroRestKeyState();
renderEditorState({});
setModule(new URLSearchParams(window.location.search).get("module") || "map");
lucide.createIcons();
