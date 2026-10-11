const sourceData = window.MO2_DATA;
const BASE_INPUT = 10000;
const INVENTORY_STORAGE_KEY = "nave-reverse-inventory-v3";
const PROCESS_METHODS = [
  "Attractor",
  "Blast Furnace",
  "Crusher",
  "Fabricula",
  "Furnace",
  "Greater Natorus",
  "Grinder",
  "Grizzly",
  "Hearth",
  "Herbologium",
  "Kiln",
  "Natorus",
  "Press",
];
const METHOD_SUFFIX_PATTERN = new RegExp(
  `\\s+-\\s+(?:${PROCESS_METHODS.map(escapeRegExp).join("|")})$`,
  "i",
);

const recipes = buildAllRecipes();
const outputMaterials = [...new Set(
  recipes.flatMap((recipe) => recipe.outputs.map((output) => output.name)),
)].sort((a, b) => a.localeCompare(b));
const ingredientMaterials = [...new Set(
  recipes.flatMap((recipe) => recipe.ingredients.map((item) => item.name)),
)].sort((a, b) => a.localeCompare(b));
const groups = [...new Set(recipes.map((recipe) => recipe.group))]
  .sort((a, b) => a.localeCompare(b));
const commonMaterials = [
  "Granum",
  "Calx",
  "Saburra",
  "Tephra",
  "Water",
  "Coal",
  "Coke",
  "Calx Powder",
  "Bor",
  "Rock Oil",
].filter((material) => ingredientMaterials.includes(material));

const query = new URLSearchParams(window.location.search);
const requestedTarget = query.get("material");
const requestedAmount = Number(query.get("amount"));

const state = {
  mode: query.get("mode") === "target" ? "target" : "inventory",
  inventory: loadInventory(),
  target: outputMaterials.includes(requestedTarget) ? requestedTarget : selectInitialTarget(),
  amount: Number.isFinite(requestedAmount) && requestedAmount > 0
    ? clampAmount(requestedAmount)
    : 1000,
  includeBonus: false,
  showNearMatches: true,
  enabledGroups: new Set(groups),
  search: "",
};

const els = {
  materialCount: document.querySelector("#materialCount"),
  routeCount: document.querySelector("#routeCount"),
  modeTabs: document.querySelector(".reverse-mode-tabs"),
  inventoryModeTab: document.querySelector("#inventoryModeTab"),
  targetModeTab: document.querySelector("#targetModeTab"),
  inventoryPanel: document.querySelector("#inventoryPanel"),
  targetPanel: document.querySelector("#targetPanel"),
  inventoryMaterialInput: document.querySelector("#inventoryMaterialInput"),
  inventoryMaterialOptions: document.querySelector("#inventoryMaterialOptions"),
  addMaterialBtn: document.querySelector("#addMaterialBtn"),
  quickMaterials: document.querySelector("#quickMaterials"),
  clearInventoryBtn: document.querySelector("#clearInventoryBtn"),
  inventoryCount: document.querySelector("#inventoryCount"),
  selectedInventory: document.querySelector("#selectedInventory"),
  targetSelect: document.querySelector("#targetSelect"),
  amountInput: document.querySelector("#amountInput"),
  cladeBonus: document.querySelector("#cladeBonus"),
  showNearMatches: document.querySelector("#showNearMatches"),
  nearMatchTitle: document.querySelector("#nearMatchTitle"),
  nearMatchCopy: document.querySelector("#nearMatchCopy"),
  groupSummary: document.querySelector("#groupSummary"),
  groupFilters: document.querySelector("#groupFilters"),
  summaryTitle: document.querySelector("#summaryTitle"),
  summaryCopy: document.querySelector("#summaryCopy"),
  primaryMetricLabel: document.querySelector("#primaryMetricLabel"),
  secondaryMetricLabel: document.querySelector("#secondaryMetricLabel"),
  matchingCount: document.querySelector("#matchingCount"),
  secondaryCount: document.querySelector("#secondaryCount"),
  bestRoute: document.querySelector("#bestRoute"),
  resultsKicker: document.querySelector("#resultsKicker"),
  resultsHeading: document.querySelector("#resultsHeading"),
  routeSearch: document.querySelector("#routeSearch"),
  routeResults: document.querySelector("#routeResults"),
  emptyRoutes: document.querySelector("#emptyRoutes"),
  dataStamp: document.querySelector("#dataStamp"),
};

function buildAllRecipes() {
  const found = [
    ...buildProcessRecipes("Ore Extraction & Refining", () => "Extraction", 0.03),
    ...buildProcessRecipes(
      "Alchemy & Botany Extraction",
      (record) => record.section || "Alchemy",
      0.05,
    ),
    ...buildRefiningRecipes(),
    ...buildButcheryRecipes(),
  ].filter(Boolean);

  const deduped = new Map();
  found.forEach((recipe) => {
    const key = [
      recipe.group,
      recipe.method,
      ...recipe.ingredients.map((item) => `${item.name}:${item.amount}`),
      ...recipe.outputs.map((item) => `${item.name}:${item.amount}`),
    ].join("|");
    if (!deduped.has(key)) deduped.set(key, recipe);
  });
  return [...deduped.values()];
}

function buildProcessRecipes(sheetName, groupResolver, bonusRate) {
  let currentInput = "";
  let currentMethod = "";

  return sourceData.records
    .filter((record) => record.sheet === sheetName && record.type === "Recipe")
    .map((record) => {
      const parsedInput = parseProcessInput(
        getField(record, "Material (10k)") || stripMethod(record.title),
      );
      const input = parsedInput.name;
      const baseInput = parsedInput.amount;
      if (!input || input === "Note:") return null;

      if (`${input}:${baseInput}` !== currentInput) {
        currentInput = `${input}:${baseInput}`;
        currentMethod = "";
      }

      const explicitMethod = getField(record, "Machine") || inferMethod(record.title);
      if (PROCESS_METHODS.includes(explicitMethod)) currentMethod = explicitMethod;

      const outputs = parseOutputs(record);
      if (!outputs.length) return null;

      const catalyst = parseNamedAmount(getField(record, "Catalyst") || "N/A");
      if (currentMethod === "Furnace" && input === "Coal" && catalyst.name === "Calx Powder") {
        const pitch = outputs.find((output) => output.name === "Pitch");
        if (pitch && pitch.amount === null) pitch.amount = 418;
      }
      const ingredients = [ingredient("Main material", input, baseInput)];
      if (!(catalyst.name === "None" && catalyst.amount === 0)) {
        ingredients.push(ingredient("Catalyst", catalyst.name, catalyst.amount));
      }

      return createRecipe({
        id: record.id,
        group: groupResolver(record),
        method: currentMethod || "Unspecified method",
        input,
        ingredients,
        outputs,
        bonusRate,
      });
    })
    .filter(Boolean);
}

function buildRefiningRecipes() {
  return sourceData.records
    .map((record) => {
      const output = getField(record, "Metal Refining");
      const primary = getField(record, "2 Units");
      const secondary = getField(record, "1 Unit");
      const tertiary = getField(record, "1 Unit 2");
      if (!output || !primary || !secondary || !tertiary) return null;

      return createRecipe({
        id: `reverse-refine-${slugify(output)}-${slugify(primary)}`,
        group: "Refining",
        method: "Refining",
        input: primary,
        ingredients: [
          ingredient("2 parts", primary, BASE_INPUT),
          ingredient("1 part", secondary, BASE_INPUT / 2),
          ingredient("1 part", tertiary, BASE_INPUT / 2),
        ],
        outputs: [{ name: output, amount: 7000 }],
        bonusRate: 0.03,
      });
    })
    .filter(Boolean);
}

function buildButcheryRecipes() {
  return sourceData.records
    .filter((record) => record.type === "Butchery")
    .map((record) => {
      const outputs = record.fields
        .filter((field) => /^Butchery Table Yields|^Yield \d+/i.test(field.label))
        .map((field) => parseNamedAmount(field.value))
        .filter((output) => output.name && !/^(values needed|nyi)$/i.test(output.name));
      if (!outputs.length) return null;

      const input = getField(record, "Carcass (10k)") || record.title;
      return createRecipe({
        id: `reverse-${record.id}`,
        group: "Butchery",
        method: "Butchery Table",
        input,
        ingredients: [ingredient("Carcass", input, BASE_INPUT)],
        outputs,
        bonusRate: 0.1,
      });
    })
    .filter(Boolean);
}

function createRecipe(recipe) {
  const searchText = [
    recipe.group,
    recipe.method,
    recipe.input,
    ...recipe.ingredients.map((item) => item.name),
    ...recipe.outputs.map((item) => item.name),
  ].join(" ").toLowerCase();
  return { ...recipe, searchText };
}

function ingredient(role, name, amount) {
  return { role, name, amount };
}

function parseOutputs(record) {
  return record.fields
    .filter((field) => /^Yield(?:s|\s|\b)/i.test(field.label))
    .filter((field) => !/^needs verification/i.test(String(field.value || "").trim()))
    .map((field) => parseNamedAmount(field.value))
    .filter((output) => output.name);
}

function parseNamedAmount(value) {
  const text = String(value || "").trim();
  if (!text || /^n\/?a$/i.test(text)) return { name: "None", amount: 0 };

  const match = text.match(/^(.*?)\s*\(([\d,]+|\?)\)(?:\s*,.*)?$/);
  if (!match) {
    const uncertain = text.match(/^(.*?)\s*\([^)]*\?[^)]*\)\s*$/);
    return { name: uncertain ? uncertain[1].trim() : text, amount: null };
  }
  return {
    name: match[1].trim(),
    amount: match[2] === "?" ? null : Number(match[2].replaceAll(",", "")),
  };
}

function parseProcessInput(value) {
  const parsed = parseNamedAmount(value);
  return {
    name: parsed.name,
    amount: parsed.amount !== null && parsed.amount > 0 ? parsed.amount : BASE_INPUT,
  };
}

function getField(record, label) {
  return record.fields.find((field) => field.label === label)?.value || "";
}

function inferMethod(title) {
  return PROCESS_METHODS.find(
    (method) => new RegExp(`\\s+-\\s+${escapeRegExp(method)}$`, "i").test(title),
  ) || "";
}

function stripMethod(title) {
  return String(title || "").replace(METHOD_SUFFIX_PATTERN, "").trim();
}

function selectInitialTarget() {
  for (const preferred of ["Steel", "Coke", "Pig Iron", "Coal"]) {
    if (outputMaterials.includes(preferred)) return preferred;
  }
  return outputMaterials[0] || "";
}

function init() {
  els.materialCount.textContent = outputMaterials.length.toLocaleString();
  els.routeCount.textContent = recipes.length.toLocaleString();
  els.dataStamp.textContent = `Data generated ${formatDate(sourceData.meta.generatedAt)}`;

  renderInventoryOptions();
  renderTargetOptions();
  renderGroupFilters();
  attachEvents();
  render();
  window.lucide?.createIcons();
}

function attachEvents() {
  els.modeTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    render();
    syncUrl();
  });

  els.addMaterialBtn.addEventListener("click", addMaterialFromInput);
  els.inventoryMaterialInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addMaterialFromInput();
  });

  els.quickMaterials.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quick-material]");
    if (!button) return;
    addInventoryMaterial(button.dataset.quickMaterial, BASE_INPUT);
  });

  els.clearInventoryBtn.addEventListener("click", () => {
    state.inventory.clear();
    persistInventory();
    renderInventory();
    renderResults();
  });

  els.selectedInventory.addEventListener("input", (event) => {
    const input = event.target.closest("[data-inventory-amount]");
    const row = event.target.closest("[data-material-row]");
    if (!input || !row) return;
    state.inventory.set(row.dataset.material, clampAmount(input.value));
    persistInventory();
    renderResults();
  });

  els.selectedInventory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-material]");
    const row = event.target.closest("[data-material-row]");
    if (!button || !row) return;
    state.inventory.delete(row.dataset.material);
    persistInventory();
    renderInventory();
    renderResults();
  });

  els.targetSelect.addEventListener("change", () => {
    state.target = els.targetSelect.value;
    renderResults();
    syncUrl();
  });

  els.amountInput.addEventListener("input", () => {
    state.amount = clampAmount(els.amountInput.value);
    renderResults();
    syncUrl();
  });

  document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      state.amount = Number(button.dataset.amount);
      els.amountInput.value = state.amount;
      renderResults();
      syncUrl();
    });
  });

  els.cladeBonus.addEventListener("change", () => {
    state.includeBonus = els.cladeBonus.checked;
    renderResults();
  });

  els.showNearMatches.addEventListener("change", () => {
    state.showNearMatches = els.showNearMatches.checked;
    renderResults();
  });

  els.groupFilters.addEventListener("change", (event) => {
    const input = event.target.closest("[data-group]");
    if (!input) return;
    if (input.checked) {
      state.enabledGroups.add(input.dataset.group);
    } else {
      state.enabledGroups.delete(input.dataset.group);
    }
    renderGroupSummary();
    renderResults();
  });

  els.routeSearch.addEventListener("input", () => {
    state.search = els.routeSearch.value.trim().toLowerCase();
    renderResults();
  });
}

function addMaterialFromInput() {
  const requested = els.inventoryMaterialInput.value.trim();
  const material = ingredientMaterials.find(
    (item) => item.localeCompare(requested, undefined, { sensitivity: "accent" }) === 0,
  );
  if (!material) {
    els.inventoryMaterialInput.setCustomValidity("Choose a material from the list.");
    els.inventoryMaterialInput.reportValidity();
    return;
  }

  els.inventoryMaterialInput.setCustomValidity("");
  els.inventoryMaterialInput.value = "";
  addInventoryMaterial(material, state.inventory.get(material) || BASE_INPUT);
}

function addInventoryMaterial(material, amount) {
  if (!ingredientMaterials.includes(material)) return;
  state.inventory.set(material, clampAmount(amount));
  persistInventory();
  renderInventory();
  renderResults();
}

function render() {
  renderMode();
  renderInventory();
  els.targetSelect.value = state.target;
  els.amountInput.value = state.amount;
  els.cladeBonus.checked = state.includeBonus;
  els.showNearMatches.checked = state.showNearMatches;
  renderGroupSummary();
  renderResults();
  window.lucide?.createIcons();
}

function renderMode() {
  const inventoryMode = state.mode === "inventory";
  els.inventoryPanel.hidden = !inventoryMode;
  els.targetPanel.hidden = inventoryMode;
  els.inventoryModeTab.classList.toggle("active", inventoryMode);
  els.targetModeTab.classList.toggle("active", !inventoryMode);
  els.inventoryModeTab.setAttribute("aria-selected", String(inventoryMode));
  els.targetModeTab.setAttribute("aria-selected", String(!inventoryMode));

  if (els.nearMatchTitle && els.nearMatchCopy) {
    els.nearMatchTitle.textContent = inventoryMode ? "Show near matches" : "Show incomplete routes";
    els.nearMatchCopy.textContent = inventoryMode
      ? "Includes recipes missing one inventory material"
      : "Includes workbook routes with an unknown yield";
  }
}

function renderInventoryOptions() {
  els.inventoryMaterialOptions.innerHTML = ingredientMaterials
    .map((material) => `<option value="${escapeHtml(material)}"></option>`)
    .join("");
  els.quickMaterials.innerHTML = commonMaterials
    .map((material) => `<button type="button" data-quick-material="${escapeHtml(material)}">${escapeHtml(material)}</button>`)
    .join("");
}

function renderInventory() {
  const entries = [...state.inventory.entries()]
    .sort(([a], [b]) => a.localeCompare(b));
  els.inventoryCount.textContent = `${entries.length.toLocaleString()} ${entries.length === 1 ? "material" : "materials"}`;
  els.clearInventoryBtn.disabled = entries.length === 0;

  if (!entries.length) {
    els.selectedInventory.innerHTML = `<div class="inventory-empty">No materials selected.</div>`;
  } else {
    els.selectedInventory.innerHTML = entries
      .map(([material, amount]) => `<div class="inventory-row" data-material-row data-material="${escapeHtml(material)}">
        <div>
          <strong title="${escapeHtml(material)}">${escapeHtml(material)}</strong>
          <small>Available units</small>
        </div>
        <input
          type="number"
          min="1"
          max="100000000"
          step="1"
          value="${amount}"
          aria-label="${escapeHtml(material)} available amount"
          data-inventory-amount
        />
        <button type="button" aria-label="Remove ${escapeHtml(material)}" data-remove-material>
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>`)
      .join("");
  }

  els.quickMaterials.querySelectorAll("[data-quick-material]").forEach((button) => {
    button.classList.toggle("selected", state.inventory.has(button.dataset.quickMaterial));
  });
  window.lucide?.createIcons();
}

function renderTargetOptions() {
  const grouped = new Map();
  outputMaterials.forEach((material) => {
    const routeGroups = [...new Set(
      recipes
        .filter((recipe) => recipe.outputs.some((output) => output.name === material))
        .map((recipe) => recipe.group),
    )].sort();
    const group = routeGroups.length === 1 ? routeGroups[0] : "Multiple processes";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(material);
  });

  els.targetSelect.innerHTML = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => `<optgroup label="${escapeHtml(group)}">
      ${items.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
    </optgroup>`)
    .join("");
}

function renderGroupFilters() {
  els.groupFilters.innerHTML = groups
    .map((group) => `<label class="group-chip">
      <input type="checkbox" data-group="${escapeHtml(group)}" checked />
      <span>${escapeHtml(group)}</span>
    </label>`)
    .join("");
}

function renderGroupSummary() {
  els.groupSummary.textContent = `${state.enabledGroups.size} of ${groups.length} enabled`;
}

function renderResults() {
  if (state.mode === "inventory") {
    renderInventoryResults();
  } else {
    renderTargetResults();
  }
}

function renderInventoryResults() {
  els.resultsKicker.textContent = "Inventory routes";
  els.resultsHeading.textContent = "Recipes you can run";
  els.primaryMetricLabel.textContent = "Ready now";
  els.secondaryMetricLabel.textContent = "Near matches";

  if (!state.inventory.size) {
    els.summaryTitle.textContent = "Add your materials";
    els.summaryCopy.textContent = "Your craftable routes will appear here.";
    els.matchingCount.textContent = "0";
    els.secondaryCount.textContent = "0";
    els.bestRoute.innerHTML = "";
    els.routeResults.innerHTML = "";
    renderEmptyState("package-plus", "Add a material to begin", "Production routes will update as your inventory changes.");
    return;
  }

  const candidates = recipes
    .filter((recipe) => state.enabledGroups.has(recipe.group))
    .filter((recipe) => !state.search || recipe.searchText.includes(state.search))
    .map(calculateInventoryRoute);
  const ready = candidates
    .filter((route) => route.missing.length === 0)
    .sort(compareInventoryRoutes);
  const near = candidates
    .filter((route) => route.missing.length === 1)
    .sort(compareInventoryRoutes);
  const visible = state.showNearMatches ? [...ready, ...near] : ready;

  els.summaryTitle.textContent = `${state.inventory.size.toLocaleString()} materials selected`;
  els.summaryCopy.textContent = state.includeBonus
    ? "Relevant clade bonuses are included in projected outputs."
    : "Base yields are shown without clade bonuses.";
  els.matchingCount.textContent = ready.length.toLocaleString();
  els.secondaryCount.textContent = near.length.toLocaleString();
  renderInventoryHighlight(ready[0]);

  els.routeResults.innerHTML = visible.map(inventoryRouteCard).join("");
  if (visible.length) {
    els.emptyRoutes.hidden = true;
  } else {
    renderEmptyState("package-x", "No matching recipes", "Add another material or enable another process.");
  }
  window.lucide?.createIcons();
}

function calculateInventoryRoute(recipe) {
  const missing = recipe.ingredients
    .filter((item) => !state.inventory.has(item.name))
    .map((item) => item.name);
  const hasUnknownRequirement = recipe.ingredients.some((item) => item.amount === null);
  let scale = null;

  if (!missing.length && !hasUnknownRequirement) {
    const ratios = recipe.ingredients.map(
      (item) => state.inventory.get(item.name) / item.amount,
    );
    scale = Math.min(...ratios);
  }

  const yieldMultiplier = state.includeBonus ? 1 + recipe.bonusRate : 1;
  const outputs = recipe.outputs.map((output) => ({
    ...output,
    produced: scale === null || output.amount === null
      ? null
      : Math.floor(output.amount * scale * yieldMultiplier),
  }));
  const requirements = recipe.ingredients.map((item) => ({
    ...item,
    required: scale === null || item.amount === null
      ? item.amount
      : Math.ceil(item.amount * scale),
    available: state.inventory.get(item.name) ?? null,
  }));

  return {
    recipe,
    missing,
    scale,
    outputs,
    requirements,
  };
}

function compareInventoryRoutes(a, b) {
  return a.missing.length - b.missing.length
    || a.recipe.group.localeCompare(b.recipe.group)
    || a.recipe.method.localeCompare(b.recipe.method)
    || a.recipe.input.localeCompare(b.recipe.input);
}

function renderInventoryHighlight(route) {
  if (!route) {
    els.bestRoute.innerHTML = `<span class="best-route-label">No complete route</span>
      <strong>Add one of the missing materials</strong>
      <span>Near matches below show the shortest path to another recipe.</span>`;
    return;
  }

  const output = route.outputs.find((item) => item.produced !== null) || route.outputs[0];
  const outputText = output?.produced === null
    ? `Unknown ${output?.name || "output"}`
    : `${formatNumber(output.produced)} ${output.name}`;
  els.bestRoute.innerHTML = `<span class="best-route-label">Ready route</span>
    <strong>${escapeHtml(route.recipe.input)} in ${escapeHtml(route.recipe.method)}</strong>
    <span>${escapeHtml(outputText)}</span>`;
}

function inventoryRouteCard(route) {
  const ready = route.missing.length === 0;
  const firstOutput = route.outputs[0];
  const outputSummary = ready
    ? firstOutput.produced === null
      ? `Unknown ${firstOutput.name}`
      : `${formatNumber(firstOutput.produced)} ${firstOutput.name}`
    : `Missing ${route.missing[0]}`;
  const ingredientRows = route.requirements
    .map((item) => {
      const isMissing = !state.inventory.has(item.name);
      const required = item.required === null ? "Unknown" : formatNumber(item.required);
      const status = isMissing
        ? "Missing"
        : `${formatNumber(item.available)} owned / ${required} used`;
      return `<li class="${isMissing ? "missing" : ""}">
        <span>${escapeHtml(item.role)} - ${escapeHtml(item.name)}</span>
        <span>${escapeHtml(status)}</span>
      </li>`;
    })
    .join("");
  const outputRows = route.outputs
    .map((output) => `<li>
      <span>${escapeHtml(output.name)}</span>
      <span>${output.produced === null ? "Unknown" : formatNumber(output.produced)}</span>
    </li>`)
    .join("");
  const note = ready
    ? "Maximum output from the limiting selected material."
    : `Add ${route.missing.map(escapeHtml).join(", ")} to run this recipe.`;

  return `<article class="route-card ${ready ? "ready" : "near"}">
    <header class="route-card-header">
      <div>
        <span class="eyebrow">${escapeHtml(route.recipe.group)}</span>
        <h3>${escapeHtml(route.recipe.input)}</h3>
      </div>
      <div class="route-badges">
        <span class="route-badge group">${escapeHtml(route.recipe.method)}</span>
        <span class="route-badge ${ready ? "ready" : "near"}">${ready ? "Ready" : "Near match"}</span>
      </div>
    </header>
    <div class="route-flow">
      <div>
        <span>Process</span>
        <strong>${escapeHtml(route.recipe.method)}</strong>
      </div>
      <i data-lucide="arrow-right" aria-hidden="true"></i>
      <div class="route-flow-output">
        <span>${ready ? "Maximum result" : "Needed next"}</span>
        <strong>${escapeHtml(outputSummary)}</strong>
      </div>
    </div>
    <div class="route-card-body">
      <ul class="ingredient-list">${ingredientRows}</ul>
      ${ready ? `<ul class="output-list">${outputRows}</ul>` : ""}
      <div class="card-note">${note}</div>
    </div>
  </article>`;
}

function renderTargetResults() {
  const amount = clampAmount(state.amount);
  els.amountInput.value = amount;
  els.resultsKicker.textContent = "Target routes";
  els.resultsHeading.textContent = "Ways to produce it";
  els.primaryMetricLabel.textContent = "Matching routes";
  els.secondaryMetricLabel.textContent = "Known yields";

  const matching = recipes
    .filter((recipe) => recipe.outputs.some((output) => output.name === state.target))
    .filter((recipe) => state.enabledGroups.has(recipe.group))
    .map((recipe) => calculateTargetRoute(recipe, state.target, amount))
    .filter((route) => state.showNearMatches || route.target.amount !== null)
    .filter((route) => !state.search || route.recipe.searchText.includes(state.search))
    .sort(compareTargetRoutes);
  const known = matching.filter((route) => route.target.amount !== null);

  els.summaryTitle.textContent = `${formatNumber(amount)} ${state.target}`;
  els.summaryCopy.textContent = state.includeBonus
    ? "Relevant clade bonuses are included in the required load."
    : "Base yields are shown without clade bonuses.";
  els.matchingCount.textContent = matching.length.toLocaleString();
  els.secondaryCount.textContent = known.length.toLocaleString();
  renderTargetHighlight(known[0]);

  els.routeResults.innerHTML = matching.map(targetRouteCard).join("");
  if (matching.length) {
    els.emptyRoutes.hidden = true;
  } else {
    renderEmptyState("search-x", "No production routes match", "Enable another process or clear the route filter.");
  }
  window.lucide?.createIcons();
}

function calculateTargetRoute(recipe, targetName, wantedAmount) {
  const target = recipe.outputs.find((output) => output.name === targetName);
  if (!target || target.amount === null || target.amount <= 0) {
    return {
      recipe,
      target: { name: targetName, amount: null },
      ingredients: recipe.ingredients.map((item) => ({ ...item, required: item.amount })),
      coProducts: recipe.outputs.filter((output) => output.name !== targetName)
        .map((output) => ({ ...output, produced: output.amount })),
      primaryLoad: Number.POSITIVE_INFINITY,
      totalLoad: null,
    };
  }

  const yieldMultiplier = state.includeBonus ? 1 + recipe.bonusRate : 1;
  const primary = recipe.ingredients[0];
  const rawScale = wantedAmount / (target.amount * yieldMultiplier);
  const primaryRequired = Math.ceil(primary.amount * rawScale);
  const scale = primaryRequired / primary.amount;
  const ingredients = recipe.ingredients.map((item, index) => ({
    ...item,
    required: item.amount === null
      ? null
      : index === 0
        ? primaryRequired
        : Math.ceil(item.amount * scale),
  }));
  const producedTarget = Math.floor(target.amount * scale * yieldMultiplier);
  const coProducts = recipe.outputs
    .filter((output) => output.name !== targetName)
    .map((output) => ({
      ...output,
      produced: output.amount === null
        ? null
        : Math.floor(output.amount * scale * yieldMultiplier),
    }));
  const hasUnknownLoad = ingredients.some((item) => item.required === null);
  const totalLoad = hasUnknownLoad
    ? null
    : ingredients.reduce((sum, item) => sum + item.required, 0);

  return {
    recipe,
    target: { name: targetName, amount: producedTarget },
    ingredients,
    coProducts,
    primaryLoad: primaryRequired,
    totalLoad,
  };
}

function compareTargetRoutes(a, b) {
  const aKnown = a.target.amount !== null;
  const bKnown = b.target.amount !== null;
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  return a.primaryLoad - b.primaryLoad
    || a.recipe.method.localeCompare(b.recipe.method)
    || a.recipe.input.localeCompare(b.recipe.input);
}

function renderTargetHighlight(route) {
  if (!route) {
    els.bestRoute.innerHTML = `<span class="best-route-label">No numeric route</span>
      <strong>Try another process filter</strong>
      <span>The workbook has no calculable path in the current selection.</span>`;
    return;
  }

  const primary = route.ingredients[0];
  const carry = route.totalLoad === null
    ? "Known load unavailable"
    : `${formatNumber(route.totalLoad)} total units`;
  els.bestRoute.innerHTML = `<span class="best-route-label">Smallest primary load</span>
    <strong>${formatNumber(primary.required)} ${escapeHtml(primary.name)}</strong>
    <span>${escapeHtml(route.recipe.method)} - ${carry}</span>`;
}

function targetRouteCard(route) {
  const unknown = route.target.amount === null;
  const primary = route.ingredients[0];
  const ingredientRows = route.ingredients
    .map((item) => `<li>
      <span>${escapeHtml(item.role)} - ${escapeHtml(item.name)}</span>
      <span>${item.required === null ? "Unknown" : formatNumber(item.required)}</span>
    </li>`)
    .join("");
  const coProducts = route.coProducts.length
    ? route.coProducts
      .map((output) => `${escapeHtml(output.name)} ${output.produced === null ? "unknown" : formatNumber(output.produced)}`)
      .join(" - ")
    : "No additional outputs documented";

  return `<article class="route-card ${unknown ? "near" : "ready"}">
    <header class="route-card-header">
      <div>
        <span class="eyebrow">${escapeHtml(route.recipe.group)}</span>
        <h3>${escapeHtml(route.recipe.input)}</h3>
      </div>
      <div class="route-badges">
        <span class="route-badge group">${escapeHtml(route.recipe.method)}</span>
        <span class="route-badge ${unknown ? "near" : "ready"}">${unknown ? "Unknown yield" : "Calculated"}</span>
      </div>
    </header>
    <div class="route-flow">
      <div>
        <span>Primary load</span>
        <strong>${unknown ? "Base recipe" : `${formatNumber(primary.required)} ${escapeHtml(primary.name)}`}</strong>
      </div>
      <i data-lucide="arrow-right" aria-hidden="true"></i>
      <div class="route-flow-output">
        <span>Expected ${escapeHtml(route.target.name)}</span>
        <strong>${unknown ? "Unknown" : formatNumber(route.target.amount)}</strong>
      </div>
    </div>
    <div class="route-card-body">
      <ul class="ingredient-list">${ingredientRows}</ul>
      <div class="card-note"><strong>Co-products:</strong> ${coProducts}</div>
    </div>
  </article>`;
}

function renderEmptyState(icon, title, copy) {
  els.emptyRoutes.hidden = false;
  els.emptyRoutes.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(copy)}</span>`;
  window.lucide?.createIcons();
}

function loadInventory() {
  try {
    const stored = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY) || "{}");
    return new Map(
      Object.entries(stored)
        .filter(([material, amount]) => ingredientMaterials.includes(material) && Number(amount) > 0)
        .map(([material, amount]) => [material, clampAmount(amount)]),
    );
  } catch {
    return new Map();
  }
}

function persistInventory() {
  localStorage.setItem(
    INVENTORY_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(state.inventory.entries())),
  );
}

function syncUrl() {
  const next = new URL(window.location.href);
  next.searchParams.set("mode", state.mode);
  if (state.mode === "target") {
    next.searchParams.set("material", state.target);
    next.searchParams.set("amount", String(state.amount));
  }
  history.replaceState(null, "", next);
}

function clampAmount(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 1) return 1;
  return Math.min(number, 100000000);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "from the source workbook";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
