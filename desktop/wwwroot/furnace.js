const sourceData = window.MO2_DATA;
const BASE_INPUT = 10000;
const MACHINES = [
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
const MACHINE_SUFFIX_PATTERN = new RegExp(
  `\\s+-\\s+(?:${MACHINES.map(escapeRegExp).join("|")})$`,
  "i",
);

const state = {
  machine: "Attractor",
  recipeId: "",
  amount: 10000,
  cladeBonus: false,
  search: "",
};

const els = {
  machineSelect: document.querySelector("#machineSelect"),
  materialSelect: document.querySelector("#materialSelect"),
  recipeSelect: document.querySelector("#recipeSelect"),
  amountInput: document.querySelector("#amountInput"),
  cladeBonus: document.querySelector("#cladeBonus"),
  recipeCount: document.querySelector("#recipeCount"),
  resultRecipeName: document.querySelector("#resultRecipeName"),
  batchScale: document.querySelector("#batchScale"),
  mainAmount: document.querySelector("#mainAmount"),
  mainMaterial: document.querySelector("#mainMaterial"),
  catalystAmount: document.querySelector("#catalystAmount"),
  catalystName: document.querySelector("#catalystName"),
  totalAmount: document.querySelector("#totalAmount"),
  outputGrid: document.querySelector("#outputGrid"),
  recipeNote: document.querySelector("#recipeNote"),
  recipeSearch: document.querySelector("#recipeSearch"),
  recipeTableBody: document.querySelector("#recipeTableBody"),
  recipeTableEmpty: document.querySelector("#recipeTableEmpty"),
  dataStamp: document.querySelector("#dataStamp"),
};

const recipes = buildRecipes();

function buildRecipes() {
  const workbookRecipes = normalizeProcessRecords()
    .map(({ record, input, baseInput, machine }) => {
      if (!MACHINES.includes(machine)) return null;

      const catalyst = parseNamedAmount(getField(record, "Catalyst") || "N/A");
      const sourceWarning = record.fields
        .map((field) => String(field.value || "").trim())
        .find((value) => /^needs verification/i.test(value)) || "";
      const outputs = record.fields
        .filter((field) => /^Yield(?:s|\s|\b)/i.test(field.label))
        .filter((field) => !/^needs verification/i.test(String(field.value || "").trim()))
        .map((field) => parseNamedAmount(field.value))
        .filter((output) => output.name);

      if (!input || !outputs.some((output) => Number.isFinite(output.amount))) return null;
      if (machine === "Furnace" && input === "Coal" && catalyst.name === "Calx Powder") {
        const pitch = outputs.find((output) => output.name === "Pitch");
        if (pitch && pitch.amount === null) pitch.amount = 418;
      }
      const searchText = [
        machine,
        input,
        catalyst.name,
        ...outputs.map((output) => output.name),
      ].join(" ").toLowerCase();

      return {
        id: record.id,
        machine,
        input,
        baseInput,
        catalyst,
        outputs,
        section: record.section,
        sourceWarning,
        searchText,
      };
    })
    .filter(Boolean);

  return workbookRecipes.sort(
    (a, b) => a.machine.localeCompare(b.machine) || a.input.localeCompare(b.input),
  );
}

function normalizeProcessRecords() {
  let currentSheet = "";
  let currentInput = "";
  let currentMachine = "";

  return sourceData.records
    .filter((record) => record.type === "Recipe")
    .map((record) => {
      const explicitInput = getField(record, "Material (10k)");
      const parsedInput = parseProcessInput(
        explicitInput || record.title.replace(MACHINE_SUFFIX_PATTERN, "").trim(),
      );
      const input = parsedInput.name;
      const baseInput = parsedInput.amount;

      if (record.sheet !== currentSheet || `${input}:${baseInput}` !== currentInput) {
        currentSheet = record.sheet;
        currentInput = `${input}:${baseInput}`;
        currentMachine = "";
      }

      const explicitMachine = getField(record, "Machine");
      const titleMachine = MACHINES.find(
        (machine) => new RegExp(`\\s+-\\s+${escapeRegExp(machine)}$`, "i").test(record.title),
      ) || "";
      const machine = MACHINES.includes(explicitMachine)
        ? explicitMachine
        : titleMachine || currentMachine;
      if (machine) currentMachine = machine;

      return { record, input, baseInput, machine };
    });
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

function parseNamedAmount(value) {
  const text = String(value || "").trim();
  if (!text || /^n\/?a$/i.test(text)) return { name: "None", amount: 0, known: true };

  const match = text.match(/^(.*?)\s*\(([\d,]+|\?)\)(?:\s*,.*)?$/);
  if (!match) return { name: text, amount: null, known: false };
  if (match[2] === "?") return { name: match[1].trim(), amount: null, known: false };
  return {
    name: match[1].trim(),
    amount: Number(match[2].replaceAll(",", "")),
    known: true,
  };
}

function init() {
  const first = recipes.find((recipe) => recipe.machine === state.machine && recipe.input === "Granum")
    || recipes.find((recipe) => recipe.machine === state.machine)
    || recipes[0];
  state.recipeId = first?.id || "";
  state.amount = first?.baseInput || BASE_INPUT;

  els.recipeCount.textContent = recipes.length.toLocaleString();
  els.dataStamp.textContent = `Data generated ${formatDate(sourceData.meta.generatedAt)}`;
  attachEvents();
  render();
}

function attachEvents() {
  els.machineSelect.addEventListener("change", () => {
    state.machine = els.machineSelect.value;
    const available = recipes.filter((recipe) => recipe.machine === state.machine);
    const current = recipes.find((recipe) => recipe.id === state.recipeId);
    const replacement = available.find((recipe) => recipe.input === current?.input) || available[0];
    state.recipeId = replacement?.id || "";
    state.amount = replacement?.baseInput || BASE_INPUT;
    render();
  });

  els.materialSelect.addEventListener("change", () => {
    const match = recipes.find(
      (recipe) => recipe.machine === state.machine && recipe.input === els.materialSelect.value,
    );
    state.recipeId = match?.id || "";
    state.amount = match?.baseInput || BASE_INPUT;
    renderRecipeOptions();
    renderResult();
  });

  els.recipeSelect.addEventListener("change", () => {
    state.recipeId = els.recipeSelect.value;
    state.amount = getCurrentRecipe()?.baseInput || BASE_INPUT;
    renderResult();
  });

  els.amountInput.addEventListener("input", () => {
    state.amount = clampAmount(els.amountInput.value);
    renderResult();
  });

  document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      state.amount = button.dataset.amount === "base"
        ? getCurrentRecipe()?.baseInput || BASE_INPUT
        : Number(button.dataset.amount);
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

  els.recipeTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-use-recipe]");
    if (!button) return;
    const recipe = recipes.find((item) => item.id === button.dataset.useRecipe);
    if (!recipe) return;
    state.machine = recipe.machine;
    state.recipeId = recipe.id;
    state.amount = recipe.baseInput;
    render();
    document.querySelector(".calculator-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function render() {
  renderMachineOptions();
  renderMaterialOptions();
  renderRecipeOptions();
  renderResult();
  renderRecipeTable();
}

function renderMachineOptions() {
  const counts = recipes.reduce((result, recipe) => {
    result.set(recipe.machine, (result.get(recipe.machine) || 0) + 1);
    return result;
  }, new Map());
  els.machineSelect.innerHTML = MACHINES
    .filter((machine) => counts.has(machine))
    .map((machine) => `<option value="${escapeHtml(machine)}">${escapeHtml(machine)} (${counts.get(machine)})</option>`)
    .join("");
  els.machineSelect.value = state.machine;
}

function renderMaterialOptions() {
  const materials = [...new Set(
    recipes.filter((recipe) => recipe.machine === state.machine).map((recipe) => recipe.input),
  )].sort((a, b) => a.localeCompare(b));
  const current = getCurrentRecipe();

  els.materialSelect.innerHTML = materials
    .map((material) => `<option value="${escapeHtml(material)}">${escapeHtml(material)}</option>`)
    .join("");
  els.materialSelect.value = current?.input || materials[0] || "";
}

function renderRecipeOptions() {
  const current = getCurrentRecipe();
  const input = current?.input || els.materialSelect.value;
  const matches = recipes.filter(
    (recipe) => recipe.machine === state.machine && recipe.input === input,
  );

  if (!matches.some((recipe) => recipe.id === state.recipeId)) {
    state.recipeId = matches[0]?.id || "";
  }
  els.recipeSelect.innerHTML = matches
    .map((recipe) => {
      const catalyst = recipe.catalyst.amount
        ? `${recipe.catalyst.name} (${formatNumber(recipe.catalyst.amount)})`
        : recipe.catalyst.name;
      return `<option value="${escapeHtml(recipe.id)}">${escapeHtml(catalyst)}</option>`;
    })
    .join("");
  els.recipeSelect.value = state.recipeId;
  els.recipeSelect.disabled = matches.length < 2;
}

function renderResult() {
  const recipe = getCurrentRecipe();
  if (!recipe) return;

  const amount = clampAmount(state.amount);
  const scale = amount / recipe.baseInput;
  const catalystAmount = recipe.catalyst.amount === null
    ? null
    : Math.ceil(recipe.catalyst.amount * scale);
  const total = catalystAmount === null ? null : amount + catalystAmount;
  const yieldBonus = state.cladeBonus ? 1.03 : 1;

  els.amountInput.value = amount;
  els.resultRecipeName.textContent = `${recipe.input} in ${recipe.machine}`;
  els.batchScale.textContent = `${formatDecimal(scale)} ${scale === 1 ? "batch" : "batches"}`;
  els.mainAmount.textContent = formatNumber(amount);
  els.mainMaterial.textContent = recipe.input;
  els.catalystAmount.textContent = catalystAmount === null ? "Unknown" : formatNumber(catalystAmount);
  els.catalystName.textContent = recipe.catalyst.name;
  els.totalAmount.textContent = total === null ? "Unknown" : formatNumber(total);

  els.outputGrid.innerHTML = recipe.outputs
    .map((output) => {
      const amountOut = output.amount === null
        ? null
        : Math.floor(output.amount * scale * yieldBonus);
      return `<div class="output-item ${amountOut === null ? "unknown" : ""}">
        <strong>${amountOut === null ? "Unknown" : formatNumber(amountOut)}</strong>
        <span>${escapeHtml(output.name)}</span>
      </div>`;
    })
    .join("");

  const bonusText = state.cladeBonus
    ? "The 3% Metallurgist bonus is included in the output shown."
    : "The 3% Metallurgist bonus is not included.";
  const roundingText = "Catalysts round up; expected outputs round down to whole units.";
  const sourceText = recipe.sourceWarning
    ? ` Source note: ${recipe.sourceWarning}.`
    : "";
  const baseText = `Source batch: ${formatNumber(recipe.baseInput)} ${recipe.input}.`;
  els.recipeNote.textContent = `${baseText} ${bonusText} ${roundingText}${sourceText}`;
}

function renderRecipeTable() {
  const visible = recipes.filter((recipe) => !state.search || recipe.searchText.includes(state.search));
  els.recipeTableBody.innerHTML = visible
    .map((recipe) => {
      const catalyst = recipe.catalyst.amount === null
        ? `${recipe.catalyst.name} (unknown)`
        : recipe.catalyst.amount
          ? `${recipe.catalyst.name} (${formatNumber(recipe.catalyst.amount)})`
          : "None";
      const outputs = recipe.outputs
        .map((output) => `<span>${escapeHtml(output.name)} <b>${output.amount === null ? "?" : formatNumber(output.amount)}</b></span>`)
        .join("");
      return `<tr>
        <td><span class="recipe-machine">${escapeHtml(recipe.machine)}</span></td>
        <td>${escapeHtml(recipe.input)} <small class="recipe-base">(${formatNumber(recipe.baseInput)} input)</small></td>
        <td>${escapeHtml(catalyst)}</td>
        <td><div class="recipe-output-list">${outputs}</div></td>
        <td><button class="use-recipe" type="button" data-use-recipe="${escapeHtml(recipe.id)}">Use</button></td>
      </tr>`;
    })
    .join("");
  els.recipeTableEmpty.hidden = visible.length > 0;
}

function getCurrentRecipe() {
  return recipes.find((recipe) => recipe.id === state.recipeId) || null;
}

function clampAmount(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 1) return 1;
  return Math.min(number, 100000000);
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDecimal(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "from the source workbook";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
