const sourceData = window.MO2_DATA;

const baseControlCaps = sourceData.records
  .filter((record) => record.type === "Control Cap" && record.section !== "Adv Creature Control")
  .map((record) => ({
    skill: Number(getField(record, "Creature Control Skill") || record.title),
    cap: Number(getField(record, "Pet Points Cap")),
  }))
  .filter((item) => Number.isFinite(item.skill) && Number.isFinite(item.cap))
  .sort((a, b) => a.skill - b.skill);

const advancedControlCaps = sourceData.records
  .filter((record) => record.type === "Control Cap" && record.section === "Adv Creature Control")
  .map((record) => ({
    skill: Number(getField(record, "Creature Control Skill") || record.title),
    cap: Number(getField(record, "Pet Points Cap")),
  }))
  .filter((item) => Number.isFinite(item.skill) && Number.isFinite(item.cap))
  .sort((a, b) => a.skill - b.skill);

const petProfiles = sourceData.records
  .filter((record) => ["Taming Pet Points", "Domination Pet Points"].includes(record.type))
  .map((record) => {
    const points = (record.matrix || [])
      .map((item) => ({
        level: Number(item.level),
        cost: Number(item.points),
      }))
      .filter((item) => Number.isFinite(item.level) && Number.isFinite(item.cost))
      .sort((a, b) => a.level - b.level);
    return {
      id: record.id,
      name: record.title,
      mode: record.type === "Domination Pet Points" ? "Domination" : "Taming",
      family: getField(record, "Family"),
      lineage: [
        getField(record, "Sub Family"),
        getField(record, "Species"),
        getField(record, "Sub Species"),
        getField(record, "Sub-Sub Species"),
      ].filter(Boolean).join(" / "),
      requirement: getField(record, "Taming Requirement"),
      points,
    };
  })
  .filter((profile) => profile.points.length)
  .sort((a, b) => a.mode.localeCompare(b.mode) || a.name.localeCompare(b.name));

const combatProfiles = sourceData.records
  .filter((record) => ["Max Pet Stats", "Dual Wield Pet"].includes(record.type))
  .map((record) => ({
    id: record.id,
    name: record.title,
    type: record.type === "Max Pet Stats" ? "Maximum profile" : "Dual-pet profile",
    fields: record.fields.filter((field) => field.label !== "Animal Type"),
  }))
  .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

const feedingProfiles = sourceData.records
  .filter((record) => record.type === "Feeding")
  .map((record) => ({
    id: record.id,
    name: record.title,
    diet: getField(record, "Diet"),
    foods: record.fields
      .filter((field) => field.label !== "Diet")
      .map((field) => ({
        name: field.label,
        value: field.value,
        numeric: Number(field.value),
      }))
      .sort((a, b) => {
        const aKnown = Number.isFinite(a.numeric);
        const bKnown = Number.isFinite(b.numeric);
        if (aKnown !== bKnown) return aKnown ? -1 : 1;
        return aKnown ? b.numeric - a.numeric : a.name.localeCompare(b.name);
      }),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const defaultProfile = petProfiles.find((profile) => /steppe/i.test(profile.name)) || petProfiles[0];
const state = {
  controlSkill: 100,
  advancedControlSkill: 100,
  herdingSkill: 91,
  slots: [
    { profileId: defaultProfile?.id || "", level: maxKnownLevel(defaultProfile) },
    { profileId: "", level: null },
  ],
  combatProfileId: combatProfiles[0]?.id || "",
  feedingProfileId: feedingProfiles[0]?.id || "",
};

const els = {
  profileCount: document.querySelector("#profileCount"),
  levelPointCount: document.querySelector("#levelPointCount"),
  controlSkillInput: document.querySelector("#controlSkillInput"),
  advancedControlSkillInput: document.querySelector("#advancedControlSkillInput"),
  herdingSkillInput: document.querySelector("#herdingSkillInput"),
  petOneSelect: document.querySelector("#petOneSelect"),
  petOneLevel: document.querySelector("#petOneLevel"),
  petOneDetails: document.querySelector("#petOneDetails"),
  petTwoSelect: document.querySelector("#petTwoSelect"),
  petTwoLevel: document.querySelector("#petTwoLevel"),
  petTwoDetails: document.querySelector("#petTwoDetails"),
  loadoutStatus: document.querySelector("#loadoutStatus"),
  loadoutCopy: document.querySelector("#loadoutCopy"),
  pointCap: document.querySelector("#pointCap"),
  pointsUsed: document.querySelector("#pointsUsed"),
  pointsRemaining: document.querySelector("#pointsRemaining"),
  pointMeterFill: document.querySelector("#pointMeterFill"),
  skillBreakdown: document.querySelector("#skillBreakdown"),
  loadoutBreakdown: document.querySelector("#loadoutBreakdown"),
  combatProfileSelect: document.querySelector("#combatProfileSelect"),
  combatProfileDetails: document.querySelector("#combatProfileDetails"),
  feedingSelect: document.querySelector("#feedingSelect"),
  feedingDetails: document.querySelector("#feedingDetails"),
  dataStamp: document.querySelector("#dataStamp"),
};

function init() {
  els.profileCount.textContent = petProfiles.length.toLocaleString();
  els.levelPointCount.textContent = petProfiles
    .reduce((sum, profile) => sum + profile.points.length, 0)
    .toLocaleString();
  els.dataStamp.textContent = `Data generated ${formatDate(sourceData.meta.generatedAt)}`;

  renderPetOptions();
  renderCombatOptions();
  renderFeedingOptions();
  attachEvents();
  render();
}

function attachEvents() {
  els.controlSkillInput.addEventListener("input", () => {
    state.controlSkill = clampSkill(els.controlSkillInput.value);
    renderLoadout();
  });

  els.advancedControlSkillInput.addEventListener("input", () => {
    state.advancedControlSkill = clampSkill(els.advancedControlSkillInput.value);
    renderLoadout();
  });

  els.herdingSkillInput.addEventListener("input", () => {
    state.herdingSkill = clampSkill(els.herdingSkillInput.value);
    renderLoadout();
  });

  [els.petOneSelect, els.petTwoSelect].forEach((select, slotIndex) => {
    select.addEventListener("change", () => {
      const profile = getProfile(select.value);
      state.slots[slotIndex].profileId = profile?.id || "";
      state.slots[slotIndex].level = maxKnownLevel(profile);
      renderSlot(slotIndex);
      renderLoadout();
    });
  });

  [els.petOneLevel, els.petTwoLevel].forEach((select, slotIndex) => {
    select.addEventListener("change", () => {
      state.slots[slotIndex].level = Number(select.value) || null;
      renderSlotDetails(slotIndex);
      renderLoadout();
    });
  });

  els.combatProfileSelect.addEventListener("change", () => {
    state.combatProfileId = els.combatProfileSelect.value;
    renderCombatProfile();
  });

  els.feedingSelect.addEventListener("change", () => {
    state.feedingProfileId = els.feedingSelect.value;
    renderFeedingProfile();
  });
}

function render() {
  els.controlSkillInput.value = state.controlSkill;
  els.advancedControlSkillInput.value = state.advancedControlSkill;
  els.herdingSkillInput.value = state.herdingSkill;
  renderSlot(0);
  renderSlot(1);
  renderLoadout();
  renderCombatProfile();
  renderFeedingProfile();
}

function renderPetOptions() {
  const optionGroups = ["Taming", "Domination"]
    .map((mode) => `<optgroup label="${mode}">
      ${petProfiles
        .filter((profile) => profile.mode === mode)
        .map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>`)
        .join("")}
    </optgroup>`)
    .join("");
  els.petOneSelect.innerHTML = optionGroups;
  els.petTwoSelect.innerHTML = `<option value="">No second pet</option>${optionGroups}`;
}

function renderSlot(slotIndex) {
  const slot = state.slots[slotIndex];
  const profile = getProfile(slot.profileId);
  const petSelect = slotIndex === 0 ? els.petOneSelect : els.petTwoSelect;
  const levelSelect = slotIndex === 0 ? els.petOneLevel : els.petTwoLevel;

  petSelect.value = profile?.id || "";
  if (!profile) {
    levelSelect.innerHTML = `<option value="">No level</option>`;
    levelSelect.disabled = true;
    renderSlotDetails(slotIndex);
    return;
  }

  levelSelect.disabled = false;
  levelSelect.innerHTML = profile.points
    .map((point) => `<option value="${point.level}">Level ${point.level} - ${point.cost} PP</option>`)
    .join("");
  if (!profile.points.some((point) => point.level === slot.level)) {
    slot.level = maxKnownLevel(profile);
  }
  levelSelect.value = String(slot.level);
  renderSlotDetails(slotIndex);
}

function renderSlotDetails(slotIndex) {
  const slot = state.slots[slotIndex];
  const profile = getProfile(slot.profileId);
  const target = slotIndex === 0 ? els.petOneDetails : els.petTwoDetails;
  if (!profile) {
    target.textContent = "Slot unused.";
    return;
  }

  const levelCost = getLevelCost(profile, slot.level);
  const lineage = [profile.family, profile.lineage].filter(Boolean).join(" / ");
  const requirement = profile.requirement ? ` - Requirement ${profile.requirement}` : "";
  target.textContent = `${profile.mode} - Lore: ${lineage || "not listed"} - ${levelCost?.cost ?? "Unknown"} PP at max lore${requirement}`;
}

function renderLoadout() {
  els.controlSkillInput.value = state.controlSkill;
  els.advancedControlSkillInput.value = state.advancedControlSkill;
  els.herdingSkillInput.value = state.herdingSkill;
  const activeSlots = state.slots
    .map((slot) => {
      const profile = getProfile(slot.profileId);
      const point = getLevelCost(profile, slot.level);
      return profile && point ? { profile, point } : null;
    })
    .filter(Boolean);
  const baseCap = getBaseControlCap(state.controlSkill);
  const advancedBonus = getAdvancedControlBonus(state.advancedControlSkill);
  const rawCap = baseCap + advancedBonus;
  const penaltyPerExtraPet = getHerdingPenalty(state.herdingSkill);
  const multiPetPenalty = Math.max(activeSlots.length - 1, 0) * penaltyPerExtraPet;
  const cap = Math.max(rawCap - multiPetPenalty, 0);
  const used = activeSlots.reduce((sum, slot) => sum + slot.point.cost, 0);
  const remaining = cap - used;
  const fits = remaining >= 0;
  const ratio = cap > 0 ? Math.min(used / cap, 1) : 0;

  els.pointCap.textContent = formatNumber(cap);
  els.pointsUsed.textContent = formatNumber(used);
  els.pointsRemaining.textContent = fits ? formatNumber(remaining) : `-${formatNumber(Math.abs(remaining))}`;
  els.loadoutStatus.textContent = fits ? "Loadout fits" : "Point cap exceeded";
  els.loadoutCopy.textContent = fits
    ? `${formatNumber(remaining)} pet points remain after skills and the active-pet penalty.`
    : `Remove ${formatNumber(Math.abs(remaining))} pet points to fit this loadout.`;
  els.pointMeterFill.style.width = `${Math.max(used ? 3 : 0, ratio * 100)}%`;
  els.pointMeterFill.classList.toggle("over", !fits);
  els.skillBreakdown.innerHTML = [
    ["Creature Control", `${formatNumber(baseCap)} PP`],
    ["Advanced Creature Control", `+${formatNumber(advancedBonus)} PP`],
    ["Raw control cap", `${formatNumber(rawCap)} PP`],
    ["Herding penalty", activeSlots.length > 1
      ? `-${formatNumber(multiPetPenalty)} PP (${formatNumber(penaltyPerExtraPet)} each extra pet)`
      : `${formatNumber(penaltyPerExtraPet)} PP per extra pet`],
  ]
    .map(([label, value]) => `<div class="skill-line"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  els.loadoutBreakdown.innerHTML = activeSlots.length
    ? activeSlots
      .map((slot) => `<div class="loadout-line">
        <span>${escapeHtml(slot.profile.name)} - Level ${slot.point.level}</span>
        <span>${slot.point.cost} PP</span>
      </div>`)
      .join("")
    : `<div class="loadout-line"><span>No pets selected</span><span>0 PP</span></div>`;
}

function renderCombatOptions() {
  const grouped = ["Maximum profile", "Dual-pet profile"]
    .map((type) => `<optgroup label="${type}">
      ${combatProfiles
        .filter((profile) => profile.type === type)
        .map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>`)
        .join("")}
    </optgroup>`)
    .join("");
  els.combatProfileSelect.innerHTML = grouped;
  els.combatProfileSelect.value = state.combatProfileId;
}

function renderCombatProfile() {
  const profile = combatProfiles.find((item) => item.id === state.combatProfileId)
    || combatProfiles[0];
  if (!profile) {
    els.combatProfileDetails.innerHTML = "";
    return;
  }

  state.combatProfileId = profile.id;
  els.combatProfileSelect.value = profile.id;
  els.combatProfileDetails.innerHTML = [
    { label: "Profile", value: profile.name },
    { label: "Use case", value: profile.type },
    ...profile.fields,
  ]
    .filter((field) => field.value)
    .map((field) => `<div class="profile-detail">
      <span>${escapeHtml(field.label)}</span>
      <strong>${escapeHtml(field.value)}</strong>
    </div>`)
    .join("");
}

function renderFeedingOptions() {
  els.feedingSelect.innerHTML = feedingProfiles
    .map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)} - ${escapeHtml(profile.diet)}</option>`)
    .join("");
  els.feedingSelect.value = state.feedingProfileId;
}

function renderFeedingProfile() {
  const profile = feedingProfiles.find((item) => item.id === state.feedingProfileId)
    || feedingProfiles[0];
  if (!profile) {
    els.feedingDetails.innerHTML = "";
    return;
  }

  state.feedingProfileId = profile.id;
  els.feedingSelect.value = profile.id;
  els.feedingDetails.innerHTML = profile.foods
    .map((food, index) => `<div class="feeding-detail ${index === 0 ? "best" : ""}">
      <span>${escapeHtml(food.name)}</span>
      <strong>${escapeHtml(food.value)}</strong>
    </div>`)
    .join("");
}

function getProfile(id) {
  return petProfiles.find((profile) => profile.id === id) || null;
}

function getLevelCost(profile, level) {
  return profile?.points.find((point) => point.level === Number(level)) || null;
}

function maxKnownLevel(profile) {
  return profile?.points.at(-1)?.level || null;
}

function getBaseControlCap(skill) {
  return getCapAtSkill(baseControlCaps, skill, 25);
}

function getAdvancedControlBonus(skill) {
  if (Number(skill) <= 0) return 0;
  const combinedCap = getCapAtSkill(advancedControlCaps, skill, 75);
  return Math.max(combinedCap - 75, 0);
}

function getHerdingPenalty(skill) {
  const level = Number(skill);
  if (!Number.isFinite(level) || level <= 0) return 20;
  return Math.max(10, 20 - Math.ceil(Math.min(level, 91) / 10));
}

function getCapAtSkill(table, skill, fallback) {
  const level = Number(skill);
  const exact = table.find((item) => item.skill === level);
  if (exact) return exact.cap;
  const nearest = table.filter((item) => item.skill <= level).at(-1);
  return nearest?.cap ?? table[0]?.cap ?? fallback;
}

function clampSkill(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(number, 0), 100);
}

function getField(record, label) {
  return record.fields.find((field) => field.label === label)?.value || "";
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
