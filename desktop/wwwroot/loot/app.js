(() => {
  "use strict";

  const database = window.MO2_LOOT_DATA;
  const CATEGORY_BY_MODE = {
    mob: "Mob",
    object: "Object / Container",
    resource: "Resource Yield",
  };
  const MODE_COPY = {
    mob: ["Creatures", "Creature drops"],
    object: ["World loot", "Containers"],
    resource: ["Gathering", "Resource yields"],
    raw: ["All decoded sources", "Raw evidence"],
    unresolved: ["References requiring review", "Unresolved records"],
  };
  const CREATURE_FIELDS = [10354, 10373, 10392, 10411, 10430, 10449, 10468, 10487, 10506, 10525];
  const PICKABLE_FIELDS = [10540, 10546, 10547, 10548, 10549, 10550, 10551, 10552, 10553, 10554];

  const state = {
    mode: "mob",
    query: "",
    evidence: "all",
    region: "all",
    hideTest: true,
    selectedKey: "",
    profileIndex: 0,
  };

  const elements = {
    modeTabs: document.getElementById("modeTabs"),
    search: document.getElementById("searchInput"),
    exportButton: document.getElementById("exportButton"),
    evidenceFilter: document.getElementById("evidenceFilter"),
    evidenceFilterLabel: document.getElementById("evidenceFilterLabel"),
    regionFilter: document.getElementById("regionFilter"),
    regionFilterLabel: document.getElementById("regionFilterLabel"),
    hideTest: document.getElementById("hideTestDefinitions"),
    testFilterLabel: document.getElementById("testFilterLabel"),
    sourceEyebrow: document.getElementById("sourceEyebrow"),
    sourceHeading: document.getElementById("sourceHeading"),
    sourceCount: document.getElementById("sourceCount"),
    sourceList: document.getElementById("sourceList"),
    emptyState: document.getElementById("emptyState"),
    profileContent: document.getElementById("profileContent"),
    profileEyebrow: document.getElementById("profileEyebrow"),
    profileTitle: document.getElementById("profileTitle"),
    profileSubtitle: document.getElementById("profileSubtitle"),
    profileBadges: document.getElementById("profileBadges"),
    profileExplanation: document.getElementById("profileExplanation"),
    profileTabs: document.getElementById("profileTabs"),
    definitionCount: document.getElementById("definitionCount"),
    definitionNames: document.getElementById("definitionNames"),
    combatSection: document.getElementById("combatSection"),
    combatProfiles: document.getElementById("combatProfiles"),
    dropHeading: document.getElementById("dropHeading"),
    dropSummary: document.getElementById("dropSummary"),
    dropRows: document.getElementById("dropRows"),
    technicalList: document.getElementById("technicalList"),
    sourceTimestamp: document.getElementById("sourceTimestamp"),
    dialog: document.getElementById("detailsDialog"),
    closeDialog: document.getElementById("closeDialog"),
    detailEyebrow: document.getElementById("detailEyebrow"),
    detailTitle: document.getElementById("detailTitle"),
    detailList: document.getElementById("detailList"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cleanDisplayName(value) {
    return String(value || "Unknown source")
      .replace(/\.\&s/gi, "'s")
      .replace(/&%s/gi, "'s")
      .replace(/&s/gi, "'s")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rowsForMode(mode) {
    if (mode === "raw") return database.loot;
    if (mode === "unresolved") {
      return database.loot.filter((row) => !String(row.st).startsWith("Resolved"));
    }
    return database.loot.filter((row) => row.c === CATEGORY_BY_MODE[mode]);
  }

  function regionHint(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("sarducaa") || value.includes("sarducca")) return "sarducca";
    if (value.includes("myrland")) return "myrland";
    if (value.includes("haven")) return "haven";
    return "shared";
  }

  function isLikelyTest(text) {
    return /(^|[^a-z])(test|dev|dummy|debug|sandbox)([^a-z]|$)/i.test(String(text || "").replaceAll("_", " "));
  }

  function sortRows(rows) {
    return [...rows].sort((a, b) =>
      Number(a.f || 0) - Number(b.f || 0) ||
      String(a.id || a.ii).localeCompare(String(b.id || b.ii), undefined, { numeric: true })
    );
  }

  function lootSignature(rows) {
    return JSON.stringify(sortRows(rows).map((row) => [
      row.f, row.tt, row.tg, row.ch, row.min, row.max, row.st,
    ]));
  }

  function buildGroups(rows) {
    const sourceMap = new Map();
    rows.forEach((row) => {
      const sourceKey = row.sg || `${row.c}|${row.t}|${row.si}`;
      if (!sourceMap.has(sourceKey)) {
        const refs = database.sourceEvidence?.[row.sg]?.refs || [];
        const sourceText = [row.si, row.sd, ...refs.map((ref) => `${ref.i} ${ref.d}`)].join(" ");
        sourceMap.set(sourceKey, {
          key: sourceKey,
          guid: row.sg,
          internal: row.si,
          display: cleanDisplayName(row.sd || row.si),
          category: row.c,
          table: row.t,
          className: row.sc,
          refs,
          region: regionHint(sourceText),
          likelyTest: isLikelyTest(sourceText),
          stats: database.monsterStats?.[row.sg] || null,
          rows: [],
        });
      }
      sourceMap.get(sourceKey).rows.push(row);
    });

    const groupMap = new Map();
    sourceMap.forEach((sourceEntry) => {
      const groupKey = `${sourceEntry.category}|${sourceEntry.display.toLowerCase()}`;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          display: sourceEntry.display,
          category: sourceEntry.category,
          sources: [],
          profiles: [],
        });
      }
      groupMap.get(groupKey).sources.push(sourceEntry);
    });

    groupMap.forEach((group) => {
      const profiles = new Map();
      group.sources.forEach((sourceEntry) => {
        const signature = lootSignature(sourceEntry.rows);
        if (!profiles.has(signature)) {
          profiles.set(signature, { rows: sortRows(sourceEntry.rows), sources: [] });
        }
        profiles.get(signature).sources.push(sourceEntry);
      });
      group.profiles = [...profiles.values()].sort((a, b) =>
        b.sources.length - a.sources.length || b.rows.length - a.rows.length
      );
      group.searchText = [
        group.display,
        ...group.sources.flatMap((sourceEntry) => [
          sourceEntry.internal,
          sourceEntry.guid,
          ...sourceEntry.rows.flatMap((row) => [row.id, row.ii, row.tc, row.tg]),
        ]),
      ].join(" ").toLowerCase();
      group.hasSpawnerReference = group.sources.some((sourceEntry) => sourceEntry.refs.length > 0);
      group.regions = new Set(group.sources.map((sourceEntry) => sourceEntry.region));
      group.allLikelyTest = group.sources.every((sourceEntry) => sourceEntry.likelyTest);
    });

    return [...groupMap.values()].sort((a, b) =>
      a.display.localeCompare(b.display, undefined, { numeric: true })
    );
  }

  const groupsByMode = Object.fromEntries(
    ["mob", "object", "resource", "raw", "unresolved"].map((mode) => [mode, buildGroups(rowsForMode(mode))])
  );

  function filteredGroups() {
    const query = state.query.trim().toLowerCase();
    return groupsByMode[state.mode].filter((group) => {
      if (query && !group.searchText.includes(query)) return false;
      if (state.mode === "mob" && state.evidence === "linked" && !group.hasSpawnerReference) return false;
      if (state.mode === "mob" && state.evidence === "content" && group.hasSpawnerReference) return false;
      if (state.mode === "mob" && state.region !== "all" && !group.regions.has(state.region)) return false;
      if (state.mode === "mob" && state.hideTest && group.allLikelyTest) return false;
      return true;
    });
  }

  function formatCount(value) {
    return new Intl.NumberFormat().format(value);
  }

  function trimNumber(value, digits) {
    return Number(value).toFixed(digits).replace(/\.?0+$/, "");
  }

  function chancePercent(value) {
    if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return null;
    return Number(value) * 100;
  }

  function formatChance(value) {
    const percent = chancePercent(value);
    if (percent === null) return "Not decoded";
    if (Math.abs(percent - 100) < 0.0000001) return "100%";
    const digits = percent >= 10 ? 2 : percent >= 1 ? 2 : percent >= 0.1 ? 3 : 4;
    return `${trimNumber(percent, digits)}%`;
  }

  function quantityLabel(row) {
    if (row.min === "" || row.min === null || row.min === undefined) return "Not decoded";
    return Number(row.min) === Number(row.max) ? formatCount(row.min) : `${formatCount(row.min)} - ${formatCount(row.max)}`;
  }

  function rollSlotLabel(row) {
    const field = Number(row.f);
    const creatureIndex = CREATURE_FIELDS.indexOf(field);
    if (creatureIndex >= 0) return `Loot slot ${creatureIndex + 1}`;
    const pickableIndex = PICKABLE_FIELDS.indexOf(field);
    if (pickableIndex >= 0) return `Loot slot ${pickableIndex + 1}`;
    return `Field ${row.f}`;
  }

  function evidenceLabel(row) {
    if (!String(row.st).startsWith("Resolved")) return row.st || "Unresolved";
    return "GUID resolved";
  }

  function updateModeCounts() {
    Object.entries(groupsByMode).forEach(([mode, groups]) => {
      const target = document.querySelector(`[data-count="${mode}"]`);
      if (target) target.textContent = formatCount(groups.length);
    });
  }

  function renderSourceList(groups) {
    elements.sourceCount.textContent = formatCount(groups.length);
    if (!groups.some((group) => group.key === state.selectedKey)) {
      state.selectedKey = groups[0]?.key || "";
      state.profileIndex = 0;
    }

    elements.sourceList.innerHTML = groups.map((group) => {
      const dropCount = new Set(group.profiles.flatMap((entry) => entry.rows.map((row) => row.id || row.ii || row.tg))).size;
      return `<button class="source-row${group.key === state.selectedKey ? " active" : ""}" type="button" data-source-key="${escapeHtml(group.key)}" role="option" aria-selected="${group.key === state.selectedKey}">
        <span class="source-row-main"><strong>${escapeHtml(group.display)}</strong></span>
        <span>${formatCount(dropCount)} known drop${dropCount === 1 ? "" : "s"}</span>
      </button>`;
    }).join("");

    if (!groups.length) {
      elements.sourceList.innerHTML = '<div class="list-empty">No sources match these filters.</div>';
    }
  }

  function badge(text, className) {
    return `<span class="badge ${className}">${escapeHtml(text)}</span>`;
  }

  function formatCombatValue(value) {
    if (value === null || value === undefined || value === "") return "Not set";
    return Number.isFinite(Number(value)) ? formatCount(Number(value)) : String(value);
  }

  function combatVariants(sources) {
    const variants = new Map();
    sources.filter((entry) => entry.stats).forEach((sourceEntry) => {
      const { i, c, ...values } = sourceEntry.stats;
      const signature = JSON.stringify(values);
      if (!variants.has(signature)) {
        variants.set(signature, { stats: sourceEntry.stats, sources: [] });
      }
      variants.get(signature).sources.push(sourceEntry);
    });
    return [...variants.values()];
  }

  function armorCell(value) {
    return value === null || value === undefined
      ? '<span class="armor-missing">Not set</span>'
      : `${escapeHtml(trimNumber(value, 2))}%`;
  }

  function renderCombatStats(group, profile) {
    const variants = group.category === "Mob" ? combatVariants(profile.sources) : [];
    elements.combatSection.hidden = variants.length === 0;
    if (!variants.length) {
      elements.combatProfiles.innerHTML = "";
      return;
    }

    const zones = [
      ["torso", "Torso"],
      ["head", "Head"],
      ["legs", "Legs"],
      ["rightArm", "Right arm"],
      ["leftArm", "Left arm"],
    ];
    elements.combatProfiles.innerHTML = variants.map((variant, index) => {
      const stats = variant.stats;
      const armorRows = zones.map(([key, label]) => {
        const values = stats.a?.[key] || {};
        return `<tr>
          <th>${label}</th>
          <td>${armorCell(values.b)}</td>
          <td>${armorCell(values.p)}</td>
          <td>${armorCell(values.s)}</td>
        </tr>`;
      }).join("");
      const hasArmor = zones.some(([key]) => Object.values(stats.a?.[key] || {}).some((value) => value !== null && value !== undefined));
      const detailStats = [
        ["Current health", stats.hc],
        ["Awareness distance", stats.ad],
        ["HP regeneration", stats.hr],
        ["Walk speed", stats.wv],
      ].filter(([, value]) => value !== null && value !== undefined);
      return `<article class="combat-card">
        <header class="combat-card-header">
          <div>
            <span>Stats${variants.length > 1 ? ` ${index + 1}` : ""}</span>
            <strong>${variants.length > 1 ? `${index + 1} of ${variants.length}` : "Creature profile"}</strong>
          </div>
        </header>
        <div class="combat-metrics">
          <div><span>Max health</span><strong>${escapeHtml(formatCombatValue(stats.h))}</strong></div>
          <div><span>Clade XP</span><strong>${escapeHtml(formatCombatValue(stats.x))}</strong></div>
          <div><span>Magic defense</span><strong>${stats.md === null || stats.md === undefined ? "Not set" : `${escapeHtml(trimNumber(stats.md, 2))}%`}</strong></div>
          <div><span>Move speed</span><strong>${escapeHtml(formatCombatValue(stats.mv))}</strong></div>
        </div>
        ${detailStats.length ? `<dl class="combat-details">${detailStats.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(formatCombatValue(value))}</dd></div>`).join("")}</dl>` : ""}
        ${hasArmor ? `<div class="armor-shell">
          <table class="armor-table">
            <thead><tr><th>Body zone</th><th>Blunt</th><th>Piercing</th><th>Slashing</th></tr></thead>
            <tbody>${armorRows}</tbody>
          </table>
        </div>` : '<p class="no-armor">No defense fields are set on this creature definition.</p>'}
      </article>`;
    }).join("");
  }

  function renderProfile(group) {
    if (!group) {
      elements.profileContent.hidden = true;
      elements.emptyState.hidden = false;
      elements.emptyState.querySelector("strong").textContent = "Nothing selected";
      elements.emptyState.querySelector("p").textContent = "Adjust the filters or choose a source from the list.";
      return;
    }

    elements.emptyState.hidden = true;
    elements.profileContent.hidden = false;
    state.profileIndex = Math.min(state.profileIndex, group.profiles.length - 1);
    const profile = group.profiles[state.profileIndex];
    const linkedSources = group.sources.filter((sourceEntry) => sourceEntry.refs.length > 0);
    const regionLabels = [...group.regions].map((value) => ({
      sarducca: "Sarducca name hint",
      myrland: "Myrland name hint",
      haven: "Haven name hint",
      shared: "Shared / unspecified",
    })[value]);

    elements.profileEyebrow.textContent = group.category;
    elements.profileTitle.textContent = group.display;
    elements.profileSubtitle.textContent = "Known drops and available creature stats.";
    elements.profileBadges.innerHTML = regionLabels.map((label) => badge(label.replace(" name hint", ""), "neutral")).join("");

    if (group.category === "Mob") {
      elements.profileExplanation.innerHTML = linkedSources.length
        ? `<strong>What is proven:</strong> the loot slots below are stored on these creature definitions, and ${linkedSources.length} definition${linkedSources.length === 1 ? " is" : "s are"} referenced by at least one AI spawner definition. <strong>What is not proven:</strong> that every definition or spawner is placed in the current world.`
        : `<strong>What is proven:</strong> the loot slots below are stored on these creature definitions. <strong>What is not proven:</strong> that the definitions are actively spawned; no AI spawner reference was found in this Content.db.`;
    } else if (group.category === "Object / Container") {
      elements.profileExplanation.innerHTML = linkedSources.length
        ? `<strong>What is proven:</strong> these rolls are stored on the pickable or container definition, and ${linkedSources.length} definition${linkedSources.length === 1 ? " is" : "s are"} referenced by a dedicated spawner definition. <strong>What is not proven:</strong> the spawner's world coordinate or whether it is currently placed.`
        : "<strong>What is proven:</strong> these rolls are stored on the pickable or container definition. A definition alone does not provide a world coordinate or prove that the object is currently placed.";
    } else if (group.category === "Resource Yield") {
      elements.profileExplanation.innerHTML = "<strong>What is proven:</strong> these are extraction or processing yields recorded by the resource filter. They are not conventional kill drops.";
    } else {
      elements.profileExplanation.innerHTML = "<strong>Raw evidence:</strong> this view preserves the decoded source record without adding a spawn or placement claim.";
    }

    elements.profileTabs.hidden = group.profiles.length <= 1;
    elements.profileTabs.innerHTML = group.profiles.map((entry, index) => (
      `<button class="profile-tab${index === state.profileIndex ? " active" : ""}" type="button" data-profile-index="${index}">Loot table ${index + 1}</button>`
    )).join("");

    elements.definitionCount.textContent = formatCount(profile.sources.length);
    elements.definitionNames.innerHTML = profile.sources.map((sourceEntry) => (
      `<span title="${escapeHtml(sourceEntry.guid)}">${escapeHtml(sourceEntry.internal)}</span>`
    )).join("");
    renderCombatStats(group, profile);

    const guaranteed = profile.rows.filter((row) => chancePercent(row.ch) === 100).length;
    const unresolved = profile.rows.filter((row) => !String(row.st).startsWith("Resolved")).length;
    elements.dropHeading.textContent = group.category === "Resource Yield" ? "Yields" : "Drops";
    elements.dropSummary.innerHTML = [
      `<span><strong>${profile.rows.length}</strong> items</span>`,
      `<span><strong>${guaranteed}</strong> guaranteed</span>`,
      unresolved ? `<span class="summary-warning"><strong>${unresolved}</strong> unresolved</span>` : "",
    ].join("");

    elements.dropRows._rows = profile.rows;
    elements.dropRows.innerHTML = profile.rows.map((row, index) => {
      const percent = chancePercent(row.ch);
      const guaranteedRow = percent === 100;
      const resolved = String(row.st).startsWith("Resolved");
      const itemName = row.id || row.ii || "Unparsed target";
      return `<tr data-drop-index="${index}">
        <td>
          <strong>${escapeHtml(itemName)}</strong>
        </td>
        <td><span class="chance ${guaranteedRow ? "guaranteed" : percent !== null && percent < 5 ? "rare" : ""}">${guaranteedRow ? "Guaranteed" : escapeHtml(formatChance(row.ch))}</span></td>
        <td><strong>${escapeHtml(quantityLabel(row))}</strong></td>
      </tr>`;
    }).join("");

    const profileRefs = profile.sources.flatMap((sourceEntry) => sourceEntry.refs.map((ref) => ({ ...ref, source: sourceEntry.internal })));
    const technicalFields = [
      ["Source class", [...new Set(profile.sources.map((entry) => entry.className))].join(", ")],
      ["Source GUIDs", profile.sources.map((entry) => entry.guid).filter(Boolean).join("\n") || "No GUID"],
      ["Internal definitions", profile.sources.map((entry) => entry.internal).join("\n")],
      ["Spawner references", profileRefs.length
        ? profileRefs.map((ref) => `${ref.d} [${ref.i}] -> ${ref.source}`).join("\n")
        : "None found in the spawner-definition table"],
      ["Chance semantics", database.meta.chanceSemantics],
      ["Quantity semantics", database.meta.quantitySemantics],
      ["Combat stat fields", "hpMax=3638; hpCur=3639; awareDist=3640; AiHpRegen=11615; AiDefencePctMagic=11633; AiMoveSpeed=11575; AiWalkSpeed=12471; AiCladeGiftXP=15292; AiLevelXP=15417; AiPerLevelXP=16364"],
      ["Defense fields", "Five body zones, each stored as AiDefencePctBlunt, AiDefencePctPiercing, and AiDefencePctSlashing"],
    ];
    elements.technicalList.innerHTML = technicalFields.map(([label, value]) => (
      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    )).join("");
  }

  function render() {
    const [eyebrow, heading] = MODE_COPY[state.mode];
    elements.sourceEyebrow.textContent = eyebrow;
    elements.sourceHeading.textContent = heading;
    const mobOnly = state.mode === "mob";
    elements.evidenceFilterLabel.hidden = true;
    elements.regionFilterLabel.hidden = !mobOnly;
    elements.testFilterLabel.hidden = true;
    elements.modeTabs.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === state.mode);
    });

    const groups = filteredGroups();
    renderSourceList(groups);
    renderProfile(groups.find((group) => group.key === state.selectedKey));
  }

  function openDropDetails(row) {
    const fields = [
      ["Source", cleanDisplayName(row.sd)],
      ["Item", row.id || row.ii || "Unknown item"],
      ["Chance", formatChance(row.ch)],
      ["Quantity", quantityLabel(row)],
      ["Notes", row.n || "No additional notes"],
    ];
    elements.detailEyebrow.textContent = row.c;
    elements.detailTitle.textContent = row.id || row.ii || "Unresolved loot target";
    elements.detailList.innerHTML = fields.map(([label, value]) => (
      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    )).join("");
    elements.dialog.showModal();
  }

  function exportCurrentView() {
    const groups = filteredGroups();
    const rows = groups.flatMap((group) => group.sources.flatMap((sourceEntry) => sourceEntry.rows));
    const columns = [
      ["sd", "Source"], ["si", "Source internal name"], ["sg", "Source GUID"],
      ["id", "Item or outcome"], ["ii", "Item internal name"], ["ch", "Recorded chance"],
      ["min", "Minimum quantity"], ["max", "Maximum quantity"], ["f", "Loot field"],
      ["st", "Resolution"],
    ];
    const csvRows = [columns.map(([, label]) => label), ...rows.map((row) => columns.map(([key]) =>
      key === "ch" ? formatChance(row[key]) : row[key] ?? ""
    ))];
    const csv = csvRows.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mo2-${state.mode}-loot-evidence.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  elements.modeTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    state.selectedKey = "";
    state.profileIndex = 0;
    render();
  });
  elements.search.addEventListener("input", () => {
    state.query = elements.search.value;
    state.selectedKey = "";
    state.profileIndex = 0;
    render();
  });
  elements.evidenceFilter.addEventListener("change", () => {
    state.evidence = elements.evidenceFilter.value;
    state.selectedKey = "";
    render();
  });
  elements.regionFilter.addEventListener("change", () => {
    state.region = elements.regionFilter.value;
    state.selectedKey = "";
    render();
  });
  elements.hideTest.addEventListener("change", () => {
    state.hideTest = elements.hideTest.checked;
    state.selectedKey = "";
    render();
  });
  elements.sourceList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-source-key]");
    if (!button) return;
    state.selectedKey = button.dataset.sourceKey;
    state.profileIndex = 0;
    render();
  });
  elements.profileTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-profile-index]");
    if (!button) return;
    state.profileIndex = Number(button.dataset.profileIndex);
    render();
  });
  elements.dropRows.addEventListener("click", (event) => {
    const row = event.target.closest("[data-drop-index]");
    if (!row) return;
    openDropDetails(elements.dropRows._rows[Number(row.dataset.dropIndex)]);
  });
  elements.closeDialog.addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
  elements.exportButton.addEventListener("click", exportCurrentView);
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== elements.search) {
      event.preventDefault();
      elements.search.focus();
    }
    if (event.key === "Escape" && document.activeElement === elements.search) {
      elements.search.value = "";
      state.query = "";
      elements.search.blur();
      state.selectedKey = "";
      render();
    }
  });

  updateModeCounts();
  elements.sourceTimestamp.textContent = `Decoded export: ${new Date(database.meta.exportedAt).toLocaleString()}`;
  render();
})();
