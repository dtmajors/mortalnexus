import { DUNGEONS } from "/dungeons-data.js?v=7";

const NS = "http://www.w3.org/2000/svg";
const MARKERS = {
  entrance: { label: "Entrance", glyph: "↓", color: "#78b78d" },
  exit: { label: "Exit", glyph: "↑", color: "#78b78d" },
  boss: { label: "Boss", glyph: "◆", color: "#e0635d" },
  chest: { label: "Chest", glyph: "▣", color: "#d8ad55" },
  urn: { label: "Urn / loot pile", glyph: "◍", color: "#a89678" },
  mob: { label: "Mob spawn", glyph: "●", color: "#c57966" },
  elite: { label: "Elite mob", glyph: "✦", color: "#da5a68" },
  altar: { label: "Altar", glyph: "▲", color: "#a78bc0" },
  shrine: { label: "Shrine", glyph: "△", color: "#a78bc0" },
  trap: { label: "Trap", glyph: "✕", color: "#d06458" },
  lever: { label: "Lever / switch", glyph: "↧", color: "#8d9d9a" },
  campfire: { label: "Campfire", glyph: "△", color: "#d98a50" },
  "stairs-down": { label: "Stairs down", glyph: "▼", color: "#6b9fb7" },
  "stairs-up": { label: "Stairs up", glyph: "▲", color: "#6b9fb7" },
  ladder: { label: "Ladder", glyph: "H", color: "#8aa8b2" },
  loot: { label: "Loot", glyph: "✦", color: "#d2b45f" },
  treasure: { label: "Treasure", glyph: "◇", color: "#e6c768" },
  vendor: { label: "Vendor", glyph: "$", color: "#79a5a1" },
  portal: { label: "Portal", glyph: "◎", color: "#907ac0" },
};

const elements = {
  search: document.querySelector("#dungeonSearch"),
  region: document.querySelector("#dungeonRegion"),
  difficulty: document.querySelector("#dungeonDifficulty"),
  clear: document.querySelector("#clearDungeonFilters"),
  count: document.querySelector("#dungeonCount"),
  list: document.querySelector("#dungeonList"),
  regionLabel: document.querySelector("#dungeonRegionLabel"),
  name: document.querySelector("#dungeonName"),
  location: document.querySelector("#dungeonLocation"),
  badges: document.querySelector("#dungeonBadges"),
  summary: document.querySelector("#dungeonSummary"),
  floorTabs: document.querySelector("#floorTabs"),
  floorName: document.querySelector("#floorName"),
  floorMeta: document.querySelector("#floorMeta"),
  map: document.querySelector("#dungeonMap"),
  map3d: document.querySelector("#dungeonMap3d"),
  map3dStatus: document.querySelector("#dungeonMap3dStatus"),
  mapFrame: document.querySelector("#dungeonMapFrame"),
  mapScale: document.querySelector("#mapScale"),
  mapControlsHint: document.querySelector("#mapControlsHint"),
  selectedPoi: document.querySelector("#selectedPoi"),
  legend: document.querySelector("#dungeonLegend"),
  mobs: document.querySelector("#dungeonMobs"),
  drops: document.querySelector("#dungeonDrops"),
  caveats: document.querySelector("#dungeonCaveats"),
  sources: document.querySelector("#dungeonSources"),
  zoomOut: document.querySelector("#zoomOutDungeon"),
  zoomIn: document.querySelector("#zoomInDungeon"),
  resetView: document.querySelector("#resetDungeonView"),
};

const params = new URLSearchParams(location.search);
const state = {
  query: "",
  region: "all",
  difficulty: "all",
  dungeonId: DUNGEONS.some((item) => item.id === params.get("dungeon"))
    ? params.get("dungeon")
    : DUNGEONS[0].id,
  floorId: params.get("floor") || "",
  view: { x: 0, y: 0, size: 100, zoom: 1 },
  drag: null,
};

function continentFor(dungeon) {
  return dungeon.region.toLowerCase().includes("sarducaa") ? "sarducaa" : "myrland";
}

function poiCount(dungeon) {
  return dungeon.levels.reduce((count, floor) => {
    const markers = floor.planImage ? floor.overlayMarkers : floor.markers;
    return count + (markers?.length || 0);
  }, 0);
}

function difficultyKey(value) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function searchableText(dungeon) {
  return [
    dungeon.name,
    dungeon.region,
    dungeon.difficulty,
    dungeon.groupSize,
    dungeon.level,
    dungeon.summary,
    ...(dungeon.mobs || []),
    ...(dungeon.drops || []),
    ...(dungeon.caveats || []),
  ].join(" ").toLowerCase();
}

function filteredDungeons() {
  const query = state.query.trim().toLowerCase();
  return DUNGEONS.filter((dungeon) => {
    if (state.region !== "all" && continentFor(dungeon) !== state.region) return false;
    if (state.difficulty !== "all" && difficultyKey(dungeon.difficulty) !== state.difficulty) return false;
    return !query || searchableText(dungeon).includes(query);
  });
}

function renderBrowser() {
  const visible = filteredDungeons();
  elements.count.textContent = `${visible.length} ${visible.length === 1 ? "dungeon" : "dungeons"}`;
  elements.list.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "dungeon-list-empty";
    empty.textContent = "No dungeons match those filters.";
    elements.list.append(empty);
    return;
  }

  for (const dungeon of visible) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dungeon-list-item${dungeon.id === state.dungeonId ? " active" : ""}`;
    button.dataset.dungeonId = dungeon.id;
    const pois = poiCount(dungeon);
    button.innerHTML = `
      <span class="dungeon-list-title"><strong>${escapeHtml(dungeon.name)}</strong><span>${escapeHtml(dungeon.difficulty)}</span></span>
      <span class="dungeon-list-line">${escapeHtml(dungeon.region)}</span>
      <span class="dungeon-list-meta">${dungeon.levels.length} ${dungeon.levels.length === 1 ? "floor" : "floors"}${pois ? ` · ${pois} POIs` : " · route schematic"}</span>`;
    button.addEventListener("click", () => selectDungeon(dungeon.id));
    elements.list.append(button);
  }
}

function selectDungeon(id, requestedFloor = "") {
  const dungeon = DUNGEONS.find((item) => item.id === id);
  if (!dungeon) return;
  state.dungeonId = dungeon.id;
  state.floorId = dungeon.levels.some((floor) => floor.id === requestedFloor)
    ? requestedFloor
    : dungeon.levels[0].id;
  resetMapView(false);
  renderBrowser();
  renderDetail();
}

function renderDetail() {
  const dungeon = DUNGEONS.find((item) => item.id === state.dungeonId) || DUNGEONS[0];
  if (!dungeon.levels.some((floor) => floor.id === state.floorId)) state.floorId = dungeon.levels[0].id;
  const floor = dungeon.levels.find((item) => item.id === state.floorId);

  elements.regionLabel.textContent = continentFor(dungeon) === "sarducaa" ? "Sarducaa" : "Myrland";
  elements.name.textContent = dungeon.name;
  elements.location.textContent = dungeon.region;
  elements.summary.textContent = dungeon.summary;
  elements.badges.innerHTML = [
    `<span class="dungeon-badge difficulty-${difficultyKey(dungeon.difficulty)}">${escapeHtml(dungeon.difficulty)}</span>`,
    `<span class="dungeon-badge">${escapeHtml(dungeon.groupSize)}</span>`,
    `<span class="dungeon-badge">${escapeHtml(dungeon.level)}</span>`,
    dungeon.verified ? '<span class="dungeon-badge verified">Verified</span>' : '<span class="dungeon-badge">Community mapped</span>',
  ].join("");

  elements.floorTabs.replaceChildren();
  for (const item of dungeon.levels) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `floor-tab${item.id === floor.id ? " active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", item.id === floor.id ? "true" : "false");
    button.textContent = item.name;
    button.addEventListener("click", () => {
      state.floorId = item.id;
      resetMapView(false);
      renderDetail();
    });
    elements.floorTabs.append(button);
  }

  elements.floorName.textContent = floor.name;
  const orientation = floor.orientation === "north-up" ? "North up" : floor.orientation;
  elements.floorMeta.textContent = floor.metresPerUnit
    ? `${orientation} · ${floor.metresPerUnit} m / unit`
    : `${orientation} · player-recorded schematic`;
  elements.mapScale.textContent = floor.metresPerUnit
    ? `≈${Math.round(floor.metresPerUnit * 20)} m square · ${floor.metresPerUnit} m / unit`
    : "Player-recorded route schematic";
  elements.selectedPoi.hidden = true;
  renderMap(dungeon, floor);
  renderLegend(dungeon);
  renderSimpleList(elements.mobs, dungeon.mobs, "No notable mobs recorded.");
  renderSimpleList(elements.drops, dungeon.drops, "No drops recorded.");
  renderSimpleList(elements.caveats, dungeon.caveats, "No special caveats recorded.");
  renderSimpleList(elements.sources, dungeon.sources, "No source notes recorded.");
  updateUrl();
}

class DungeonMap3D {
  constructor(canvas, status) {
    this.canvas = canvas;
    this.status = status;
    this.active = false;
    this.renderToken = 0;
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.target = null;
    this.drag = null;
    this.azimuth = -0.78;
    this.elevation = 1.08;
    this.distance = 118;
    this.zoom = 1;
    this.imageCache = new Map();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.bindControls();
  }

  async show(dungeon, floor) {
    const token = ++this.renderToken;
    this.active = true;
    this.canvas.hidden = false;
    elements.map.hidden = true;
    elements.mapFrame.classList.add("is-3d");
    this.status.hidden = false;
    this.status.textContent = "Building 3D map...";
    this.disposeScene();
    this.setupScene();

    try {
      const layers = this.layersFor(dungeon, floor);
      const loaded = await Promise.all(layers.map(async (layer) => ({
        ...layer,
        image: await this.loadImage(layer.url),
      })));
      if (token !== this.renderToken) return;

      const selectedIndex = Math.max(0, loaded.findIndex((layer) => layer.selected));
      loaded.forEach((layer, index) => {
        const level = dungeon.id === "sator-dungeon" && floor.id !== "vessel" ? index : 0;
        const mesh = this.surfaceFromImage(layer.image, {
          opacity: layer.selected ? 1 : 0.1,
          z: level * 6,
          selected: layer.selected,
        });
        this.scene.add(mesh);
      });

      this.addGround(dungeon.id === "sator-dungeon" && floor.id !== "vessel" ? loaded.length : 1);
      this.target.z = dungeon.id === "sator-dungeon" && floor.id !== "vessel" ? selectedIndex * 6 : 0;
      this.status.hidden = true;
      this.resize();
      this.updateCamera();
      this.draw();
    } catch (error) {
      if (token !== this.renderToken) return;
      this.status.textContent = "3D map could not be rendered";
      console.error(error);
    }
  }

  hide() {
    this.active = false;
    this.renderToken += 1;
    this.canvas.hidden = true;
    this.status.hidden = true;
    elements.map.hidden = false;
    elements.mapFrame.classList.remove("is-3d");
    this.disposeScene();
  }

  layersFor(dungeon, floor) {
    if (dungeon.id !== "sator-dungeon" || floor.id === "vessel") {
      return [{ url: floor.planImage, selected: true }];
    }
    return dungeon.levels
      .filter((item) => item.planImage && item.id !== "vessel")
      .map((item) => ({ url: item.planImage, selected: item.id === floor.id }));
  }

  setupScene() {
    const THREE = window.THREE;
    if (!THREE) throw new Error("Three.js is unavailable");
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 500);
    this.camera.up.set(0, 0, 1);
    this.target = new THREE.Vector3(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x05090b, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambient = new THREE.HemisphereLight(0x9edfff, 0x10120f, 0.82);
    const key = new THREE.DirectionalLight(0xdaf5ff, 1.05);
    key.position.set(-32, -26, 72);
    key.castShadow = true;
    this.scene.add(ambient, key);
    this.resizeObserver.observe(elements.mapFrame);
  }

  surfaceFromImage(image, options) {
    const THREE = window.THREE;
    const sampleSize = 260;
    const sample = document.createElement("canvas");
    sample.width = sampleSize;
    sample.height = sampleSize;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.clearRect(0, 0, sampleSize, sampleSize);
    context.drawImage(image, 0, 0, sampleSize, sampleSize);
    const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;

    const texture = new THREE.Texture(image);
    texture.needsUpdate = true;
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const segments = sampleSize - 1;
    const geometry = new THREE.PlaneGeometry(86, 86, segments, segments);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = index % sampleSize;
      const y = Math.floor(index / sampleSize);
      const pixelIndex = ((sampleSize - 1 - y) * sampleSize + x) * 4;
      const alpha = pixels[pixelIndex + 3] / 255;
      const luminance = (
        pixels[pixelIndex] * 0.2126
        + pixels[pixelIndex + 1] * 0.7152
        + pixels[pixelIndex + 2] * 0.0722
      ) / 255;
      const ridge = alpha < 0.42
        ? 0
        : luminance > 0.43
          ? (options.selected ? 2.7 : 1.85)
          : (options.selected ? 0.58 : 0.4);
      positions.setZ(index, ridge);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: options.opacity,
      alphaTest: options.selected ? 0.12 : 0.04,
      side: THREE.DoubleSide,
      roughness: 0.54,
      metalness: 0.18,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: options.selected ? 1.3 : 0.58,
      depthWrite: options.selected,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = options.z;
    mesh.castShadow = options.selected;
    mesh.receiveShadow = true;
    mesh.userData.disposableTextures = [texture];
    return mesh;
  }

  addGround(layerCount) {
    const THREE = window.THREE;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(90, 90, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x07100f, roughness: 0.9, metalness: 0.05 }),
    );
    slab.position.z = -0.58;
    slab.receiveShadow = true;
    this.scene.add(slab);

    const grid = new THREE.GridHelper(90, 30, 0x2e6574, 0x17333a);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.02;
    grid.material.transparent = true;
    grid.material.opacity = 0.34;
    this.scene.add(grid);

    if (layerCount > 1) {
      for (let index = 1; index < layerCount; index += 1) {
        const guide = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(88, 88, 0.05)),
          new THREE.LineBasicMaterial({ color: 0x24566a, transparent: true, opacity: 0.13 }),
        );
        guide.position.z = index * 6;
        this.scene.add(guide);
      }
    }
  }

  loadImage(url) {
    if (this.imageCache.has(url)) return this.imageCache.get(url);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load ${url}`));
      image.src = url;
    });
    this.imageCache.set(url, promise);
    return promise;
  }

  bindControls() {
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.canvas.addEventListener("wheel", (event) => {
      if (!this.active) return;
      event.preventDefault();
      this.setZoom(this.zoom * (event.deltaY < 0 ? 1.12 : 0.89));
    }, { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.active) return;
      this.drag = {
        x: event.clientX,
        y: event.clientY,
        azimuth: this.azimuth,
        elevation: this.elevation,
        target: this.target.clone(),
        pan: event.shiftKey || event.button === 1 || event.button === 2,
      };
      this.canvas.classList.add("dragging");
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.drag || !this.active) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      if (this.drag.pan) {
        const scale = 0.115 / this.zoom;
        this.target.x = this.drag.target.x - dx * scale;
        this.target.y = this.drag.target.y + dy * scale;
      } else {
        this.azimuth = this.drag.azimuth - dx * 0.007;
        this.elevation = clamp(this.drag.elevation + dy * 0.005, 0.34, 1.32);
      }
      this.updateCamera();
      this.draw();
    });
    for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
      this.canvas.addEventListener(eventName, () => {
        this.drag = null;
        this.canvas.classList.remove("dragging");
      });
    }
  }

  setZoom(value) {
    this.zoom = clamp(value, 0.72, 3.8);
    if (this.camera) this.camera.zoom = this.zoom;
    if (this.camera) this.camera.updateProjectionMatrix();
    elements.resetView.textContent = `${this.zoom.toFixed(1)}×`;
    this.draw();
  }

  reset() {
    this.azimuth = -0.78;
    this.elevation = 1.08;
    this.distance = 118;
    this.zoom = 1;
    if (this.target) this.target.set(0, 0, this.target.z || 0);
    if (this.camera) this.camera.zoom = 1;
    if (this.camera) this.camera.updateProjectionMatrix();
    elements.resetView.textContent = "1:1";
    this.updateCamera();
    this.draw();
  }

  updateCamera() {
    if (!this.camera || !this.target) return;
    const horizontal = Math.cos(this.elevation) * this.distance;
    this.camera.position.set(
      this.target.x + Math.cos(this.azimuth) * horizontal,
      this.target.y + Math.sin(this.azimuth) * horizontal,
      this.target.z + Math.sin(this.elevation) * this.distance,
    );
    this.camera.lookAt(this.target);
  }

  resize() {
    if (!this.active || !this.renderer || !this.camera) return;
    const rect = elements.mapFrame.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const span = 52;
    const aspect = width / height;
    this.camera.left = -span * aspect;
    this.camera.right = span * aspect;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.draw();
  }

  draw() {
    if (this.active && this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }

  disposeScene() {
    this.resizeObserver.disconnect();
    if (this.scene) {
      this.scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose?.();
        object.userData?.disposableTextures?.forEach((texture) => texture.dispose());
      });
    }
    this.renderer?.dispose();
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.target = null;
  }
}

const map3d = new DungeonMap3D(elements.map3d, elements.map3dStatus);

function renderMap(dungeon, floor) {
  elements.map.replaceChildren();

  if (floor.planImage) {
    map3d.hide();
    elements.mapControlsHint.textContent = "Scroll to zoom · drag to pan";
    elements.mapScale.textContent = "Original player map";
    appendMapGrid();
    elements.map.append(svg("image", {
      href: floor.planImage,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      preserveAspectRatio: "xMidYMid meet",
      class: "map-plan-image",
    }));
  } else {
    map3d.hide();
    elements.mapControlsHint.textContent = "Scroll to zoom · drag to pan · select a POI for details";
    appendMapGrid();

    for (const corridor of floor.corridors || []) {
    const line = svg("polyline", {
      points: corridor.points.map((point) => point.join(",")).join(" "),
      class: "map-corridor",
      "stroke-width": corridor.width || 2,
    });
    elements.map.append(line);
  }

    for (const wall of floor.walls || []) {
    elements.map.append(svg("polyline", {
      points: wall.points.map((point) => point.join(",")).join(" "),
      class: "map-wall",
    }));
  }

    for (const room of floor.rooms || []) {
    const shape = room.shape || {};
    let node;
    if (shape.kind === "poly") {
      node = svg("polygon", { points: shape.points.map((point) => point.join(",")).join(" ") });
    } else {
      node = svg("rect", { x: shape.x, y: shape.y, width: shape.w, height: shape.h });
    }
    node.setAttribute("class", `map-room${room.tone ? ` ${room.tone}` : ""}`);
    node.append(svgTitle(room.name));
    elements.map.append(node);

    if (room.name) {
      const center = roomCenter(shape);
      const label = svg("text", { x: center[0], y: center[1], class: "map-room-name" });
      label.textContent = room.name;
      elements.map.append(label);
    }
  }

    for (const door of floor.doors || []) {
    const [x, y] = door.at;
    const horizontal = door.facing === "N" || door.facing === "S";
    const node = svg("line", horizontal
      ? { x1: x - 2.1, y1: y, x2: x + 2.1, y2: y }
      : { x1: x, y1: y - 2.1, x2: x, y2: y + 2.1 });
    node.setAttribute("class", `map-door ${door.kind || "door"}`);
    node.append(svgTitle(door.label || `${door.kind || "Door"} · ${door.facing}`));
      elements.map.append(node);
    }
  }

  for (const marker of floor.planImage ? (floor.overlayMarkers || []) : (floor.markers || [])) {
    const definition = markerDefinition(marker.kind);
    const group = svg("g", {
      class: "map-marker",
      transform: `translate(${marker.at[0]} ${marker.at[1]})`,
      tabindex: "0",
      role: "button",
      "aria-label": `${definition.label}: ${marker.label}`,
      style: `--marker-color:${definition.color}`,
    });
    group.append(svg("circle", { r: 2.15 }));
    const glyph = svg("text", { x: 0, y: .1 });
    glyph.textContent = definition.glyph;
    group.append(glyph, svgTitle(`${definition.label}: ${marker.label}`));
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      showPoi(marker, definition);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showPoi(marker, definition);
      }
    });
    elements.map.append(group);
  }

  for (const item of floor.planImage ? (floor.overlayLabels || []) : (floor.labels || [])) {
    const label = svg("text", {
      x: item.at[0],
      y: item.at[1],
      class: `map-label ${item.tone || "normal"}`,
      "font-size": Math.max(1.4, Number(item.size) || 1.8),
    });
    label.textContent = item.text;
    elements.map.append(label);
  }

  applyViewBox();
}

function appendMapGrid() {
  const defs = svg("defs");
  const minor = svg("pattern", { id: "minorGrid", width: 2, height: 2, patternUnits: "userSpaceOnUse" });
  minor.append(svg("path", { d: "M 2 0 L 0 0 0 2", class: "map-grid-minor", fill: "none" }));
  const major = svg("pattern", { id: "majorGrid", width: 10, height: 10, patternUnits: "userSpaceOnUse" });
  major.append(svg("rect", { width: 10, height: 10, fill: "url(#minorGrid)" }));
  major.append(svg("path", { d: "M 10 0 L 0 0 0 10", class: "map-grid-major", fill: "none" }));
  defs.append(minor, major);
  elements.map.append(defs, svg("rect", { x: 0, y: 0, width: 100, height: 100, fill: "url(#majorGrid)" }));
}

function roomCenter(shape) {
  if (shape.kind === "poly" && shape.points?.length) {
    const sums = shape.points.reduce((result, point) => [result[0] + point[0], result[1] + point[1]], [0, 0]);
    return [sums[0] / shape.points.length, sums[1] / shape.points.length];
  }
  return [Number(shape.x || 0) + Number(shape.w || 0) / 2, Number(shape.y || 0) + Number(shape.h || 0) / 2];
}

function markerDefinition(kind) {
  return MARKERS[kind] || { label: titleCase(kind || "point"), glyph: "•", color: "#d2b46e" };
}

function renderLegend(dungeon) {
  const kinds = [...new Set(dungeon.levels.flatMap((floor) => {
    const markers = floor.planImage ? floor.overlayMarkers : floor.markers;
    return (markers || []).map((marker) => marker.kind);
  }))];
  const section = elements.legend.closest(".legend-section");
  if (section) section.hidden = kinds.length === 0;
  elements.legend.replaceChildren();
  for (const kind of kinds) {
    const definition = markerDefinition(kind);
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-symbol" style="--legend-color:${definition.color}">${escapeHtml(definition.glyph)}</span><span>${escapeHtml(definition.label)}</span>`;
    elements.legend.append(item);
  }
}

function renderSimpleList(target, values, emptyText) {
  target.replaceChildren();
  const items = Array.isArray(values) && values.length ? values : [emptyText];
  for (const value of items) {
    const item = document.createElement("li");
    item.textContent = value;
    target.append(item);
  }
}

function showPoi(marker, definition) {
  elements.selectedPoi.innerHTML = `<strong>${escapeHtml(marker.label)}</strong><span>${escapeHtml(definition.label)} · X ${marker.at[0]} · Y ${marker.at[1]}${marker.notes ? `<br>${escapeHtml(marker.notes)}` : ""}</span>`;
  elements.selectedPoi.hidden = false;
}

function updateUrl() {
  const next = new URL(location.href);
  next.searchParams.set("dungeon", state.dungeonId);
  next.searchParams.set("floor", state.floorId);
  history.replaceState(null, "", next);
}

function resetMapView(render = true) {
  state.view = { x: 0, y: 0, size: 100, zoom: 1 };
  if (render) {
    if (map3d.active) map3d.reset();
    else applyViewBox();
  }
}

function setZoom(nextZoom, anchorX = 50, anchorY = 50) {
  const zoom = clamp(nextZoom, 1, 5);
  const nextSize = 100 / zoom;
  const current = state.view;
  const ratioX = current.size ? (anchorX - current.x) / current.size : .5;
  const ratioY = current.size ? (anchorY - current.y) / current.size : .5;
  state.view = {
    x: clamp(anchorX - ratioX * nextSize, 0, 100 - nextSize),
    y: clamp(anchorY - ratioY * nextSize, 0, 100 - nextSize),
    size: nextSize,
    zoom,
  };
  applyViewBox();
}

function applyViewBox() {
  const { x, y, size } = state.view;
  elements.map.setAttribute("viewBox", `${x} ${y} ${size} ${size}`);
  elements.resetView.textContent = state.view.zoom === 1 ? "1:1" : `${state.view.zoom.toFixed(1)}×`;
}

function pointInCurrentView(event) {
  const rect = elements.map.getBoundingClientRect();
  return [
    state.view.x + ((event.clientX - rect.left) / rect.width) * state.view.size,
    state.view.y + ((event.clientY - rect.top) / rect.height) * state.view.size,
  ];
}

elements.map.addEventListener("wheel", (event) => {
  event.preventDefault();
  const [x, y] = pointInCurrentView(event);
  setZoom(state.view.zoom * (event.deltaY < 0 ? 1.25 : .8), x, y);
}, { passive: false });

elements.map.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || state.view.zoom <= 1 || event.target.closest(".map-marker")) return;
  state.drag = { x: event.clientX, y: event.clientY, viewX: state.view.x, viewY: state.view.y };
  elements.map.classList.add("dragging");
  elements.map.setPointerCapture(event.pointerId);
});

elements.map.addEventListener("pointermove", (event) => {
  if (!state.drag) return;
  const rect = elements.map.getBoundingClientRect();
  const deltaX = ((event.clientX - state.drag.x) / rect.width) * state.view.size;
  const deltaY = ((event.clientY - state.drag.y) / rect.height) * state.view.size;
  state.view.x = clamp(state.drag.viewX - deltaX, 0, 100 - state.view.size);
  state.view.y = clamp(state.drag.viewY - deltaY, 0, 100 - state.view.size);
  applyViewBox();
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  elements.map.addEventListener(eventName, () => {
    state.drag = null;
    elements.map.classList.remove("dragging");
  });
}

elements.zoomIn.addEventListener("click", () => {
  if (map3d.active) map3d.setZoom(map3d.zoom * 1.2);
  else setZoom(state.view.zoom * 1.25);
});
elements.zoomOut.addEventListener("click", () => {
  if (map3d.active) map3d.setZoom(map3d.zoom * .83);
  else setZoom(state.view.zoom * .8);
});
elements.resetView.addEventListener("click", () => resetMapView());
elements.search.addEventListener("input", () => {
  state.query = elements.search.value;
  renderBrowser();
});
elements.region.addEventListener("change", () => {
  state.region = elements.region.value;
  renderBrowser();
});
elements.difficulty.addEventListener("change", () => {
  state.difficulty = elements.difficulty.value;
  renderBrowser();
});
elements.clear.addEventListener("click", () => {
  state.query = "";
  state.region = "all";
  state.difficulty = "all";
  elements.search.value = "";
  elements.region.value = "all";
  elements.difficulty.value = "all";
  renderBrowser();
});
window.addEventListener("popstate", () => {
  const next = new URLSearchParams(location.search);
  selectDungeon(next.get("dungeon") || DUNGEONS[0].id, next.get("floor") || "");
});

function svg(name, attributes = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function svgTitle(text) {
  const title = svg("title");
  title.textContent = text;
  return title;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function titleCase(value) {
  return String(value).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const totalFloors = DUNGEONS.reduce((count, dungeon) => count + dungeon.levels.length, 0);
const totalPois = DUNGEONS.reduce((count, dungeon) => count + poiCount(dungeon), 0);
const statusText = document.querySelector("#dungeonStatus strong");
if (statusText) statusText.textContent = `${DUNGEONS.length} dungeons · ${totalFloors} floors · ${totalPois} POIs`;

selectDungeon(state.dungeonId, state.floorId);
