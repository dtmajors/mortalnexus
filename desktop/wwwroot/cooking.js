const sourceData = window.MO2_DATA;
const cookingReference = window.MO2_COOKING_REFERENCE || {
  meta: {},
  ingredients: [],
  ratios: [],
  testedRecipes: [],
};

const STAT_FIELDS = [
  { key: "health", label: "Health Nourishment", remote: "health" },
  { key: "stamina", label: "Stamina Nourishment", remote: "stamina" },
  { key: "mana", label: "Mana Nourishment", remote: "mana" },
  { key: "directHealing", label: "Direct Healing", remote: "healing" },
  { key: "directPoison", label: "Direct Poison", remote: "poison" },
  { key: "foodPoison", label: "Food Poison", remote: "foodpoison" },
  { key: "poisonOverTime", label: "Poison Over Time", remote: "poisonOT" },
  { key: "poisonLength", label: "Poison Length", remote: "poisonLen" },
  { key: "alcohol", label: "Alcohol", remote: "alcohol" },
  { key: "directMana", label: "Direct Mana", remote: "directMana" },
  { key: "healingOverTime", label: "Healing Over Time", remote: "healOT" },
  { key: "healingLength", label: "Healing Length", remote: "healLen" },
];

const ROLE_OPTIONS = [
  { value: "Grain", label: "Grain / Flour" },
  { value: "Liquid", label: "Liquid" },
  { value: "Fat", label: "Fat / Oil" },
  { value: "Filler", label: "Filler" },
  { value: "Fuel", label: "Fuel" },
];
const ROLE_VALUES = ROLE_OPTIONS.map((role) => role.value);
const SYNTHETIC_FUELS = ["Bor", "Brownwood", "Coal", "Firmwood", "Greywood", "Spongewood", "Whitewood"];
const RECIPE_PAGE_SIZE = 40;

const TOOL_NOTES = {
  "Baking Stone": "Bread and flour-forward recipes",
  "Cooking Pot": "Fried foods, stews, soups, boiled dishes, and dumplings",
  Turnspit: "Roasted and fuel-roasted food",
  "Baking Pot": "Pies and pot-baked dishes",
  "Fermentation Jar": "Beer and fermented food",
  "Steam Pot": "Steamed dishes",
  "Smoke Box": "Smoked and fuel-smoked food",
  "Cold Cook": "Ingredients consumed or prepared without a cooking appliance",
};

const TEMPLATES = cookingReference.ratios.map((ratio, index) => ({
  ...ratio,
  id: `${slugify(ratio.product)}-${index}`,
  description: describeRatio(ratio),
}));
const TOOLS = [...new Set([...TEMPLATES.map((item) => item.tool), "Cold Cook"])]
  .map((name) => ({ name, note: TOOL_NOTES[name] || "Tested community cooking method" }));
const testedRecipes = cookingReference.testedRecipes.map((recipe, index) => ({ ...recipe, id: index }));
const PRESETS = buildPresets();
const materials = buildMaterials();
const materialByName = new Map(materials.map((material) => [material.name, material]));
const materialByLowerName = new Map(materials.map((material) => [material.name.toLowerCase(), material]));
const materialTypes = [...new Set(materials.map((material) => material.type))]
  .sort((a, b) => a.localeCompare(b));

const state = {
  tool: normalizeRecipeTool(PRESETS[0]?.recipe.tool || "Baking Stone"),
  presetId: PRESETS[0]?.id || "",
  ingredients: PRESETS[0] ? ingredientsFromTestedRecipe(PRESETS[0].recipe) : [ingredient("Water", 1000, "Liquid")],
  materialSearch: "",
  materialType: "All types",
  materialSort: "stamina",
  reverseIngredients: [],
  recipeSearch: "",
  recipeMatchMode: "all",
  recipeTool: "All tools",
  recipeTier: "All tiers",
  recipeSort: "quality",
  recipePage: 1,
};

const els = {
  materialCount: document.querySelector("#materialCount"),
  templateCount: document.querySelector("#templateCount"),
  testedRecipeCount: document.querySelector("#testedRecipeCount"),
  toolSelect: document.querySelector("#toolSelect"),
  presetSelect: document.querySelector("#presetSelect"),
  loadPresetBtn: document.querySelector("#loadPresetBtn"),
  clearRecipeBtn: document.querySelector("#clearRecipeBtn"),
  ingredientCount: document.querySelector("#ingredientCount"),
  ingredientRows: document.querySelector("#ingredientRows"),
  addIngredientBtn: document.querySelector("#addIngredientBtn"),
  dishName: document.querySelector("#dishName"),
  ratioBadge: document.querySelector("#ratioBadge"),
  dishSummary: document.querySelector("#dishSummary"),
  totalAmount: document.querySelector("#totalAmount"),
  knownAmount: document.querySelector("#knownAmount"),
  resultIngredientCount: document.querySelector("#resultIngredientCount"),
  profileHeading: document.querySelector("#profileHeading"),
  profileContext: document.querySelector("#profileContext"),
  primaryStats: document.querySelector("#primaryStats"),
  reserveBalance: document.querySelector("#reserveBalance"),
  secondaryStats: document.querySelector("#secondaryStats"),
  recipeWarnings: document.querySelector("#recipeWarnings"),
  reverseIngredientInput: document.querySelector("#reverseIngredientInput"),
  reverseIngredientOptions: document.querySelector("#reverseIngredientOptions"),
  addReverseIngredientBtn: document.querySelector("#addReverseIngredientBtn"),
  clearReverseBtn: document.querySelector("#clearReverseBtn"),
  reverseIngredientChips: document.querySelector("#reverseIngredientChips"),
  recipeSearch: document.querySelector("#recipeSearch"),
  recipeMatchMode: document.querySelector("#recipeMatchMode"),
  recipeToolFilter: document.querySelector("#recipeToolFilter"),
  recipeTierFilter: document.querySelector("#recipeTierFilter"),
  recipeSort: document.querySelector("#recipeSort"),
  recipeResultCount: document.querySelector("#recipeResultCount"),
  recipeTableBody: document.querySelector("#recipeTableBody"),
  recipeTableEmpty: document.querySelector("#recipeTableEmpty"),
  recipePrevBtn: document.querySelector("#recipePrevBtn"),
  recipeNextBtn: document.querySelector("#recipeNextBtn"),
  recipePageLabel: document.querySelector("#recipePageLabel"),
  materialSearch: document.querySelector("#materialSearch"),
  materialTypeFilter: document.querySelector("#materialTypeFilter"),
  materialSort: document.querySelector("#materialSort"),
  materialTableBody: document.querySelector("#materialTableBody"),
  materialTableEmpty: document.querySelector("#materialTableEmpty"),
  dataStamp: document.querySelector("#dataStamp"),
};

function ingredient(name, amount, role) {
  return { name, amount, role };
}

function buildMaterials() {
  const merged = new Map();

  sourceData.records
    .filter((record) => record.type === "Material")
    .forEach((record) => {
      const name = getField(record, "Name") || record.title;
      if (!name) return;
      const stats = Object.fromEntries(
        STAT_FIELDS.map((field) => [field.key, parseNumber(getField(record, field.label))]),
      );
      merged.set(name.toLowerCase(), {
        id: record.id,
        name,
        type: getField(record, "Type") || "Unclassified",
        lore: "",
        stats,
        sources: ["MO2 INFO.xls"],
      });
    });

  cookingReference.ingredients.forEach((record, index) => {
    if (!record.name) return;
    const key = record.name.toLowerCase();
    const existing = merged.get(key);
    const remoteStats = Object.fromEntries(
      STAT_FIELDS.map((field) => [field.key, parseNumber(record[field.remote])]),
    );

    if (existing) {
      STAT_FIELDS.forEach((field) => {
        if (!Number.isFinite(existing.stats[field.key]) && Number.isFinite(remoteStats[field.key])) {
          existing.stats[field.key] = remoteStats[field.key];
        }
      });
      existing.lore = existing.lore || record.lore || "";
      if (existing.type === "Unclassified" && record.lore) existing.type = record.lore;
      existing.sources.push("Danimoth cooking data");
      return;
    }

    merged.set(key, {
      id: `cooking-${index}-${slugify(record.name)}`,
      name: record.name,
      type: record.lore || "Unclassified",
      lore: record.lore || "",
      stats: remoteStats,
      sources: ["Danimoth cooking data"],
    });
  });

  SYNTHETIC_FUELS.forEach((name) => {
    const key = name.toLowerCase();
    if (merged.has(key)) return;
    merged.set(key, {
      id: `fuel-${slugify(name)}`,
      name,
      type: "Fuel",
      lore: "",
      stats: emptyStats(),
      sources: ["Recipe support"],
    });
  });

  return [...merged.values()]
    .map((material) => ({
      ...material,
      hasStats: STAT_FIELDS.some((field) => Number.isFinite(material.stats[field.key])),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildPresets() {
  const seen = new Set();

  return testedRecipes
    .filter((recipe) => {
      const signature = [
        recipe.tool,
        recipe.mat,
        recipe.matAmt,
        recipe.liq,
        recipe.liqAmt,
        recipe.product,
        recipe.quality,
      ].join("|");
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .map((recipe) => ({
      id: `tested-${recipe.id}`,
      name: `${formatRecipeIngredients(recipe)} -> ${readableProduct(recipe.product)} (${recipe.quality})`,
      recipe,
    }))
    .sort((a, b) => {
      const toolOrder = normalizeRecipeTool(a.recipe.tool).localeCompare(normalizeRecipeTool(b.recipe.tool));
      return toolOrder || a.name.localeCompare(b.name);
    });
}

function init() {
  els.materialCount.textContent = materials.length.toLocaleString();
  els.templateCount.textContent = TEMPLATES.length.toLocaleString();
  els.testedRecipeCount.textContent = testedRecipes.length.toLocaleString();
  els.toolSelect.innerHTML = TOOLS
    .map((tool) => `<option value="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</option>`)
    .join("");
  els.toolSelect.value = state.tool;

  els.materialTypeFilter.innerHTML = ["All types", ...materialTypes]
    .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
    .join("");
  els.reverseIngredientOptions.innerHTML = materials
    .map((material) => `<option value="${escapeHtml(material.name)}"></option>`)
    .join("");

  const recipeTools = [...new Set(testedRecipes.map((recipe) => recipe.tool))].sort();
  const recipeTiers = [...new Set(testedRecipes.map((recipe) => recipe.tier))].sort();
  els.recipeToolFilter.innerHTML = ["All tools", ...recipeTools]
    .map((tool) => `<option value="${escapeHtml(tool)}">${escapeHtml(displayRecipeTool(tool))}</option>`)
    .join("");
  els.recipeTierFilter.innerHTML = ["All tiers", ...recipeTiers]
    .map((tier) => `<option value="${escapeHtml(tier)}">${escapeHtml(tier)}</option>`)
    .join("");

  els.dataStamp.textContent = `Reference refreshed ${formatDate(cookingReference.meta.generatedAt)}`;
  attachEvents();
  attachCookingViews();
  renderPresetOptions();
  renderIngredients();
  renderResults();
  renderReverseIngredients();
  renderRecipeTable();
  renderLibrary();
  window.lucide?.createIcons();
}

function attachCookingViews() {
  const tabs = [...document.querySelectorAll("[data-cooking-view]")];
  const panels = [...document.querySelectorAll("[data-cooking-panel]")];
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const target = tab.dataset.cookingView;
      for (const item of tabs) item.classList.toggle("is-active", item === tab);
      for (const panel of panels) panel.classList.toggle("is-active", panel.dataset.cookingPanel === target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== "nexus.search") return;
    if (String(event.data.query || "").trim()) {
      document.querySelector('[data-cooking-view="recipes"]')?.click();
    }
  });
}

function attachEvents() {
  els.toolSelect.addEventListener("change", () => {
    state.tool = els.toolSelect.value;
    renderPresetOptions();
    renderResults();
  });

  els.presetSelect.addEventListener("change", () => {
    state.presetId = els.presetSelect.value;
  });
  els.loadPresetBtn.addEventListener("click", loadSelectedPreset);
  els.clearRecipeBtn.addEventListener("click", resetRecipe);

  els.addIngredientBtn.addEventListener("click", () => {
    const material = materialByName.get("Water") || materials[0];
    state.ingredients.push(ingredient(material.name, 1000, inferRole(material)));
    renderIngredients();
    renderResults();
  });
  els.ingredientRows.addEventListener("change", handleIngredientChange);
  els.ingredientRows.addEventListener("input", handleIngredientInput);
  els.ingredientRows.addEventListener("click", handleIngredientClick);

  els.addReverseIngredientBtn.addEventListener("click", addReverseIngredient);
  els.reverseIngredientInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addReverseIngredient();
  });
  els.clearReverseBtn.addEventListener("click", () => {
    state.reverseIngredients = [];
    state.recipePage = 1;
    renderReverseIngredients();
    renderRecipeTable();
  });
  els.reverseIngredientChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-reverse]");
    if (!button) return;
    state.reverseIngredients = state.reverseIngredients.filter((name) => name !== button.dataset.removeReverse);
    state.recipePage = 1;
    renderReverseIngredients();
    renderRecipeTable();
  });

  els.recipeSearch.addEventListener("input", () => {
    state.recipeSearch = els.recipeSearch.value.trim().toLowerCase();
    state.recipePage = 1;
    renderRecipeTable();
  });
  els.recipeMatchMode.addEventListener("change", () => {
    state.recipeMatchMode = els.recipeMatchMode.value;
    state.recipePage = 1;
    renderRecipeTable();
  });
  els.recipeToolFilter.addEventListener("change", () => {
    state.recipeTool = els.recipeToolFilter.value;
    state.recipePage = 1;
    renderRecipeTable();
  });
  els.recipeTierFilter.addEventListener("change", () => {
    state.recipeTier = els.recipeTierFilter.value;
    state.recipePage = 1;
    renderRecipeTable();
  });
  els.recipeSort.addEventListener("change", () => {
    state.recipeSort = els.recipeSort.value;
    state.recipePage = 1;
    renderRecipeTable();
  });
  els.recipeTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-load-tested-recipe]");
    if (!button) return;
    const recipe = testedRecipes[Number(button.dataset.loadTestedRecipe)];
    if (recipe) loadTestedRecipe(recipe);
  });
  els.recipePrevBtn.addEventListener("click", () => {
    if (state.recipePage <= 1) return;
    state.recipePage -= 1;
    renderRecipeTable();
  });
  els.recipeNextBtn.addEventListener("click", () => {
    state.recipePage += 1;
    renderRecipeTable();
  });

  els.materialSearch.addEventListener("input", () => {
    state.materialSearch = els.materialSearch.value.trim().toLowerCase();
    renderLibrary();
  });
  els.materialTypeFilter.addEventListener("change", () => {
    state.materialType = els.materialTypeFilter.value;
    renderLibrary();
  });
  els.materialSort.addEventListener("change", () => {
    state.materialSort = els.materialSort.value;
    renderLibrary();
  });
  els.materialTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-material]");
    if (!button) return;
    const material = materialByName.get(button.dataset.addMaterial);
    if (!material) return;
    state.ingredients.push(ingredient(material.name, 1000, inferRole(material)));
    renderIngredients();
    renderResults();
  });
}

function resetRecipe() {
  if (PRESETS[0]) {
    state.tool = normalizeRecipeTool(PRESETS[0].recipe.tool);
    state.ingredients = ingredientsFromTestedRecipe(PRESETS[0].recipe);
    state.presetId = PRESETS[0].id;
  } else {
    state.tool = "Baking Stone";
    state.ingredients = [ingredient("Water", 1000, "Liquid")];
    state.presetId = "";
  }
  els.toolSelect.value = state.tool;
  renderPresetOptions();
  renderIngredients();
  renderResults();
}

function handleIngredientChange(event) {
  const row = event.target.closest("[data-ingredient-index]");
  if (!row) return;
  const item = state.ingredients[Number(row.dataset.ingredientIndex)];
  if (!item) return;

  if (event.target.matches("[data-material-select]")) {
    item.name = event.target.value;
    item.role = inferRole(materialByName.get(item.name));
    renderIngredients();
  } else if (event.target.matches("[data-role-select]")) {
    item.role = event.target.value;
  }
  renderResults();
}

function handleIngredientInput(event) {
  if (!event.target.matches("[data-amount-input]")) return;
  const row = event.target.closest("[data-ingredient-index]");
  const item = state.ingredients[Number(row?.dataset.ingredientIndex)];
  if (!item) return;
  item.amount = clampAmount(event.target.value);
  renderResults();
}

function handleIngredientClick(event) {
  const button = event.target.closest("[data-remove-ingredient]");
  if (!button || state.ingredients.length <= 1) return;
  state.ingredients.splice(Number(button.dataset.removeIngredient), 1);
  renderIngredients();
  renderResults();
}

function renderPresetOptions() {
  const available = PRESETS.filter((preset) => normalizeRecipeTool(preset.recipe.tool) === state.tool);
  if (!available.length) {
    state.presetId = "";
    els.presetSelect.innerHTML = '<option value="">Use reverse finder below</option>';
    els.presetSelect.disabled = true;
    els.loadPresetBtn.disabled = true;
    return;
  }

  if (!available.some((preset) => preset.id === state.presetId)) state.presetId = available[0].id;
  els.presetSelect.innerHTML = available
    .map((preset) => `<option value="${preset.id}">${escapeHtml(preset.name)}</option>`)
    .join("");
  els.presetSelect.value = state.presetId;
  els.presetSelect.disabled = false;
  els.loadPresetBtn.disabled = false;
}

function loadSelectedPreset() {
  const preset = PRESETS.find((candidate) => candidate.id === state.presetId);
  if (preset) loadTestedRecipe(preset.recipe, false);
}

function loadTestedRecipe(recipe, scroll = true) {
  state.tool = normalizeRecipeTool(recipe.tool);
  state.presetId = `tested-${recipe.id}`;
  state.ingredients = ingredientsFromTestedRecipe(recipe);
  els.toolSelect.value = state.tool;
  renderPresetOptions();
  renderIngredients();
  renderResults();
  if (scroll) document.querySelector(".cooking-workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ingredientsFromTestedRecipe(recipe) {
  const parts = recipeIngredients(recipe);
  const totalParts = parts.reduce((sum, part) => sum + (Number.isFinite(part.amount) ? part.amount : 0), 0);
  return parts.map((part) => {
    const amount = totalParts > 0 && Number.isFinite(part.amount)
      ? Math.max(1, Math.round(part.amount / totalParts * 10000))
      : 1000;
    return ingredient(part.name, amount, inferRole(materialByLowerName.get(part.name.toLowerCase())));
  });
}

function renderIngredients() {
  const materialOptions = materials
    .map((material) => `<option value="${escapeHtml(material.name)}">${escapeHtml(material.name)}</option>`)
    .join("");
  const roleOptions = ROLE_OPTIONS
    .map((role) => `<option value="${role.value}">${role.label}</option>`)
    .join("");

  els.ingredientRows.innerHTML = state.ingredients
    .map((item, index) => `<div class="ingredient-row" data-ingredient-index="${index}">
      <label>
        <span>Material</span>
        <select data-material-select aria-label="Ingredient ${index + 1} material">${materialOptions}</select>
      </label>
      <label>
        <span>Amount</span>
        <input data-amount-input aria-label="${escapeHtml(item.name)} amount" type="number" min="1" max="100000000" step="1" inputmode="numeric" value="${item.amount}" />
      </label>
      <label>
        <span>Recipe role</span>
        <select data-role-select aria-label="${escapeHtml(item.name)} recipe role">${roleOptions}</select>
      </label>
      <button class="ingredient-remove" type="button" data-remove-ingredient="${index}" aria-label="Remove ${escapeHtml(item.name)}" title="Remove ingredient" ${state.ingredients.length <= 1 ? "disabled" : ""}>
        <i data-lucide="trash-2" aria-hidden="true"></i>
      </button>
    </div>`)
    .join("");

  state.ingredients.forEach((item, index) => {
    const row = els.ingredientRows.querySelector(`[data-ingredient-index="${index}"]`);
    row.querySelector("[data-material-select]").value = item.name;
    row.querySelector("[data-role-select]").value = item.role;
  });
  els.ingredientCount.textContent = `${state.ingredients.length} selected`;
  window.lucide?.createIcons();
}

function renderResults() {
  const profile = calculateProfile();
  const exactRecipe = findExactTestedRecipe();
  const match = exactRecipe ? null : findBestTemplate(profile.roleTotals);
  const tool = TOOLS.find((candidate) => candidate.name === state.tool);
  const displayStats = exactRecipe ? statsFromReference(exactRecipe) : profile.stats;

  if (exactRecipe) {
    els.dishName.textContent = readableProduct(exactRecipe.product);
    els.ratioBadge.textContent = `${exactRecipe.quality} tested`;
    els.ratioBadge.className = "ratio-badge";
    els.dishSummary.textContent = `${formatRecipeIngredients(exactRecipe)} using ${displayRecipeTool(exactRecipe.tool)}. This exact ratio exists in the tested recipe library.`;
    els.profileHeading.textContent = "Recorded cooked outcome";
    els.profileContext.textContent = "Community-tested result; character skills and lores can change values";
  } else {
    els.dishName.textContent = match ? match.template.product : "Experimental Mix";
    els.ratioBadge.textContent = match
      ? match.score >= 0.9 ? "Ratio matched" : `${Math.round(match.score * 100)}% family match`
      : "No known ratio";
    els.ratioBadge.className = `ratio-badge ${match ? match.score >= 0.9 ? "" : "near" : "experimental"}`.trim();
    els.dishSummary.textContent = match
      ? `${match.template.description}. ${tool?.note || ""}`
      : tool?.note || "No documented named ratio for this tool.";
    els.profileHeading.textContent = "Weighted base profile";
    els.profileContext.textContent = "Before hidden tool, skill, and lore modifiers";
  }

  els.totalAmount.textContent = formatNumber(profile.totalAmount);
  els.knownAmount.textContent = formatNumber(profile.knownAmount);
  els.resultIngredientCount.textContent = state.ingredients.length.toLocaleString();

  const primary = [
    ["health", "Health nourishment", "health"],
    ["stamina", "Stamina nourishment", "stamina"],
    ["mana", "Mana nourishment", "mana"],
    ["foodPoison", "Food poison", "poison"],
  ];
  els.primaryStats.innerHTML = primary
    .map(([key, label, className]) => `<div class="primary-stat ${className}">
      <span>${label}</span>
      <strong>${formatStat(displayStats[key])}</strong>
    </div>`)
    .join("");

  const reserveMax = Math.max(displayStats.health || 0, displayStats.stamina || 0, displayStats.mana || 0, 1);
  els.reserveBalance.innerHTML = [
    ["health", "Health"],
    ["stamina", "Stamina"],
    ["mana", "Mana"],
  ].map(([key, label]) => `<div class="reserve-line ${key}">
    <span>${label}</span>
    <div class="reserve-track"><span style="width:${Math.max((displayStats[key] || 0) / reserveMax * 100, 1)}%"></span></div>
    <b>${formatStat(displayStats[key])}</b>
  </div>`).join("");

  const secondary = [
    ["directHealing", "Direct healing"],
    ["directMana", "Direct mana"],
    ["healingOverTime", "Healing over time"],
    ["healingLength", "Healing length"],
    ["directPoison", "Direct poison"],
    ["poisonOverTime", "Poison over time"],
    ["poisonLength", "Poison length"],
    ["alcohol", "Alcohol"],
  ];
  els.secondaryStats.innerHTML = secondary
    .map(([key, label]) => `<div class="secondary-stat"><span>${label}</span><strong>${formatStat(displayStats[key])}</strong></div>`)
    .join("");

  const warnings = [];
  if (profile.unknownAmount > 0 && !exactRecipe) {
    warnings.push(`${formatNumber(profile.unknownAmount)} units have no documented ingredient attributes and are excluded from the base profile.`);
  }
  if ((displayStats.foodPoison || 0) >= 0.3) warnings.push(`Food poison is elevated at ${formatStat(displayStats.foodPoison)}.`);
  if ((displayStats.directPoison || 0) > 0 || (displayStats.poisonOverTime || 0) > 0) {
    warnings.push("This recipe contains direct or over-time poison properties.");
  }
  warnings.push(exactRecipe
    ? "Recorded values come from a tested community recipe; your skills and lores can produce different results."
    : "Final cooked values depend on the selected tool, ingredient class, cooking skill, and lores.");
  els.recipeWarnings.innerHTML = warnings
    .map((warning, index) => `<div class="recipe-warning ${index === warnings.length - 1 ? "info" : ""}">${escapeHtml(warning)}</div>`)
    .join("");
}

function calculateProfile() {
  const stats = emptyNumericStats();
  const roleTotals = Object.fromEntries(ROLE_VALUES.map((role) => [role, 0]));
  let totalAmount = 0;
  let knownAmount = 0;

  state.ingredients.forEach((item) => {
    const amount = clampAmount(item.amount);
    const material = materialByName.get(item.name);
    totalAmount += amount;
    roleTotals[item.role] = (roleTotals[item.role] || 0) + amount;
    if (!material?.hasStats) return;
    knownAmount += amount;
    STAT_FIELDS.forEach((field) => {
      const value = material.stats[field.key];
      if (Number.isFinite(value)) stats[field.key] += value * amount;
    });
  });

  if (knownAmount > 0) {
    STAT_FIELDS.forEach((field) => {
      stats[field.key] /= knownAmount;
    });
  }
  return { stats, roleTotals, totalAmount, knownAmount, unknownAmount: totalAmount - knownAmount };
}

function findExactTestedRecipe() {
  const current = collapseIngredients(state.ingredients);
  if (!current.length || current.length > 2) return null;
  const currentNames = new Set(current.map((item) => item.name.toLowerCase()));
  const currentTotal = current.reduce((sum, item) => sum + item.amount, 0);
  if (!(currentTotal > 0)) return null;

  return testedRecipes
    .filter((recipe) => normalizeRecipeTool(recipe.tool) === state.tool)
    .filter((recipe) => {
      const parts = recipeIngredients(recipe);
      if (parts.length !== current.length) return false;
      if (!parts.every((part) => currentNames.has(part.name.toLowerCase()))) return false;
      if (parts.length === 1 || parts.some((part) => !Number.isFinite(part.amount))) return true;
      const recipeTotal = parts.reduce((sum, part) => sum + part.amount, 0);
      return parts.every((part) => {
        const currentPart = current.find((item) => item.name.toLowerCase() === part.name.toLowerCase());
        return Math.abs(currentPart.amount / currentTotal - part.amount / recipeTotal) <= 0.005;
      });
    })
    .sort((a, b) => (b.qScore || 0) - (a.qScore || 0))[0] || null;
}

function collapseIngredients(items) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = item.name.toLowerCase();
    const existing = grouped.get(key);
    if (existing) existing.amount += clampAmount(item.amount);
    else grouped.set(key, { name: item.name, amount: clampAmount(item.amount) });
  });
  return [...grouped.values()];
}

function findBestTemplate(roleTotals) {
  const candidates = TEMPLATES
    .filter((template) => template.tool === state.tool)
    .map((template) => ({ template, score: scoreTemplate(template, roleTotals) }))
    .sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 0.5) return null;
  return candidates[0];
}

function scoreTemplate(template, totals) {
  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  if (!(total > 0)) return 0;
  const fields = [
    ["Grain", template.grain],
    ["Liquid", template.liquid],
    ["Fat", template.fat],
    ["Filler", template.filler],
    ["Fuel", template.fuel],
  ].filter(([, constraint]) => constraint != null && constraint !== "");
  if (!fields.length) return 0.5;

  const scores = fields.map(([role, constraint]) => constraintScore((totals[role] || 0) / total, constraint));
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function constraintScore(observed, rawConstraint) {
  if (typeof rawConstraint === "number") {
    return Math.max(0, 1 - Math.abs(observed - rawConstraint) / Math.max(rawConstraint, 0.05));
  }
  const normalized = String(rawConstraint).replace("%%", "%").trim();
  const match = normalized.match(/^(>=|<=|>|<)?\s*([0-9.]+)%$/);
  if (!match) return 0;
  const operator = match[1] || "=";
  const target = Number(match[2]) / 100;
  if (operator === ">" || operator === ">=") {
    return observed >= target ? 1 : observed / Math.max(target, 0.01);
  }
  if (operator === "<" || operator === "<=") {
    return observed <= target ? 1 : Math.max(0, (1 - observed) / Math.max(1 - target, 0.01));
  }
  return Math.max(0, 1 - Math.abs(observed - target) / Math.max(target, 0.05));
}

function addReverseIngredient() {
  const typed = els.reverseIngredientInput.value.trim();
  const material = materialByLowerName.get(typed.toLowerCase());
  if (!material) {
    els.reverseIngredientInput.setCustomValidity("Choose an ingredient from the list.");
    els.reverseIngredientInput.reportValidity();
    return;
  }
  els.reverseIngredientInput.setCustomValidity("");
  if (!state.reverseIngredients.includes(material.name)) state.reverseIngredients.push(material.name);
  els.reverseIngredientInput.value = "";
  state.recipePage = 1;
  renderReverseIngredients();
  renderRecipeTable();
}

function renderReverseIngredients() {
  els.reverseIngredientChips.innerHTML = state.reverseIngredients.length
    ? state.reverseIngredients.map((name) => `<span class="reverse-chip">
        ${escapeHtml(name)}
        <button type="button" data-remove-reverse="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(name)}">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </span>`).join("")
    : '<span class="reverse-chip-empty">No ingredients selected. The full tested library is shown below.</span>';
  window.lucide?.createIcons();
}

function renderRecipeTable() {
  const selected = new Set(state.reverseIngredients.map((name) => name.toLowerCase()));
  let filtered = testedRecipes.filter((recipe) => {
    const parts = recipeIngredients(recipe);
    const names = parts.map((part) => part.name.toLowerCase());
    if (selected.size) {
      if (state.recipeMatchMode === "all" && ![...selected].every((name) => names.includes(name))) return false;
      if (state.recipeMatchMode === "any" && !names.some((name) => selected.has(name))) return false;
      if (state.recipeMatchMode === "craftable" && !names.every((name) => selected.has(name))) return false;
    }
    if (state.recipeTool !== "All tools" && recipe.tool !== state.recipeTool) return false;
    if (state.recipeTier !== "All tiers" && recipe.tier !== state.recipeTier) return false;
    if (state.recipeSearch) {
      const haystack = `${formatRecipeIngredients(recipe)} ${recipe.tool} ${recipe.product} ${recipe.quality}`.toLowerCase();
      if (!haystack.includes(state.recipeSearch)) return false;
    }
    return true;
  });

  filtered = filtered.sort(compareRecipes);
  const pageCount = Math.max(1, Math.ceil(filtered.length / RECIPE_PAGE_SIZE));
  state.recipePage = Math.min(Math.max(state.recipePage, 1), pageCount);
  const pageStart = (state.recipePage - 1) * RECIPE_PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + RECIPE_PAGE_SIZE);

  els.recipeResultCount.textContent = `${filtered.length.toLocaleString()} tested ${filtered.length === 1 ? "recipe" : "recipes"}`;
  els.recipeTableBody.innerHTML = pageRows.map((recipe) => `<tr>
    <td>${escapeHtml(formatRecipeIngredients(recipe))}</td>
    <td>${escapeHtml(displayRecipeTool(recipe.tool))}</td>
    <td>${escapeHtml(readableProduct(recipe.product))}</td>
    <td><span class="recipe-quality ${String(recipe.tier || "").toLowerCase()}">${escapeHtml(recipe.quality)}</span></td>
    <td>${formatStat(recipe.health)}</td>
    <td>${formatStat(recipe.stamina)}</td>
    <td>${formatStat(recipe.mana)}</td>
    <td><button class="load-tested-recipe" type="button" data-load-tested-recipe="${recipe.id}">
      <i data-lucide="flask-conical" aria-hidden="true"></i> Load
    </button></td>
  </tr>`).join("");
  els.recipeTableEmpty.hidden = filtered.length > 0;
  els.recipePageLabel.textContent = `Page ${state.recipePage} of ${pageCount}`;
  els.recipePrevBtn.disabled = state.recipePage <= 1;
  els.recipeNextBtn.disabled = state.recipePage >= pageCount;
  window.lucide?.createIcons();
}

function compareRecipes(a, b) {
  if (state.recipeSort === "health") return numericSort(a.health, b.health, -1) || compareRecipeNames(a, b);
  if (state.recipeSort === "stamina") return numericSort(a.stamina, b.stamina, -1) || compareRecipeNames(a, b);
  if (state.recipeSort === "mana") return numericSort(a.mana, b.mana, -1) || compareRecipeNames(a, b);
  if (state.recipeSort === "name") return compareRecipeNames(a, b);
  return numericSort(a.qScore, b.qScore, -1) || compareRecipeNames(a, b);
}

function compareRecipeNames(a, b) {
  return formatRecipeIngredients(a).localeCompare(formatRecipeIngredients(b));
}

function recipeIngredients(recipe) {
  const parts = [];
  if (recipe.mat) parts.push({ name: recipe.mat, amount: parseNumber(recipe.matAmt) });
  if (recipe.liq) parts.push({ name: recipe.liq, amount: parseNumber(recipe.liqAmt) });
  return parts;
}

function formatRecipeIngredients(recipe) {
  return recipeIngredients(recipe)
    .map((part) => Number.isFinite(part.amount) ? `${part.name} ${formatNumber(part.amount)}` : part.name)
    .join(" + ");
}

function statsFromReference(record) {
  const stats = {};
  STAT_FIELDS.forEach((field) => {
    stats[field.key] = parseNumber(record[field.remote]) ?? 0;
  });
  return stats;
}

function renderLibrary() {
  const filtered = materials
    .filter((material) => state.materialType === "All types" || material.type === state.materialType)
    .filter((material) => !state.materialSearch || `${material.name} ${material.type} ${material.lore}`.toLowerCase().includes(state.materialSearch))
    .sort(compareMaterials);

  els.materialTableBody.innerHTML = filtered.map((material) => `<tr>
    <td>${escapeHtml(material.name)}</td>
    <td>${escapeHtml(material.type)}</td>
    <td>${formatStat(material.stats.health)}</td>
    <td>${formatStat(material.stats.stamina)}</td>
    <td>${formatStat(material.stats.mana)}</td>
    <td>${formatStat(material.stats.foodPoison)}</td>
    <td><button type="button" data-add-material="${escapeHtml(material.name)}">
      <i data-lucide="plus" aria-hidden="true"></i> Add
    </button></td>
  </tr>`).join("");
  els.materialTableEmpty.hidden = filtered.length > 0;
  window.lucide?.createIcons();
}

function compareMaterials(a, b) {
  if (state.materialSort === "name") return a.name.localeCompare(b.name);
  if (state.materialSort === "safe") return numericSort(a.stats.foodPoison, b.stats.foodPoison, 1) || a.name.localeCompare(b.name);
  if (state.materialSort === "healing") return numericSort(a.stats.directHealing, b.stats.directHealing, -1) || a.name.localeCompare(b.name);
  return numericSort(a.stats[state.materialSort], b.stats[state.materialSort], -1) || a.name.localeCompare(b.name);
}

function numericSort(a, b, direction) {
  const aValue = Number.isFinite(a) ? a : direction > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const bValue = Number.isFinite(b) ? b : direction > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  return (aValue - bValue) * direction;
}

function inferRole(material) {
  const name = material?.name?.toLowerCase() || "";
  const type = material?.type?.toLowerCase() || "";
  if (SYNTHETIC_FUELS.some((fuel) => fuel.toLowerCase() === name) || type.includes("wood")) return "Fuel";
  if (/flour|barley|corn|oat|rice|rye|spelt|grain/.test(name) || type.includes("agrostology")) return "Grain";
  if (/oil|butter|tallow|fat/.test(name) || type.includes("oil")) return "Fat";
  if (/water|juice|milk|cream|blood|ichor/.test(name)) return "Liquid";
  return "Filler";
}

function describeRatio(ratio) {
  const labels = [
    ["grain", "grain"],
    ["liquid", "liquid"],
    ["fat", "fat"],
    ["filler", "filler"],
    ["fuel", "fuel"],
  ];
  const parts = labels
    .filter(([key]) => ratio[key] != null && ratio[key] !== "")
    .map(([key, label]) => `${label} ${formatConstraint(ratio[key])}`);
  return parts.length ? parts.join(" / ") : "No fixed proportion documented";
}

function formatConstraint(value) {
  if (typeof value === "number") return `${Math.round(value * 100)}%`;
  return String(value).replace("%%", "%");
}

function normalizeRecipeTool(tool) {
  return tool === "Beer" ? "Fermentation Jar" : tool;
}

function displayRecipeTool(tool) {
  return tool === "Beer" ? "Beer / Fermentation Jar" : tool;
}

function readableProduct(product) {
  return String(product || "Unknown dish").replace(/([A-Za-z])([1-5])$/, "$1 $2");
}

function emptyStats() {
  return Object.fromEntries(STAT_FIELDS.map((field) => [field.key, null]));
}

function emptyNumericStats() {
  return Object.fromEntries(STAT_FIELDS.map((field) => [field.key, 0]));
}

function getField(record, label) {
  return record.fields.find((field) => field.label === label)?.value ?? "";
}

function parseNumber(value) {
  if (value == null || value === "" || value === "?") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function clampAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(100000000, Math.round(parsed)));
}

function formatNumber(value) {
  return Math.round(value || 0).toLocaleString();
}

function formatStat(value) {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 100) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();
