const sourceData = window.MO2_DATA;
const BASE_CARCASS = 10000;
const CLADE_MULTIPLIER = 1.1;

const state = {
  carcassId: "",
  amount: 10000,
  cladeBonus: false,
  carcassFilter: "",
  search: "",
  root: "all",
};

const els = {
  knownCount: document.querySelector("#knownCount"),
  catalogCount: document.querySelector("#catalogCount"),
  carcassFilter: document.querySelector("#carcassFilter"),
  carcassSelect: document.querySelector("#carcassSelect"),
  amountInput: document.querySelector("#amountInput"),
  cladeBonus: document.querySelector("#cladeBonus"),
  resultCarcass: document.querySelector("#resultCarcass"),
  dataStatus: document.querySelector("#dataStatus"),
  zoologyRoot: document.querySelector("#zoologyRoot"),
  zoology: document.querySelector("#zoology"),
  totalYield: document.querySelector("#totalYield"),
  outputGrid: document.querySelector("#outputGrid"),
  unavailableState: document.querySelector("#unavailableState"),
  trophyName: document.querySelector("#trophyName"),
  trophyValue: document.querySelector("#trophyValue"),
  recipeNote: document.querySelector("#recipeNote"),
  rootFilter: document.querySelector("#rootFilter"),
  recipeSearch: document.querySelector("#recipeSearch"),
  butcheryTableBody: document.querySelector("#butcheryTableBody"),
  tableEmpty: document.querySelector("#tableEmpty"),
  dataStamp: document.querySelector("#dataStamp"),
};

const carcasses = buildCarcasses();

function buildCarcasses() {
  return sourceData.records
    .filter((record) => record.type === "Butchery")
    .map((record) => {
      const yieldFields = record.fields.filter(
        (field) => /^Butchery Table Yields|^Yield \d+/i.test(field.label),
      );
      if (!yieldFields.length) return null;

      const outputs = yieldFields
        .map((field) => parseYield(field.value))
        .filter(Boolean);
      const knownOutputs = outputs.filter((output) => output.amount !== null);
      const name = getField(record, "Carcass (10k)") || record.title;
      const root = normalizeRoot(getField(record, "Zoology Root"));
      const zoology = normalizeInfo(getField(record, "Zoology"));
      const trophy = normalizeInfo(getField(record, "Trophy"));
      const trophyValue = normalizeInfo(getField(record, "Trophy Value"));

      return {
        id: record.id,
        name,
        root,
        zoology,
        outputs,
        knownOutputs,
        trophy,
        trophyValue,
        searchText: [
          name,
          root,
          zoology,
          trophy,
          ...outputs.map((output) => output.name),
        ].join(" ").toLowerCase(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getField(record, label) {
  return record.fields.find((field) => field.label === label)?.value || "";
}

function parseYield(value) {
  const text = String(value || "").trim();
  if (!text || /^(values needed|nyi)$/i.test(text)) return null;
  const match = text.match(/^(.*?)\s*\(([\d,]+|\?)\)\s*$/);
  if (!match) return { name: text, amount: null };
  return {
    name: match[1].trim(),
    amount: match[2] === "?" ? null : Number(match[2].replaceAll(",", "")),
  };
}

function normalizeRoot(value) {
  const text = String(value || "").trim();
  if (!text || /^(nyi|values needed)/i.test(text)) return "Unclassified";
  return text;
}

function normalizeInfo(value) {
  const text = String(value || "").trim();
  return !text || /^(n\/?a|nyi|values needed)$/i.test(text) ? "None" : text;
}

function init() {
  const initial = carcasses.find((carcass) => carcass.name === "Black Bear" && carcass.knownOutputs.length)
    || carcasses.find((carcass) => carcass.knownOutputs.length)
    || carcasses[0];
  state.carcassId = initial?.id || "";

  els.knownCount.textContent = carcasses.filter((carcass) => carcass.knownOutputs.length).length.toLocaleString();
  els.catalogCount.textContent = carcasses.length.toLocaleString();
  els.dataStamp.textContent = `Data generated ${formatDate(sourceData.meta.generatedAt)}`;
  renderRootOptions();
  attachEvents();
  render();
}

function attachEvents() {
  els.carcassFilter.addEventListener("input", () => {
    state.carcassFilter = els.carcassFilter.value.trim().toLowerCase();
    renderCarcassOptions();
    renderResult();
  });

  els.carcassSelect.addEventListener("change", () => {
    state.carcassId = els.carcassSelect.value;
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

  els.rootFilter.addEventListener("change", () => {
    state.root = els.rootFilter.value;
    renderTable();
  });

  els.recipeSearch.addEventListener("input", () => {
    state.search = els.recipeSearch.value.trim().toLowerCase();
    renderTable();
  });

  els.butcheryTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-use-carcass]");
    if (!button) return;
    const carcass = carcasses.find((item) => item.id === button.dataset.useCarcass);
    if (!carcass) return;
    state.carcassFilter = "";
    state.carcassId = carcass.id;
    els.carcassFilter.value = "";
    renderCarcassOptions();
    renderResult();
    document.querySelector(".butchery-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function render() {
  renderCarcassOptions();
  renderResult();
  renderTable();
}

function renderRootOptions() {
  const roots = [...new Set(carcasses.map((carcass) => carcass.root))]
    .sort((a, b) => a.localeCompare(b));
  els.rootFilter.innerHTML = [
    `<option value="all">All zoology roots</option>`,
    ...roots.map((root) => `<option value="${escapeHtml(root)}">${escapeHtml(root)}</option>`),
  ].join("");
}

function renderCarcassOptions() {
  const visible = carcasses.filter(
    (carcass) => !state.carcassFilter || carcass.searchText.includes(state.carcassFilter),
  );
  if (!visible.some((carcass) => carcass.id === state.carcassId)) {
    state.carcassId = visible[0]?.id || "";
  }

  els.carcassSelect.innerHTML = visible.length
    ? visible.map((carcass) => {
      const suffix = carcass.knownOutputs.length ? "" : " - data pending";
      return `<option value="${escapeHtml(carcass.id)}">${escapeHtml(carcass.name + suffix)}</option>`;
    }).join("")
    : `<option value="">No matching carcasses</option>`;
  els.carcassSelect.value = state.carcassId;
  els.carcassSelect.disabled = !visible.length;
}

function renderResult() {
  const carcass = getCurrentCarcass();
  if (!carcass) {
    renderNoSelection();
    return;
  }

  const amount = clampAmount(state.amount);
  const scale = amount / BASE_CARCASS;
  const multiplier = state.cladeBonus ? CLADE_MULTIPLIER : 1;
  const known = carcass.knownOutputs.map((output) => ({
    ...output,
    scaled: Math.floor(output.amount * scale * multiplier),
  }));
  const unknown = carcass.outputs.filter((output) => output.amount === null);
  const total = known.reduce((sum, output) => sum + output.scaled, 0);
  const hasKnown = known.length > 0;

  els.amountInput.value = amount;
  els.resultCarcass.textContent = carcass.name;
  els.dataStatus.textContent = hasKnown ? "Yield data available" : "Yield data pending";
  els.dataStatus.classList.toggle("pending", !hasKnown);
  els.zoologyRoot.textContent = carcass.root;
  els.zoology.textContent = carcass.zoology;
  els.totalYield.textContent = hasKnown ? formatNumber(total) : "Unknown";
  els.outputGrid.hidden = !hasKnown && !unknown.length;
  els.outputGrid.innerHTML = [
    ...known.map((output) => outputItem(output.name, formatNumber(output.scaled), false)),
    ...unknown.map((output) => outputItem(output.name, "Unknown", true)),
  ].join("");
  els.unavailableState.hidden = hasKnown || unknown.length > 0;
  els.trophyName.textContent = carcass.trophy;
  els.trophyValue.textContent = carcass.trophyValue;

  const bonus = state.cladeBonus
    ? "The 10% Butcher bonus is included."
    : "The 10% Butcher bonus is not included.";
  els.recipeNote.textContent = hasKnown
    ? `Scaled from ${formatNumber(BASE_CARCASS)} carcass. Known outputs round down to whole units. ${bonus}`
    : "This entry exists in the workbook, but numeric yields have not been documented yet.";
}

function renderNoSelection() {
  els.resultCarcass.textContent = "No matching carcass";
  els.dataStatus.textContent = "Adjust the search";
  els.dataStatus.classList.add("pending");
  els.zoologyRoot.textContent = "-";
  els.zoology.textContent = "-";
  els.totalYield.textContent = "-";
  els.outputGrid.innerHTML = "";
  els.unavailableState.hidden = false;
  els.trophyName.textContent = "None";
  els.trophyValue.textContent = "None";
  els.recipeNote.textContent = "Clear or shorten the carcass search to continue.";
}

function outputItem(name, amount, unknown) {
  return `<div class="output-item ${unknown ? "unknown" : ""}">
    <strong>${escapeHtml(amount)}</strong>
    <span>${escapeHtml(name)}</span>
  </div>`;
}

function renderTable() {
  const visible = carcasses.filter((carcass) => {
    if (state.root !== "all" && carcass.root !== state.root) return false;
    return !state.search || carcass.searchText.includes(state.search);
  });

  els.butcheryTableBody.innerHTML = visible.map((carcass) => {
    const yields = carcass.knownOutputs.length
      ? carcass.knownOutputs
        .map((output) => `<span>${escapeHtml(output.name)} <b>${formatNumber(output.amount)}</b></span>`)
        .join("")
      : `<span class="pending-yield">Data pending</span>`;
    const trophy = carcass.trophy === "None"
      ? "None"
      : `${carcass.trophy}${carcass.trophyValue === "None" ? "" : ` (${carcass.trophyValue})`}`;
    return `<tr>
      <td>${escapeHtml(carcass.name)}</td>
      <td>${escapeHtml(carcass.root)} / ${escapeHtml(carcass.zoology)}</td>
      <td><div class="yield-list">${yields}</div></td>
      <td>${escapeHtml(trophy)}</td>
      <td><button class="use-carcass" type="button" data-use-carcass="${escapeHtml(carcass.id)}">Use</button></td>
    </tr>`;
  }).join("");
  els.tableEmpty.hidden = visible.length > 0;
}

function getCurrentCarcass() {
  return carcasses.find((carcass) => carcass.id === state.carcassId) || null;
}

function clampAmount(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 1) return 1;
  return Math.min(number, 100000000);
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
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
