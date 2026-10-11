const sourceData = window.MO2_DATA;
const PLAN_STORAGE_KEY = "nave_building_plan_v1";
const resourceKeys = ["wood", "stone", "metal", "gold", "prom"];

const categoryGroups = {
  Residences: new Set(["Small House", "Medium House", "Stronghold", "Castle"]),
  Services: new Set([
    "Alchemist Apotheca",
    "Bank",
    "Butchery",
    "Chancery",
    "Culinarium",
    "Foundry",
    "General Store",
    "Library",
    "Magic Emporium",
    "Priest",
    "Red Priest",
    "Reliquary",
    "Smithy",
    "Stable",
    "Stone Refinery",
  ]),
  "Defense & Support": new Set([
    "Alert Tower",
    "Barracks",
    "Bridge",
    "Gate",
    "Gate Expansion",
    "Guard Tower",
    "Supply Line",
    "Supply Storehouse",
    "Supply Tower",
    "Wall",
    "Wall Corner Tier 2",
    "Wall Tower Tier 2",
  ]),
  Siege: new Set([
    "Ballista",
    "Boltsmith's Tent",
    "Fire Pot Tent",
    "Manganon",
    "Stone Cutting Tent",
    "Wheeled Ballista",
    "Wheeled Mangaon",
  ]),
};

const stages = buildStages();
const structures = buildStructures(stages);
const categories = [...new Set(structures.map((structure) => structure.category))]
  .sort((a, b) => a.localeCompare(b));

const state = {
  category: categories[0] || "",
  structureName: "",
  stageId: "",
  quantity: 1,
  mode: "total",
  catalogSearch: "",
  catalogCategory: "All categories",
  plan: loadPlan(),
};

const els = {
  structureCount: document.querySelector("#structureCount"),
  stageCount: document.querySelector("#stageCount"),
  categorySelect: document.querySelector("#categorySelect"),
  structureSelect: document.querySelector("#structureSelect"),
  stageSelect: document.querySelector("#stageSelect"),
  quantityInput: document.querySelector("#quantityInput"),
  costModeControl: document.querySelector("#costModeControl"),
  selectionPreview: document.querySelector("#selectionPreview"),
  selectionDetails: document.querySelector("#selectionDetails"),
  addStructureBtn: document.querySelector("#addStructureBtn"),
  clearPlanBtn: document.querySelector("#clearPlanBtn"),
  planRows: document.querySelector("#planRows"),
  emptyPlan: document.querySelector("#emptyPlan"),
  planCount: document.querySelector("#planCount"),
  planTotals: document.querySelector("#planTotals"),
  catalogSearch: document.querySelector("#catalogSearch"),
  catalogCategory: document.querySelector("#catalogCategory"),
  catalogBody: document.querySelector("#catalogBody"),
  catalogEmpty: document.querySelector("#catalogEmpty"),
  dataStamp: document.querySelector("#dataStamp"),
};

function buildStages() {
  return sourceData.records
    .filter((record) => record.sheet === "TC & Housing" && record.type === "Structure")
    .map((record) => {
      const name = getField(record, "Name");
      const hasCost = ["Wood", "Stone", "Metal", "Gold", "Prom"]
        .some((label) => /^\d/.test(getField(record, label)));
      if (!name || name === "Note:" || !hasCost) return null;

      const group = getField(record, "Group") || record.title;
      const tierMatch = name.match(/^Tier\s+(\d+)$/i);
      return {
        id: record.id,
        group,
        stageName: name,
        tier: tierMatch ? Number(tierMatch[1]) : null,
        category: categoryFor(group),
        costs: {
          wood: parseAmount(getField(record, "Wood")),
          stone: parseAmount(getField(record, "Stone")),
          metal: parseAmount(getField(record, "Metal")),
          gold: parseAmount(getField(record, "Gold")),
          prom: parseAmount(getField(record, "Prom")),
        },
        health: parseAmount(getField(record, "Health")),
        type: cleanOptional(getField(record, "Type")),
        limit: cleanOptional(getField(record, "Limit")),
        notes: cleanOptional(getField(record, "Notes")),
        searchText: [
          group,
          name,
          getField(record, "Type"),
          getField(record, "Notes"),
          getField(record, "Limit"),
        ].join(" ").toLowerCase(),
      };
    })
    .filter(Boolean);
}

function buildStructures(allStages) {
  const grouped = new Map();
  allStages.forEach((stage) => {
    if (!grouped.has(stage.group)) grouped.set(stage.group, []);
    grouped.get(stage.group).push(stage);
  });

  return [...grouped.entries()]
    .map(([name, structureStages]) => ({
      name,
      category: structureStages[0].category,
      stages: structureStages.sort(compareStages),
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function init() {
  const first = structures.find((structure) => structure.category === state.category) || structures[0];
  state.structureName = first?.name || "";
  state.stageId = first?.stages[0]?.id || "";
  state.plan = state.plan.filter((line) => getStage(line.stageId));

  els.structureCount.textContent = structures.length.toLocaleString();
  els.stageCount.textContent = stages.length.toLocaleString();
  els.dataStamp.textContent = `Data generated ${formatDate(sourceData.meta.generatedAt)}`;

  attachEvents();
  renderCategoryOptions();
  renderCatalogCategoryOptions();
  render();
  window.lucide?.createIcons();
}

function attachEvents() {
  els.categorySelect.addEventListener("change", () => {
    state.category = els.categorySelect.value;
    const first = structures.find((structure) => structure.category === state.category);
    state.structureName = first?.name || "";
    state.stageId = first?.stages[0]?.id || "";
    renderStructureOptions();
    renderStageOptions();
    renderSelection();
  });

  els.structureSelect.addEventListener("change", () => {
    state.structureName = els.structureSelect.value;
    state.stageId = getCurrentStructure()?.stages[0]?.id || "";
    renderStageOptions();
    renderSelection();
  });

  els.stageSelect.addEventListener("change", () => {
    state.stageId = els.stageSelect.value;
    renderSelection();
  });

  els.quantityInput.addEventListener("input", () => {
    state.quantity = clampQuantity(els.quantityInput.value);
    renderSelection();
  });

  els.costModeControl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    renderModeControl();
    renderSelection();
  });

  els.addStructureBtn.addEventListener("click", addCurrentSelection);

  els.clearPlanBtn.addEventListener("click", () => {
    state.plan = [];
    savePlan();
    renderPlan();
  });

  els.planRows.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-line]");
    if (!removeButton) return;
    state.plan = state.plan.filter((line) => line.id !== removeButton.dataset.removeLine);
    savePlan();
    renderPlan();
  });

  els.planRows.addEventListener("change", (event) => {
    const input = event.target.closest("[data-line-quantity]");
    if (!input) return;
    const line = state.plan.find((item) => item.id === input.dataset.lineQuantity);
    if (!line) return;
    line.quantity = clampQuantity(input.value);
    savePlan();
    renderPlan();
  });

  els.catalogSearch.addEventListener("input", () => {
    state.catalogSearch = els.catalogSearch.value.trim().toLowerCase();
    renderCatalog();
  });

  els.catalogCategory.addEventListener("change", () => {
    state.catalogCategory = els.catalogCategory.value;
    renderCatalog();
  });

  els.catalogBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-use-stage]");
    if (!button) return;
    const stage = getStage(button.dataset.useStage);
    if (!stage) return;
    state.category = stage.category;
    state.structureName = stage.group;
    state.stageId = stage.id;
    renderCategoryOptions();
    renderStructureOptions();
    renderStageOptions();
    renderSelection();
    document.querySelector(".building-planner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function render() {
  renderStructureOptions();
  renderStageOptions();
  renderModeControl();
  renderSelection();
  renderPlan();
  renderCatalog();
}

function renderCategoryOptions() {
  els.categorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  els.categorySelect.value = state.category;
}

function renderCatalogCategoryOptions() {
  const options = ["All categories", ...categories];
  els.catalogCategory.innerHTML = options
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  els.catalogCategory.value = state.catalogCategory;
}

function renderStructureOptions() {
  const available = structures.filter((structure) => structure.category === state.category);
  if (!available.some((structure) => structure.name === state.structureName)) {
    state.structureName = available[0]?.name || "";
  }
  els.structureSelect.innerHTML = available
    .map((structure) => `<option value="${escapeHtml(structure.name)}">${escapeHtml(structure.name)}</option>`)
    .join("");
  els.structureSelect.value = state.structureName;
}

function renderStageOptions() {
  const structure = getCurrentStructure();
  if (!structure) return;
  if (!structure.stages.some((stage) => stage.id === state.stageId)) {
    state.stageId = structure.stages[0]?.id || "";
  }
  els.stageSelect.innerHTML = structure.stages
    .map((stage) => `<option value="${escapeHtml(stage.id)}">${escapeHtml(stage.stageName)}</option>`)
    .join("");
  els.stageSelect.value = state.stageId;
  els.stageSelect.disabled = structure.stages.length < 2;
}

function renderModeControl() {
  els.costModeControl.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderSelection() {
  const structure = getCurrentStructure();
  const stage = getCurrentStage();
  if (!structure || !stage) return;

  state.quantity = clampQuantity(state.quantity);
  els.quantityInput.value = state.quantity;
  const scaled = scaleCost(
    calculateStageCost(structure, stage, state.mode),
    state.quantity,
  );

  els.selectionPreview.innerHTML = resourceKeys
    .map((key) => resourcePreview(key, scaled[key]))
    .join("");

  const detailParts = [
    state.mode === "total" && stage.tier
      ? `Includes Tier 1 through ${stage.stageName}`
      : "Direct construction stage",
    stage.type ? stage.type.replace("?", "") : "",
    stage.health ? `${formatNumber(stage.health)} health each` : "",
    stage.limit ? `Limit: ${stage.limit}` : "",
  ].filter(Boolean);
  const note = stage.notes ? `<span>${escapeHtml(stage.notes)}</span>` : "";
  els.selectionDetails.innerHTML = `<strong>${escapeHtml(detailParts.join(" · "))}</strong>${note}`;
}

function renderPlan() {
  const totalQuantity = state.plan.reduce((sum, line) => sum + line.quantity, 0);
  els.emptyPlan.hidden = state.plan.length > 0;
  els.planRows.hidden = state.plan.length === 0;
  els.clearPlanBtn.disabled = state.plan.length === 0;

  els.planRows.innerHTML = state.plan
    .map((line) => {
      const stage = getStage(line.stageId);
      const structure = structures.find((item) => item.name === stage?.group);
      if (!stage || !structure) return "";
      const lineCost = scaleCost(calculateStageCost(structure, stage, line.mode), line.quantity);
      const modeLabel = line.mode === "total" && stage.tier ? "from scratch" : "stage only";
      return `<article class="plan-row">
        <div class="plan-row-copy">
          <strong>${escapeHtml(stage.group)} <span>${escapeHtml(stage.stageName)}</span></strong>
          <small>${escapeHtml(modeLabel)} · ${formatCompactCost(lineCost)}</small>
        </div>
        <label class="plan-quantity">
          <input type="number" min="1" max="999" value="${line.quantity}" data-line-quantity="${line.id}" aria-label="Quantity for ${escapeHtml(stage.group)} ${escapeHtml(stage.stageName)}" />
        </label>
        <button class="building-icon-button" type="button" data-remove-line="${line.id}" aria-label="Remove ${escapeHtml(stage.group)}">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </article>`;
    })
    .join("");

  els.planCount.textContent = `${formatNumber(totalQuantity)} ${totalQuantity === 1 ? "structure" : "structures"}`;
  const totals = calculatePlanTotals();
  els.planTotals.innerHTML = [
    ...resourceKeys.map((key) => totalItem(key, totals[key])),
    totalItem("health", totals.health),
  ].join("");

  window.lucide?.createIcons();
}

function renderCatalog() {
  const visible = stages.filter((stage) => {
    const matchesCategory = state.catalogCategory === "All categories"
      || stage.category === state.catalogCategory;
    const matchesSearch = !state.catalogSearch || stage.searchText.includes(state.catalogSearch);
    return matchesCategory && matchesSearch;
  });

  els.catalogBody.innerHTML = visible
    .map((stage) => `<tr>
      <td>
        <strong>${escapeHtml(stage.group)}</strong>
        <small>${escapeHtml(stage.category)}</small>
      </td>
      <td>${escapeHtml(stage.stageName)}</td>
      <td>${escapeHtml(stage.type || "—")}</td>
      <td><span class="catalog-cost">${formatCompactCost(stage.costs, true)}</span></td>
      <td>${stage.health ? formatNumber(stage.health) : "—"}</td>
      <td>
        <button class="catalog-use-button" type="button" data-use-stage="${stage.id}">
          <i data-lucide="plus" aria-hidden="true"></i>
          Use
        </button>
      </td>
    </tr>`)
    .join("");
  els.catalogEmpty.hidden = visible.length > 0;
  window.lucide?.createIcons();
}

function addCurrentSelection() {
  const stage = getCurrentStage();
  if (!stage) return;
  const quantity = clampQuantity(state.quantity);
  const existing = state.plan.find(
    (line) => line.stageId === stage.id && line.mode === state.mode,
  );
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + quantity);
  } else {
    state.plan.push({
      id: cryptoRandomId(),
      stageId: stage.id,
      quantity,
      mode: state.mode,
    });
  }
  savePlan();
  renderPlan();
}

function calculateStageCost(structure, targetStage, mode) {
  const included = mode === "total" && targetStage.tier
    ? structure.stages.filter((stage) => stage.tier && stage.tier <= targetStage.tier)
    : [targetStage];
  return included.reduce((total, stage) => {
    resourceKeys.forEach((key) => {
      total[key] += stage.costs[key];
    });
    total.health = targetStage.health;
    return total;
  }, emptyTotals());
}

function calculatePlanTotals() {
  return state.plan.reduce((totals, line) => {
    const stage = getStage(line.stageId);
    const structure = structures.find((item) => item.name === stage?.group);
    if (!stage || !structure) return totals;
    const cost = scaleCost(calculateStageCost(structure, stage, line.mode), line.quantity);
    [...resourceKeys, "health"].forEach((key) => {
      totals[key] += cost[key];
    });
    return totals;
  }, emptyTotals());
}

function emptyTotals() {
  return { wood: 0, stone: 0, metal: 0, gold: 0, prom: 0, health: 0 };
}

function scaleCost(cost, quantity) {
  return Object.fromEntries(
    Object.entries(cost).map(([key, value]) => [key, value * quantity]),
  );
}

function resourcePreview(key, value) {
  return `<div class="resource-preview resource-${key}">
    <span>${resourceLabel(key)}</span>
    <strong>${formatNumber(value)}</strong>
  </div>`;
}

function totalItem(key, value) {
  return `<div class="plan-total resource-${key}">
    <dt>${resourceLabel(key)}</dt>
    <dd>${formatNumber(value)}</dd>
  </div>`;
}

function formatCompactCost(cost, includeZero = false) {
  const labels = { wood: "W", stone: "S", metal: "M", gold: "G", prom: "P" };
  const parts = resourceKeys
    .filter((key) => includeZero || cost[key] > 0)
    .map((key) => `${labels[key]} ${formatNumber(cost[key])}`);
  return parts.length ? parts.join(" · ") : "No listed materials";
}

function categoryFor(group) {
  const match = Object.entries(categoryGroups)
    .find(([, names]) => names.has(group));
  return match?.[0] || "Special";
}

function getCurrentStructure() {
  return structures.find((structure) => structure.name === state.structureName);
}

function getCurrentStage() {
  return getStage(state.stageId);
}

function getStage(id) {
  return stages.find((stage) => stage.id === id);
}

function getField(record, label) {
  return record.fields.find((field) => field.label === label)?.value || "";
}

function cleanOptional(value) {
  const text = String(value || "").trim();
  return !text || /^n\/?a$/i.test(text) ? "" : text;
}

function parseAmount(value) {
  const text = String(value || "").trim().replaceAll(",", "").toLowerCase();
  if (!text || /^n\/?a$/.test(text)) return 0;
  const match = text.match(/^([\d.]+)\s*([kg])?$/);
  if (!match) return 0;
  return Number(match[1]) * (match[2] === "k" ? 1000 : 1);
}

function compareStages(a, b) {
  const tierA = a.tier ?? 999;
  const tierB = b.tier ?? 999;
  return tierA - tierB || a.stageName.localeCompare(b.stageName);
}

function clampQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(999, Math.max(1, Math.floor(numeric)));
}

function resourceLabel(key) {
  return {
    wood: "Wood",
    stone: "Stone",
    metal: "Metal",
    gold: "Gold",
    prom: "Prominence",
    health: "Total health",
  }[key];
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cryptoRandomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadPlan() {
  try {
    const stored = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((line) => line && typeof line.stageId === "string")
      .map((line) => ({
        id: String(line.id || cryptoRandomId()),
        stageId: line.stageId,
        quantity: clampQuantity(line.quantity),
        mode: line.mode === "stage" ? "stage" : "total",
      }));
  } catch {
    return [];
  }
}

function savePlan() {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(state.plan));
  } catch {
    // The calculator still works when storage is unavailable.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
