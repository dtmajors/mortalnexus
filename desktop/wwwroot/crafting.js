const TYPE = {
  weaponHandle: 1,
  weaponHead: 2,
  materialWeaponCore: 4,
  materialWeaponGrip: 8,
  materialWeaponHead: 16,
  armorStyle: 32,
  materialArmorSupport: 262144,
  bowStyle: 1024,
  bowCurve: 2048,
  materialBow: 4096,
  shieldSize: 8192,
  shieldFrame: 16384,
  materialShieldCore: 32768,
  materialShieldCoat: 65536,
  materialShieldFrame: 131072,
  petArmorStyle: 1048576,
};

const MODE_LABELS = {
  weapon: "Weapon",
  armor: "Armor",
  bow: "Bow",
  shield: "Shield",
  pet: "Pet gear",
};

const state = {
  catalog: null,
  mode: "weapon",
  quantity: 1,
  result: null,
  timer: null,
  requestId: 0,
  comparisons: loadJson("nave.forge.comparisons", []),
  recent: loadJson("nave.forge.recent", []),
  prices: loadJson("nave.forge.prices", {}),
};

const els = Object.fromEntries([
  "catalogStatus", "craftQuantity", "calculateCraft", "resultKind", "resultName", "resultState",
  "resultSummary", "resultStats", "slotBreakdown", "materialQuantityLabel", "materialResults",
  "weaponFamily", "weaponHandle", "weaponHead", "weaponCore", "weaponGrip", "weaponHeadMaterial",
  "armorStyle", "armorBase", "armorSupport", "armorBaseDensity", "armorBaseDensityValue",
  "armorSupportDensity", "armorSupportDensityValue", "bowSize", "bowCurve", "selfBow", "bowBelly",
  "bowBack", "bowBackLabel", "bowBellyField", "compositeField", "compositePercent", "compositeValue",
  "shieldStyle", "shieldFrame", "shieldCore", "shieldCoat", "shieldFrameMaterial", "petStyle", "petBase",
  "petSupport", "petBaseDensity", "petBaseDensityValue", "petSupportDensity", "petSupportDensityValue",
  "resultChart", "compareCraft", "clearComparison", "comparisonCount", "comparisonList", "clearRecent", "recentCrafts",
  "marketInputs", "brokerMargin", "rawCost", "salePrice",
].map((id) => [id, document.getElementById(id)]));

init();

async function init() {
  attachEvents();
  renderComparison();
  renderRecent();
  drawProfile(null);
  window.lucide?.createIcons();
  try {
    const response = await fetch("/api/crafting/catalog", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Catalog unavailable");
    state.catalog = await response.json();
    populateAllControls();
    els.calculateCraft.disabled = false;
    els.catalogStatus.className = "catalog-status ready";
    els.catalogStatus.querySelector("strong").textContent = "Crafting catalog ready";
    els.catalogStatus.querySelector("small").textContent = `${state.catalog.items.length} patterns and ${state.catalog.mats.length} materials`;
    calculate();
  } catch {
    els.catalogStatus.className = "catalog-status error";
    els.catalogStatus.querySelector("strong").textContent = "Catalog unavailable";
    els.catalogStatus.querySelector("small").textContent = "Try reloading in a moment";
    showError("The equipment catalog could not be loaded.");
  }
}

function attachEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  els.weaponFamily.addEventListener("change", () => {
    populateWeaponParts();
    scheduleCalculate();
  });
  els.armorStyle.addEventListener("change", () => {
    populateArmorMaterials();
    scheduleCalculate();
  });
  els.shieldStyle.addEventListener("change", () => {
    populateShieldFrames();
    scheduleCalculate();
  });
  els.petStyle.addEventListener("change", () => {
    populatePetMaterials();
    scheduleCalculate();
  });
  els.selfBow.addEventListener("change", () => {
    updateBowMode();
    scheduleCalculate();
  });

  document.querySelectorAll(".craft-panel select").forEach((select) => {
    if ([els.weaponFamily, els.armorStyle, els.shieldStyle, els.petStyle].includes(select)) return;
    select.addEventListener("change", scheduleCalculate);
  });

  [
    [els.armorBaseDensity, els.armorBaseDensityValue],
    [els.armorSupportDensity, els.armorSupportDensityValue],
    [els.compositePercent, els.compositeValue],
    [els.petBaseDensity, els.petBaseDensityValue],
    [els.petSupportDensity, els.petSupportDensityValue],
  ].forEach(([input, output]) => {
    input.addEventListener("input", () => {
      output.textContent = `${input.value}%`;
      scheduleCalculate();
    });
  });

  els.craftQuantity.addEventListener("input", () => {
    state.quantity = clamp(els.craftQuantity.value, 1, 1000);
    renderMaterials();
    renderMarketSummary();
  });
  els.calculateCraft.addEventListener("click", calculate);
  els.compareCraft.addEventListener("click", addComparison);
  els.clearComparison.addEventListener("click", () => { state.comparisons = []; persistForgeState(); renderComparison(); });
  els.clearRecent.addEventListener("click", () => { state.recent = []; persistForgeState(); renderRecent(); });
  els.brokerMargin.addEventListener("input", renderMarketSummary);
}

function populateAllControls() {
  fillSelect(els.weaponFamily, state.catalog.families, "wbFamilyId", "displayName", ["One Handed Swords"]);
  fillSelect(els.weaponCore, materials(TYPE.materialWeaponCore), "wbMatId", "displayName", ["Brownwood"]);
  fillSelect(els.weaponGrip, materials(TYPE.materialWeaponGrip), "wbMatId", "displayName", ["Fullgrain Leather"]);
  fillSelect(els.weaponHeadMaterial, materials(TYPE.materialWeaponHead), "wbMatId", "displayName", ["Cuprum"]);
  populateWeaponParts();

  fillSelect(els.armorStyle, items(TYPE.armorStyle), "wbItemId", "displayName", ["Tindremic Knight"]);
  fillSelect(els.armorSupport, materials(TYPE.materialArmorSupport), "wbMatId", "displayName", ["Fullgrain Leather"]);
  populateArmorMaterials();

  fillSelect(els.bowSize, items(TYPE.bowStyle), "wbItemId", "displayName", ["Long"]);
  fillSelect(els.bowCurve, items(TYPE.bowCurve), "wbItemId", "displayName", ["Recurve"]);
  fillSelect(els.bowBelly, materials(TYPE.materialBow), "wbMatId", "displayName", ["Brownwood"]);
  fillSelect(els.bowBack, materials(TYPE.materialBow), "wbMatId", "displayName", ["Spongewood"]);
  updateBowMode();

  fillSelect(els.shieldStyle, items(TYPE.shieldSize), "wbItemId", "displayName", ["Medium Round Shield"]);
  fillSelect(els.shieldCore, materials(TYPE.materialShieldCore), "wbMatId", "displayName", ["Brownwood"]);
  fillSelect(els.shieldCoat, materials(TYPE.materialShieldCoat), "wbMatId", "displayName", ["Fullgrain Leather"]);
  fillSelect(els.shieldFrameMaterial, materials(TYPE.materialShieldFrame), "wbMatId", "displayName", ["Cuprum"]);
  populateShieldFrames();

  fillSelect(els.petStyle, items(TYPE.petArmorStyle), "wbItemId", "displayName", ["Large Bags"]);
  fillSelect(els.petSupport, materials(TYPE.materialArmorSupport), "wbMatId", "displayName", ["Cotton"]);
  populatePetMaterials();
}

function populateWeaponParts() {
  const familyId = numberValue(els.weaponFamily);
  fillSelect(els.weaponHandle, items(TYPE.weaponHandle).filter((item) => item.familyId === familyId), "wbItemId", "displayName");
  fillSelect(els.weaponHead, items(TYPE.weaponHead).filter((item) => item.familyId === familyId), "wbItemId", "displayName");
}

function populateArmorMaterials() {
  const style = itemById(numberValue(els.armorStyle));
  fillSelect(els.armorBase, materials(style?.matMask || 128), "wbMatId", "displayName", ["Steel", "Plate Scales", "Fullgrain Leather"]);
}

function populateShieldFrames() {
  const style = itemById(numberValue(els.shieldStyle));
  const frames = items(TYPE.shieldFrame).filter((item) => item.matMask === style?.matMask);
  fillSelect(els.shieldFrame, frames, "wbItemId", "displayName");
}

function populatePetMaterials() {
  const style = itemById(numberValue(els.petStyle));
  fillSelect(els.petBase, materials(style?.matMask || 128), "wbMatId", "displayName", ["Fullgrain Leather", "Plate Scales"]);
}

function updateBowMode() {
  const self = els.selfBow.checked;
  els.bowBellyField.hidden = self;
  els.compositeField.hidden = self;
  els.bowBackLabel.textContent = self ? "Wood material" : "Back material";
}

function setMode(mode) {
  if (!MODE_LABELS[mode] || mode === state.mode) return;
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== mode;
  });
  els.resultKind.textContent = `${MODE_LABELS[mode]} result`;
  state.result = null;
  calculate();
}

function items(typeBit) {
  return (state.catalog?.items || [])
    .filter((item) => item.typeBits === typeBit)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function materials(typeMask) {
  return (state.catalog?.mats || [])
    .filter((material) => (material.typeMask & typeMask) !== 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function itemById(id) {
  return state.catalog?.items.find((item) => item.wbItemId === id);
}

function materialById(id) {
  return state.catalog?.mats.find((material) => material.wbMatId === id);
}

function familyById(id) {
  return state.catalog?.families.find((family) => family.wbFamilyId === id);
}

function fillSelect(select, records, valueKey, labelKey, preferred = []) {
  const oldValue = select.value;
  select.innerHTML = records.map((record) => `<option value="${record[valueKey]}">${escapeHtml(record[labelKey])}</option>`).join("");
  if (records.some((record) => String(record[valueKey]) === oldValue)) {
    select.value = oldValue;
    return;
  }
  for (const name of preferred) {
    const match = records.find((record) => record[labelKey] === name);
    if (match) {
      select.value = String(match[valueKey]);
      return;
    }
  }
}

function scheduleCalculate() {
  clearTimeout(state.timer);
  state.timer = setTimeout(calculate, 240);
}

async function calculate() {
  if (!state.catalog) return;
  const requestId = ++state.requestId;
  const request = buildRequest();
  if (!request) return;
  setResultState("Calculating", "");
  els.calculateCraft.disabled = true;

  try {
    const response = await fetch(`/api/crafting/calculate/${state.mode}?${new URLSearchParams(request)}`);
    const text = await response.text();
    if (!response.ok || text.trim().startsWith("{")) throw new Error("Calculation unavailable");
    if (requestId !== state.requestId) return;
    state.result = parseResult(state.mode, text.split("|"));
    renderResult();
  } catch {
    if (requestId === state.requestId) showError("The crafting service could not calculate this combination.");
  } finally {
    if (requestId === state.requestId) els.calculateCraft.disabled = false;
  }
}

function buildRequest() {
  if (state.mode === "weapon") return {
    handleId: els.weaponHandle.value,
    headId: els.weaponHead.value,
    coreMatId: els.weaponCore.value,
    gripMatId: els.weaponGrip.value,
    headMatId: els.weaponHeadMaterial.value,
  };
  if (state.mode === "armor") return {
    armorStyleId: els.armorStyle.value,
    baseMatId: els.armorBase.value,
    supportMatId: els.armorSupport.value,
    baseDensity: els.armorBaseDensity.value,
    supportDensity: els.armorSupportDensity.value,
  };
  if (state.mode === "bow") return {
    bowSizeId: els.bowSize.value,
    bowTypeId: els.bowCurve.value,
    bellyMatId: els.selfBow.checked ? 0 : els.bowBelly.value,
    backMatId: els.bowBack.value,
    compositePercent: els.selfBow.checked ? 0 : els.compositePercent.value,
    isSelfBow: els.selfBow.checked ? 1 : 0,
  };
  if (state.mode === "shield") return {
    shieldStyleId: els.shieldStyle.value,
    shieldFrameId: els.shieldFrame.value,
    coreMatId: els.shieldCore.value,
    coatMatId: els.shieldCoat.value,
    frameMatId: els.shieldFrameMaterial.value,
  };
  return {
    armorStyleId: els.petStyle.value,
    baseMatId: els.petBase.value,
    supportMatId: els.petSupport.value,
    baseDensity: els.petBaseDensity.value,
    supportDensity: els.petSupportDensity.value,
  };
}

function parseResult(mode, parts) {
  if (mode === "weapon") {
    const head = itemById(Number(parts[0]));
    const handle = itemById(Number(parts[1]));
    const family = familyById(handle?.familyId);
    return {
      name: `${family?.displayName || "Weapon"}: ${head?.displayName || "Head"} / ${handle?.displayName || "Handle"}`,
      summary: "Damage, strength requirement, and handling for the selected weapon components.",
      stats: [["Weight", `${parts[5]} kg`], ["Slash damage", parts[6]], ["Blunt damage", parts[7]], ["Pierce damage", parts[8]], ["Durability", parts[9]], ["Strength required", parts[10]]],
      materials: parseMaterials(parts[11]),
    };
  }
  if (mode === "armor") {
    const style = itemById(Number(parts[0]));
    const base = materialById(Number(parts[1]));
    const slotNames = ["Helm", "Left arm", "Torso", "Right arm", "Legs"];
    return {
      name: `${style?.displayName || "Armor"} in ${base?.displayName || "material"}`,
      summary: "Full-set protection and weight. The slot table shows how the set total is distributed.",
      stats: [["Blunt defense", parts[7]], ["Pierce defense", parts[5]], ["Slash defense", parts[6]], ["Total weight", `${parts[8]} kg`], ["Durability", parts[14]]],
      materials: parseMaterials(parts[20]),
      slots: slotNames.map((name, index) => ({ name, weight: parts[9 + index], durability: parts[15 + index] })),
    };
  }
  if (mode === "bow") {
    const size = itemById(Number(parts[0]));
    const curve = itemById(Number(parts[1]));
    const material = materialById(Number(parts[3]));
    const self = Number(parts[5]) === 1;
    return {
      name: `${size?.displayName || ""} ${curve?.displayName || ""} Bow in ${material?.displayName || "material"}`.trim(),
      summary: self ? "Self bow using one material." : `Composite bow with ${parts[4]}% back balance.`,
      stats: [["Strength required", parts[6]], ["Range", parts[7]], ["Durability", parts[8]], ["Weight", `${parts[9]} kg`], ["Construction", self ? "Self" : "Composite"]],
      materials: parseMaterials(parts[10]),
    };
  }
  if (mode === "shield") {
    const style = itemById(Number(parts[0]));
    const frame = itemById(Number(parts[1]));
    return {
      name: `${style?.displayName || "Shield"} / ${frame?.displayName || "Frame"}`,
      summary: "Defense, durability, and carried weight for the selected shield construction.",
      stats: [["Blunt defense", parts[7]], ["Pierce defense", parts[9]], ["Slash defense", parts[8]], ["Weight", `${parts[5]} kg`], ["Durability", parts[6]]],
      materials: parseMaterials(parts[10]),
    };
  }
  const style = itemById(Number(parts[0]));
  const base = materialById(Number(parts[1]));
  return {
    name: `${style?.displayName || "Pet gear"} in ${base?.displayName || "material"}`,
    summary: style?.displayName.includes("Bag") ? "Crafted pet bag durability, defense, weight, and material cost." : "Crafted pet armor protection, weight, and material cost.",
    stats: [["Blunt defense", parts[7]], ["Pierce defense", parts[5]], ["Slash defense", parts[6]], ["Weight", `${parts[8]} kg`], ["Durability", parts[9]]],
    materials: parseMaterials(parts[10]),
  };
}

function parseMaterials(value = "") {
  const rows = [];
  const pattern = /(\d+)\[([\d.]+)\]/g;
  let match;
  while ((match = pattern.exec(value))) {
    const material = materialById(Number(match[1]));
    rows.push({ name: material?.displayName || `Material ${match[1]}`, quantity: Number(match[2]) });
  }
  return rows;
}

function renderResult() {
  const result = state.result;
  if (!result) return;
  els.resultName.textContent = result.name;
  els.resultSummary.textContent = result.summary;
  els.resultStats.innerHTML = result.stats.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "-")}</dd></div>`).join("");
  if (result.slots?.length) {
    els.slotBreakdown.hidden = false;
    els.slotBreakdown.innerHTML = `<table><thead><tr><th>Piece</th><th>Weight</th><th>Durability</th></tr></thead><tbody>${result.slots.map((slot) => `<tr><td>${escapeHtml(slot.name)}</td><td>${escapeHtml(slot.weight)} kg</td><td>${escapeHtml(slot.durability)}</td></tr>`).join("")}</tbody></table>`;
  } else {
    els.slotBreakdown.hidden = true;
    els.slotBreakdown.innerHTML = "";
  }
  setResultState("Calculated", "ready");
  els.compareCraft.disabled = false;
  drawProfile(result);
  renderMaterials();
  renderMarketInputs();
  rememberResult(result);
}

function renderMaterials() {
  state.quantity = clamp(els.craftQuantity.value, 1, 1000);
  els.materialQuantityLabel.textContent = `For ${state.quantity} ${state.quantity === 1 ? "item" : "items"}`;
  const rows = state.result?.materials || [];
  els.materialResults.innerHTML = rows.length
    ? rows.map((row) => `<div class="material-row"><span>${escapeHtml(row.name)}</span><strong>${formatQuantity(row.quantity * state.quantity)}</strong></div>`).join("")
    : '<p class="empty-result">No material use returned for this craft.</p>';
}

function drawProfile(result) {
  const canvas = els.resultChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0f0c";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#273028";
  ctx.lineWidth = 1;
  for (let x = 130; x < width - 18; x += 80) { ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, height - 18); ctx.stroke(); }
  if (!result) {
    ctx.fillStyle = "#787e77";
    ctx.font = "12px sans-serif";
    ctx.fillText("Crafted stat profile", 18, 31);
    ctx.fillText("Select components to compare protection, damage, weight, and durability.", 18, 53);
    return;
  }
  const numeric = result.stats.map(([label, value]) => ({ label, value: Number(String(value).replace(/[^0-9.-]/g, "")) })).filter((item) => Number.isFinite(item.value)).slice(0, 6);
  const max = Math.max(...numeric.map((item) => Math.abs(item.value)), 1);
  const rowHeight = Math.min(29, (height - 28) / Math.max(numeric.length, 1));
  numeric.forEach((item, index) => {
    const y = 19 + index * rowHeight;
    ctx.fillStyle = "#9d9c91"; ctx.font = "10px sans-serif"; ctx.textAlign = "right"; ctx.fillText(item.label.slice(0, 18), 119, y + 10);
    const barWidth = Math.max(2, Math.abs(item.value) / max * (width - 170));
    ctx.fillStyle = index % 2 ? "#8e7650" : "#a04d3e"; ctx.fillRect(130, y, barWidth, 13);
    ctx.fillStyle = "#eee9dc"; ctx.textAlign = "left"; ctx.fillText(formatQuantity(item.value), Math.min(width - 42, 137 + barWidth), y + 10);
  });
}

function renderMarketInputs() {
  const materials = state.result?.materials || [];
  els.marketInputs.innerHTML = materials.length ? materials.map((material) => `<label class="market-input"><span>${escapeHtml(material.name)} · per unit</span><div><input data-market-price="${escapeHtml(material.name)}" type="number" min="0" step="0.0001" value="${Number(state.prices[material.name] || 0)}" /><small>g</small></div></label>`).join("") : `<p class="empty-result">No priced materials.</p>`;
  els.marketInputs.querySelectorAll("[data-market-price]").forEach((input) => input.addEventListener("input", () => { state.prices[input.dataset.marketPrice] = Math.max(0, Number(input.value) || 0); persistForgeState(); renderMarketSummary(); }));
  renderMarketSummary();
}

function renderMarketSummary() {
  const raw = (state.result?.materials || []).reduce((sum, material) => sum + material.quantity * state.quantity * Number(state.prices[material.name] || 0), 0);
  const margin = Math.max(0, Number(els.brokerMargin.value) || 0) / 100;
  els.rawCost.textContent = `${raw.toLocaleString(undefined, { maximumFractionDigits: 4 })} g`;
  els.salePrice.textContent = `${(raw * (1 + margin)).toLocaleString(undefined, { maximumFractionDigits: 4 })} g`;
}

function addComparison() {
  if (!state.result || state.comparisons.length >= 10) return;
  const snapshot = { id: `${Date.now()}-${Math.random()}`, mode: state.mode, name: state.result.name, stats: state.result.stats, materials: state.result.materials };
  state.comparisons.push(snapshot);
  persistForgeState();
  renderComparison();
}

function renderComparison() {
  els.comparisonCount.textContent = `${state.comparisons.length} / 10`;
  els.compareCraft.disabled = !state.result || state.comparisons.length >= 10;
  els.comparisonList.innerHTML = state.comparisons.length ? state.comparisons.map((item) => `<button class="compare-row" data-comparison="${escapeHtml(item.id)}" type="button"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.mode)} · ${item.materials.length} materials</small></button>`).join("") : `<p class="empty-result">No saved variants.</p>`;
  els.comparisonList.querySelectorAll("[data-comparison]").forEach((button) => button.addEventListener("click", () => { const item = state.comparisons.find((entry) => entry.id === button.dataset.comparison); if (!item) return; state.result = { ...item, summary: "Saved comparison variant." }; renderResultPreview(); }));
}

function rememberResult(result) {
  const existing = state.recent.filter((item) => item.name !== result.name);
  state.recent = [{ id: `${Date.now()}`, mode: state.mode, name: result.name, stats: result.stats, materials: result.materials }, ...existing].slice(0, 8);
  persistForgeState();
  renderRecent();
}

function renderRecent() {
  els.recentCrafts.innerHTML = state.recent.length ? state.recent.map((item) => `<button class="recent-row" data-recent="${escapeHtml(item.id)}" type="button"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.mode)} · ${item.materials.length} materials</small></button>`).join("") : `<p class="empty-result">Nothing forged this session.</p>`;
  els.recentCrafts.querySelectorAll("[data-recent]").forEach((button) => button.addEventListener("click", () => { const item = state.recent.find((entry) => entry.id === button.dataset.recent); if (!item) return; state.result = { ...item, summary: "Recent calculated craft." }; renderResultPreview(); }));
}

function renderResultPreview() {
  const result = state.result;
  els.resultName.textContent = result.name; els.resultSummary.textContent = result.summary;
  els.resultStats.innerHTML = result.stats.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "-")}</dd></div>`).join("");
  els.slotBreakdown.hidden = true; setResultState("Saved", "ready"); drawProfile(result); renderMaterials(); renderMarketInputs();
}

function persistForgeState() {
  localStorage.setItem("nave.forge.comparisons", JSON.stringify(state.comparisons));
  localStorage.setItem("nave.forge.recent", JSON.stringify(state.recent));
  localStorage.setItem("nave.forge.prices", JSON.stringify(state.prices));
}

function loadJson(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }

function showError(message) {
  state.result = null;
  els.resultName.textContent = "Unable to calculate";
  els.resultSummary.textContent = message;
  els.resultStats.innerHTML = "";
  els.slotBreakdown.hidden = true;
  els.materialResults.innerHTML = '<p class="empty-result">No material result available.</p>';
  els.compareCraft.disabled = true;
  drawProfile(null);
  setResultState("Unavailable", "error");
}

function setResultState(label, className) {
  els.resultState.textContent = label;
  els.resultState.className = `result-state ${className}`.trim();
}

function numberValue(select) {
  return Number(select.value);
}

function clamp(value, min, max) {
  const number = Math.round(Number(value) || min);
  return Math.max(min, Math.min(max, number));
}

function formatQuantity(value) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
