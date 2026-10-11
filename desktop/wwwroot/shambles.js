const state = { creatures: [], mode: "creature", selectedSlug: "", selectedMaterial: "", level: 100, lore: 100, budget: null };
const $ = (id) => document.getElementById(id);
const els = Object.fromEntries([
  "shamblesStatus", "creatureSearch", "classFilter", "tameableOnly", "sortCreatures", "visibleCreatureCount", "clearCreatureFilters", "creatureList",
  "specimenEmpty", "specimenContent", "specimenPortrait", "specimenTaxon", "specimenName", "specimenBadges", "specimenMetrics", "yieldTable", "tamingDetails",
  "petLevel", "petLevelValue", "petLore", "petBudget", "scaledHealth", "scaledPoints", "budgetStatus", "petMeterFill", "levelMarks", "materialSelect",
  "targetAmount", "yieldMastery", "faunistBonus", "yieldBonus", "materialHeading", "sourceCount", "materialResults", "dataCount",
].map((id) => [id, $(id)]));

init();

async function init() {
  attachEvents();
  loadPreferences();
  try {
    const response = await fetch("/api/reference/creatures", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Creature data unavailable");
    state.creatures = (await response.json()).creatures || [];
    state.creatures.sort((a, b) => a.name.localeCompare(b.name));
    populateFilters(); populateMaterials();
    const requested = new URLSearchParams(location.search).get("creature");
    const defaultCreature = state.creatures.find((item) => item.name === "Black Bear" && item.tameable && !item.incomplete && item.yields?.length)
      || state.creatures.find((item) => item.tameable && !item.incomplete && item.yields?.length)
      || state.creatures.find((item) => item.tameable)
      || state.creatures[0];
    state.selectedSlug = state.creatures.some((item) => item.slug === requested) ? requested : (defaultCreature?.slug || "");
    els.shamblesStatus.className = "status-line ready";
    els.shamblesStatus.querySelector("strong").textContent = "Creature codex ready";
    els.dataCount.textContent = `${state.creatures.length} creatures · ${state.creatures.filter((item) => item.tameable).length} tameable`;
    renderAll();
  } catch {
    els.shamblesStatus.className = "status-line error";
    els.shamblesStatus.querySelector("strong").textContent = "Creature data unavailable";
    els.creatureList.innerHTML = `<div class="empty-panel">The live creature reference could not be loaded.</div>`;
  }
}

function attachEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  [els.creatureSearch, els.classFilter, els.tameableOnly, els.sortCreatures].forEach((control) => control.addEventListener("input", renderCreatureList));
  els.clearCreatureFilters.addEventListener("click", () => { els.creatureSearch.value = ""; els.classFilter.value = ""; els.tameableOnly.checked = false; els.sortCreatures.value = "family"; renderCreatureList(); });
  els.petLevel.addEventListener("input", () => { state.level = Number(els.petLevel.value); renderPetScale(); });
  els.petLore.addEventListener("change", () => { state.lore = Number(els.petLore.value); renderPetScale(); });
  els.petBudget.addEventListener("input", () => { state.budget = els.petBudget.value === "" ? null : Number(els.petBudget.value); renderPetScale(); });
  [els.materialSelect, els.targetAmount, els.yieldMastery, els.faunistBonus].forEach((control) => control.addEventListener("input", () => { state.selectedMaterial = els.materialSelect.value; savePreferences(); renderMaterialPlanner(); }));
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  document.querySelectorAll("[data-mode-panel]").forEach((panel) => { panel.hidden = panel.dataset.modePanel !== mode; });
  if (mode === "material") renderMaterialPlanner();
}

function populateFilters() {
  const classes = [...new Set(state.creatures.map((item) => item.taxonClass).filter(Boolean))].sort();
  els.classFilter.innerHTML = `<option value="">All classes</option>${classes.map((name) => `<option>${escapeHtml(name)}</option>`).join("")}`;
}

function populateMaterials() {
  const materials = [...new Set(state.creatures.flatMap((creature) => creature.yields || []).map((item) => item.material).filter(Boolean))].sort();
  els.materialSelect.innerHTML = materials.map((name) => `<option>${escapeHtml(name)}</option>`).join("");
  if (!materials.includes(state.selectedMaterial)) state.selectedMaterial = materials[0] || "";
  els.materialSelect.value = state.selectedMaterial;
}

function renderAll() { renderCreatureList(); renderSpecimen(); renderMaterialPlanner(); }

function filteredCreatures() {
  const query = normalize(els.creatureSearch.value); const selectedClass = els.classFilter.value;
  const records = state.creatures.filter((creature) => {
    if (selectedClass && creature.taxonClass !== selectedClass) return false;
    if (els.tameableOnly.checked && !creature.tameable) return false;
    return !query || normalize(`${creature.name} ${creature.taxonClass} ${creature.taxonOrder} ${(creature.yields || []).map((item) => item.material).join(" ")}`).includes(query);
  });
  const sort = els.sortCreatures.value;
  records.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name)
    : sort === "pp" ? petCost(a, state.level, state.lore) - petCost(b, state.level, state.lore) || a.name.localeCompare(b.name)
    : sort === "hp" ? petHealth(b, state.level) - petHealth(a, state.level) || a.name.localeCompare(b.name)
    : (a.taxonOrder || "Other").localeCompare(b.taxonOrder || "Other") || Number(b.tameable) - Number(a.tameable) || a.name.localeCompare(b.name));
  return records;
}

function renderCreatureList() {
  const records = filteredCreatures();
  els.visibleCreatureCount.textContent = `${records.length} ${records.length === 1 ? "creature" : "creatures"}`;
  if (!records.length) { els.creatureList.innerHTML = `<div class="empty-panel">No creatures match these filters.</div>`; return; }
  const grouped = els.sortCreatures.value === "family";
  let lastGroup = "";
  els.creatureList.innerHTML = records.map((creature) => {
    const group = creature.taxonOrder || creature.taxonClass || "Other";
    const heading = grouped && group !== lastGroup ? `<div class="family-heading"><span>${escapeHtml(group)}</span><span>${records.filter((item) => (item.taxonOrder || item.taxonClass || "Other") === group).length}</span></div>` : "";
    lastGroup = group;
    const detail = creature.tameable && creature.taming ? `HP ${petHealth(creature, state.level)} · PP ${formatNumber(petCost(creature, state.level, state.lore))}` : `${(creature.yields || []).filter((item) => item.material).length} drops`;
    return `${heading}<button class="creature-row ${creature.slug === state.selectedSlug ? "active" : ""}" data-creature="${escapeHtml(creature.slug)}" type="button">
      ${creature.hasImage ? `<img class="creature-thumb" src="${imageUrl(creature)}" alt="" loading="lazy" />` : `<span class="creature-thumb creature-placeholder">${escapeHtml(creature.name[0])}</span>`}
      <span><strong>${escapeHtml(creature.name)}</strong><small>${escapeHtml(group)}</small></span><em>${escapeHtml(detail)}</em></button>`;
  }).join("");
  els.creatureList.querySelectorAll("[data-creature]").forEach((button) => button.addEventListener("click", () => { state.selectedSlug = button.dataset.creature; history.replaceState(null, "", `${location.pathname}?creature=${encodeURIComponent(state.selectedSlug)}`); renderCreatureList(); renderSpecimen(); }));
}

function selectedCreature() { return state.creatures.find((item) => item.slug === state.selectedSlug); }

function renderSpecimen() {
  const creature = selectedCreature();
  els.specimenEmpty.hidden = Boolean(creature); els.specimenContent.hidden = !creature;
  if (!creature) return;
  els.specimenName.textContent = creature.name;
  els.specimenTaxon.textContent = [creature.taxonClass, creature.taxonOrder].filter(Boolean).join(" · ") || creature.category || "Creature";
  els.specimenPortrait.innerHTML = creature.hasImage ? `<img src="${imageUrl(creature)}" alt="${escapeHtml(creature.name)}" />` : `<span>${escapeHtml(creature.name[0])}</span>`;
  const badges = [creature.tameable ? `<span class="good">Tameable</span>` : `<span>Butchery only</span>`, creature.taming?.dominateOnly ? `<span class="warn">Dominate only</span>` : "", creature.incomplete ? `<span class="warn">Partial data</span>` : ""].filter(Boolean);
  els.specimenBadges.innerHTML = badges.join("");
  const yields = (creature.yields || []).filter((item) => item.material);
  const metrics = [["Known drops", yields.length], ["Base HP", creature.taming?.hp ?? "—"], ["Base PP", creature.taming?.petPoints ?? "—"], ["Carry", creature.taming?.carry ? `${creature.taming.carry.toLocaleString()} kg` : "—"], ["Food", creature.taming?.food ?? "—"], ["Stamina", creature.taming?.stamina ?? "—"]];
  els.specimenMetrics.innerHTML = metrics.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  els.yieldTable.innerHTML = yields.length ? `<table class="data-table"><thead><tr><th>Material</th><th>Yield</th><th>Share</th></tr></thead><tbody>${yields.sort((a, b) => (b.qty || 0) - (a.qty || 0)).map((item) => `<tr><td><button class="yield-material" data-material="${escapeHtml(item.material)}">${escapeHtml(item.material)}</button></td><td>${item.qty == null ? "Pending" : Number(item.qty).toLocaleString()}</td><td>${item.qty == null ? "—" : `${(Number(item.qty) / 100).toFixed(1)}%`}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-panel">Butchery data is pending for this creature.</div>`;
  els.yieldTable.querySelectorAll("[data-material]").forEach((button) => button.addEventListener("click", () => { state.selectedMaterial = button.dataset.material; els.materialSelect.value = state.selectedMaterial; setMode("material"); }));
  const taming = creature.taming;
  const hasTamingRange = Number(taming?.tamingMin) > 0 || Number(taming?.tamingMax) > 0;
  const hasTamingRate = Number(taming?.tamingRate) > 0;
  els.tamingDetails.innerHTML = taming ? [["Control method", taming.dominateOnly ? "Dominate Creatures" : "Taming"], ["Relevant lore", taming.tamingClade || "Not listed"], ["Taming range", taming.dominateOnly ? "Dominate only" : hasTamingRange ? `${taming.tamingMin || 0}–${taming.tamingMax || 0}` : "Not documented"], ["Taming rate", taming.dominateOnly ? "—" : hasTamingRate ? `${taming.tamingRate}%` : "Not documented"], ["Mastery", taming.mastery || "None listed"], ["Attack profile", taming.attackSetKey || "Not listed"]].map(lineHtml).join("") : lineHtml(["Taming", "This creature has no pet profile"]);
  renderPetScale();
}

function renderPetScale() {
  const creature = selectedCreature();
  els.petLevelValue.textContent = state.level; els.petLevel.value = state.level; els.petLore.value = String(state.lore);
  if (!creature?.taming) { els.scaledHealth.textContent = "—"; els.scaledPoints.textContent = "—"; els.budgetStatus.textContent = "Not a pet"; els.levelMarks.innerHTML = ""; return; }
  const hp = petHealth(creature, state.level); const pp = petCost(creature, state.level, state.lore);
  els.scaledHealth.textContent = hp.toLocaleString(); els.scaledPoints.textContent = formatNumber(pp);
  if (state.budget == null || !Number.isFinite(state.budget)) { els.budgetStatus.textContent = "Not set"; els.petMeterFill.style.width = "0"; }
  else { const fits = pp <= state.budget; els.budgetStatus.textContent = fits ? `${formatNumber(state.budget - pp)} free` : `${formatNumber(pp - state.budget)} over`; els.petMeterFill.style.width = `${Math.min(100, pp / Math.max(state.budget, 1) * 100)}%`; els.petMeterFill.classList.toggle("over", !fits); }
  els.levelMarks.innerHTML = [1, 25, 50, 75, 100, 125].map((level) => `<tr><td>${level}</td><td>${petHealth(creature, level).toLocaleString()}</td><td>${formatNumber(petCost(creature, level, state.lore))}</td></tr>`).join("");
  renderCreatureList();
}

function petHealth(creature, level) { return creature?.taming ? Math.floor(Number(creature.taming.hp || 0) * (Number(level) / 50 + 1)) : 0; }
function petCost(creature, level, lore) {
  if (!creature?.taming) return Number.MAX_SAFE_INTEGER;
  const scaled = Math.floor(Number(creature.taming.petPoints || 0) * (Number(level) / 50 + 1) + 1e-7);
  return Math.ceil(scaled * (1 - Number(lore) / 400) - 1e-7);
}

function renderMaterialPlanner() {
  if (!state.creatures.length) return;
  state.selectedMaterial = els.materialSelect.value || state.selectedMaterial;
  const target = Math.max(1, Number(els.targetAmount.value) || 1); const mastery = Number(els.yieldMastery.value) || 0; const faunist = els.faunistBonus.checked;
  const bonus = mastery * .02 + (faunist ? .10 : 0);
  els.yieldBonus.textContent = `+${Math.round(bonus * 100)}%`; els.materialHeading.textContent = state.selectedMaterial || "Select a material";
  const sources = state.creatures.map((creature) => { const drop = (creature.yields || []).find((item) => item.material === state.selectedMaterial && item.qty > 0); if (!drop) return null; const base = Number(drop.qty); const boosted = Math.floor(base * (1 + bonus) + 1e-9); const carcasses = Math.ceil(target / boosted); return { creature, base, boosted, carcasses, carcassWeight: carcasses * 10000, spare: carcasses * boosted - target }; }).filter(Boolean).sort((a, b) => a.carcassWeight - b.carcassWeight || b.boosted - a.boosted || a.creature.name.localeCompare(b.creature.name));
  els.sourceCount.textContent = `${sources.length} ${sources.length === 1 ? "source" : "sources"}`;
  els.materialResults.innerHTML = sources.length ? sources.map((source) => `<div class="material-source"><div><span>Creature</span><strong>${escapeHtml(source.creature.name)}</strong></div><div><span>Base yield</span><strong>${source.base.toLocaleString()}</strong></div><div><span>Boosted</span><strong>${source.boosted.toLocaleString()}</strong></div><div><span>Carcasses</span><strong>${source.carcasses.toLocaleString()}</strong></div><div><span>Carcass weight</span><strong>${source.carcassWeight.toLocaleString()}</strong></div><button data-open-creature="${escapeHtml(source.creature.slug)}" type="button">Inspect</button></div>`).join("") : `<div class="empty-panel">No documented creature yields this material.</div>`;
  els.materialResults.querySelectorAll("[data-open-creature]").forEach((button) => button.addEventListener("click", () => { state.selectedSlug = button.dataset.openCreature; setMode("creature"); renderCreatureList(); renderSpecimen(); }));
}

function imageUrl(creature) { return `https://mortalcodex.com/api/v1/game-reference/creatures/${encodeURIComponent(creature.slug)}/image${creature.imageVersion ? `?v=${encodeURIComponent(creature.imageVersion)}` : ""}`; }
function loadPreferences() { try { const value = JSON.parse(localStorage.getItem("nave.shambles.v1")); if (value) { state.selectedMaterial = value.material || ""; els.yieldMastery.value = String(value.mastery || 0); els.faunistBonus.checked = Boolean(value.faunist); } } catch {} }
function savePreferences() { localStorage.setItem("nave.shambles.v1", JSON.stringify({ material: state.selectedMaterial, mastery: Number(els.yieldMastery.value) || 0, faunist: els.faunistBonus.checked })); }
function lineHtml([label, value]) { return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }
function formatNumber(value) { return Number.isInteger(value) ? value.toLocaleString() : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
