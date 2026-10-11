const sourceData = window.MO2_DATA;
const BASE_RETURN = 0.7;
const CLADE_MULTIPLIER = 1.03;

const state = {
  recipeId: "",
  mode: "input",
  amount: 10000,
  cladeBonus: false,
  search: "",
};

const els = {
  alloySelect: document.querySelector("#alloySelect"),
  modeControl: document.querySelector("#modeControl"),
  amountLabel: document.querySelector("#amountLabel"),
  amountInput: document.querySelector("#amountInput"),
  cladeBonus: document.querySelector("#cladeBonus"),
  resultAlloy: document.querySelector("#resultAlloy"),
  materialLoad: document.querySelector("#materialLoad"),
  outputLabel: document.querySelector("#outputLabel"),
  outputAmount: document.querySelector("#outputAmount"),
  outputName: document.querySelector("#outputName"),
  totalLoad: document.querySelector("#totalLoad"),
  retainedRate: document.querySelector("#retainedRate"),
  recipeNote: document.querySelector("#recipeNote"),
  recipeSearch: document.querySelector("#recipeSearch"),
  alloyTableBody: document.querySelector("#alloyTableBody"),
  alloyTableEmpty: document.querySelector("#alloyTableEmpty"),
  dataStamp: document.querySelector("#dataStamp"),
};

const recipes = buildRecipes();

function buildRecipes() {
  const found = sourceData.records
    .map((record) => {
      const output = getField(record, "Metal Refining");
      const primary = getField(record, "2 Units");
      const secondary = getField(record, "1 Unit");
      const tertiary = getField(record, "1 Unit 2");
      if (!output || !primary || !secondary || !tertiary) return null;

      return {
        id: `refine-${slugify(output)}`,
        output,
        primary,
        secondary,
        tertiary,
        searchText: `${output} ${primary} ${secondary} ${tertiary}`.toLowerCase(),
      };
    })
    .filter(Boolean);

  return [...new Map(
    found.map((recipe) => [
      [recipe.output, recipe.primary, recipe.secondary, recipe.tertiary].join("|"),
      recipe,
    ]),
  ).values()].sort((a, b) => alloyOrder(a.output) - alloyOrder(b.output) || a.output.localeCompare(b.output));
}

function getField(record, label) {
  return record.fields.find((field) => field.label === label)?.value || "";
}

function alloyOrder(name) {
  const order = [
    "Bron",
    "Messing",
    "Tindremic Messing",
    "Grain Steel",
    "Steel",
    "Tungsteel",
    "Cronite",
    "Oghmium",
  ];
  const index = order.indexOf(name);
  return index === -1 ? order.length : index;
}

function init() {
  const initial = recipes.find((recipe) => recipe.output === "Grain Steel") || recipes[0];
  state.recipeId = initial?.id || "";
  els.dataStamp.textContent = `Data generated ${formatDate(sourceData.meta.generatedAt)}`;
  attachEvents();
  render();
}

function attachEvents() {
  els.alloySelect.addEventListener("change", () => {
    state.recipeId = els.alloySelect.value;
    renderResult();
  });

  els.modeControl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    renderMode();
    renderResult();
  });

  els.amountInput.addEventListener("input", () => {
    state.amount = clampAmount(els.amountInput.value);
    renderResult();
  });

  document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      state.amount = Number(button.dataset.amount);
      els.amountInput.value = state.amount;
      renderResult();
    });
  });

  els.cladeBonus.addEventListener("change", () => {
    state.cladeBonus = els.cladeBonus.checked;
    renderResult();
  });

  els.recipeSearch.addEventListener("input", () => {
    state.search = els.recipeSearch.value.trim().toLowerCase();
    renderRecipeTable();
  });

  els.alloyTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-use-alloy]");
    if (!button) return;
    const recipe = recipes.find((item) => item.id === button.dataset.useAlloy);
    if (!recipe) return;
    state.recipeId = recipe.id;
    els.alloySelect.value = recipe.id;
    renderResult();
    document.querySelector(".refining-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function render() {
  els.alloySelect.innerHTML = recipes
    .map((recipe) => `<option value="${escapeHtml(recipe.id)}">${escapeHtml(recipe.output)}</option>`)
    .join("");
  els.alloySelect.value = state.recipeId;
  renderMode();
  renderResult();
  renderRecipeTable();
}

function renderMode() {
  els.modeControl.querySelectorAll("[data-mode]").forEach((button) => {
    const selected = button.dataset.mode === state.mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  els.amountLabel.textContent = state.mode === "input"
    ? "Primary material amount"
    : "Finished alloy wanted";
}

function renderResult() {
  const recipe = getCurrentRecipe();
  if (!recipe) return;

  const amount = clampAmount(state.amount);
  const multiplier = state.cladeBonus ? CLADE_MULTIPLIER : 1;
  const effectiveReturn = BASE_RETURN * multiplier;
  const primary = state.mode === "input"
    ? amount
    : Math.ceil(amount / effectiveReturn);
  const support = Math.ceil(primary / 2);
  const output = Math.floor(primary * effectiveReturn);
  const total = primary + support + support;

  els.amountInput.value = amount;
  els.resultAlloy.textContent = recipe.output;
  els.outputLabel.textContent = state.mode === "input" ? "Expected alloy" : "Minimum expected alloy";
  els.outputAmount.textContent = formatNumber(output);
  els.outputName.textContent = recipe.output;
  els.totalLoad.textContent = formatNumber(total);
  els.retainedRate.textContent = formatPercent(effectiveReturn);
  els.materialLoad.innerHTML = [
    materialItem("2 parts", recipe.primary, primary),
    materialItem("1 part", recipe.secondary, support),
    materialItem("1 part", recipe.tertiary, support),
  ].join("");

  const direction = state.mode === "input"
    ? `Starting with ${formatNumber(primary)} ${recipe.primary}.`
    : `To make at least ${formatNumber(amount)} ${recipe.output}.`;
  const bonus = state.cladeBonus
    ? "The 3% Metallurgist bonus is included."
    : "The 3% Metallurgist bonus is not included.";
  els.recipeNote.textContent = `${direction} Required materials round up; finished alloy rounds down. ${bonus}`;
}

function materialItem(ratio, name, amount) {
  return `<div class="material-item">
    <span class="material-ratio">${escapeHtml(ratio)}</span>
    <strong>${formatNumber(amount)}</strong>
    <span>${escapeHtml(name)}</span>
  </div>`;
}

function renderRecipeTable() {
  const visible = recipes.filter((recipe) => !state.search || recipe.searchText.includes(state.search));
  els.alloyTableBody.innerHTML = visible
    .map((recipe) => `<tr>
      <td>${escapeHtml(recipe.output)}</td>
      <td><span class="ratio-cell">2x</span> ${escapeHtml(recipe.primary)}</td>
      <td><span class="ratio-cell">1x</span> ${escapeHtml(recipe.secondary)}</td>
      <td><span class="ratio-cell">1x</span> ${escapeHtml(recipe.tertiary)}</td>
      <td>70% of ${escapeHtml(recipe.primary)}</td>
      <td><button class="use-alloy" type="button" data-use-alloy="${escapeHtml(recipe.id)}">Use</button></td>
    </tr>`)
    .join("");
  els.alloyTableEmpty.hidden = visible.length > 0;
}

function getCurrentRecipe() {
  return recipes.find((recipe) => recipe.id === state.recipeId) || null;
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

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPercent(value) {
  const percent = value * 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "from the source workbook";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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
