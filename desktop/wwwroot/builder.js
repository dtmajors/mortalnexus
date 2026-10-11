const STORAGE_KEY = "mortal-nexus.character-builder.v2";
const SOURCE = "/api/oracle-builder/assets";
const ATTRS = ["str", "dex", "con", "int", "psy"];
const ATTR_LABELS = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", psy: "Psyche" };
const ARMOR_SLOTS = [["helmet", "Helmet"], ["torso", "Torso"], ["rightArm", "Right arm"], ["leftArm", "Left arm"], ["legs", "Legs"]];
const REQUESTED_VIEW = new URLSearchParams(window.location.search).get("view");

const emptyGear = () => ({
  armor: { helmet: null, torso: null, rightArm: null, leftArm: null, legs: null },
  mainHand: null, offHand: null, offHandShield: null, bow: null, neck: null, ring1: null, ring2: null,
});

const state = {
  catalog: null,
  result: null,
  input: null,
  meta: { name: "My build", notes: "", spells: {} },
  publicBuilds: null,
  buildsLoading: false,
  buildsError: "",
  buildNotice: null,
  ui: {
    view: "stats", skillSearch: "", skillPool: "all", skillView: "all", giftSearch: "",
    masterySearch: "", masteryTree: "mine", petSearch: "", spellSearch: "", spellSchool: "all",
    workbenchMode: "armor", workbenchSlot: "torso",
  },
  computeTimer: null,
  computeSequence: 0,
};

const els = Object.fromEntries([
  "builderStatus", "statsPanel", "skillsPanel", "giftsPanel", "masteryPanel", "petsPanel", "gearPanel",
  "workbenchPanel", "magicPanel", "buildsPanel", "summaryPanel", "sheetHeritage", "sheetAttributes", "sheetMetrics",
  "sheetPools", "sheetGear", "sheetWarnings", "warningList", "sheetSync", "catalogCount", "saveBuild",
  "resetBuild", "exportBuild", "importBuild", "importFile",
].map((id) => [id, document.getElementById(id)]));

initialize();

async function initialize() {
  bindGlobalEvents();
  try {
    const response = await fetch("/api/oracle-builder/catalog", { headers: { accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok || !payload?.catalog) throw new Error(payload?.error || "Character catalog unavailable.");
    state.catalog = payload.catalog;
    state.input = defaultInput();
    loadSavedBuild();
    normalizeInput();
    const c = state.catalog;
    els.catalogCount.textContent = `${c.races.length} bloodlines · ${c.skills.length} skills · ${c.gifts.length} gifts · ${c.mastery.length} mastery nodes`;
    setStatus("ready", "Complete builder catalog loaded");
    renderAll();
    if (state.ui.view !== "stats") setView(state.ui.view);
    scheduleCompute(0);
  } catch (error) {
    setStatus("error", error.message || "The character builder could not load.");
    els.statsPanel.innerHTML = `<div class="builder-empty"><i data-lucide="triangle-alert"></i><strong>Builder data could not load</strong><span>Reconnect and reopen this page to try again.</span></div>`;
    refreshIcons();
  }
}

function defaultInput() {
  const clade = state.catalog.clades[0];
  return {
    cladeId: clade.id, grandparents: defaultGrandparents(clade.id), sex: "Male", age: 30,
    height: 184, weightPct: 100, attrs: { str: 25, dex: 25, con: 25, int: 25, psy: 25 },
    gifts: [], masteries: [], skills: {}, pets: [], gear: emptyGear(),
  };
}

function normalizeInput() {
  const c = state.catalog;
  if (!c.clades.some((item) => item.id === state.input.cladeId)) state.input = defaultInput();
  state.input.grandparents = Array.from({ length: 4 }, (_, index) => {
    const choices = grandparentChoices(state.input.cladeId, index);
    return choices.includes(state.input.grandparents?.[index]) ? state.input.grandparents[index] : choices[0];
  });
  state.input.sex = state.input.sex === "Female" ? "Female" : "Male";
  state.input.age = clamp(state.input.age, c.limits.age[0], c.limits.age[1]);
  state.input.height = clamp(state.input.height, 150, 230);
  state.input.weightPct = clamp(state.input.weightPct, c.limits.weightPct[0], c.limits.weightPct[1]);
  state.input.attrs ||= {};
  ATTRS.forEach((key) => { state.input.attrs[key] = clamp(state.input.attrs[key], c.limits.attrFloor, c.limits.hardCap[key]); });
  state.input.gifts = unique(state.input.gifts).filter((id) => c.gifts.some((gift) => gift.id === id));
  state.input.masteries = unique(state.input.masteries).filter((id) => c.mastery.some((node) => node.id === id));
  state.input.skills = Object.fromEntries(Object.entries(state.input.skills || {}).filter(([id, value]) => c.skills.some((skill) => skill.id === id) && Number(value) > 0).map(([id, value]) => [id, clamp(value, 0, 100)]));
  state.input.pets = (state.input.pets || []).filter((pet) => c.pets.some((item) => item.id === pet.id)).map((pet) => ({ id: pet.id, level: clamp(pet.level, 0, 125) }));
  state.input.gear = { ...emptyGear(), ...(state.input.gear || {}), armor: { ...emptyGear().armor, ...(state.input.gear?.armor || {}) } };
  state.meta.spells ||= {};
}

function bindGlobalEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("keydown", (event) => {
    const actionTarget = event.target.closest?.('[role="button"][data-action]');
    if (actionTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      actionTarget.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return;
    }
    if (event.key === "Enter" && event.target.id === "shareCode") {
      event.preventDefault();
      loadSharedBuild(event.target.value);
    }
  });
  els.saveBuild.addEventListener("click", saveBuild);
  els.resetBuild.addEventListener("click", resetBuild);
  els.exportBuild.addEventListener("click", exportBuild);
  els.importBuild.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importBuild);
  document.addEventListener("error", (event) => { if (event.target instanceof HTMLImageElement) event.target.classList.add("image-missing"); }, true);
}

function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || !state.catalog) return;
  const { action, id, value } = button.dataset;
  if (action === "clade") changeClade(id);
  if (action === "sex") updateInput("sex", value);
  if (action === "gift") toggleDependency("gifts", state.catalog.gifts, id);
  if (action === "mastery") toggleDependency("masteries", state.catalog.mastery, id, 110);
  if (action === "pet") togglePet(id);
  if (action === "remove-gear") removeGear(id);
  if (action === "workbench-mode") { state.ui.workbenchMode = value; renderWorkbench(); }
  if (action === "apply-gear") applyWorkbench();
  if (action === "spell") toggleSpell(id);
  if (action === "remove-spell") { delete state.meta.spells[id]; renderMagic(); renderSummary(); }
  if (action === "publish-build") publishCurrentBuild();
  if (action === "refresh-builds") loadPublicBuilds(true);
  if (action === "load-build") loadSharedBuild(value);
  if (action === "load-code") loadSharedBuild(document.getElementById("shareCode")?.value);
  if (action === "copy-code") copyBuildCode(value);
}

function handleInput(event) {
  const target = event.target;
  if (!state.catalog) return;
  if (target.matches("[data-attr]")) { state.input.attrs[target.dataset.attr] = Number(target.value); scheduleCompute(); renderStats(); }
  if (target.matches("[data-range]")) { state.input[target.dataset.range] = Number(target.value); scheduleCompute(); renderStats(); }
  if (target.matches("[data-skill]")) {
    const value = Number(target.value);
    if (value > 0) state.input.skills[target.dataset.skill] = value; else delete state.input.skills[target.dataset.skill];
    target.closest(".skill-row")?.querySelector("output")?.replaceChildren(String(value));
    scheduleCompute();
  }
  if (target.matches("[data-pet-level]")) {
    const pet = state.input.pets.find((item) => item.id === target.dataset.petLevel);
    if (pet) pet.level = Number(target.value);
    scheduleCompute();
  }
  if (target.matches("[data-spell-qty]")) { state.meta.spells[target.dataset.spellQty] = clamp(target.value, 1, 999); rerenderAndRestore(target); }
  if (target.matches("[data-ui]")) { state.ui[target.dataset.ui] = target.value; rerenderAndRestore(target); }
  if (target.id === "buildName") state.meta.name = target.value.slice(0, 70);
  if (target.id === "buildNotes") state.meta.notes = target.value.slice(0, 2000);
  if (target.id === "shareBuildName") state.meta.name = target.value.slice(0, 70);
  if (target.id === "shareBuildDescription") state.meta.notes = target.value.slice(0, 2000);
}

function handleChange(event) {
  const target = event.target;
  if (!state.catalog) return;
  if (target.matches("[data-grandparent]")) { state.input.grandparents[Number(target.dataset.grandparent)] = target.value; scheduleCompute(); renderStats(); }
  if (target.matches('[data-workbench="armorFamily"], [data-workbench="weaponType"], [data-workbench="shieldStyle"]')) renderWorkbench();
}

function rerenderAndRestore(target) {
  const attribute = target.hasAttribute("data-ui") ? "data-ui" : "data-spell-qty";
  const value = target.getAttribute(attribute);
  const start = target.selectionStart;
  renderCurrentView(false);
  const replacement = document.querySelector(`[${attribute}="${CSS.escape(value)}"]`);
  replacement?.focus();
  if (replacement && start !== null && replacement.setSelectionRange) replacement.setSelectionRange(start, start);
}

function changeClade(id) {
  if (id === state.input.cladeId) return;
  state.input.cladeId = id;
  state.input.grandparents = defaultGrandparents(id);
  state.input.gifts = [];
  scheduleCompute(); renderAll();
}

function updateInput(key, value) { state.input[key] = value; scheduleCompute(); renderCurrentView(); }

function toggleDependency(key, records, id, max = Infinity) {
  const selected = new Set(state.input[key]);
  const byId = new Map(records.map((record) => [record.id, record]));
  if (selected.has(id)) {
    const remove = new Set([id]);
    let changed = true;
    while (changed) { changed = false; records.forEach((record) => { if (record.parent && remove.has(record.parent) && !remove.has(record.id)) { remove.add(record.id); changed = true; } }); }
    remove.forEach((value) => selected.delete(value));
  } else {
    const lineage = [];
    let cursor = byId.get(id);
    while (cursor) { lineage.unshift(cursor.id); cursor = cursor.parent ? byId.get(cursor.parent) : null; }
    lineage.forEach((value) => { if (selected.size < max) selected.add(value); });
  }
  state.input[key] = [...selected];
  scheduleCompute(); renderCurrentView();
}

function togglePet(id) {
  const index = state.input.pets.findIndex((pet) => pet.id === id);
  if (index >= 0) state.input.pets.splice(index, 1); else state.input.pets.push({ id, level: 125 });
  scheduleCompute(); renderPets();
}

function toggleSpell(id) {
  if (state.meta.spells[id]) delete state.meta.spells[id]; else state.meta.spells[id] = 1;
  renderMagic(); renderSummary();
}

function removeGear(slot) {
  if (slot.startsWith("armor.")) state.input.gear.armor[slot.split(".")[1]] = null;
  else state.input.gear[slot] = null;
  scheduleCompute(); renderGear();
}

function setView(view) {
  state.ui.view = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll("[data-view-panel]").forEach((panel) => { const active = panel.dataset.viewPanel === view; panel.hidden = !active; panel.classList.toggle("active", active); });
  renderCurrentView();
  if (view === "builds" && state.publicBuilds === null && !state.buildsLoading) loadPublicBuilds();
}

function renderAll() { renderCurrentView(); renderSheet(); refreshIcons(); }
function renderCurrentView(reset = true) {
  const renderers = { stats: renderStats, skills: renderSkills, gifts: renderGifts, mastery: renderMastery, pets: renderPets, gear: renderGear, workbench: renderWorkbench, magic: renderMagic, builds: renderBuilds, summary: renderSummary };
  renderers[state.ui.view]?.(reset);
  refreshIcons();
}

function renderStats() {
  const c = state.catalog;
  const caps = state.result?.caps || Object.fromEntries(ATTRS.map((key) => [key, c.limits.hardCap[key]]));
  const range = state.result?.heightRange || [150, 230];
  els.statsPanel.innerHTML = `
    <div class="section-head"><div><span>Bloodline</span><h2>Choose a clade</h2></div><p>Changing clade resets bloodline-specific gifts.</p></div>
    <div class="clade-grid">${c.clades.map((clade) => {
      const portraits = c.races.filter((race) => race.clade === clade.id).slice(0, 2);
      return `<button class="clade-card ${clade.id === state.input.cladeId ? "selected" : ""}" data-action="clade" data-id="${clade.id}" type="button"><span class="clade-portraits">${portraits.map((race) => `<img src="${raceImage(race)}" alt="" />`).join("")}</span><strong>${escapeHtml(clade.name)}</strong><small>${c.gifts.filter((gift) => gift.clade === clade.id).length} clade gifts</small></button>`;
    }).join("")}</div>
    <div class="builder-columns">
      <section class="builder-panel"><div class="panel-title"><i data-lucide="dna"></i><div><h2>Heritage</h2><p>All four grandparents contribute to your final caps.</p></div></div>
        <div class="grandparent-grid">${state.input.grandparents.map((id, index) => {
          const choices = grandparentChoices(state.input.cladeId, index);
          const races = choices.map((choice) => c.races.find((item) => item.id === choice)).filter(Boolean);
          const race = c.races.find((item) => item.id === id) || races[0];
          const fixed = choices.length === 1;
          return `<label class="grandparent-card"><img src="${raceImage(race)}" alt="" /><span>${index % 2 ? "Grandmother" : "Grandfather"} ${index < 2 ? "I" : "II"}</span><select data-grandparent="${index}" ${fixed ? "disabled" : ""}>${races.map((item) => option(item.id, item.name, id)).join("")}</select></label>`;
        }).join("")}</div>
        <div class="control-stack"><div class="field-label">Sex</div><div class="segmented">${["Male", "Female"].map((sex) => `<button class="${state.input.sex === sex ? "active" : ""}" data-action="sex" data-value="${sex}" type="button">${sex}</button>`).join("")}</div>${rangeControl("Age", "age", state.input.age, c.limits.age[0], c.limits.age[1], "years")}${rangeControl("Height", "height", state.input.height, range[0], range[1], "cm")}${rangeControl("Weight", "weightPct", state.input.weightPct, c.limits.weightPct[0], c.limits.weightPct[1], `% · ${escapeHtml(state.result?.weightClass || "")}`)}</div>
      </section>
      <section class="builder-panel"><div class="panel-title"><i data-lucide="sliders-horizontal"></i><div><h2>Attributes</h2><p>Effective values include gifts and mastery.</p></div></div>
        <div class="attribute-list">${ATTRS.map((key) => `<label class="attribute-control"><span><strong>${ATTR_LABELS[key]}</strong><small>Cap ${caps[key]}</small></span><input data-attr="${key}" type="range" min="${c.limits.attrFloor}" max="${caps[key]}" value="${state.input.attrs[key]}" /><output>${state.input.attrs[key]}</output></label>`).join("")}</div>
      </section>
    </div>`;
}

function renderSkills(reset = true) {
  const q = normalize(state.ui.skillSearch);
  const rows = state.catalog.skills.filter((skill) => {
    if (state.ui.skillPool !== "all" && skill.type !== state.ui.skillPool) return false;
    if (state.ui.skillView === "spent" && !state.input.skills[skill.id]) return false;
    if (state.ui.skillView === "primary" && !skill.primary) return false;
    return !q || normalize(`${skill.name} ${skill.description} ${skill.type}`).includes(q);
  }).slice(0, 350);
  els.skillsPanel.innerHTML = `${sectionIntro("list-tree", "Skills", "Build action and profession trees", `${Object.keys(state.input.skills).length} skills allocated`)}
    <div class="builder-toolbar"><label class="search-field"><i data-lucide="search"></i><input data-ui="skillSearch" value="${escapeAttr(state.ui.skillSearch)}" placeholder="Search skills" /></label><select data-ui="skillPool">${option("all", "All pools", state.ui.skillPool)}${option("action", "Action", state.ui.skillPool)}${option("profession", "Profession", state.ui.skillPool)}</select><select data-ui="skillView">${option("all", "All skills", state.ui.skillView)}${option("primary", "Primary only", state.ui.skillView)}${option("spent", "Allocated", state.ui.skillView)}</select></div>
    <div class="skill-list">${rows.map((skill) => {
      const value = state.input.skills[skill.id] || 0;
      const effective = effectiveSkill(skill.id, value);
      const parent = state.catalog.skills.find((item) => item.id === skill.parent)?.name;
      return `<article class="skill-row ${value ? "selected" : ""}"><div><strong>${escapeHtml(skill.name)}</strong><small>${capitalize(skill.type)} · ${skill.primary ? "Primary" : "Secondary"}${parent ? ` · Requires ${escapeHtml(parent)}` : ""}</small><p>${escapeHtml(skill.description || "")}</p></div><label><span>Points <output>${value}</output></span><input data-skill="${skill.id}" type="range" min="0" max="100" value="${value}" /></label><div class="effective-value"><span>Effective</span><strong>${formatNumber(effective)}</strong></div></article>`;
    }).join("") || empty("No matching skills")}</div>`;
}

function renderGifts() {
  const q = normalize(state.ui.giftSearch);
  const gifts = state.catalog.gifts.filter((gift) => gift.clade === state.input.cladeId);
  const byId = new Map(gifts.map((gift) => [gift.id, gift]));
  const selected = new Set(state.input.gifts);
  const cladeName = state.catalog.clades.find((item) => item.id === state.input.cladeId)?.name || "Clade";
  const palette = giftPalette(cladeName);
  const extent = 378;
  const radius = 300;
  const point = (gift) => ({ x: 300 * Number(gift.pos?.[0] || 0), y: 300 * Number(gift.pos?.[1] || 0) });
  const lineage = (gift) => {
    const ids = [];
    let cursor = gift;
    while (cursor) { ids.push(cursor.id); cursor = cursor.parent ? byId.get(cursor.parent) : null; }
    return ids;
  };
  const canUnlock = (gift) => (!gift.parent || selected.has(gift.parent)) && state.input.gifts.length + lineage(gift).filter((id) => !selected.has(id)).length <= 20;
  const matches = (gift) => !q || normalize(`${gift.name} ${gift.description}`).includes(q);
  const connections = gifts.flatMap((gift) => gift.children.map((childId) => {
    const child = byId.get(childId);
    if (!child) return "";
    const from = point(gift);
    const to = point(child);
    const active = selected.has(gift.id) && selected.has(child.id);
    return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="gift-link ${active ? "active" : ""}" />`;
  })).join("");
  const pins = gifts.map((gift) => {
    const { x, y } = point(gift);
    const active = selected.has(gift.id);
    const unlockable = canUnlock(gift);
    const match = matches(gift);
    const size = 42;
    const clipId = `gift-clip-${gift.id}`;
    return `<g class="gift-pin ${active ? "selected" : ""} ${unlockable ? "unlockable" : "locked"} ${match ? "search-match" : "search-muted"}" transform="translate(${x} ${y})" data-action="gift" data-id="${gift.id}" role="button" tabindex="0" aria-label="${escapeAttr(`${gift.name}: ${gift.description || "Clade gift"}`)}">
      ${unlockable && !active ? `<circle class="gift-unlock-ring" r="30" />` : ""}
      <circle class="gift-pin-frame ${gift.grantsSkill ? "skill" : ""}" r="25" />
      <clipPath id="${clipId}"><circle r="${size / 2}" /></clipPath>
      <image href="${giftImage(gift)}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" clip-path="url(#${clipId})" />
      <ellipse class="gift-pin-shine" cx="0" cy="-9" rx="14" ry="6" clip-path="url(#${clipId})" />
      <title>${escapeHtml(`${gift.name} - ${gift.description || "Clade gift"}`)}</title>
      ${active || (q && match) ? `<text x="0" y="42" text-anchor="middle">${escapeHtml(gift.name)}</text>` : ""}
    </g>`;
  }).join("");
  const learned = state.input.gifts.map((id) => byId.get(id)).filter(Boolean);
  els.giftsPanel.innerHTML = `${sectionIntro("sparkles", `${cladeName} gift wheel`, "Choose directly from the in-game clade layout; required gifts unlock from the center outward", `${20 - learned.length} points remaining`)}
    <div class="builder-toolbar single"><label class="search-field"><i data-lucide="search"></i><input data-ui="giftSearch" value="${escapeAttr(state.ui.giftSearch)}" placeholder="Find a gift on the wheel" /></label></div>
    <div class="gift-layout">
      <div class="gift-wheel-shell" style="--gift-edge:${palette.edge};--gift-core:${palette.core};--gift-mid:${palette.mid};--gift-rim:${palette.rim};--gift-ring:${palette.ring};--gift-gem-a:${palette.gem[0]};--gift-gem-b:${palette.gem[1]};--gift-gem-c:${palette.gem[2]}">
        <svg class="gift-wheel" viewBox="${-extent} ${-extent} ${extent * 2} ${extent * 2}" role="img" aria-label="${escapeAttr(`${cladeName} clade gift wheel`)}">
          <defs>
            <radialGradient id="gift-wheel-material" cx="50%" cy="42%" r="68%"><stop offset="0%" stop-color="${palette.core}"/><stop offset="58%" stop-color="${palette.mid}"/><stop offset="100%" stop-color="${palette.rim}"/></radialGradient>
            <radialGradient id="gift-wheel-gem" cx="42%" cy="36%" r="66%"><stop offset="0%" stop-color="${palette.gem[0]}"/><stop offset="42%" stop-color="${palette.gem[1]}"/><stop offset="100%" stop-color="${palette.gem[2]}"/></radialGradient>
          </defs>
          <circle class="gift-wheel-outer" r="${extent - 5}" />
          <circle class="gift-wheel-edge" r="${extent - 12}" />
          <circle class="gift-wheel-material" r="${extent - 27}" />
          <circle class="gift-wheel-inner" r="${extent - 38}" />
          ${[.32, .6, .88].map((scale) => `<circle class="gift-orbit" r="${scale * radius}" />`).join("")}
          ${Array.from({ length: 16 }, (_, index) => { const angle = index / 16 * Math.PI * 2; return `<line class="gift-spoke" x1="${Math.cos(angle) * radius * .5}" y1="${Math.sin(angle) * radius * .5}" x2="${Math.cos(angle) * extent * .9}" y2="${Math.sin(angle) * extent * .9}" />`; }).join("")}
          ${connections}
          <circle class="gift-gem" r="${radius * .145}" />
          <ellipse class="gift-gem-shine" cx="${-radius * .045}" cy="${-radius * .05}" rx="${radius * .05}" ry="${radius * .028}" />
          ${pins}
        </svg>
      </div>
      <aside class="gift-learned">
        <header><span>Learned Gifts</span><strong>${learned.length} / 20</strong></header>
        <div class="gift-learned-list">${learned.length ? learned.map((gift) => `<button data-action="gift" data-id="${gift.id}" type="button" title="${escapeAttr(gift.description)}"><img src="${giftImage(gift)}" alt="" /><span><strong>${escapeHtml(gift.name)}</strong><small>${escapeHtml(gift.description || "Clade gift")}</small></span><i data-lucide="x"></i></button>`).join("") : `<div class="gift-empty"><i data-lucide="sparkles"></i><span>Click an available pin on the wheel to learn a gift.</span></div>`}</div>
        <footer><span>Character level</span><strong>20 / 20</strong><div><i></i></div></footer>
      </aside>
    </div>
    <p class="builder-map-note"><i data-lucide="info"></i> Blue ring means available. Red-rimmed gifts grant skill levels. Selecting a later gift automatically includes its required path.</p>`;
}

function renderMastery() {
  const cladeTree = (state.input.cladeId || "").replace(/^c_/, "").replace(/^./, (letter) => letter.toUpperCase());
  const baseTrees = ["str", "dex", "con", "int", "point"];
  const availableTrees = ["mine", ...baseTrees, cladeTree].filter((tree, index, values) => tree && values.indexOf(tree) === index && (tree === "mine" || state.catalog.mastery.some((node) => node.tree === tree)));
  if (!availableTrees.includes(state.ui.masteryTree)) state.ui.masteryTree = "mine";
  const q = normalize(state.ui.masterySearch);
  const inCharacterMap = (node) => baseTrees.includes(node.tree) || node.tree === cladeTree;
  const nodes = state.catalog.mastery.filter((node) => Number(node.x) || Number(node.y)).filter((node) => state.ui.masteryTree === "mine" ? inCharacterMap(node) : node.tree === state.ui.masteryTree);
  const byId = new Map(state.catalog.mastery.map((node) => [node.id, node]));
  const selected = new Set(state.input.masteries);
  const lineages = new Map();
  const lineage = (node) => {
    if (lineages.has(node.id)) return lineages.get(node.id);
    const ids = [];
    let cursor = node;
    while (cursor) { ids.push(cursor.id); cursor = cursor.parent ? byId.get(cursor.parent) : null; }
    lineages.set(node.id, ids);
    return ids;
  };
  const canUnlock = (node) => (!node.parent || selected.has(node.parent)) && state.input.masteries.length + lineage(node).filter((id) => !selected.has(id)).length <= 110;
  const point = (node) => ({ x: 8 * Number(node.x), y: -8 * Number(node.y) });
  const viewBox = masteryViewBox(nodes.map(point));
  const lines = nodes.map((node) => {
    const parent = node.parent ? byId.get(node.parent) : null;
    if (!parent || (!Number(parent.x) && !Number(parent.y))) return "";
    const from = point(parent);
    const to = point(node);
    return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="mastery-link ${selected.has(node.id) && selected.has(parent.id) ? "active" : ""}" />`;
  }).join("");
  const pins = nodes.map((node) => {
    const { x, y } = point(node);
    const active = selected.has(node.id);
    const unlockable = canUnlock(node);
    const match = !q || normalize(`${node.title} ${node.description}`).includes(q);
    return `<g class="mastery-pin ${active ? "selected" : ""} ${unlockable ? "unlockable" : "locked"} ${match ? "search-match" : "search-muted"}" data-action="mastery" data-id="${node.id}" role="button" tabindex="0" aria-label="${escapeAttr(`${node.title}: ${node.description || "Mastery"}`)}">
      <circle class="mastery-pin-back" cx="${x}" cy="${y}" r="8" />
      ${unlockable && !active ? `<circle class="mastery-unlock-ring" cx="${x}" cy="${y}" r="10" />` : ""}
      <circle class="mastery-pin-core ${node.needsElixir ? "elixir" : ""}" cx="${x}" cy="${y}" r="5" />
      <title>${escapeHtml(`${node.title} - ${node.description || node.tree}${node.needsElixir ? " (requires elixir)" : ""}`)}</title>
    </g>`;
  }).join("");
  const selectedNodes = state.input.masteries.map((id) => byId.get(id)).filter(Boolean);
  const selectedGroups = groupMasteries(selectedNodes);
  els.masteryPanel.innerHTML = `${sectionIntro("orbit", "Mastery map", "Use the original in-game map layout and unlock each path from its center", `${state.input.masteries.length} / 110 points`)}
    <div class="mastery-controls"><div class="segmented mastery-tabs">${availableTrees.map((tree) => `<button class="${tree === state.ui.masteryTree ? "active" : ""}" data-ui-button="masteryTree" data-value="${tree}" type="button">${escapeHtml(tree === "mine" ? "Full map" : masteryTreeName(tree))}</button>`).join("")}</div><label class="search-field"><i data-lucide="search"></i><input data-ui="masterySearch" value="${escapeAttr(state.ui.masterySearch)}" placeholder="Find a mastery node" /></label></div>
    <div class="mastery-layout">
      <div class="mastery-map-shell"><svg class="mastery-map" viewBox="${viewBox}" role="img" aria-label="Mortal Online 2 mastery map">
        ${Array.from({ length: 6 }, (_, col) => Array.from({ length: 4 }, (_, row) => `<image href="${SOURCE}/img/mastery/3/${col}/${row}.avif" x="${256 * col}" y="${256 * row}" width="256" height="256" class="mastery-tile" />`).join("")).join("")}
        ${lines}${pins}
      </svg></div>
      <aside class="mastery-selected"><header><span>Selected Masteries</span><strong>${selectedNodes.length}</strong></header><div>${selectedGroups.length ? selectedGroups.map((group) => `<button data-action="mastery" data-id="${group.ids[group.ids.length - 1]}" type="button" title="Remove the latest matching node and its dependants"><span><strong>${escapeHtml(group.node.title)}${group.count > 1 ? ` ×${group.count}` : ""}</strong><small>${escapeHtml(group.count > 1 ? totalMasteryDescription(group.node.description, group.count) : (group.node.description || group.node.tree))}</small></span><i data-lucide="x"></i></button>`).join("") : `<div class="mastery-empty"><i data-lucide="orbit"></i><span>Choose an available pin from the center of a tree.</span></div>`}</div></aside>
    </div>
    <p class="builder-map-note"><i data-lucide="info"></i> Blue ring means the node is available. Red nodes require an elixir. Gold paths are part of your current build.</p>`;
  els.masteryPanel.querySelectorAll("[data-ui-button]").forEach((button) => button.addEventListener("click", () => { state.ui[button.dataset.uiButton] = button.dataset.value; renderMastery(); }));
}

function renderPets(reset = true) {
  const q = normalize(state.ui.petSearch);
  const pets = state.catalog.pets.filter((pet) => !q || normalize(`${pet.name} ${pet.tamingClade} ${pet.mastery}`).includes(q));
  const selected = new Map(state.input.pets.map((pet) => [pet.id, pet]));
  const petResult = state.result?.pets;
  els.petsPanel.innerHTML = `${sectionIntro("paw-print", "Pets", "Compare creature control costs and level-scaled health", petResult ? `${petResult.spent} / ${petResult.budget} pet points` : `${selected.size} selected`)}
    ${selected.size ? `<div class="selected-pets">${[...selected.values()].map((entry) => { const pet = state.catalog.pets.find((item) => item.id === entry.id); const calc = petResult?.items?.find((item) => item.id === entry.id); return `<article><img src="${petImage(pet)}" alt="" /><div><strong>${escapeHtml(pet.name)}</strong><small>${calc ? `${calc.cost} points · ${calc.hp} health` : `${pet.petPoints} base points`}</small></div><label>Level <input data-pet-level="${pet.id}" type="number" min="0" max="125" value="${entry.level}" /></label><button data-action="pet" data-id="${pet.id}" type="button" title="Remove pet"><i data-lucide="x"></i></button></article>`; }).join("")}</div>` : ""}
    <div class="builder-toolbar single"><label class="search-field"><i data-lucide="search"></i><input data-ui="petSearch" value="${escapeAttr(state.ui.petSearch)}" placeholder="Search pets, lore, or mastery" /></label></div>
    <div class="catalog-card-grid">${pets.map((pet) => `<button class="catalog-card ${selected.has(pet.id) ? "selected" : ""}" data-action="pet" data-id="${pet.id}" type="button"><img src="${petImage(pet)}" alt="" /><span><strong>${escapeHtml(pet.name)}</strong><small>${escapeHtml(pet.tamingClade || "Creature")} · ${pet.petPoints} points</small><p>${pet.hp} health · ${pet.carry} carry${pet.dominateOnly ? " · Domination" : ""}</p></span><i data-lucide="${selected.has(pet.id) ? "check" : "plus"}"></i></button>`).join("")}</div>`;
}

function renderGear() {
  const gear = state.input.gear;
  const slots = [
    ...ARMOR_SLOTS.map(([key, label]) => ({ id: `armor.${key}`, label, value: gear.armor[key], image: gear.armor[key] ? armorImage(gear.armor[key], label) : "" })),
    { id: "mainHand", label: "Main hand", value: gear.mainHand, image: gear.mainHand ? `${SOURCE}/img/gear/weapon/${gear.mainHand.type}.png` : "" },
    { id: "offHandShield", label: "Shield", value: gear.offHandShield, image: gear.offHandShield ? `${SOURCE}/img/gear/shield/${slug(gear.offHandShield.style)}.png` : "" },
    { id: "bow", label: "Bow", value: gear.bow, image: gear.bow ? `${SOURCE}/img/gear/bow/${slug(`${gear.bow.size} ${gear.bow.curve}`)}.png` : "" },
  ];
  const calc = state.result?.gear;
  els.gearPanel.innerHTML = `${sectionIntro("shield", "Equipped gear", "Review the current loadout and calculated weight penalties", calc ? `${formatNumber(calc.equippedWeight)} kg equipped` : "No calculation yet")}
    <div class="gear-layout"><div class="gear-slots">${slots.map((slot) => `<article class="gear-slot ${slot.value ? "equipped" : ""}">${slot.image ? `<img src="${slot.image}" alt="" />` : `<span class="gear-placeholder"><i data-lucide="plus"></i></span>`}<div><small>${slot.label}</small><strong>${escapeHtml(gearLabel(slot.id, slot.value))}</strong></div>${slot.value ? `<button data-action="remove-gear" data-id="${slot.id}" type="button" title="Unequip ${slot.label}"><i data-lucide="x"></i></button>` : ""}</article>`).join("")}</div>
      <aside class="gear-ledger"><h2>Loadout effects</h2>${lineList([
        ["Free armor weight", calc?.freeArmorWeight, " kg"], ["Equipped weight", calc?.equippedWeight, " kg"], ["Stamina penalty", calc?.staminaWeightPenalty, "%"], ["Stamina regeneration", calc?.staminaRegenPercent, "%"], ["Mana regeneration", calc?.manaRegenPercent, "%"], ["Status", calc?.overweight ? "Overweight" : "Within limits"],
      ])}<button class="tool-button primary wide" type="button" data-open-view="workbench"><i data-lucide="hammer"></i> Open workbench</button></aside></div>`;
  els.gearPanel.querySelector("[data-open-view]")?.addEventListener("click", () => setView("workbench"));
}

function renderWorkbench() {
  const g = state.catalog.gear;
  const mode = state.ui.workbenchMode;
  const tabs = [["armor", "Armor"], ["weapon", "Weapon"], ["shield", "Shield"], ["bow", "Bow"]];
  let form = "";
  if (mode === "armor") {
    const family = document.querySelector('[data-workbench="armorFamily"]')?.value || g.armorFamilies[0].id;
    const record = g.armorFamilies.find((item) => item.id === family) || g.armorFamilies[0];
    form = `${selectField("Slot", "armorSlot", ARMOR_SLOTS.map(([value, label]) => ({ value, label })), state.ui.workbenchSlot)}${selectField("Armor family", "armorFamily", g.armorFamilies.map((item) => ({ value: item.id, label: item.name })), family)}${selectField("Core material", "armorCore", record.cores, record.refCore || record.cores[0])}${selectField("Padding", "armorPad", record.paddings, record.refPadding || record.paddings[0])}${numberField("Core density", "armorBaseDensity", 100, 0, 100)}${numberField("Padding density", "armorSupportDensity", 100, 0, 100)}`;
  } else if (mode === "weapon") {
    const type = document.querySelector('[data-workbench="weaponType"]')?.value || g.weapons[0].id;
    const record = g.weapons.find((item) => item.id === type) || g.weapons[0]; const mats = g.weaponMats;
    form = `${selectField("Weapon type", "weaponType", g.weapons.map((item) => ({ value: item.id, label: item.name })), type)}${selectField("Head", "weaponHead", record.heads, record.refHead)}${selectField("Handle", "weaponHandle", record.handles, record.refHandle)}${selectField("Core material", "weaponCore", mats.core, record.refCore)}${selectField("Grip material", "weaponGrip", mats.grip, record.refGrip)}${selectField("Head material", "weaponHeadMat", mats.head, record.refHeadMat)}`;
  } else if (mode === "shield") {
    const shield = g.shields; const styles = shield.styles; const style = Number(document.querySelector('[data-workbench="shieldStyle"]')?.value || styles[0].id); const record = styles.find((item) => item.id === style) || styles[0];
    form = `${selectField("Shield style", "shieldStyle", styles.map((item) => ({ value: item.id, label: item.name })), style)}${selectField("Frame", "shieldFrame", record.frames, record.frames[0])}${selectField("Core material", "shieldCore", shield.coreMats, shield.refCore)}${selectField("Coating", "shieldCoat", shield.coatMats, shield.refCoat)}${selectField("Frame material", "shieldFrameMat", shield.frameMats, shield.refFrameMat)}`;
  } else {
    const bows = g.bows;
    form = `${selectField("Size", "bowSize", bows.sizes, bows.sizes[0])}${selectField("Curve", "bowCurve", bows.curves, bows.curves[0])}${selectField("Belly material", "bowBelly", bows.mats, bows.mats[0])}${selectField("Back material", "bowBack", bows.mats, bows.mats[1])}${numberField("Composite percent", "bowComposite", 50, 5, 95)}<label class="check-field"><input data-workbench="bowSelf" type="checkbox" /><span>Self bow</span></label>`;
  }
  els.workbenchPanel.innerHTML = `${sectionIntro("hammer", "Gear workbench", "Assemble equipment from the complete armor, weapon, shield, and bow catalog", "Applies directly to this build")}
    <div class="segmented workbench-tabs">${tabs.map(([value, label]) => `<button class="${mode === value ? "active" : ""}" data-action="workbench-mode" data-value="${value}" type="button">${label}</button>`).join("")}</div>
    <div class="workbench-layout"><section class="builder-panel"><div class="workbench-form">${form}</div><button class="tool-button primary wide" data-action="apply-gear" type="button"><i data-lucide="check"></i> Equip ${capitalize(mode)}</button></section><aside class="workbench-preview"><i data-lucide="anvil"></i><h2>Build-ready equipment</h2><p>Every choice is sent through the same character model as your attributes, gifts, skills, and mastery.</p><span>${g.armorFamilies.length} armor families · ${g.weapons.length} weapon groups · ${g.trinketMods.length} trinket modifiers</span></aside></div>`;
}

function applyWorkbench() {
  const value = (name) => document.querySelector(`[data-workbench="${name}"]`)?.value;
  const mode = state.ui.workbenchMode;
  if (mode === "armor") {
    const slot = value("armorSlot"); state.ui.workbenchSlot = slot;
    state.input.gear.armor[slot] = { family: value("armorFamily"), coreMat: value("armorCore"), padMat: value("armorPad"), baseDensity: Number(value("armorBaseDensity")), supportDensity: Number(value("armorSupportDensity")) };
  } else if (mode === "weapon") state.input.gear.mainHand = { type: value("weaponType"), head: value("weaponHead"), handle: value("weaponHandle"), coreMat: value("weaponCore"), gripMat: value("weaponGrip"), headMat: value("weaponHeadMat") };
  else if (mode === "shield") state.input.gear.offHandShield = { style: value("shieldStyle"), frame: value("shieldFrame"), coreMat: value("shieldCore"), coatMat: value("shieldCoat"), frameMat: value("shieldFrameMat") };
  else state.input.gear.bow = { size: value("bowSize"), curve: value("bowCurve"), bellyMat: value("bowBelly"), backMat: value("bowBack"), compositePercent: Number(value("bowComposite")), isSelfBow: document.querySelector('[data-workbench="bowSelf"]')?.checked || false };
  scheduleCompute(); setView("gear");
}

function renderMagic(reset = true) {
  const schools = unique(state.catalog.spells.map((spell) => spell.school)).sort();
  const q = normalize(state.ui.spellSearch);
  const spells = state.catalog.spells.filter((spell) => (state.ui.spellSchool === "all" || spell.school === state.ui.spellSchool) && (!q || normalize(`${spell.name} ${spell.school} ${spell.description} ${Object.keys(spell.reagents || {}).join(" ")}`).includes(q)));
  const selected = new Set(Object.keys(state.meta.spells));
  const reagents = {};
  selected.forEach((id) => { const spell = state.catalog.spells.find((item) => item.id === id); const qty = state.meta.spells[id] || 1; Object.entries(spell?.reagents || {}).forEach(([name, amount]) => { reagents[name] = (reagents[name] || 0) + Number(amount) * qty; }); });
  els.magicPanel.innerHTML = `${sectionIntro("wand-sparkles", "Magic planner", "Select spells and total every required reagent", `${selected.size} spells · ${Object.keys(reagents).length} materials`)}
    <div class="magic-layout"><section><div class="builder-toolbar"><label class="search-field"><i data-lucide="search"></i><input data-ui="spellSearch" value="${escapeAttr(state.ui.spellSearch)}" placeholder="Search spells or reagents" /></label><select data-ui="spellSchool">${option("all", "All schools", state.ui.spellSchool)}${schools.map((school) => option(school, school, state.ui.spellSchool)).join("")}</select></div><div class="spell-grid">${spells.map((spell) => `<button class="spell-card ${selected.has(spell.id) ? "selected" : ""}" data-action="spell" data-id="${spell.id}" type="button"><img src="${spellImage(spell)}" alt="" /><span><strong>${escapeHtml(spell.name)}</strong><small>${escapeHtml(spell.school)} · ${spell.mana} mana · ${spell.castTime}s</small><p>${escapeHtml(spell.description)}</p></span><i data-lucide="${selected.has(spell.id) ? "check" : "plus"}"></i></button>`).join("")}</div></section>
      <aside class="reagent-ledger"><h2>Spell loadout</h2>${selected.size ? [...selected].map((id) => { const spell = state.catalog.spells.find((item) => item.id === id); return `<div class="selected-spell"><img src="${spellImage(spell)}" alt="" /><span>${escapeHtml(spell.name)}</span><input data-spell-qty="${id}" type="number" min="1" max="999" value="${state.meta.spells[id]}" /><button data-action="remove-spell" data-id="${id}" type="button"><i data-lucide="x"></i></button></div>`; }).join("") : empty("No spells selected")}
      <h2>Material total</h2>${Object.keys(reagents).length ? lineList(Object.entries(reagents).sort((a, b) => a[0].localeCompare(b[0]))) : empty("Add spells to calculate reagents")}</aside></div>`;
}

function renderBuilds() {
  const builds = state.publicBuilds || [];
  const notice = state.buildNotice ? `<div class="build-notice ${state.buildNotice.kind}"><i data-lucide="${state.buildNotice.kind === "error" ? "triangle-alert" : "badge-check"}"></i><span>${escapeHtml(state.buildNotice.message)}</span>${state.buildNotice.code ? `<button data-action="copy-code" data-value="${escapeAttr(state.buildNotice.code)}" type="button"><i data-lucide="copy"></i> ${escapeHtml(state.buildNotice.code)}</button>` : ""}</div>` : "";
  const list = state.buildsLoading
    ? `<div class="builder-empty"><i data-lucide="loader-circle"></i><strong>Loading shared builds</strong></div>`
    : state.buildsError
      ? `<div class="builder-empty"><i data-lucide="wifi-off"></i><strong>Build library unavailable</strong><span>${escapeHtml(state.buildsError)}</span><button class="tool-button" data-action="refresh-builds" type="button"><i data-lucide="refresh-cw"></i> Try again</button></div>`
      : builds.length
        ? `<div class="public-build-list">${builds.map(publicBuildCard).join("")}</div>`
        : empty("No public character builds have been shared yet.");

  els.buildsPanel.innerHTML = `${sectionIntro("users-round", "Shared builds", "Publish your current character or load one by its share code", `${builds.length} public builds`)}
    ${notice}
    <div class="builds-layout">
      <section class="build-publisher">
        <div class="panel-title"><i data-lucide="send"></i><div><h2>Publish current build</h2><p>Share every stat, skill, gift, mastery choice, pet, item, and spell in your current workspace.</p></div></div>
        <div class="build-publish-form">
          <label class="tool-field"><span>Build name</span><input id="shareBuildName" type="text" maxlength="70" value="${escapeAttr(state.meta.name)}" placeholder="Name this build" /></label>
          <label class="tool-field"><span>Description</span><textarea id="shareBuildDescription" maxlength="500" placeholder="Role, playstyle, and anything players should know">${escapeHtml(state.meta.notes.slice(0, 500))}</textarea></label>
          <button class="tool-button primary build-publish-button" data-action="publish-build" type="button" ${state.buildsLoading ? "disabled" : ""}><i data-lucide="radio"></i> Publish current build</button>
        </div>
        <div class="code-loader"><span>Have a build code?</span><div><input id="shareCode" type="text" maxlength="8" autocomplete="off" placeholder="AB12CD34" /><button class="tool-button" data-action="load-code" type="button"><i data-lucide="download"></i> Load</button></div></div>
      </section>
      <section class="build-browser">
        <header><div><span>Community library</span><strong>Newest public builds</strong></div><button class="icon-button" data-action="refresh-builds" type="button" title="Refresh builds"><i data-lucide="refresh-cw"></i></button></header>
        ${list}
      </section>
    </div>`;
}

function publicBuildCard(build) {
  const author = build.author_name || "Mortal Nexus player";
  const avatar = discordAvatar(build);
  return `<article class="public-build-card">
    <div class="build-author"><span class="build-avatar">${avatar ? `<img src="${escapeAttr(avatar)}" alt="" />` : escapeHtml(author.slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(author)}</strong><small>${formatBuildDate(build.updated_at)}</small></span></div>
    <h3>${escapeHtml(build.name || "Untitled build")}</h3>
    <p>${escapeHtml(build.description || "No build notes provided.")}</p>
    <footer><span><i data-lucide="eye"></i> ${Number(build.views || 0).toLocaleString()}</span><button data-action="copy-code" data-value="${escapeAttr(build.share_code)}" type="button" title="Copy build code"><i data-lucide="copy"></i>${escapeHtml(build.share_code)}</button><button class="tool-button" data-action="load-build" data-value="${escapeAttr(build.share_code)}" type="button"><i data-lucide="download"></i> Load</button></footer>
  </article>`;
}

async function loadPublicBuilds(force = false) {
  if (state.buildsLoading || (!force && state.publicBuilds !== null)) return;
  state.buildsLoading = true;
  state.buildsError = "";
  if (state.ui.view === "builds") renderBuilds();
  try {
    const response = await fetch("/api/oracle-builder/builds", { headers: { accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.message || "Shared builds could not be loaded.");
    state.publicBuilds = payload.builds || [];
  } catch (error) {
    state.publicBuilds = [];
    state.buildsError = error.message || "Shared builds could not be loaded.";
  } finally {
    state.buildsLoading = false;
    if (state.ui.view === "builds") { renderBuilds(); refreshIcons(); }
  }
}

async function publishCurrentBuild() {
  const name = String(document.getElementById("shareBuildName")?.value || state.meta.name || "My build").trim();
  const description = String(document.getElementById("shareBuildDescription")?.value || state.meta.notes || "").trim();
  if (!name) { state.buildNotice = { kind: "error", message: "Give the build a name before publishing it." }; renderBuilds(); refreshIcons(); return; }
  state.meta.name = name.slice(0, 70);
  state.meta.notes = description.slice(0, 2000);
  state.buildsLoading = true;
  state.buildNotice = null;
  renderBuilds(); refreshIcons();
  try {
    const response = await fetch("/api/oracle-builder/builds", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ name: state.meta.name, description: description.slice(0, 500), build: buildDocument() }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.message || "The build could not be published.");
    state.buildNotice = { kind: "success", message: "Build published. Share this code with any Mortal Nexus player:", code: payload.build.share_code };
    state.publicBuilds = null;
  } catch (error) {
    state.buildNotice = { kind: "error", message: error.message || "The build could not be published." };
  } finally {
    state.buildsLoading = false;
    renderBuilds(); refreshIcons();
    if (state.publicBuilds === null) loadPublicBuilds(true);
  }
}

async function loadSharedBuild(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) { state.buildNotice = { kind: "error", message: "Enter the complete 8-character build code." }; renderBuilds(); refreshIcons(); return; }
  setStatus("ready", `Loading build ${code}...`);
  try {
    const response = await fetch(`/api/oracle-builder/builds/${encodeURIComponent(code)}`, { headers: { accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.message || "That shared build could not be loaded.");
    applyBuildDocument(payload.build.build_json);
    setStatus("ready", `${payload.build.name || "Shared build"} loaded`);
    setView("summary");
  } catch (error) {
    state.buildNotice = { kind: "error", message: error.message || "That shared build could not be loaded." };
    setStatus("error", state.buildNotice.message);
    renderBuilds(); refreshIcons();
  }
}

function applyBuildDocument(data) {
  if (data?.version !== 2 || !data.input) throw new Error("That share code does not contain a valid character build.");
  state.input = data.input;
  state.meta = { name: "Shared build", notes: "", spells: {}, ...(data.meta || {}) };
  normalizeInput();
  state.result = null;
  renderAll();
  scheduleCompute(0);
}

function buildDocument() { return { version: 2, input: state.input, meta: state.meta }; }
async function copyBuildCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    state.buildNotice = { kind: "success", message: `Build code ${code} copied.` };
  } catch {
    state.buildNotice = { kind: "error", message: `Could not copy automatically. The build code is ${code}.` };
  }
  renderBuilds(); refreshIcons();
}
function discordAvatar(build) {
  const id = String(build.author_discord_id || "").replace(/\D/g, "");
  const hash = String(build.author_avatar || "").replace(/[^a-zA-Z0-9_]/g, "");
  return id && hash ? `https://cdn.discordapp.com/avatars/${id}/${hash}.png?size=64` : "";
}
function formatBuildDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently shared" : `Updated ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function renderSummary() {
  const clade = state.catalog.clades.find((item) => item.id === state.input.cladeId)?.name;
  const heritage = state.input.grandparents.map((id) => state.catalog.races.find((race) => race.id === id)?.name).join(" · ");
  const topSkills = Object.entries(state.input.skills).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, value]) => [state.catalog.skills.find((skill) => skill.id === id)?.name || id, value]);
  const gear = state.input.gear;
  els.summaryPanel.innerHTML = `${sectionIntro("clipboard-list", "Build summary", "Name, review, save, or export the complete character", state.result?.warnings?.length ? `${state.result.warnings.length} notes` : "Ready to save")}
    <div class="summary-editor"><label class="tool-field"><span>Build name</span><input id="buildName" value="${escapeAttr(state.meta.name)}" maxlength="70" /></label><label class="tool-field"><span>Notes</span><textarea id="buildNotes" maxlength="2000" placeholder="Role, equipment goals, or leveling notes">${escapeHtml(state.meta.notes)}</textarea></label></div>
    <div class="summary-grid"><section class="builder-panel"><h2>Character</h2>${lineList([["Clade", clade], ["Heritage", heritage], ["Sex and age", `${state.input.sex}, ${state.input.age}`], ["Height", `${state.input.height} cm`], ["Weight", `${state.result?.weightKg ?? "—"} kg · ${state.result?.weightClass || "—"}`]])}</section>
      <section class="builder-panel"><h2>Selections</h2>${lineList([["Skills", Object.keys(state.input.skills).length], ["Clade gifts", state.input.gifts.length], ["Mastery", `${state.input.masteries.length} / 110`], ["Pets", state.input.pets.length], ["Spells", Object.keys(state.meta.spells).length], ["Armor pieces", Object.values(gear.armor).filter(Boolean).length]])}</section>
      <section class="builder-panel"><h2>Top skills</h2>${topSkills.length ? lineList(topSkills) : empty("No skill points allocated")}</section>
      <section class="builder-panel"><h2>Calculated notes</h2>${state.result?.warnings?.length ? state.result.warnings.map((warning) => `<p class="summary-warning"><i data-lucide="triangle-alert"></i>${escapeHtml(warning)}</p>`).join("") : `<p class="summary-ready"><i data-lucide="badge-check"></i>No calculation warnings.</p>`}</section></div>`;
}

function renderSheet() {
  if (!state.catalog || !state.input) return;
  const races = state.input.grandparents.map((id) => state.catalog.races.find((race) => race.id === id)?.name).filter(Boolean);
  els.sheetHeritage.textContent = [...new Set(races)].join(" / ") || "Character";
  const effective = state.result?.effectiveAttrs || state.input.attrs;
  const caps = state.result?.caps || {};
  els.sheetAttributes.innerHTML = ATTRS.map((key) => `<div><span>${key.toUpperCase()}</span><strong>${effective[key]}</strong><small>${caps[key] ? `cap ${caps[key]}` : ""}</small></div>`).join("");
  const metrics = state.result?.derived || [];
  els.sheetMetrics.innerHTML = metrics.slice(0, 9).map((metric) => `<div><span>${escapeHtml(metric.label)}</span><strong>${formatMetric(metric)}</strong></div>`).join("") || `<div class="sheet-loading">Calculating...</div>`;
  const pools = state.result?.pools;
  els.sheetPools.innerHTML = lineList([
    ["Attributes", state.result ? `${state.result.attrsUsed + state.result.heightCost} / ${state.result.pool}` : "—"],
    ["Action", poolText(pools?.action)], ["Profession", poolText(pools?.profession)],
    ["Mastery", `${state.input.masteries.length} / 110`], ["Pet points", state.result?.pets ? `${state.result.pets.spent} / ${state.result.pets.budget}` : "—"],
  ]);
  const gear = state.result?.gear;
  els.sheetGear.innerHTML = lineList([["Equipped", gear ? `${formatNumber(gear.equippedWeight)} kg` : "—"], ["Free armor", gear ? `${formatNumber(gear.freeArmorWeight)} kg` : "—"], ["Stamina regen", gear ? `${formatNumber(gear.staminaRegenPercent)}%` : "—"], ["Mana regen", gear ? `${formatNumber(gear.manaRegenPercent)}%` : "—"]]);
  const warnings = state.result?.warnings || [];
  els.sheetWarnings.hidden = !warnings.length;
  els.warningList.innerHTML = warnings.map((warning) => `<p><i data-lucide="triangle-alert"></i>${escapeHtml(warning)}</p>`).join("");
  refreshIcons();
}

function scheduleCompute(delay = 140) {
  clearTimeout(state.computeTimer);
  state.computeTimer = setTimeout(compute, delay);
  els.sheetSync.classList.add("working");
}

async function compute() {
  const sequence = ++state.computeSequence;
  try {
    const response = await fetch("/api/oracle-builder/compute", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(state.input) });
    const payload = await response.json();
    if (!response.ok || !payload?.ok || !payload.result) throw new Error(payload?.error || "The build could not be calculated.");
    if (sequence !== state.computeSequence) return;
    state.result = payload.result;
    setStatus("ready", "Live calculations synchronized");
    renderSheet(); renderCurrentView(false);
  } catch (error) {
    if (sequence !== state.computeSequence) return;
    setStatus("error", error.message || "Live calculations are unavailable.");
    renderSheet();
  } finally { if (sequence === state.computeSequence) els.sheetSync.classList.remove("working"); }
}

function saveBuild() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, input: state.input, meta: state.meta }));
  const original = els.saveBuild.innerHTML; els.saveBuild.innerHTML = '<i data-lucide="check"></i> Saved'; refreshIcons();
  setTimeout(() => { els.saveBuild.innerHTML = original; refreshIcons(); }, 1300);
}
function loadSavedBuild() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved?.version === 2 && saved.input) { state.input = saved.input; state.meta = { ...state.meta, ...(saved.meta || {}) }; } } catch {} }
function resetBuild() { if (!confirm("Reset every character choice in this build?")) return; localStorage.removeItem(STORAGE_KEY); state.input = defaultInput(); state.meta = { name: "My build", notes: "", spells: {} }; state.result = null; renderAll(); scheduleCompute(0); }
function exportBuild() { const blob = new Blob([JSON.stringify(buildDocument(), null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${slug(state.meta.name) || "mortal-nexus-build"}.json`; anchor.click(); URL.revokeObjectURL(url); }
async function importBuild() { const file = els.importFile.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (data?.version !== 2 || !data.input) throw new Error(); state.input = data.input; state.meta = { ...state.meta, ...(data.meta || {}) }; normalizeInput(); state.result = null; renderAll(); scheduleCompute(0); setView("summary"); } catch { alert("That is not a valid Mortal Nexus character build."); } finally { els.importFile.value = ""; } }

function sectionIntro(icon, title, copy, stat) { return `<div class="section-head"><div><span><i data-lucide="${icon}"></i> Character planning</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div><strong>${escapeHtml(stat)}</strong></div>`; }
function defaultGrandparents(cladeId) { return Array.from({ length: 4 }, (_, index) => grandparentChoices(cladeId, index)[0]); }
function grandparentChoices(cladeId, index) {
  const rule = state.catalog.grandparents?.[cladeId];
  if (Array.isArray(rule)) return rule;
  if (rule && index < Number(rule.fixedCount || 0)) return [rule.fixedSide];
  if (rule?.chooseFrom?.length) return rule.chooseFrom;
  return state.catalog.races.filter((race) => race.clade === cladeId).map((race) => race.id);
}
function rangeControl(label, key, value, min, max, suffix) { return `<label class="range-control"><span><strong>${label}</strong><output>${value} ${suffix}</output></span><input data-range="${key}" type="range" min="${min}" max="${max}" value="${value}" /></label>`; }
function selectField(label, name, choices, selected) { const records = choices.map((item) => typeof item === "object" ? item : ({ value: item, label: item })); return `<label class="tool-field"><span>${label}</span><select data-workbench="${name}">${records.map((item) => option(item.value, item.label, selected)).join("")}</select></label>`; }
function numberField(label, name, value, min, max) { return `<label class="tool-field"><span>${label}</span><input data-workbench="${name}" type="number" value="${value}" min="${min}" max="${max}" /></label>`; }
function option(value, label, selected) { return `<option value="${escapeAttr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`; }
function lineList(lines) { return `<div class="sheet-lines">${lines.filter((line) => line[1] !== undefined && line[1] !== null).map(([label, value, suffix = ""]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(`${value}${typeof value === "number" ? suffix : ""}`)}</strong></div>`).join("")}</div>`; }
function empty(message) { return `<div class="builder-empty compact"><i data-lucide="inbox"></i><span>${escapeHtml(message)}</span></div>`; }
function raceImage(race) { return `${SOURCE}/img/races/${slug(race.name).replaceAll("_", "")}.png`; }
function giftImage(gift) { return `${SOURCE}/img/gifts/${gift.clade.replace(/^c_/, "")}/${gift.icon || gift.id.replace(`g_${gift.clade.replace(/^c_/, "")}_`, "")}.png`; }
function giftPalette(cladeName) {
  const palettes = {
    Human: { core: "#bcc2cc", mid: "#7c8490", rim: "#363b45", edge: "#c4ccd8", ring: "rgba(210,224,244,.18)", gem: ["#e6c0f6", "#9a52c8", "#37154f"] },
    Alvarin: { core: "#4a3720", mid: "#312417", rim: "#140f0a", edge: "#5a4227", ring: "rgba(200,160,90,.11)", gem: ["#f0dca8", "#c89850", "#553618"] },
    Oghmir: { core: "#875a32", mid: "#4c3420", rim: "#221610", edge: "#9c6c3c", ring: "rgba(222,150,80,.14)", gem: ["#f4c898", "#cc7c44", "#552c14"] },
    Thursar: { core: "#4c4850", mid: "#28262c", rim: "#100e12", edge: "#5e5862", ring: "rgba(170,175,190,.12)", gem: ["#e6c0f6", "#9a52c8", "#37154f"] },
  };
  return palettes[cladeName] || palettes.Human;
}
function masteryViewBox(points) {
  if (!points.length) return "0 0 1536 1024";
  let x = Math.min(...points.map((point) => point.x)) - 42;
  let y = Math.min(...points.map((point) => point.y)) - 42;
  let width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)) + 84;
  let height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y)) + 84;
  if (width / height < 1.5) { const nextWidth = 1.5 * height; x -= (nextWidth - width) / 2; width = nextWidth; }
  else { const nextHeight = width / 1.5; y -= (nextHeight - height) / 2; height = nextHeight; }
  return `${x} ${y} ${width} ${height}`;
}
function groupMasteries(nodes) {
  const groups = new Map();
  nodes.forEach((node) => {
    const key = `${node.title}::${node.description || ""}`;
    const group = groups.get(key);
    if (group) { group.count += 1; group.ids.push(node.id); }
    else groups.set(key, { node, count: 1, ids: [node.id] });
  });
  return [...groups.values()];
}
function totalMasteryDescription(description, count) {
  const match = String(description || "").match(/^([+\-])([\d.]+)(%?)\s*(.*)$/);
  if (!match) return `${description || "Mastery"} ×${count}`;
  const total = Number(match[2]) * count;
  return `${match[1]}${Number.isInteger(total) ? total : total.toFixed(2)}${match[3]} ${match[4]} (×${count})`;
}
function petImage(pet) { return `${SOURCE}/img/pets/${pet.id}.png`; }
function spellImage(spell) { return `${SOURCE}/img/spells/${spell.id}.png`; }
function armorImage(piece, label) { return `${SOURCE}/img/gear/armor/${piece.family}/${slug(label)}.png`; }
function gearLabel(slot, value) { if (!value) return "Empty"; if (slot.startsWith("armor.")) return `${titleCase(value.family)} · ${value.coreMat || "No core"}`; if (slot === "mainHand") return state.catalog.gear.weapons.find((item) => item.id === value.type)?.name || titleCase(value.type); if (slot === "offHandShield") return value.style; if (slot === "bow") return `${value.size} ${value.curve}`; return "Equipped"; }
function effectiveSkill(id, fallback) { const value = state.result?.skillEffective; if (Array.isArray(value)) return value.find((item) => item.id === id)?.value ?? fallback; return value?.[id]?.value ?? value?.[id] ?? fallback; }
function poolText(pool) { if (!pool) return "—"; if (typeof pool === "number") return String(pool); return `${pool.spent ?? pool.used ?? 0} / ${pool.max ?? pool.pool ?? pool.total ?? "—"}`; }
function formatMetric(metric) { if (metric.value2 !== undefined) return `${formatNumber(metric.value)} / ${formatNumber(metric.value2)}${metric.unit || ""}`; return `${formatNumber(metric.value)}${metric.unit || ""}`; }
function setStatus(kind, text) { els.builderStatus.className = `builder-status ${kind}`; els.builderStatus.lastElementChild.textContent = text; }
function masteryTreeName(value) { return ({ str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", psy: "Psyche" })[value] || titleCase(value); }
function refreshIcons() { window.lucide?.createIcons?.(); }
function unique(values) { return [...new Set(values || [])]; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Math.round(Number(value) || min))); }
function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function slug(value) { return normalize(value).replaceAll(" ", "_"); }
function titleCase(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function capitalize(value) { return String(value || "").replace(/^./, (letter) => letter.toUpperCase()); }
function formatNumber(value) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttr(value) { return escapeHtml(value); }
