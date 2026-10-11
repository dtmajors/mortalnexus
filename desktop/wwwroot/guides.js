(() => {
  const CATEGORY_COLORS = {
    all: "#43c8ff",
    character: "#9f75ff",
    general: "#43c8ff",
    items: "#ffb14a",
    magic: "#b983ff",
    skills: "#ff8155",
    world: "#55d9a6",
  };

  const state = {
    catalog: null,
    category: "all",
    selectedId: new URLSearchParams(location.search).get("guide") || "",
    query: "",
  };

  const categoryRoot = document.getElementById("guideCategories");
  const listRoot = document.getElementById("guideList");
  const reader = document.getElementById("guideReader");
  const search = document.getElementById("guideSearch");
  const countLabel = document.getElementById("guideResultCount");
  const lightbox = document.getElementById("guideLightbox");
  const lightboxImage = document.getElementById("guideLightboxImage");
  const lightboxCaption = document.getElementById("guideLightboxCaption");

  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const filteredGuides = () => {
    if (!state.catalog) return [];
    const query = state.query.trim().toLowerCase();
    return state.catalog.guides.filter((guide) => {
      if (state.category !== "all" && guide.category !== state.category) return false;
      return !query || guide.searchText.includes(query);
    });
  };

  function renderCategories() {
    const categories = [{ id: "all", label: "All guides", icon: "library", count: state.catalog.guides.length }, ...state.catalog.categories];
    categoryRoot.innerHTML = categories.map((category) => `
      <button class="guide-category${state.category === category.id ? " is-active" : ""}" type="button" data-category="${category.id}" title="${escapeHtml(category.id === "all" ? "Browse the complete field archive" : category.description)}" style="--category-color:${CATEGORY_COLORS[category.id] || CATEGORY_COLORS.all}">
        <span class="guide-category-icon">${icon(category.icon)}</span>
        <strong>${escapeHtml(category.label)}</strong>
        <small>${category.count}</small>
      </button>`).join("");
    window.lucide?.createIcons();
  }

  function renderList() {
    const guides = filteredGuides();
    countLabel.textContent = `${guides.length} ${guides.length === 1 ? "guide" : "guides"}`;
    if (!guides.some((guide) => guide.id === state.selectedId)) {
      state.selectedId = guides[0]?.id || "";
    }
    listRoot.innerHTML = guides.map((guide) => {
      const category = state.catalog.categories.find((entry) => entry.id === guide.category);
      return `
        <button class="guide-list-item${guide.id === state.selectedId ? " is-active" : ""}" type="button" data-guide-id="${guide.id}" title="${escapeHtml(guide.title)}" style="--item-color:${CATEGORY_COLORS[guide.category] || CATEGORY_COLORS.all}">
          <span class="guide-list-icon">${icon(category?.icon || "book-open")}</span>
          <span class="guide-list-copy"><strong>${escapeHtml(guide.title)}</strong><small>${guide.blocks.length} ${guide.blocks.length === 1 ? "section" : "sections"}${guide.images.length ? ` / ${guide.images.length} ${guide.images.length === 1 ? "image" : "images"}` : ""}</small></span>
          ${icon("chevron-right")}
        </button>`;
    }).join("");
    renderReader();
  }

  function imageGrid(images) {
    if (!images?.length) return "";
    return `<div class="guide-image-grid${images.length === 1 ? " is-single" : ""}">${images.map((image) => `
      <button class="guide-image-button" type="button" data-guide-image="${escapeHtml(image.url || image.sourceUrl || "")}" data-guide-caption="${escapeHtml(image.alt || "Guide image")}">
        <img src="${escapeHtml(image.url || image.sourceUrl || "")}" alt="${escapeHtml(image.alt || "Guide image")}" loading="lazy" decoding="async" />
        <span>${icon("expand")}</span>
      </button>`).join("")}</div>`;
  }

  function renderReader() {
    if (!state.selectedId) {
      reader.innerHTML = `<div class="guide-empty">${icon("search-x")}<strong>No guides match this search.</strong></div>`;
      window.lucide?.createIcons();
      return;
    }
    const guide = state.catalog.guides.find((entry) => entry.id === state.selectedId);
    if (!guide) return;
    const category = state.catalog.categories.find((entry) => entry.id === guide.category);
    const color = CATEGORY_COLORS[guide.category] || CATEGORY_COLORS.all;
    const blocks = guide.blocks.map((block) => `
      <section class="guide-source-block">
        ${block.html ? `<div class="guide-prose">${block.html}</div>` : ""}
        ${imageGrid(block.images)}
      </section>`).join("");
    const resources = guide.links.length ? `
      <section class="guide-resources">
        <h3>Related resources</h3>
        ${guide.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${icon("external-link")}<span>${escapeHtml(link.label)}</span></a>`).join("")}
      </section>` : "";

    reader.innerHTML = `
      <header class="guide-article-header" style="--article-color:${color}">
        <div class="guide-article-meta">${icon(category?.icon || "book-open")}<span>${escapeHtml(category?.label || guide.categoryLabel)}</span></div>
        <h2>${escapeHtml(guide.title)}</h2>
        <p>${escapeHtml(guide.summary)}</p>
        <div class="guide-article-stats">
          <span>${icon("align-left")} ${guide.blocks.length} ${guide.blocks.length === 1 ? "section" : "sections"}</span>
          ${guide.images.length ? `<span>${icon("images")} ${guide.images.length} ${guide.images.length === 1 ? "image" : "images"}</span>` : ""}
          ${guide.links.length ? `<span>${icon("link")} ${guide.links.length} ${guide.links.length === 1 ? "resource" : "resources"}</span>` : ""}
        </div>
      </header>
      <div class="guide-article-body">
        ${blocks}
        ${resources}
      </div>`;
    window.lucide?.createIcons();
    reader.scrollTop = 0;
  }

  function chooseGuide(id, push = true) {
    state.selectedId = id;
    if (push) {
      const url = new URL(location.href);
      url.searchParams.set("guide", id);
      history.replaceState(null, "", url);
    }
    renderList();
  }

  categoryRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderList();
  });

  listRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide-id]");
    if (button) chooseGuide(button.dataset.guideId);
  });

  search.addEventListener("input", () => {
    state.query = search.value;
    renderList();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== search && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && lightbox.open) lightbox.close();
  });

  reader.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide-image]");
    if (!button) return;
    lightboxImage.src = button.dataset.guideImage;
    lightboxImage.alt = button.dataset.guideCaption || "Guide image";
    lightboxCaption.textContent = button.dataset.guideCaption || "";
    lightbox.showModal();
  });

  document.getElementById("closeGuideLightbox").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });

  fetch("/assets/guides/mortal-nexus-guides.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Guide catalog returned ${response.status}`);
      return response.json();
    })
    .then((catalog) => {
      state.catalog = catalog;
      if (!catalog.guides.some((guide) => guide.id === state.selectedId)) state.selectedId = catalog.guides[0]?.id || "";
      renderCategories();
      renderList();
    })
    .catch((error) => {
      reader.innerHTML = `<div class="guide-empty">${icon("triangle-alert")}<strong>The guide library could not be loaded.</strong><span>${escapeHtml(error.message)}</span></div>`;
      countLabel.textContent = "Guide catalog unavailable";
      window.lucide?.createIcons();
    });
})();
