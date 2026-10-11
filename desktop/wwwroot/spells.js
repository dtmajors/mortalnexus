(() => {
  const STORAGE_KEY = "mortal-nexus-spell-loadout-v1";
  const DEFAULT_REAGENT_WEIGHT_KG = 0.01;
  const REAGENT_WEIGHT_KG = new Map([
    ["Small Rough Black Opal", 0.005],
  ]);
  const schoolOrder = ["All", "Ecumenical", "Spiritism", "Necromancy", "Elementalism"];
  const state = {
    spells: [],
    byId: new Map(),
    loadout: new Map(),
    school: "All",
    query: "",
  };

  const elements = {
    catalogStatus: document.querySelector("#catalogStatus"),
    catalogCount: document.querySelector("#catalogCount"),
    filteredCount: document.querySelector("#filteredCount"),
    schoolFilters: document.querySelector("#schoolFilters"),
    spellSearch: document.querySelector("#spellSearch"),
    spellCatalog: document.querySelector("#spellCatalog"),
    clearLoadout: document.querySelector("#clearLoadout"),
    loadoutEmpty: document.querySelector("#loadoutEmpty"),
    loadoutList: document.querySelector("#loadoutList"),
    totalCasts: document.querySelector("#totalCasts"),
    totalMana: document.querySelector("#totalMana"),
    totalCastTime: document.querySelector("#totalCastTime"),
    totalWeight: document.querySelector("#totalWeight"),
    reagentKinds: document.querySelector("#reagentKinds"),
    reagentTotals: document.querySelector("#reagentTotals"),
    reagentEmpty: document.querySelector("#reagentEmpty"),
    copyLoadout: document.querySelector("#copyLoadout"),
    copyStatus: document.querySelector("#copyStatus"),
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalizeName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const refreshIcons = () => window.lucide?.createIcons?.({ attrs: { "aria-hidden": "true" } });
  const spellArt = (spell) => spell.imageId
    ? `<span class="spell-art"><img src="/api/oracle-builder/assets/img/spells/${encodeURIComponent(spell.imageId)}.png" alt="" loading="lazy" /><i data-lucide="wand-sparkles"></i></span>`
    : '<span class="spell-art"><i data-lucide="wand-sparkles"></i></span>';

  const formatNumber = (value, maximumFractionDigits = 1) => new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value || 0);

  const formatWeight = (value) => `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value || 0)} kg`;

  const reagentUnitWeight = (reagent) => Number.isFinite(reagent.weightKg)
    ? reagent.weightKg
    : REAGENT_WEIGHT_KG.get(reagent.name) ?? DEFAULT_REAGENT_WEIGHT_KG;

  function loadSavedPlan() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return;
      for (const entry of saved) {
        const quantity = Math.max(1, Math.min(99999, Number.parseInt(entry.quantity, 10) || 1));
        if (entry.id) state.loadout.set(entry.id, quantity);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function savePlan() {
    const saved = [...state.loadout].map(([id, quantity]) => ({ id, quantity }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }

  function spellEffect(spell) {
    if (!spell.effect) return "Utility";
    const range = spell.effect.min === spell.effect.max
      ? formatNumber(spell.effect.min)
      : `${formatNumber(spell.effect.min)}-${formatNumber(spell.effect.max)}`;
    return `${range} ${spell.effect.kind.toLowerCase()}`;
  }

  function reagentText(spell, multiplier = 1) {
    if (!spell.reagents.length) return "No reagent listed";
    return spell.reagents
      .map((reagent) => `${formatNumber(reagent.quantity * multiplier, 0)} ${reagent.name}`)
      .join(" + ");
  }

  function renderSchoolFilters() {
    elements.schoolFilters.innerHTML = schoolOrder.map((school) => {
      const count = school === "All" ? state.spells.length : state.spells.filter((spell) => spell.school === school).length;
      return `<button class="school-filter${school === state.school ? " is-active" : ""}" type="button" data-school="${school}">${school} <small>${count}</small></button>`;
    }).join("");
    refreshIcons();
  }

  function renderCatalog() {
    const query = state.query.trim().toLowerCase();
    const filtered = state.spells.filter((spell) => {
      if (state.school !== "All" && spell.school !== state.school) return false;
      if (!query) return true;
      const haystack = [spell.name, spell.school, spell.skill, spell.description, ...spell.reagents.map((item) => item.name)]
        .join(" ").toLowerCase();
      return haystack.includes(query);
    });

    elements.filteredCount.textContent = formatNumber(filtered.length, 0);
    if (!filtered.length) {
      elements.spellCatalog.innerHTML = '<p class="catalog-empty">No spells match that search.</p>';
      return;
    }

    elements.spellCatalog.innerHTML = filtered.map((spell) => {
      const added = state.loadout.has(spell.id);
      return `<button class="spell-entry${added ? " is-added" : ""}" type="button" data-spell-id="${escapeHtml(spell.id)}" data-school-color="${escapeHtml(spell.school)}">
        ${spellArt(spell)}
        <span class="spell-entry-copy">
          <span class="spell-entry-title"><strong>${escapeHtml(spell.name)}</strong><em>${escapeHtml(spell.school)}</em></span>
          <small>${escapeHtml(spellEffect(spell))} | ${formatNumber(spell.mana, 0)} mana | ${formatNumber(spell.castSeconds)}s</small>
          <span class="spell-entry-description">${escapeHtml(spell.description || "No description recorded.")}</span>
        </span>
        <span class="add-mark" aria-hidden="true"><i data-lucide="${added ? "check" : "plus"}"></i></span>
      </button>`;
    }).join("");
    refreshIcons();
  }

  function calculateTotals() {
    let casts = 0;
    let mana = 0;
    let castSeconds = 0;
    let inventoryWeightKg = 0;
    const reagents = new Map();

    for (const [id, quantity] of state.loadout) {
      const spell = state.byId.get(id);
      if (!spell) continue;
      casts += quantity;
      mana += spell.mana * quantity;
      castSeconds += spell.castSeconds * quantity;
      for (const reagent of spell.reagents) {
        const reagentQuantity = reagent.quantity * quantity;
        reagents.set(reagent.name, (reagents.get(reagent.name) || 0) + reagentQuantity);
        inventoryWeightKg += reagentQuantity * reagentUnitWeight(reagent);
      }
    }
    return { casts, mana, castSeconds, inventoryWeightKg, reagents: [...reagents].sort((a, b) => a[0].localeCompare(b[0])) };
  }

  function renderLoadout() {
    for (const id of [...state.loadout.keys()]) {
      if (!state.byId.has(id)) state.loadout.delete(id);
    }
    const selected = [...state.loadout]
      .map(([id, quantity]) => ({ spell: state.byId.get(id), quantity }))
      .filter((entry) => entry.spell);

    elements.loadoutEmpty.hidden = selected.length > 0;
    elements.clearLoadout.disabled = selected.length === 0;
    elements.loadoutList.innerHTML = selected.map(({ spell, quantity }) => `
      <article class="loadout-row" data-spell-id="${escapeHtml(spell.id)}" data-school-color="${escapeHtml(spell.school)}">
        ${spellArt(spell)}
        <div class="loadout-main">
          <div class="loadout-title"><strong>${escapeHtml(spell.name)}</strong><span>${escapeHtml(spell.school)}</span></div>
          <p class="loadout-meta">${escapeHtml(spellEffect(spell))} | skill ${formatNumber(spell.skillRequired, 0)}-${formatNumber(spell.skillFull, 0)} | ${formatNumber(spell.mana, 0)} mana | ${formatNumber(spell.castSeconds)}s${spell.rangeMeters == null ? "" : ` | ${formatNumber(spell.rangeMeters)}m`}</p>
          <div class="loadout-reagents">${escapeHtml(reagentText(spell, quantity))}</div>
        </div>
        <div class="quantity-control" aria-label="Cast quantity for ${escapeHtml(spell.name)}">
          <button type="button" data-action="decrease" title="Decrease quantity">-</button>
          <input type="number" min="1" max="99999" step="1" value="${quantity}" aria-label="Cast quantity" />
          <button type="button" data-action="increase" title="Increase quantity">+</button>
        </div>
        <button class="remove-spell" type="button" data-action="remove" title="Remove ${escapeHtml(spell.name)}" aria-label="Remove ${escapeHtml(spell.name)}"><i data-lucide="x"></i></button>
      </article>`).join("");

    const totals = calculateTotals();
    elements.totalCasts.textContent = formatNumber(totals.casts, 0);
    elements.totalMana.textContent = formatNumber(totals.mana, 0);
    elements.totalCastTime.textContent = `${formatNumber(totals.castSeconds)}s`;
    elements.totalWeight.textContent = formatWeight(totals.inventoryWeightKg);
    elements.reagentKinds.textContent = `${totals.reagents.length} ${totals.reagents.length === 1 ? "type" : "types"}`;
    elements.reagentTotals.innerHTML = totals.reagents.map(([name, quantity]) => `
      <div class="reagent-row"><span>${escapeHtml(name)}</span><strong>${formatNumber(quantity, 0)}</strong></div>`).join("");
    elements.reagentEmpty.hidden = totals.reagents.length > 0;
    elements.copyLoadout.disabled = selected.length === 0;

    savePlan();
    renderCatalog();
    refreshIcons();
  }

  function setQuantity(id, value) {
    const quantity = Math.max(1, Math.min(99999, Number.parseInt(value, 10) || 1));
    state.loadout.set(id, quantity);
    renderLoadout();
  }

  function copySummary() {
    const totals = calculateTotals();
    const lines = ["Mortal Nexus spell tally", ""];
    for (const [id, quantity] of state.loadout) {
      const spell = state.byId.get(id);
      if (spell) lines.push(`${quantity}x ${spell.name}`);
    }
    lines.push("", `Total casts: ${formatNumber(totals.casts, 0)}`);
    lines.push(`Total mana: ${formatNumber(totals.mana, 0)}`);
    lines.push(`Base cast time: ${formatNumber(totals.castSeconds)}s`);
    lines.push(`Inventory weight: ${formatWeight(totals.inventoryWeightKg)}`, "", "Reagents:");
    if (totals.reagents.length) {
      for (const [name, quantity] of totals.reagents) lines.push(`${formatNumber(quantity, 0)}x ${name}`);
    } else {
      lines.push("None listed");
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      elements.copyStatus.textContent = "Tally copied.";
      window.setTimeout(() => { elements.copyStatus.textContent = ""; }, 1800);
    }).catch(() => {
      elements.copyStatus.textContent = "Copy was blocked by Windows.";
    });
  }

  elements.schoolFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-school]");
    if (!button) return;
    state.school = button.dataset.school;
    renderSchoolFilters();
    renderCatalog();
  });

  elements.spellSearch.addEventListener("input", () => {
    state.query = elements.spellSearch.value;
    renderCatalog();
  });

  elements.spellCatalog.addEventListener("click", (event) => {
    const button = event.target.closest("[data-spell-id]");
    if (!button) return;
    const id = button.dataset.spellId;
    state.loadout.set(id, (state.loadout.get(id) || 0) + 1);
    renderLoadout();
  });

  elements.loadoutList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-spell-id]");
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!row || !action) return;
    const id = row.dataset.spellId;
    if (action === "remove") state.loadout.delete(id);
    if (action === "increase") state.loadout.set(id, (state.loadout.get(id) || 1) + 1);
    if (action === "decrease") state.loadout.set(id, Math.max(1, (state.loadout.get(id) || 1) - 1));
    renderLoadout();
  });

  elements.loadoutList.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="number"]')) return;
    const row = event.target.closest("[data-spell-id]");
    if (row) setQuantity(row.dataset.spellId, event.target.value);
  });

  elements.clearLoadout.addEventListener("click", () => {
    state.loadout.clear();
    renderLoadout();
  });
  elements.copyLoadout.addEventListener("click", copySummary);

  loadSavedPlan();
  Promise.all([
    fetch("/assets/data/spells-catalog.json?v=1", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
      return response.json();
    }),
    fetch("/assets/data/oracle-builder-catalog.json?v=1", { cache: "force-cache" })
      .then((response) => response.ok ? response.json() : null)
      .catch(() => null),
  ])
    .then(([catalog, builderPayload]) => {
      const builderSpells = builderPayload?.catalog?.spells || builderPayload?.spells || [];
      const builderByName = new Map(builderSpells.map((spell) => [normalizeName(spell.name), spell]));
      state.spells = (Array.isArray(catalog.spells) ? catalog.spells : []).map((spell) => ({
        ...spell,
        imageId: builderByName.get(normalizeName(spell.name))?.id || "",
      }));
      state.byId = new Map(state.spells.map((spell) => [spell.id, spell]));
      elements.catalogStatus.textContent = "Client catalog ready";
      elements.catalogCount.textContent = `${formatNumber(state.spells.length, 0)} spells`;
      renderSchoolFilters();
      renderLoadout();
    })
    .catch((error) => {
      elements.catalogStatus.textContent = "Catalog unavailable";
      elements.catalogCount.textContent = "Reload this page";
      elements.spellCatalog.innerHTML = `<p class="catalog-empty">${escapeHtml(error.message)}</p>`;
    });

  document.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.closest(".spell-art")) {
      event.target.hidden = true;
    }
  }, true);
})();
