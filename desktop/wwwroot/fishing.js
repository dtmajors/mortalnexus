(() => {
  const state = {
    records: [],
    filtered: [],
    selectedFish: "",
    query: "",
    line: "",
    hook: "",
    bait: "",
    location: "",
    sort: "source",
  };

  const els = Object.fromEntries([
    "fishCount", "observationCount", "baitCount", "locationCount", "visibleFishCount", "fishDirectory",
    "fishProfile", "fishingSearch", "lineFilter", "hookFilter", "baitFilter", "locationFilter", "sortOrder",
    "resetFishingFilters", "filteredObservationCount", "catchTableBody", "catchTableEmpty", "dataCoverage",
  ].map((id) => [id, document.getElementById(id)]));

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const numericParts = (value) => [...String(value || "").matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  const numericMax = (value) => Math.max(0, ...numericParts(value));
  const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value || 0);
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const joinOrDash = (values) => values.length ? values.join(", ") : "Not recorded";
  const refreshIcons = () => window.lucide?.createIcons?.();

  function fillSelect(select, values, label) {
    select.innerHTML = `<option value="">All ${label}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  }

  function setupFilters() {
    fillSelect(els.lineFilter, unique(state.records.map((record) => record.line)), "lines");
    fillSelect(els.hookFilter, unique(state.records.map((record) => record.hook)), "hooks");
    fillSelect(els.baitFilter, unique(state.records.map((record) => record.bait)), "baits");
    fillSelect(els.locationFilter, unique(state.records.map((record) => record.location)), "waters");
  }

  function matches(record) {
    if (state.line && record.line !== state.line) return false;
    if (state.hook && record.hook !== state.hook) return false;
    if (state.bait && record.bait !== state.bait) return false;
    if (state.location && record.location !== state.location) return false;
    if (!state.query) return true;
    return [record.fish, record.line, record.hook, record.bait, record.depth, record.time, record.location, record.size, record.notes]
      .join(" ").toLowerCase().includes(state.query);
  }

  function sortRecords(records) {
    const sorted = [...records];
    if (state.sort === "size") sorted.sort((a, b) => numericMax(b.size) - numericMax(a.size) || a.sourceRow - b.sourceRow);
    if (state.sort === "depth") sorted.sort((a, b) => numericMax(b.depth) - numericMax(a.depth) || a.sourceRow - b.sourceRow);
    if (state.sort === "fish") sorted.sort((a, b) => a.fish.localeCompare(b.fish) || a.sourceRow - b.sourceRow);
    if (state.sort === "source") sorted.sort((a, b) => a.sourceRow - b.sourceRow);
    return sorted;
  }

  function applyFilters() {
    state.filtered = sortRecords(state.records.filter(matches));
    const availableFish = unique(state.filtered.map((record) => record.fish));
    if (!availableFish.includes(state.selectedFish)) state.selectedFish = availableFish[0] || "";
    renderDirectory(availableFish);
    renderProfile();
    renderLedger();
  }

  function renderDirectory(fishNames) {
    const counts = new Map();
    state.filtered.forEach((record) => counts.set(record.fish, (counts.get(record.fish) || 0) + 1));
    els.visibleFishCount.textContent = `${fishNames.length} ${fishNames.length === 1 ? "species" : "species"}`;
    els.fishDirectory.innerHTML = fishNames.length ? fishNames.map((fish) => `
      <button class="fish-directory-item${fish === state.selectedFish ? " is-active" : ""}" type="button" data-fish="${escapeHtml(fish)}" role="option" aria-selected="${fish === state.selectedFish}">
        <span class="fish-index-icon"><i data-lucide="fish" aria-hidden="true"></i></span>
        <strong>${escapeHtml(fish)}</strong>
        <small>${formatNumber(counts.get(fish))}</small>
      </button>`).join("") : '<div class="fishing-empty"><strong>No fish found</strong><span>Reset or widen the filters.</span></div>';
    refreshIcons();
  }

  function aggregateSetups(records) {
    const groups = new Map();
    for (const record of records) {
      const key = [record.line, record.hook, record.bait, record.location].join("|");
      const group = groups.get(key) || { line: record.line, hook: record.hook, bait: record.bait, location: record.location, records: [] };
      group.records.push(record);
      groups.set(key, group);
    }
    return [...groups.values()].map((group) => {
      const depths = group.records.flatMap((record) => numericParts(record.depth));
      const sizes = group.records.flatMap((record) => numericParts(record.size));
      const times = unique(group.records.map((record) => record.time));
      const depth = depths.length ? `${formatNumber(Math.min(...depths))}${Math.min(...depths) === Math.max(...depths) ? "" : `-${formatNumber(Math.max(...depths))}`} cm` : "Depth not recorded";
      return { ...group, count: group.records.length, depth, largest: sizes.length ? Math.max(...sizes) : 0, times };
    }).sort((a, b) => b.count - a.count || b.largest - a.largest || a.bait.localeCompare(b.bait));
  }

  function renderProfile() {
    if (!state.selectedFish) {
      els.fishProfile.innerHTML = '<div class="fishing-empty"><i data-lucide="waves" aria-hidden="true"></i><strong>No matching fishing records</strong><span>Reset or widen the filters.</span></div>';
      refreshIcons();
      return;
    }

    const records = state.filtered.filter((record) => record.fish === state.selectedFish);
    const allFishRecords = state.records.filter((record) => record.fish === state.selectedFish);
    const setups = aggregateSetups(records);
    const depths = records.flatMap((record) => numericParts(record.depth));
    const sizes = records.flatMap((record) => numericParts(record.size));
    const lines = unique(records.map((record) => record.line));
    const hooks = unique(records.map((record) => record.hook));
    const baits = unique(records.map((record) => record.bait));
    const locations = unique(records.map((record) => record.location));
    const times = unique(records.map((record) => record.time));
    const depthText = depths.length ? `${formatNumber(Math.min(...depths))}-${formatNumber(Math.max(...depths))} cm` : "Not recorded";
    const largestText = sizes.length ? `${formatNumber(Math.max(...sizes))} g` : "Not recorded";
    const confidence = allFishRecords.length >= 10 ? "Broad record" : allFishRecords.length >= 4 ? "Multiple records" : "Limited record";

    els.fishProfile.innerHTML = `
      <header class="fish-profile-heading">
        <div class="fish-profile-identity">
          <span class="fish-profile-symbol"><i data-lucide="fish" aria-hidden="true"></i></span>
          <div><h2>${escapeHtml(state.selectedFish)}</h2><p>${formatNumber(records.length)} matching of ${formatNumber(allFishRecords.length)} recorded observations</p></div>
        </div>
        <span class="fish-profile-confidence">${confidence}</span>
      </header>
      <dl class="fish-metrics">
        <div><dt>Line and hook</dt><dd>${escapeHtml(joinOrDash(lines))}<br><em>Hooks ${escapeHtml(joinOrDash(hooks))}</em></dd></div>
        <div><dt>Recorded depth</dt><dd>${escapeHtml(depthText)}</dd></div>
        <div><dt>Largest catch</dt><dd>${escapeHtml(largestText)}</dd></div>
        <div><dt>Known waters</dt><dd>${formatNumber(locations.length)} <em>${locations.length === 1 ? "location" : "locations"}</em></dd></div>
      </dl>
      <div class="fish-detail-grid">
        <section class="fish-section">
          <header><h3>Most recorded setups</h3><span>${formatNumber(setups.length)} combinations</span></header>
          <div class="setup-list">${setups.slice(0, 8).map((setup, index) => `
            <article class="setup-row">
              <span class="setup-rank">${index + 1}</span>
              <div><strong>${escapeHtml(setup.bait)} · hook ${escapeHtml(setup.hook)} · ${escapeHtml(setup.line)} line</strong><small>${escapeHtml(setup.location || "Location not recorded")} · ${escapeHtml(setup.depth)}${setup.times.length ? ` · ${escapeHtml(setup.times.slice(0, 3).join(", "))}` : ""}</small></div>
              <span>${formatNumber(setup.count)} ${setup.count === 1 ? "catch" : "catches"}</span>
            </article>`).join("")}</div>
        </section>
        <aside class="fish-section">
          <header><h3>Field record</h3><span>Current filters</span></header>
          <div class="fish-facts">
            <div class="fish-fact"><span>Recorded baits</span><strong>${escapeHtml(joinOrDash(baits))}</strong></div>
            <div class="fish-fact"><span>Locations</span><strong>${escapeHtml(joinOrDash(locations))}</strong></div>
            <div class="fish-fact"><span>Recorded times</span><strong>${escapeHtml(times.length ? times.slice(0, 12).join(", ") : "Not recorded")}</strong></div>
          </div>
        </aside>
      </div>`;
    refreshIcons();
  }

  function renderLedger() {
    els.filteredObservationCount.textContent = `${formatNumber(state.filtered.length)} ${state.filtered.length === 1 ? "observation" : "observations"}`;
    els.catchTableEmpty.hidden = state.filtered.length > 0;
    els.catchTableBody.innerHTML = state.filtered.map((record) => `<tr data-fish="${escapeHtml(record.fish)}">
      <td>${escapeHtml(record.fish)}</td><td>${escapeHtml(record.line || "-")}</td><td>${escapeHtml(record.hook || "-")}</td>
      <td>${escapeHtml(record.bait || "-")}</td><td>${escapeHtml(record.depth || "-")}</td><td>${escapeHtml(record.time || "-")}</td>
      <td>${escapeHtml(record.location || "-")}</td><td>${escapeHtml(record.size ? `${record.size} g` : "-")}</td><td>${escapeHtml(record.notes || "")}</td>
    </tr>`).join("");
  }

  function resetFilters() {
    state.query = state.line = state.hook = state.bait = state.location = "";
    state.sort = "source";
    els.fishingSearch.value = "";
    els.lineFilter.value = els.hookFilter.value = els.baitFilter.value = els.locationFilter.value = "";
    els.sortOrder.value = "source";
    applyFilters();
  }

  els.fishDirectory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fish]");
    if (!button) return;
    state.selectedFish = button.dataset.fish;
    renderDirectory(unique(state.filtered.map((record) => record.fish)));
    renderProfile();
  });
  els.catchTableBody.addEventListener("click", (event) => {
    const row = event.target.closest("[data-fish]");
    if (!row) return;
    state.selectedFish = row.dataset.fish;
    renderDirectory(unique(state.filtered.map((record) => record.fish)));
    renderProfile();
    els.fishProfile.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.fishingSearch.addEventListener("input", () => { state.query = els.fishingSearch.value.trim().toLowerCase(); applyFilters(); });
  els.lineFilter.addEventListener("change", () => { state.line = els.lineFilter.value; applyFilters(); });
  els.hookFilter.addEventListener("change", () => { state.hook = els.hookFilter.value; applyFilters(); });
  els.baitFilter.addEventListener("change", () => { state.bait = els.baitFilter.value; applyFilters(); });
  els.locationFilter.addEventListener("change", () => { state.location = els.locationFilter.value; applyFilters(); });
  els.sortOrder.addEventListener("change", () => { state.sort = els.sortOrder.value; applyFilters(); });
  els.resetFishingFilters.addEventListener("click", resetFilters);

  fetch("/assets/data/fishing-observations.json?v=1", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Fishing data request failed (${response.status})`);
      return response.json();
    })
    .then((payload) => {
      state.records = Array.isArray(payload.observations) ? payload.observations : [];
      const fish = unique(state.records.map((record) => record.fish));
      const baits = unique(state.records.map((record) => record.bait));
      const locations = unique(state.records.map((record) => record.location));
      els.fishCount.textContent = formatNumber(fish.length);
      els.observationCount.textContent = formatNumber(state.records.length);
      els.baitCount.textContent = formatNumber(baits.length);
      els.locationCount.textContent = formatNumber(locations.length);
      els.dataCoverage.textContent = `Field-sheet rows ${payload.capturedRanges?.join(", ") || "supplied"}`;
      setupFilters();
      state.selectedFish = new URLSearchParams(location.search).get("fish") || fish[0] || "";
      applyFilters();
    })
    .catch((error) => {
      els.fishProfile.innerHTML = `<div class="fishing-empty"><i data-lucide="wifi-off" aria-hidden="true"></i><strong>Fishing records unavailable</strong><span>${escapeHtml(error.message)}</span></div>`;
      refreshIcons();
    });
})();
