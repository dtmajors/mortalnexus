const data = window.MO2_DATA;

const categoryAccents = {
  crafting: "#ee4f68",
  library: "#9c67ff",
  taming: "#c252c7",
  world: "#7658d8",
};

const state = {
  query: "",
  category: "all",
  section: "all",
  type: "all",
  sort: "relevance",
  limit: 80,
};

const els = {
  categoryNav: document.querySelector("#categoryNav"),
  sectionNav: document.querySelector("#sectionNav"),
  searchInput: document.querySelector("#searchInput"),
  recordTotal: document.querySelector("#recordTotal"),
  overviewRecordTotal: document.querySelector("#overviewRecordTotal"),
  overviewTopicTotal: document.querySelector("#overviewTopicTotal"),
  overviewCategoryTotal: document.querySelector("#overviewCategoryTotal"),
  directoryView: document.querySelector("#directoryView"),
  browseView: document.querySelector("#browseView"),
  directoryTitle: document.querySelector("#directoryTitle"),
  directorySummary: document.querySelector("#directorySummary"),
  categoryDirectory: document.querySelector("#categoryDirectory"),
  popularSearches: document.querySelector("#popularSearches"),
  browseKicker: document.querySelector("#browseKicker"),
  resultsTitle: document.querySelector("#resultsTitle"),
  resultCount: document.querySelector("#resultCount"),
  typeFilter: document.querySelector("#typeFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  clearFiltersBtn: document.querySelector("#clearFiltersBtn"),
  copyShareBtn: document.querySelector("#copyShareBtn"),
  activeFilters: document.querySelector("#activeFilters"),
  results: document.querySelector("#results"),
  dataStamp: document.querySelector("#dataStamp"),
  topicSidebar: document.querySelector("#topicSidebar"),
  mobileNavBtn: document.querySelector("#mobileNavBtn"),
  closeMobileNavBtn: document.querySelector("#closeMobileNavBtn"),
  mobileNavOverlay: document.querySelector("#mobileNavOverlay"),
  drawer: document.querySelector("#detailDrawer"),
  drawerOverlay: document.querySelector("#drawerOverlay"),
  drawerContent: document.querySelector("#drawerContent"),
  closeDrawerBtn: document.querySelector("#closeDrawerBtn"),
};

const categoryById = new Map(data.categories.map((category) => [category.id, category]));
const sectionById = new Map(data.sections.map((section) => [section.id, section]));
const recordById = new Map(data.records.map((record) => [record.id, record]));
const baseRecords = JSON.parse(JSON.stringify(data.records));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function meaningfulSection(value) {
  const section = String(value || "").trim();
  return section && !["-", "--", "•", "·"].includes(section);
}

function accentStyle(categoryId) {
  return `style="--accent:${categoryAccents[categoryId] || "#c4a269"}"`;
}

function init() {
  loadHash();
  els.recordTotal.textContent = data.records.length.toLocaleString();
  if (els.overviewRecordTotal) els.overviewRecordTotal.textContent = data.records.length.toLocaleString();
  if (els.overviewTopicTotal) els.overviewTopicTotal.textContent = data.sections.length.toLocaleString();
  if (els.overviewCategoryTotal) els.overviewCategoryTotal.textContent = data.categories.length.toLocaleString();
  els.dataStamp.textContent = `Data generated ${formatDate(data.meta.generatedAt)}`;
  renderTypeOptions();
  renderPopularSearches();
  attachEvents();
  render();

  const params = new URLSearchParams(location.hash.slice(1));
  const recordId = params.get("record");
  if (recordId) requestAnimationFrame(() => openRecord(recordId, false));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "from the source workbook";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderTypeOptions() {
  const types = [...new Set(data.records.map((record) => record.type))].sort((a, b) => a.localeCompare(b));
  els.typeFilter.innerHTML = [
    `<option value="all">All entry types</option>`,
    ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`),
  ].join("");
}

function renderPopularSearches() {
  const searches = ["Calx", "White Bear", "Skill Books", "Taming", "Vadda", "Housing"];
  els.popularSearches.innerHTML = searches
    .map((term) => `<button class="search-shortcut" type="button" data-query="${escapeHtml(term)}">${escapeHtml(term)}</button>`)
    .join("");
}

function render() {
  renderNavigation();
  syncControls();

  if (isDirectoryMode()) {
    els.directoryView.hidden = false;
    els.browseView.hidden = true;
    renderDirectory();
  } else {
    els.directoryView.hidden = true;
    els.browseView.hidden = false;
    renderBrowse();
  }
}

function isDirectoryMode() {
  return !state.query && state.section === "all" && state.type === "all" && state.sort === "relevance";
}

function renderNavigation() {
  els.categoryNav.innerHTML = [
    `<button class="category-tab ${state.category === "all" ? "active" : ""}" type="button" data-category="all">All topics</button>`,
    ...data.categories.map(
      (category) => `<button class="category-tab ${state.category === category.id ? "active" : ""}" type="button" data-category="${category.id}" ${accentStyle(category.id)}>${escapeHtml(category.name)}</button>`,
    ),
  ].join("");

  // Keep the full topic index visible while browsing a single topic. The active
  // entry is highlighted, but users never lose the rest of the reference tree.
  const categories = data.categories;

  els.sectionNav.innerHTML = categories
    .map((category) => {
      const sections = data.sections.filter((section) => section.category === category.id);
      return `<div class="section-group-label" ${accentStyle(category.id)}>${escapeHtml(category.name)}</div>
        ${sections
          .map(
            (section) => `<button class="section-link ${state.section === section.id ? "active" : ""}" type="button" data-section="${section.id}" ${accentStyle(section.category)}>
              <span>${escapeHtml(section.name)}</span><small>${section.recordCount.toLocaleString()}</small>
            </button>`,
          )
          .join("")}`;
    })
    .join("");
}

function syncControls() {
  els.searchInput.value = state.query;
  els.typeFilter.value = state.type;
  els.sortSelect.value = state.sort;
}

function renderDirectory() {
  const categories = state.category === "all"
    ? data.categories
    : data.categories.filter((category) => category.id === state.category);
  const selectedCategory = categoryById.get(state.category);
  const sectionCount = data.sections.filter((section) => state.category === "all" || section.category === state.category).length;
  const recordCount = data.records.filter((record) => state.category === "all" || record.category === state.category).length;

  els.directoryTitle.textContent = selectedCategory?.name || "Browse the reference";
  els.directorySummary.textContent = `${sectionCount} topics / ${recordCount.toLocaleString()} entries`;
  els.categoryDirectory.innerHTML = categories
    .map((category) => {
      const sections = data.sections.filter((section) => section.category === category.id);
      return `<section class="directory-group" ${accentStyle(category.id)}>
        <div class="directory-group-head">
          <span class="directory-accent" aria-hidden="true"></span>
          <div>
            <h3>${escapeHtml(category.name)}</h3>
            <p>${escapeHtml(category.description)}</p>
          </div>
        </div>
        <div class="directory-links">
          ${sections
            .map(
              (section) => `<button class="directory-link" type="button" data-section="${section.id}">
                <span>${escapeHtml(section.name)}</span>
                <span>${section.recordCount.toLocaleString()}</span>
              </button>`,
            )
            .join("")}
        </div>
      </section>`;
    })
    .join("");
}

function renderBrowse() {
  const records = getFilteredRecords();
  const section = sectionById.get(state.section);
  const category = categoryById.get(state.category);

  if (state.query) {
    els.resultsTitle.textContent = "Search results";
    els.browseKicker.textContent = section?.name || category?.name || "Full reference";
  } else if (section) {
    els.resultsTitle.textContent = section.name;
    els.browseKicker.textContent = categoryById.get(section.category)?.name || "Reference topic";
  } else if (state.type !== "all") {
    els.resultsTitle.textContent = state.type;
    els.browseKicker.textContent = category?.name || "Entry type";
  } else {
    els.resultsTitle.textContent = category?.name || "All entries";
    els.browseKicker.textContent = "Reference results";
  }

  const queryNote = state.query ? ` matching "${state.query}"` : "";
  els.resultCount.textContent = `${records.length.toLocaleString()} ${records.length === 1 ? "entry" : "entries"}${queryNote}`;
  renderActiveFilters();
  renderResults(records);
}

function getFilteredRecords() {
  const tokens = normalize(state.query).split(/\s+/).filter(Boolean);
  let records = data.records.filter((record) => {
    if (state.category !== "all" && record.category !== state.category) return false;
    if (state.section !== "all" && record.sheet !== sectionById.get(state.section)?.name) return false;
    if (state.type !== "all" && record.type !== state.type) return false;
    return tokens.every((token) => record.searchText.includes(token));
  });

  const scored = records.map((record) => ({ record, score: scoreRecord(record, tokens) }));
  if (state.sort === "title") {
    scored.sort((a, b) => a.record.title.localeCompare(b.record.title, undefined, { numeric: true }));
  } else if (state.sort === "section") {
    scored.sort((a, b) => a.record.sheet.localeCompare(b.record.sheet) || a.record.title.localeCompare(b.record.title, undefined, { numeric: true }));
  } else if (tokens.length) {
    scored.sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title, undefined, { numeric: true }));
  } else {
    scored.sort((a, b) => a.record.title.localeCompare(b.record.title, undefined, { numeric: true }));
  }
  return scored.map((item) => item.record);
}

function scoreRecord(record, tokens) {
  let score = 0;
  const title = normalize(record.title);
  const subtitle = normalize(record.subtitle);
  const sheet = normalize(record.sheet);
  for (const token of tokens) {
    if (title === token) score += 60;
    else if (title.startsWith(token)) score += 30;
    else if (title.includes(token)) score += 18;
    if (subtitle.includes(token)) score += 9;
    if (sheet.includes(token)) score += 7;
    if (normalize(record.type).includes(token)) score += 6;
  }
  return score;
}

function renderActiveFilters() {
  const parts = [];
  if (state.query) parts.push(`Search: ${state.query}`);
  if (state.category !== "all") parts.push(categoryById.get(state.category)?.name || state.category);
  if (state.section !== "all") parts.push(sectionById.get(state.section)?.name || state.section);
  if (state.type !== "all") parts.push(state.type);
  els.activeFilters.innerHTML = parts.map((part) => `<span class="filter-pill">${escapeHtml(part)}</span>`).join("");
}

function renderResults(records) {
  if (!records.length) {
    els.results.innerHTML = `<div class="empty-state">No entries matched. Try a shorter search or clear the filters.</div>`;
    return;
  }

  const visible = records.slice(0, state.limit);
  const useTable = state.section !== "all" && !state.query;
  els.results.innerHTML = useTable ? renderTable(visible, records) : renderResultList(visible, records);
}

function renderResultList(records, allRecords) {
  const rows = records.map(renderRecordRow).join("");
  return `<div class="result-list">${rows}</div>${renderLoadMore(records.length, allRecords.length)}`;
}

function renderRecordRow(record) {
  const category = categoryById.get(record.category);
  const facts = previewFields(record, 3);
  return `<button class="record-row" type="button" data-open-record="${record.id}" ${accentStyle(record.category)}>
    <span class="record-heading">
      <span class="record-type">${escapeHtml(record.type)} / ${escapeHtml(record.sheet)}</span>
      <strong class="record-title">${escapeHtml(record.title)}</strong>
      ${record.subtitle ? `<span class="record-subtitle">${escapeHtml(record.subtitle)}</span>` : ""}
    </span>
    <span class="record-facts">
      ${facts
        .map((field) => `<span class="record-fact"><b>${escapeHtml(field.label)}</b><span>${escapeHtml(field.value)}</span></span>`)
        .join("")}
    </span>
    <span class="row-action" aria-hidden="true">View</span>
  </button>`;
}

function previewFields(record, limit) {
  const title = normalize(record.title);
  const fields = record.fields.filter((field) => normalize(field.value) !== title && String(field.value).trim());
  if (meaningfulSection(record.section) && !fields.some((field) => field.value === record.section)) {
    fields.unshift({ label: "Variant", value: record.section });
  }
  if (record.matrix) fields.push({ label: "Level curve", value: `${record.matrix.length} levels` });
  return fields.slice(0, limit);
}

function renderTable(records, allRecords) {
  const columns = getTableColumns(allRecords);
  const head = [`<th>Name</th>`, ...columns.map((column) => `<th>${escapeHtml(column.label)}</th>`), `<th></th>`].join("");
  const body = records
    .map((record) => {
      const cells = columns.map((column) => `<td>${escapeHtml(readColumn(record, column))}</td>`).join("");
      return `<tr data-open-record="${record.id}" tabindex="0" role="button">
        <td>${escapeHtml(record.title)}</td>${cells}<td class="row-action">View</td>
      </tr>`;
    })
    .join("");
  return `<div class="table-shell"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${renderLoadMore(records.length, allRecords.length)}`;
}

function getTableColumns(records) {
  const stats = new Map();
  let firstSeen = 0;
  for (const record of records) {
    for (const field of record.fields) {
      if (!stats.has(field.label)) stats.set(field.label, { label: field.label, count: 0, sameAsTitle: 0, order: firstSeen++ });
      const stat = stats.get(field.label);
      stat.count += 1;
      if (normalize(field.value) === normalize(record.title)) stat.sameAsTitle += 1;
    }
  }

  const threshold = Math.max(2, Math.ceil(records.length * 0.35));
  const fieldColumns = [...stats.values()]
    .filter((stat) => stat.count >= threshold && stat.sameAsTitle / stat.count < 0.8)
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, 5)
    .map((stat) => ({ kind: "field", label: stat.label }));

  const meaningfulSectionCount = records.filter((record) => meaningfulSection(record.section)).length;
  if (meaningfulSectionCount >= Math.max(2, Math.ceil(records.length * 0.2))) {
    fieldColumns.unshift({ kind: "section", label: "Variant" });
  }
  return fieldColumns.slice(0, 5);
}

function readColumn(record, column) {
  if (column.kind === "section") return meaningfulSection(record.section) ? record.section : "-";
  return record.fields.find((field) => field.label === column.label)?.value || "-";
}

function renderLoadMore(visibleCount, totalCount) {
  if (visibleCount >= totalCount) return "";
  const amount = Math.min(80, totalCount - visibleCount);
  return `<button class="load-more" type="button" data-load-more>Show ${amount.toLocaleString()} more</button>`;
}

function openRecord(id, updateHash = true) {
  const record = recordById.get(id);
  if (!record) return;
  const category = categoryById.get(record.category);
  els.drawerContent.innerHTML = `<article ${accentStyle(record.category)}>
    <header class="detail-head">
      <p class="kicker">${escapeHtml(record.type)}</p>
      <h2>${escapeHtml(record.title)}</h2>
      <p class="detail-context">${escapeHtml(category?.name || record.category)} / ${escapeHtml(record.sheet)}</p>
      ${record.subtitle ? `<p class="detail-subtitle">${escapeHtml(record.subtitle)}</p>` : ""}
    </header>
    <dl class="detail-grid">
      ${record.fields
        .map((field) => `<div class="detail-field"><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`)
        .join("")}
    </dl>
    ${record.matrix ? renderMatrix(record.matrix) : ""}
    ${record._editMeta ? `<p class="record-edit-meta">Last edited by ${escapeHtml(record._editMeta.updatedBy || "editor")}</p>` : ""}
    ${window.NaveIndexEditor?.isEditor() ? `<button class="text-button drawer-edit-button" type="button" data-nave-edit="${escapeHtml(record.id)}">Edit entry</button>` : ""}
  </article>`;
  els.drawerOverlay.hidden = false;
  els.drawer.classList.add("open");
  els.drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  if (updateHash) writeHash(id);
}

function renderMatrix(matrix) {
  return `<h3 class="matrix-heading">Pet point curve</h3>
    <div class="matrix-table-wrap">
      <table class="matrix-table">
        <thead><tr><th>Level</th><th>Pet points</th></tr></thead>
        <tbody>${matrix.map((row) => `<tr><td>${escapeHtml(row.level)}</td><td>${escapeHtml(row.points)}</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function closeDrawer() {
  els.drawer.classList.remove("open");
  els.drawer.setAttribute("aria-hidden", "true");
  els.drawerOverlay.hidden = true;
  document.body.style.overflow = "";
  writeHash();
}

function selectCategory(categoryId) {
  state.category = categoryId;
  state.section = "all";
  state.type = "all";
  state.sort = "relevance";
  state.limit = 80;
  render();
  writeHash();
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectSection(sectionId) {
  const section = sectionById.get(sectionId);
  if (!section) return;
  state.section = sectionId;
  state.category = section.category;
  state.type = "all";
  state.sort = "relevance";
  state.limit = 80;
  render();
  writeHash();
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function runSearch(query) {
  state.query = query;
  if (query.trim()) {
    state.category = "all";
    state.section = "all";
  }
  state.limit = 80;
  render();
  writeHash();
}

function clearFilters() {
  state.query = "";
  state.category = "all";
  state.section = "all";
  state.type = "all";
  state.sort = "relevance";
  state.limit = 80;
  render();
  history.replaceState(null, "", location.pathname);
}

function openMobileNav() {
  els.topicSidebar.classList.add("open");
  els.mobileNavOverlay.hidden = false;
  els.mobileNavBtn.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeMobileNav() {
  els.topicSidebar.classList.remove("open");
  els.mobileNavOverlay.hidden = true;
  els.mobileNavBtn.setAttribute("aria-expanded", "false");
  if (!els.drawer.classList.contains("open")) document.body.style.overflow = "";
}

function attachEvents() {
  els.categoryNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) selectCategory(button.dataset.category);
  });

  els.sectionNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (button) selectSection(button.dataset.section);
  });

  els.categoryDirectory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (button) selectSection(button.dataset.section);
  });

  els.popularSearches.addEventListener("click", (event) => {
    const button = event.target.closest("[data-query]");
    if (!button) return;
    runSearch(button.dataset.query);
    els.searchInput.focus();
  });

  els.searchInput.addEventListener("input", () => runSearch(els.searchInput.value));
  els.typeFilter.addEventListener("change", () => {
    state.type = els.typeFilter.value;
    state.limit = 80;
    render();
    writeHash();
  });
  els.sortSelect.addEventListener("change", () => {
    state.sort = els.sortSelect.value;
    render();
    writeHash();
  });

  els.results.addEventListener("click", (event) => {
    const recordTarget = event.target.closest("[data-open-record]");
    if (recordTarget) {
      openRecord(recordTarget.dataset.openRecord);
      return;
    }
    if (event.target.closest("[data-load-more]")) {
      state.limit += 80;
      renderBrowse();
    }
  });

  els.results.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("tr[data-open-record]");
    if (!row) return;
    event.preventDefault();
    openRecord(row.dataset.openRecord);
  });

  els.clearFiltersBtn.addEventListener("click", clearFilters);
  els.copyShareBtn.addEventListener("click", copyCurrentView);
  els.mobileNavBtn.addEventListener("click", openMobileNav);
  els.closeMobileNavBtn.addEventListener("click", closeMobileNav);
  els.mobileNavOverlay.addEventListener("click", closeMobileNav);
  els.closeDrawerBtn.addEventListener("click", closeDrawer);
  els.drawerOverlay.addEventListener("click", closeDrawer);

  document.querySelector("[data-action='home']").addEventListener("click", (event) => {
    event.preventDefault();
    clearFilters();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== els.searchInput) {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
    } else if (event.key === "Escape" && els.drawer.classList.contains("open")) {
      closeDrawer();
    } else if (event.key === "Escape" && els.topicSidebar.classList.contains("open")) {
      closeMobileNav();
    }
  });
}

function loadHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  state.query = params.get("q") || "";
  state.category = categoryById.has(params.get("category")) ? params.get("category") : "all";
  state.section = sectionById.has(params.get("section")) ? params.get("section") : "all";
  state.type = params.get("type") || "all";
  state.sort = ["relevance", "title", "section"].includes(params.get("sort")) ? params.get("sort") : "relevance";
}

function writeHash(recordId = "") {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category !== "all") params.set("category", state.category);
  if (state.section !== "all") params.set("section", state.section);
  if (state.type !== "all") params.set("type", state.type);
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (recordId) params.set("record", recordId);
  const hash = params.toString();
  history.replaceState(null, "", hash ? `#${hash}` : location.pathname);
}

async function copyCurrentView() {
  writeHash();
  try {
    await navigator.clipboard.writeText(location.href);
    els.copyShareBtn.textContent = "Link copied";
  } catch {
    els.copyShareBtn.textContent = "Copy failed";
  }
  setTimeout(() => {
    els.copyShareBtn.textContent = "Copy link";
  }, 1200);
}

function rebuildReferenceIndexes() {
  recordById.clear();
  data.records.forEach((record) => recordById.set(record.id, record));
  for (const section of data.sections) {
    const records = data.records.filter((record) => record.sheet === section.name);
    section.recordCount = records.length;
    section.types = [...new Set(records.map((record) => record.type))].sort((a, b) => a.localeCompare(b));
  }
  data.meta.recordCount = data.records.length;
  els.recordTotal.textContent = data.records.length.toLocaleString();
  if (els.overviewRecordTotal) els.overviewRecordTotal.textContent = data.records.length.toLocaleString();
  renderTypeOptions();
  render();
}

function applyReferenceChanges(changeMap = {}) {
  const merged = new Map(baseRecords.map((record) => [record.id, JSON.parse(JSON.stringify(record))]));
  for (const change of Object.values(changeMap || {})) {
    if (!change?.id) continue;
    if (change.deleted) {
      merged.delete(change.id);
      continue;
    }
    if (change.record) {
      const record = JSON.parse(JSON.stringify(change.record));
      record._editMeta = { updatedBy: change.updatedBy || "editor", updatedAt: change.updatedAt || 0 };
      merged.set(record.id, record);
    }
  }
  data.records.splice(0, data.records.length, ...merged.values());
  rebuildReferenceIndexes();
}

window.NaveIndex = {
  applyChanges: applyReferenceChanges,
  categories: () => JSON.parse(JSON.stringify(data.categories)),
  sections: () => JSON.parse(JSON.stringify(data.sections)),
  getRecord: (id) => {
    const record = recordById.get(id);
    return record ? JSON.parse(JSON.stringify(record)) : null;
  },
  refresh: rebuildReferenceIndexes,
};

init();
