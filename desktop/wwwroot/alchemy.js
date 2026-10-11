const sourceData = window.MO2_DATA;
const BASE_INPUT = 10000;

const recipes = buildRecipes();
const state = {
  section: "Alchemy",
  recipeId: "",
  amount: 10000,
  cladeBonus: false,
  search: "",
  librarySection: "All categories",
};

const els = {
  knownRecipeCount: document.querySelector("#knownRecipeCount"),
  recipeCount: document.querySelector("#recipeCount"),
  sectionControl: document.querySelector("#sectionControl"),
  materialSelect: document.querySelector("#materialSelect"),
  recipeSelect: document.querySelector("#recipeSelect"),
  amountInput: document.querySelector("#amountInput"),
  cladeBonus: document.querySelector("#cladeBonus"),
  resultRecipeName: document.querySelector("#resultRecipeName"),
  methodBadge: document.querySelector("#methodBadge"),
  mainAmount: document.querySelector("#mainAmount"),
  mainMaterial: document.querySelector("#mainMaterial"),
  catalystAmount: document.querySelector("#catalystAmount"),
  catalystName: document.querySelector("#catalystName"),
  totalAmount: document.querySelector("#totalAmount"),
  outputGrid: document.querySelector("#outputGrid"),
  recipeNote: document.querySelector("#recipeNote"),
  recipeSearch: document.querySelector("#recipeSearch"),
  librarySection: document.querySelector("#librarySection"),
  recipeTableBody: document.querySelector("#recipeTableBody"),
  recipeTableEmpty: document.querySelector("#recipeTableEmpty"),
  dataStamp: document.querySelector("#dataStamp"),
};

function buildRecipes() {
  return normalizeAlchemyRecords()
    .map(({ record, input, machine }) => {
      if (!input || input === "Note:") return null;

      const catalyst = parseNamedAmount(getField(record, "Catalyst") || "N/A");
      const needsVerification = record.fields.some(
        (field) => /^needs verification$/i.test(String(field.value).trim()),
      );
      const outputs = record.fields
        .filter((field) => /^Yield(?:s|\s|\b)/i.test(field.label))
        .map((field) => parseNamedAmount(field.value))
        .filter((output) => output.name && !/^needs verification$/i.test(output.name));
      if (!outputs.length) return null;

      return {
        id: record.id,
        section: record.section,
        input,
        machine,
        catalyst,
        outputs,
        needsVerification,
        searchText: [
          record.section,
          input,
          machine,
          catalyst.name,
          ...outputs.map((output) => output.name),
        ].join(" ").toLowerCase(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      return a.section.localeCompare(b.section)
        || a.input.localeCompare(b.input)
        || a.machine.localeCompare(b.machine);
    });
}

function normalizeAlchemyRecords() {
  let currentInput = "";
  let currentMachine = "";

  return sourceData.records
    .filter((record) => record.sheet === "Alchemy & Botany Extraction" && record.type === "Recipe")
    .map((record) => {
      const input = inferInput(record);
      if (input !== currentInput) {
        currentInput = input;
        currentMachine = "";
      }

      const explicitMachine = inferMachine(record);
      if (explicitMachine) currentMachine = explicitMachine;

      return {
        record,
        input,
        machine: explicitMachine || currentMachine || "Unspecified",
      };
    });
}

function inferInput(record) {
  const explicit = getField(record, "Material (10k)");
  if (explicit) return explicit;
  return record.title.replace(/\s+-\s+(?:Natorus|Grinder|Hearth|Kiln|Press|Furnace)$/i, "").trim();
}

function inferMachine(record) {
  const explicit = getField(record, "Machine");
  if (explicit) return explicit;
  const titleMatch = record.title.match(/\s+-\s+(Natorus|Grinder|Hearth|Kiln|Press|Furnace)$/i);
  return titleMatch?.[1] || "";
}

function init() {
  const first = recipes.find((recipe) => recipe.section === state.section) || recipes[0];
  state.recipeId = first?.id || "";
  els.knownRecipeCount.textContent = recipes
    .filter((recipe) => recipe.outputs.every((output) => output.amount !== null))
    .length
    .toLocaleString();
  els.recipeCount.textContent = recipes.length.toLocaleString();
  els.dataStamp.textContent = `Data generated ${formatDate(sourceData.meta.generatedAt)}`;

  attachEvents();
  render();
  window.lucide?.createIcons();
}

function attachEvents() {
  els.sectionControl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    state.section = button.dataset.section;
    state.recipeId = recipes.find((recipe) => recipe.section === state.section)?.id || "";
    render();
  });

  els.materialSelect.addEventListener("change", () => {
    const recipe = recipes.find(
      (item) => item.section === state.section && item.input === els.materialSelect.value,
    );
    state.recipeId = recipe?.id || "";
    renderRecipeOptions();
    renderResult();
  });

  els.recipeSelect.addEventListener("change", () => {
    state.recipeId = els.recipeSelect.value;
    renderResult();
  });

  els.amountInput.addEventListener("input", () => {
    state.amount = clampAmount(els.amountInput.value);
    renderResult();
  });

  document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      state.amount = Number(button.dataset.amount);
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

  els.librarySection.addEventListener("change", () => {
    state.librarySection = els.librarySection.value;
    renderRecipeTable();
  });

  els.recipeTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-use-recipe]");
    if (!button) return;
    const recipe = recipes.find((item) => item.id === button.dataset.useRecipe);
    if (!recipe) return;
    state.section = recipe.section;
    state.recipeId = recipe.id;
    render();
    document.querySelector(".alchemy-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function render() {
  renderSectionControl();
  renderMaterialOptions();
  renderRecipeOptions();
  renderResult();
  renderRecipeTable();
}

function renderSectionControl() {
  els.sectionControl.querySelectorAll("[data-section]").forEach((button) => {
    const active = button.dataset.section === state.section;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderMaterialOptions() {
  const materials = [...new Set(
    recipes.filter((recipe) => recipe.section === state.section).map((recipe) => recipe.input),
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
    (recipe) => recipe.section === state.section && recipe.input === input,
  );
  if (!matches.some((recipe) => recipe.id === state.recipeId)) {
    state.recipeId = matches[0]?.id || "";
  }
  els.recipeSelect.innerHTML = matches
    .map((recipe) => {
      const catalyst = recipe.catalyst.amount
        ? `${recipe.catalyst.name} (${formatNumber(recipe.catalyst.amount)})`
        : recipe.catalyst.name;
      return `<option value="${escapeHtml(recipe.id)}">${escapeHtml(recipe.machine)} · ${escapeHtml(catalyst)}</option>`;
    })
    .join("");
  els.recipeSelect.value = state.recipeId;
  els.recipeSelect.disabled = matches.length < 2;
}

function renderResult() {
  const recipe = getCurrentRecipe();
  if (!recipe) return;
  const amount = clampAmount(state.amount);
  const scale = amount / BASE_INPUT;
  const catalystAmount = recipe.catalyst.amount === null
    ? null
    : Math.ceil(recipe.catalyst.amount * scale);
  const total = catalystAmount === null ? null : amount + catalystAmount;
  const yieldBonus = state.cladeBonus ? 1.05 : 1;

  els.amountInput.value = amount;
  els.resultRecipeName.textContent = `${recipe.input} in ${recipe.machine}`;
  els.methodBadge.textContent = recipe.section;
  els.mainAmount.textContent = formatNumber(amount);
  els.mainMaterial.textContent = recipe.input;
  els.catalystAmount.textContent = catalystAmount === null ? "Unknown" : formatNumber(catalystAmount);
  els.catalystName.textContent = recipe.catalyst.name;
  els.totalAmount.textContent = total === null ? "Unknown" : formatNumber(total);

  els.outputGrid.innerHTML = recipe.outputs
    .map((output) => {
      const outputAmount = output.amount === null
        ? null
        : Math.floor(output.amount * scale * yieldBonus);
      return `<div class="alchemy-output ${outputAmount === null ? "unknown" : ""}">
        <strong>${outputAmount === null ? "Unknown" : formatNumber(outputAmount)}</strong>
        <span>${escapeHtml(output.name)}</span>
      </div>`;
    })
    .join("");

  const notes = [
    state.cladeBonus
      ? "The 5% Herbalism bonus is included."
      : "The 5% Herbalism bonus is not included.",
    "Catalysts round up; known yields round down to whole units.",
  ];
  if (recipe.needsVerification || recipe.outputs.some((output) => output.amount === null)) {
    notes.push("One or more workbook values still need verification.");
  }
  els.recipeNote.textContent = notes.join(" ");
}

function renderRecipeTable() {
  const visible = recipes.filter((recipe) => {
    const sectionMatch = state.librarySection === "All categories"
      || recipe.section === state.librarySection;
    const searchMatch = !state.search || recipe.searchText.includes(state.search);
    return sectionMatch && searchMatch;
  });

  els.recipeTableBody.innerHTML = visible
    .map((recipe) => {
      const catalyst = recipe.catalyst.amount === null
        ? `${recipe.catalyst.name} (?)`
        : recipe.catalyst.amount
          ? `${recipe.catalyst.name} (${formatNumber(recipe.catalyst.amount)})`
          : recipe.catalyst.name;
      const outputs = recipe.outputs
        .map((output) => `${escapeHtml(output.name)} ${output.amount === null ? "?" : formatNumber(output.amount)}`)
        .join(" · ");
      return `<tr>
        <td>${escapeHtml(recipe.section)}</td>
        <td><strong>${escapeHtml(recipe.input)}</strong></td>
        <td>${escapeHtml(recipe.machine)}</td>
        <td>${escapeHtml(catalyst)}</td>
        <td><span class="alchemy-table-output">${outputs}</span></td>
        <td>
          <button class="alchemy-use-button" type="button" data-use-recipe="${recipe.id}">
            <i data-lucide="arrow-up-right" aria-hidden="true"></i>
            Use
          </button>
        </td>
      </tr>`;
    })
    .join("");
  els.recipeTableEmpty.hidden = visible.length > 0;
  window.lucide?.createIcons();
}

function getCurrentRecipe() {
  return recipes.find((recipe) => recipe.id === state.recipeId);
}

function getField(record, label) {
  return record.fields.find((field) => field.label === label)?.value || "";
}

function parseNamedAmount(value) {
  const text = String(value || "").trim();
  if (!text || /^n\/?a$/i.test(text)) {
    return { name: "None", amount: 0 };
  }
  const match = text.match(/^(.*?)\s*\(([\d,]+|\?)\)\s*$/);
  if (!match) return { name: text, amount: null };
  if (match[2] === "?") return { name: match[1].trim(), amount: null };
  return {
    name: match[1].trim(),
    amount: Number(match[2].replaceAll(",", "")),
  };
}

function clampAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(100000000, Math.max(1, Math.floor(numeric)));
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
