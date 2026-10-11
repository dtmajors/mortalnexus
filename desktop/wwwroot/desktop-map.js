const STANDALONE_MODE = true;
const mapPath = location.pathname.toLowerCase();
const MAP_VARIANT_KEY = mapPath.startsWith("/myrland-alt-map")
  ? "myrland-alt"
  : mapPath.startsWith("/myrland-map")
    ? "myrland"
    : "sarducaa";
const CONTINENT_KEY = MAP_VARIANT_KEY.startsWith("myrland") ? "myrland" : "sarducaa";
const CONTINENTS = {
  sarducaa: {
    key: "sarducaa",
    name: "Sarducaa",
    subtitle: "Sarducaa",
    intelligenceLabel: "Sarducaa",
    loadingLabel: "Loading Sarducaa",
    image: "/assets/sarducaa-map.webp?v=2",
    width: 5120,
    height: 3579,
    minZoom: -2.5,
    firebaseRoot: "mortalNexus/sarducaa/v1",
    catalogs: [
      ["/assets/data/sarducaa-community-markers.json", "nave-index-sarducaa-community-catalog", "community"],
      ["/assets/data/sarducaa-game-world-markers.local.json", "mortal-nexus-sarducaa-pak-resource-catalog", "client"],
      ["/assets/data/sarducaa-granum-markers.json", "mortal-nexus-sarducaa-granum-catalog", "client"],
      ["/assets/data/sarducaa-service-markers.local.json", "mortal-nexus-sarducaa-service-catalog", "client"],
    ],
  },
  myrland: {
    key: "myrland",
    name: "Myrland",
    subtitle: "Myrland",
    intelligenceLabel: "Myrland",
    loadingLabel: "Loading Myrland",
    image: "/assets/myrland-map-worldanvil-registered.jpg?v=2",
    width: 8192,
    height: 8192,
    minZoom: -4,
    initialZoom: -3,
    firebaseRoot: "mortalNexus/sarducaa/v1/myrland",
    catalogs: [
      ["/assets/data/myrland-location-markers.local.json", "mortal-nexus-myrland-location-marker-catalog", "client"],
      ["/assets/data/myrland-crop-fields.local.json", "mortal-nexus-myrland-crop-field-catalog", "client"],
      ["/assets/data/myrland-crop-clusters.json", "mortal-nexus-myrland-crop-cluster-catalog", "community"],
      ["/assets/data/myrland-community-markers.json", "mortal-nexus-myrland-community-catalog", "community"],
    ],
  },
};
const CONTINENT = {
  ...CONTINENTS[CONTINENT_KEY],
  image: MAP_VARIANT_KEY === "myrland-alt"
    ? "/assets/myrland-map-square.jpg?v=3"
    : CONTINENTS[CONTINENT_KEY].image,
};
const MAP_WIDTH = CONTINENT.width;
const MAP_HEIGHT = CONTINENT.height;
const MAP_BOUNDS = L.latLngBounds([0, 0], [MAP_HEIGHT, MAP_WIDTH]);
const continentStorageKey = (base) => CONTINENT_KEY === "sarducaa" ? base : base.replace(":v1", `:${CONTINENT_KEY}:v1`);
const LOCAL_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-local-markers:v1");
const MAP_EDITS_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-map-edits:v1");
const HIDDEN_CATEGORIES_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-hidden-categories:v1");
const HIDDEN_RESOURCES_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-hidden-resources:v1");
const SEARCH_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-search:v1");
const SEARCH_ISOLATE_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-search-isolate:v1");
const SHOW_NAMES_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-show-names:v1");
const ROUTES_STORAGE_KEY = continentStorageKey("mortal-nexus:private-routes:v1");
const ROUTES_VISIBLE_STORAGE_KEY = continentStorageKey("mortal-nexus:private-routes-visible:v1");
const FILTER_DEFAULTS_STORAGE_KEY = continentStorageKey("mortal-nexus:desktop-filter-defaults:v1");
const FILTER_DEFAULTS_VERSION = "2";
const nativeHost = window.chrome?.webview;
const POSITION_LIFETIME_MS = 10 * 60 * 1000;
const MARKER_IMAGE_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MARKER_IMAGE_MAX_STORED_BYTES = 700 * 1024;
const MARKER_IMAGE_MAX_DIMENSION = 1280;

const elements = Object.fromEntries(
  [
    "searchInput", "searchIsolateToggle", "fitBtn", "exportBtn", "importBtn", "importInput", "totalCount",
    "visibleCount", "clientCount", "communityCount", "syncBadge", "clearFiltersBtn",
    "quickAddGrid", "cancelPlacementBtn", "positionBtn", "layerBrowser",
    "toggleAllLayersBtn", "labelsToggle", "addMarkerBtn", "editNodesBtn", "labelsMapBtn",
    "contributionsBtn", "contributionsBadge",
    "viewReadout", "loadingState", "markerDialog", "markerForm", "dialogTitle",
    "closeDialogBtn", "markerLabel", "markerCategory", "markerIcon", "markerType", "markerVisibility", "saveMarkerBtn",
    "markerPinCount", "markerX", "markerY", "markerDrops", "markerNotes",
    "markerScale", "markerScaleValue", "markerOpacity", "markerOpacityValue",
    "markerIconPicker", "markerKindSearch", "markerImageDropzone", "markerImageEmpty", "markerImageInput",
    "markerImagePreview", "markerImageStatus", "uploadMarkerImageBtn", "removeMarkerImageBtn",
    "markerImageViewer", "markerImageViewerImage", "markerImageViewerCaption",
    "closeMarkerImageViewerBtn", "positionExpiryNote", "deleteLocalBtn", "cancelDialogBtn", "toast",
    "markerDialogEyebrow", "markerContributionReason", "markerProposalReason",
    "contributionsDialog", "contributionsEyebrow", "contributionsTitle", "contributionsSummary", "contributionsHelp",
    "contributionsList", "closeContributionsBtn", "refreshContributionsBtn", "doneContributionsBtn",
    "brandSubline", "mapIntelTitle", "loadingTitle",
    "newRouteBtn", "routeList", "routeEmptyState", "routeActiveControls", "routeActiveName", "routeActiveStats",
    "routeDrawBtn", "routeUndoBtn", "routeReverseBtn", "routeShareBtn", "routeImportBtn", "routesMapBtn",
    "routeDialog", "routeForm", "routeDialogTitle", "closeRouteDialogBtn", "cancelRouteDialogBtn",
    "routeName", "routeColor", "routeWidth", "routeLoop", "deleteRouteBtn",
    "routeCodeDialog", "routeCodeDialogTitle", "closeRouteCodeDialogBtn", "routeCodeHelp", "routeCodeText",
    "routeCodeStatus", "importRouteCodeBtn", "copyRouteCodeBtn",
  ].map((id) => [id, document.getElementById(id)]),
);

elements.markerX.max = String(MAP_WIDTH);
elements.markerY.max = String(MAP_HEIGHT);

const CATEGORY_COLORS = {
  ore: "#91b9da",
  flora: "#62d59a",
  wood: "#c79d65",
  "argus-sponge": "#5dd7bd",
  creature: "#ff737d",
  bug: "#ff9b5d",
  mount: "#d891ff",
  humanoid: "#f17373",
  npc: "#70b8ff",
  chest: "#f4c95d",
  cave: "#d3a56b",
  dungeon: "#b28cff",
  camp: "#ed786d",
  town: "#55c7ee",
  keep: "#bdc9dc",
  landmark: "#e3be72",
  fish: "#55cbd5",
  book: "#e5a4ff",
  satchel: "#d9a95f",
  vendor: "#66c7e8",
  service: "#76d6ff",
  position: "#ff3545",
  house: "#3997ff",
  local: "#ffffff",
};

const CATEGORY_LABELS = {
  town: "Towns",
  keep: "Keeps",
  cave: "Caves",
  dungeon: "Dungeons",
  camp: "Camps",
  landmark: "Landmarks",
  creature: "Creatures",
  bug: "Bugs & spiders",
  humanoid: "Humanoids",
  mount: "Mounts",
  npc: "NPCs & priests",
  ore: "Ore & minerals",
  wood: "Wood",
  flora: "Plants & fungi",
  "argus-sponge": "Argus Sponge",
  fish: "Fishing spots",
  chest: "Chests & barrels",
  book: "Books",
  satchel: "Satchels & bags",
  vendor: "Vendors",
  service: "Workbenches & services",
  position: "Shared positions",
  house: "Player houses",
};

const CATEGORY_GROUPS = [
  {
    key: "places",
    label: "Places & services",
    icon: "landmark",
    categories: ["town", "keep", "cave", "dungeon", "camp", "landmark", "house", "npc", "vendor", "service", "position"],
  },
  {
    key: "creatures",
    label: "Creatures & people",
    icon: "beast",
    categories: ["creature", "bug", "humanoid", "mount"],
  },
];

const RESOURCE_GROUPS = [
  { key: "argus", label: "Argus Sponge", category: "argus-sponge", icon: "argus-sponge" },
  { key: "plants", label: "Plants & fungi", category: "flora", icon: "herb" },
  { key: "wood", label: "Wood", category: "wood", icon: "whitewood" },
  { key: "ore", label: "Ore & minerals", category: "ore", icon: "grey-ore" },
  { key: "fish", label: "Fishing", category: "fish", icon: "fish" },
  { key: "loot", label: "Chests & loot", category: "chest", icon: "chest" },
  { key: "books", label: "Books", category: "book", icon: "book" },
  { key: "satchels", label: "Satchels & bags", category: "satchel", icon: "satchel" },
];

const GATHERING_CATEGORIES = new Set(["argus-sponge", "flora", "wood", "ore"]);
const DEFAULT_HIDDEN_CATEGORIES = new Set([
  "keep",
  "landmark",
  "house",
  "vendor",
  "service",
  "flora",
  "argus-sponge",
  "wood",
  "fish",
  "ore",
  "chest",
]);
const MYRLAND_CLUSTERED_CROP_TYPES = new Set(["barley", "corn", "rice", "rye", "spelt"]);
const TYPE_FILTER_CATEGORIES = new Set([
  ...GATHERING_CATEGORIES,
  "creature",
  "bug",
  "humanoid",
  "mount",
  "camp",
  "npc",
  "cave",
  "dungeon",
  "chest",
]);
const BLOCKED_SOURCE_TYPES = new Set([
  "toghair field",
  "apera spica field",
  "capsicum field",
  "ephedria field",
  "spargia reed",
  "saguaro cactus",
  "beaver tail cactus",
]);

const ICON_FILES = {
  town: "town.png",
  "town-red": "town-red.png",
  cave: "cave.png",
  wayshrine: "wayshrine-v2.png",
  person: "priest.svg",
  trees: "whitewood.svg",
  horse: "portrait-horse.png",
  panther: "panther-v2.svg",
  "bush-pig": "portrait-bush-pig.png",
  springbok: "portrait-springbok.png",
  "snapping-turtle": "portrait-snapping-turtle.png",
  "terror-bird": "portrait-terror-bird.png",
  "spider-brown": "portrait-mountain-spider.png",
  "lizard-water": "portrait-water-lizard.png",
  "lizard-hunter": "portrait-hunter-lizard.png",
  "bear-black": "bear-black-v2.svg",
  "bear-brown": "source-bear-brown.jpg",
  cougar: "cougar-v2.svg",
  "dire-wolf": "source-dire-wolf.jpg",
  boar: "razorback.svg",
  sator: "sator-v2.svg",
  "taur-dog": "taur-dog-v2.svg",
  wisent: "source-wisent.jpg",
  troll: "source-troll.jpg",
  crab: "coralis-crab.svg",
  tagmaton: "source-tagmaton.jpg",
  "horse-steppe": "horse-steppe-codex.png",
  "horse-desert": "horse-desert-codex.png",
  "horse-jungle": "horse-jungle-codex.png",
  "horse-jotun": "horse-jotun-codex.png",
  "horse-mongrel": "horse-mongrel-codex.png",
  "night-snatcher": "night-snatcher-v2.svg",
  belbus: "belbus-v2.svg",
  brownwood: "brownwood-v3.svg",
  greywood: "greywood-v3.svg",
  basileus: "basileus.svg",
  "malus-fruit": "malus-fruit.svg",
  capsicum: "capsicum.svg",
  convolvulaceae: "convolvulaceae.svg",
  lysimachia: "lysimachia.svg",
  "muse-fruit": "muse-fruit.svg",
  allium: "allium.svg",
  "shorekelp-brown": "shorekelp-brown.svg",
  "jambura-green": "jambura-green.svg",
  pirum: "pirum.svg",
  gaillardia: "gaillardia.svg",
  karoton: "karoton.svg",
  "palm-fruit": "palm-fruit.svg",
  karuva: "karuva.svg",
  gamun: "gamun.svg",
  bor: "bor-chunk.svg",
  saburra: "saburra-v2.svg",
  crystal: "nitre-crystal.svg",
  "camp-spider": "camp-spider-v2.svg",
};

const ICON_SPRITES = {
  wisent: ["creature-portrait-atlas-v5.png", 4, 3, 0, 0],
  boar: ["creature-portrait-atlas-v5.png", 4, 3, 1, 0],
  razorback: ["creature-portrait-atlas-v5.png", 4, 3, 1, 0],
  belbus: ["creature-portrait-atlas-v5.png", 4, 3, 2, 0],
  "bear-brown": ["creature-portrait-atlas-v5.png", 4, 3, 3, 0],
  cougar: ["creature-portrait-atlas-v5.png", 4, 3, 0, 1],
  "taur-dog": ["creature-portrait-atlas-v5.png", 4, 3, 1, 1],
  "dire-wolf": ["creature-portrait-atlas-v5.png", 4, 3, 2, 1],
  troll: ["creature-portrait-atlas-v5.png", 4, 3, 3, 1],
  wolf: ["creature-portrait-atlas-v5.png", 4, 3, 0, 2],
  guar: ["creature-portrait-atlas-v5.png", 4, 3, 1, 2],
  "bear-black": ["creature-portrait-atlas-v5.png", 4, 3, 2, 2],
  panther: ["creature-portrait-atlas-v5.png", 4, 3, 3, 2],
  sator: ["creature-portrait-atlas-v6.png", 4, 4, 0, 0.8],
  crab: ["creature-portrait-atlas-v6.png", 4, 4, 1, 0.8],
  "coralis-crab": ["creature-portrait-atlas-v6.png", 4, 4, 1, 0.8],
  tagmaton: ["creature-portrait-atlas-v6.png", 4, 4, 2, 0.8],
  "night-snatcher": ["creature-portrait-atlas-v6.png", 4, 4, 3, 0.8],
  campodon: ["creature-portrait-atlas-v6.png", 4, 4, 0, 2.2],
  platybelodon: ["creature-portrait-atlas-v6.png", 4, 4, 1, 2.2],
  "kurnas-white": ["creature-portrait-atlas-v6.png", 4, 4, 2, 2.2],
  "scorpion-giant": ["creature-portrait-atlas-v6.png", 4, 4, 3, 2.2],
  "giant-akrep": ["creature-portrait-atlas-v6.png", 4, 4, 3, 2.2],
  urial: ["creature-portrait-atlas-v7.png", 4, 3, 0, 0],
  molva: ["creature-portrait-atlas-v7.png", 4, 3, 1, 0],
  rat: ["creature-portrait-atlas-v7.png", 4, 3, 2, 0],
  "bear-white": ["creature-portrait-atlas-v7.png", 4, 3, 3, 0],
  risar: ["creature-portrait-atlas-v7.png", 4, 3, 0, 1],
  "bandit-veteran": ["creature-portrait-atlas-v7.png", 4, 3, 1, 1],
  bandit: ["creature-portrait-atlas-v7.png", 4, 3, 2, 1],
  "shore-prowler": ["creature-portrait-atlas-v7.png", 4, 3, 3, 1],
  "camp-risar": ["creature-portrait-atlas-v7.png", 4, 3, 0, 2],
  "camp-bandit": ["creature-portrait-atlas-v7.png", 4, 3, 1, 2],
};

const ICON_OPTIONS = [
  ["landmark", "Point of interest"],
  ["waygate", "Waygate"],
  ["oasis", "Oasis"],
  ["bridge", "Bridge"],
  ["ruins", "Ruins"],
  ["crater", "Crater"],
  ["town", "Town"],
  ["town-red", "Hostile town"],
  ["keep", "Keep"],
  ["wayshrine", "Wayshrine"],
  ["cave", "Cave"],
  ["spider-cave", "Spider cave"],
  ["ratzar-cave", "Ratzar cave"],
  ["dungeon", "Dungeon"],
  ["tombstone", "Graveyard"],
  ["priest", "Priest / NPC"],
  ["fish", "Fishing"],
  ["chest", "Chest"],
  ["barrel", "Barrel"],
  ["enemy-camp", "Camp"],
  ["camp-humanoid", "Unclassified humanoid camp"],
  ["bandit-wastrel", "Wastrel"],
  ["bandit", "Bandit"],
  ["bandit-veteran", "Veteran bandit"],
  ["bandit-al-yaban", "Al-Yaban bandit"],
  ["bandit-bos-koch", "Bos Koch bandit"],
  ["bandit-nomad", "Nomad raider"],
  ["camp-bandit", "Bandit camp"],
  ["camp-veteran", "Veteran bandit camp"],
  ["camp-al-yaban", "Al-Yaban bandit camp"],
  ["camp-jungle", "Jungle camp"],
  ["camp-bos-koch", "Bos Koch camp"],
  ["camp-wastrel", "Wastrel camp"],
  ["camp-nomad", "Nomad camp"],
  ["camp-ratzar", "Ratzar camp"],
  ["camp-akrep", "Akrep camp"],
  ["camp-spider", "Spider camp"],
  ["camp-risar", "Risar camp"],
  ["beast", "Creature"],
  ["creature", "Creature / paw"],
  ["bear-black", "Black bear"],
  ["bear-brown", "Brown bear"],
  ["bear-white", "White bear"],
  ["wolf", "Wolf"],
  ["dire-wolf", "Dire wolf"],
  ["boar", "Razorback / boar"],
  ["cougar", "Cougar"],
  ["wisent", "Wisent"],
  ["sator", "Sator"],
  ["troll", "Troll"],
  ["rat", "Tribe rat"],
  ["urial", "Urial"],
  ["rabbit", "Rabbit"],
  ["crab", "Coralis crab"],
  ["guar", "Guar"],
  ["night-snatcher", "Night Snatcher"],
  ["taur-dog", "Taur Dog"],
  ["shore-prowler", "Shore Prowler"],
  ["belbus", "Belbus"],
  ["risar", "Risar"],
  ["undead", "Undead"],
  ["tagmaton", "Tagmaton"],
  ["bush-pig", "Bush pig"],
  ["horse", "Horse"],
  ["horse-steppe", "Steppe horse"],
  ["horse-desert", "Desert horse"],
  ["horse-jungle", "Jungle horse"],
  ["horse-jotun", "Jotun horse"],
  ["horse-mongrel", "Mongrel horse"],
  ["molva", "Molva Beast"],
  ["camel", "Camel"],
  ["panther", "Panther"],
  ["springbok", "Springbok"],
  ["gemsbok", "Gemsbok"],
  ["ibex", "Ibex"],
  ["irbis", "Irbis"],
  ["crocodile", "Crocodile"],
  ["snapping-turtle", "Snapping turtle"],
  ["terror-bird", "Terror bird"],
  ["campodon", "Campodon"],
  ["platybelodon", "Platybelodon"],
  ["danaburnu", "Danaburnu"],
  ["golden-danaburnu", "Golden Danaburnu"],
  ["ormek", "Ormek"],
  ["beetle", "Beetle"],
  ["stone-lizard", "Stone lizard"],
  ["lizard-water", "Water lizard"],
  ["lizard-hunter", "Hunter lizard"],
  ["spider-brown", "Mountain spider"],
  ["scorpion", "Akrep"],
  ["scorpion-giant", "Giant Akrep"],
  ["kurnas-white", "Giant Kurnas"],
  ["ratzar-worker", "Ratzar worker"],
  ["ratzar-hunter", "Ratzar hunter"],
  ["ratzar-feeder", "Ratzar feeder"],
  ["ratzar-queen", "Ratzar queen"],
  ["ratzar-alete", "Ratzar alete"],
  ["argus-sponge", "Argus Sponge"],
  ["sea-dew", "Sea Dew"],
  ["nymph-herb", "Nymph Herb"],
  ["glimmercap", "Glimmercap"],
  ["salvia", "Salvia"],
  ["herb", "Herb"],
  ["grain-herb", "Grain crop"],
  ["plant-purple", "Purple flower"],
  ["yellow-cepa", "Yellow Cepa"],
  ["basileus", "Basileus"],
  ["malus-fruit", "Malus Fruit"],
  ["capsicum", "Capsicum"],
  ["convolvulaceae", "Convolvulaceae"],
  ["lysimachia", "Lysimachia Arvensis"],
  ["muse-fruit", "Muse Fruit"],
  ["allium", "Allium"],
  ["shorekelp-brown", "Brown Shorekelp"],
  ["jambura-green", "Green Jambura"],
  ["pirum", "Pirum"],
  ["gaillardia", "Gaillardia"],
  ["karoton", "Karoton"],
  ["palm-fruit", "Palm Fruit"],
  ["karuva", "Karuva"],
  ["gamun", "Gamun"],
  ["whitewood", "Whitewood"],
  ["spongewood", "Spongewood"],
  ["brownwood", "Brownwood"],
  ["stonewood", "Stonewood"],
  ["calx", "Calx"],
  ["granum", "Granum"],
  ["calamine", "Calamine"],
  ["grey-ore", "Ore"],
  ["salt", "Salt"],
  ["sulfur", "Sulfur"],
  ["bor", "Bor Chunk"],
  ["tephra", "Tephra"],
  ["crystal", "Crystal"],
  ["firmwood", "Firmwood"],
  ["greywood", "Greywood"],
  ["ironwood", "Ironwood"],
  ["darkwood", "Blackwood"],
  ["mushroom-red", "Red mushroom"],
  ["moon-sponge", "Moon Sponge"],
  ["book", "Book"],
  ["satchel", "Satchel / bag"],
  ["vendor", "Vendor"],
  ["vendor-utility", "Utility vendor"],
  ["vendor-fishing", "Fishing vendor"],
  ["vendor-armor", "Armor vendor"],
  ["service-crafting", "Crafting station"],
  ["service-extraction", "Extraction machine"],
  ["service-furnace", "Furnace / refining oven"],
  ["service-cooking", "Cooking station"],
  ["service-butcher", "Butcher table"],
  ["service-guild", "Guild stone"],
  ["player-house", "Player house"],
  ["my-location", "My location"],
];
const KNOWN_ICON_KEYS = new Set(ICON_OPTIONS.map(([key]) => key));
const MOUNT_ICONS = new Set([
  "horse", "horse-steppe", "horse-desert", "horse-jungle", "horse-jotun", "horse-mongrel",
  "molva", "camel", "gemsbok", "terror-bird", "bush-pig", "wolf", "dire-wolf", "panther",
]);

function mountIconForMarker(marker, text, icon) {
  if (marker.category === "mount") return KNOWN_ICON_KEYS.has(icon) ? icon : "horse";
  if (/\b(?:steppe|desert|jungle|jotun|mongrel)?\s*horse\b|\bhorse spawn\b/.test(text)) return MOUNT_ICONS.has(icon) ? icon : "horse";
  if (/\bmolva(?: beast)?\b/.test(text)) return "molva";
  if (/\b(?:ruah|koch) gamal\b/.test(text)) return "camel";
  if (/\b(?:gemsbok|gensbok)\b/.test(text)) return "gemsbok";
  if (/\bterror bird(?:s| packs?)?\b/.test(text)) return "terror-bird";
  if (/\b(?:bush )?pig\b/.test(text)) return "bush-pig";
  if (/\bdire wolf\b/.test(text)) return "dire-wolf";
  if (/\bwolf\b/.test(text)) return "wolf";
  if (/\bpanther\b/.test(text) && !/\bisland\b/.test(text)) return "panther";
  return "";
}

function markerPresetForIcon(icon, label = "") {
  const exact = {
    town: ["town", "Town"], "town-red": ["town", "Hostile town"], keep: ["keep", "Keep"],
    wayshrine: ["landmark", "Wayshrine"], cave: ["cave", "Cave"], "spider-cave": ["cave", "Spider cave"],
    "ratzar-cave": ["cave", "Ratzar cave"], dungeon: ["dungeon", "Dungeon"], tombstone: ["landmark", "Graveyard"],
    priest: ["npc", "Priest"], fish: ["fish", "Fishing spot"], chest: ["chest", "Chest"], barrel: ["chest", "Barrel"],
    "enemy-camp": ["camp", "Camp"], "camp-humanoid": ["humanoid", "Humanoid camp"],
    "bandit-wastrel": ["humanoid", "Wastrel"], bandit: ["humanoid", "Bandit"],
    "bandit-veteran": ["humanoid", "Veteran Bandit"], "bandit-al-yaban": ["humanoid", "Al-Yaban"],
    "bandit-bos-koch": ["humanoid", "Bos Koch"], "bandit-nomad": ["humanoid", "Nomad"],
    "camp-bandit": ["humanoid", "Bandit camp"], "camp-veteran": ["humanoid", "Veteran Bandit camp"],
    "camp-al-yaban": ["humanoid", "Al-Yaban camp"], "camp-jungle": ["humanoid", "Jungle humanoid camp"],
    "camp-bos-koch": ["humanoid", "Bos Koch camp"], "camp-wastrel": ["humanoid", "Wastrel camp"],
    "camp-nomad": ["humanoid", "Nomad camp"], "camp-risar": ["humanoid", "Risar camp"], "camp-ratzar": ["bug", "Ratzar camp"],
    "camp-akrep": ["bug", "Akrep camp"], "camp-spider": ["bug", "Spider camp"],
    "argus-sponge": ["argus-sponge", "Argus Sponge"], "sea-dew": ["flora", "Sea Dew"],
    "nymph-herb": ["flora", "Nymph Herb"], glimmercap: ["flora", "Glimmercap"], salvia: ["flora", "Salvia"],
    herb: ["flora", "Herb"], "plant-purple": ["flora", "Purple flower"], "yellow-cepa": ["flora", "Yellow Cepa"],
    basileus: ["flora", "Basileus"], "malus-fruit": ["flora", "Malus Fruit"], capsicum: ["flora", "Capsicum"],
    convolvulaceae: ["flora", "Convolvulaceae"], lysimachia: ["flora", "Lysimachia Arvensis"], "muse-fruit": ["flora", "Muse Fruit"],
    allium: ["flora", "Allium"], "shorekelp-brown": ["flora", "Brown Shorekelp"], "jambura-green": ["flora", "Green Jambura"],
    pirum: ["flora", "Pirum"], gaillardia: ["flora", "Gaillardia"], karoton: ["flora", "Karoton"],
    "palm-fruit": ["flora", "Palm Fruit"], karuva: ["flora", "Karuva"], gamun: ["flora", "Gamun"],
    whitewood: ["wood", "Whitewood"], spongewood: ["wood", "Spongewood"], brownwood: ["wood", "Brownwood"],
    stonewood: ["wood", "Stonewood"], calx: ["ore", "Calx"], granum: ["ore", "Granum"],
    calamine: ["ore", "Calamine"], "grey-ore": ["ore", "Ore"], salt: ["ore", "Salt"], sulfur: ["ore", "Sulfur"],
    bor: ["ore", "Bor Chunk"], tephra: ["ore", "Tephra"], crystal: ["ore", "Crystal"],
    firmwood: ["wood", "Firmwood"], greywood: ["wood", "Greywood"], ironwood: ["wood", "Ironwood"], darkwood: ["wood", "Blackwood"],
    "mushroom-red": ["flora", "Mushroom"], "moon-sponge": ["flora", "Moon Sponge"],
    book: ["book", "Book"], satchel: ["satchel", "Satchel"], vendor: ["vendor", "Vendor"],
    "vendor-utility": ["vendor", "Utility vendor"], "vendor-fishing": ["vendor", "Fishing vendor"], "vendor-armor": ["vendor", "Armor vendor"],
    "player-house": ["house", "Player house"], "my-location": ["position", "Shared position"],
  };
  if (exact[icon]) return { category: exact[icon][0], sourceType: exact[icon][1] };
  if (icon.startsWith("service-")) return { category: "service", sourceType: label || "Service" };
  if (["beetle", "scorpion", "scorpion-giant", "kurnas-white", "ratzar-worker", "ratzar-hunter", "ratzar-feeder", "ratzar-queen", "ratzar-alete", "spider-brown", "danaburnu", "golden-danaburnu", "ormek", "tagmaton"].includes(icon)) {
    return { category: "bug", sourceType: label };
  }
  if (MOUNT_ICONS.has(icon)) return { category: "mount", sourceType: label };
  if (["beast", "creature", "bear-black", "bear-brown", "bear-white", "wolf", "dire-wolf", "boar", "cougar", "wisent", "sator", "troll", "rat", "rabbit", "crab", "guar", "night-snatcher", "taur-dog", "shore-prowler", "belbus", "bush-pig", "panther", "springbok", "ibex", "urial", "irbis", "crocodile", "snapping-turtle", "terror-bird", "campodon", "platybelodon", "stone-lizard", "lizard-water", "lizard-hunter"].includes(icon)) {
    return { category: "creature", sourceType: label };
  }
  if (["risar", "undead"].includes(icon)) return { category: "humanoid", sourceType: label };
  return { category: "landmark", sourceType: label };
}

const QUICK_ADD_PRESETS = [
  { key: "ore", label: "Ore", category: "ore", sourceType: "Ore", icon: "grey-ore" },
  { key: "calx", label: "Calx", category: "ore", sourceType: "Calx", icon: "calx" },
  { key: "granum", label: "Granum", category: "ore", sourceType: "Granum", icon: "granum" },
  { key: "calamine", label: "Calamine", category: "ore", sourceType: "Calamine", icon: "calamine" },
  { key: "argus", label: "Argus", category: "argus-sponge", sourceType: "Argus Sponge", icon: "argus-sponge" },
  { key: "sea-dew", label: "Sea Dew", category: "flora", sourceType: "Sea Dew", icon: "sea-dew" },
  { key: "nymph-herb", label: "Nymph Herb", category: "flora", sourceType: "Nymph Herb", icon: "nymph-herb" },
  { key: "glimmercap", label: "Glimmercap", category: "flora", sourceType: "Glimmercap", icon: "glimmercap" },
  { key: "salvia", label: "Salvia", category: "flora", sourceType: "Salvia", icon: "salvia" },
  { key: "yellow-cepa", label: "Yellow Cepa", category: "flora", sourceType: "Yellow Cepa", icon: "yellow-cepa" },
  { key: "herb", label: "Herb", category: "flora", sourceType: "Herb", icon: "herb" },
  { key: "whitewood", label: "Whitewood", category: "wood", sourceType: "Whitewood", icon: "whitewood" },
  { key: "spongewood", label: "Spongewood", category: "wood", sourceType: "Spongewood", icon: "spongewood" },
  { key: "brownwood", label: "Brownwood", category: "wood", sourceType: "Brownwood", icon: "brownwood" },
  { key: "stonewood", label: "Stonewood", category: "wood", sourceType: "Stonewood", icon: "stonewood" },
  { key: "monster", label: "Monster", category: "creature", sourceType: "Creature", icon: "creature" },
  { key: "camp", label: "Camp", category: "camp", sourceType: "Camp", icon: "enemy-camp" },
  { key: "cave", label: "Cave", category: "cave", sourceType: "Cave", icon: "cave" },
  { key: "dungeon", label: "Dungeon", category: "dungeon", sourceType: "Dungeon", icon: "dungeon" },
  { key: "chest", label: "Chest", category: "chest", sourceType: "Chest", icon: "chest" },
  { key: "barrel", label: "Barrel", category: "chest", sourceType: "Barrel", icon: "barrel" },
  { key: "priest", label: "Priest", category: "npc", sourceType: "Priest", icon: "priest" },
  { key: "graveyard", label: "Graveyard", category: "landmark", sourceType: "Graveyard", icon: "tombstone" },
  {
    key: "player-house",
    label: "Player house",
    category: "house",
    sourceType: "Player house",
    icon: "player-house",
    markerScale: 1.8,
    markerOpacity: 0.72,
  },
];

let catalogMarkers = [];
let localMarkers = loadLocalMarkers();
let restrictedMarkers = [];
let approvedMapOverrides = new Map();
let markerFeedback = new Map();
let accountAvailable = false;
let communityGuild = null;
let mapEdits = loadMapEdits();
let filteredMarkers = [];
let searchMatchedMarkerIds = new Set();
const renderedLayerById = new Map();
let hiddenCategories = loadStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY);
let hiddenResources = loadStoredSet(HIDDEN_RESOURCES_STORAGE_KEY);
const layerSectionOpenState = new Map();
let filterDefaultsMigrationPending = localStorage.getItem(FILTER_DEFAULTS_STORAGE_KEY) !== FILTER_DEFAULTS_VERSION;
if (filterDefaultsMigrationPending) {
  for (const category of DEFAULT_HIDDEN_CATEGORIES) hiddenCategories.add(category);
  saveStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY, hiddenCategories);
  if (!nativeHost) {
    localStorage.setItem(FILTER_DEFAULTS_STORAGE_KEY, FILTER_DEFAULTS_VERSION);
    filterDefaultsMigrationPending = false;
  }
}
let nativeFilterStateLoaded = false;
let filterSaveTimer = 0;
let lootCatalog = new Map();
let decodedLootCatalog = new Map();
let placementPreset = null;
let editMode = false;
let editingId = null;
let editingMarkerSnapshot = null;
let dialogOriginalPosition = null;
let dialogPreset = null;
let markerProposalAction = "";
let proposalMoveTarget = null;
let pendingMarkerImage = null;
let markerImageBusy = false;
let routes = loadRoutes();
let routesVisible = localStorage.getItem(ROUTES_VISIBLE_STORAGE_KEY) !== "0";
let selectedRouteId = routes[0]?.id || null;
let routeDrawMode = false;
let editingRouteId = null;
let toastTimer = 0;
let firebaseSync = null;
let editorSession = { isEditor: false, username: "", email: "" };
const pendingCloudWrites = [];
let firebaseRetryTimer = 0;

document.title = `${MAP_VARIANT_KEY === "myrland-alt" ? "Myrland Alt Map" : CONTINENT.name} | Mortal Nexus`;
if (elements.brandSubline) elements.brandSubline.textContent = "Maps, tools, and reference";
if (elements.mapIntelTitle) elements.mapIntelTitle.textContent = CONTINENT.intelligenceLabel;
if (elements.loadingTitle) elements.loadingTitle.textContent = CONTINENT.loadingLabel;
if (elements.viewReadout) elements.viewReadout.textContent = CONTINENT.name;
for (const link of document.querySelectorAll("[data-map-variant]")) {
  const active = link.dataset.mapVariant === MAP_VARIANT_KEY;
  link.classList.toggle("is-active", active);
  if (active) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
}

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: CONTINENT.minZoom,
  maxZoom: 4,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  maxBounds: MAP_BOUNDS.pad(0.12),
  maxBoundsViscosity: 0.8,
  preferCanvas: true,
  attributionControl: false,
});

L.imageOverlay(CONTINENT.image, MAP_BOUNDS, {
  interactive: false,
  className: `continent-map-image ${CONTINENT.key}-map-image`,
}).addTo(map);
const townLabelLayer = L.layerGroup().addTo(map);
function fitContinentBounds(animate = false) {
  if (CONTINENT.key === "myrland") {
    map.setView([MAP_HEIGHT / 2, MAP_WIDTH / 2], CONTINENT.initialZoom ?? CONTINENT.minZoom, { animate });
    return;
  }
  map.fitBounds(MAP_BOUNDS, { animate });
}

fitContinentBounds(false);
window.mortalNexusMapResize = () => {
  map.invalidateSize({ animate: false });
  scheduleMapRender();
};

map.createPane("routePane");
map.getPane("routePane").style.zIndex = "610";
map.getPane("routePane").style.pointerEvents = "none";
const markerLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const markerContextMenu = createMarkerContextMenu();

function clean(value) {
  return String(value ?? "").trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value) {
  return clean(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeCategory(value) {
  const category = slug(value) || "landmark";
  if (["animals", "monsters"].includes(category)) return "creature";
  if (category === "resources") return "flora";
  return category;
}

function parseDrops(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => typeof entry === "string" ? clean(entry) : clean(entry?.material || entry?.name))
      .filter(Boolean);
  }
  return clean(value).split(/[\n,;]+/).map(clean).filter(Boolean);
}

function parsePinCount(raw, label) {
  const explicit = Number(raw);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const match = clean(label).match(/\b(\d+)\s*x?\s*pin\b/i);
  return match ? Number(match[1]) : 0;
}

function sanitizeMarkerImage(value) {
  if (!value || typeof value !== "object") return null;
  const dataUrl = String(value.dataUrl || "");
  if (!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(dataUrl)) return null;
  const size = Math.max(0, Number(value.size) || Math.ceil(dataUrl.length * 0.75));
  if (size > MARKER_IMAGE_MAX_STORED_BYTES) return null;
  return {
    dataUrl,
    name: clean(value.name || "POI picture").slice(0, 80),
    type: clean(value.type || "image/webp").slice(0, 40),
    width: Math.max(1, Number(value.width) || 1),
    height: Math.max(1, Number(value.height) || 1),
    size,
  };
}

function formatFileSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

function markerVisualDefaults(icon) {
  return icon === "player-house"
    ? { markerScale: 1.8, markerOpacity: 0.72 }
    : { markerScale: 1, markerOpacity: 1 };
}

function markerText(marker) {
  return `${marker.label} ${marker.sourceType} ${marker.category} ${marker.notes}`.toLowerCase();
}

function resolveMarkerStyle(marker) {
  const text = markerText(marker);
  let category = marker.category;
  let icon = slug(marker.icon || "");
  const mountIcon = mountIconForMarker(marker, text, icon);

  if (mountIcon) {
    category = "mount";
    icon = mountIcon;
  } else if (/argus sponge/.test(text)) {
    category = "argus-sponge";
    icon = "argus-sponge";
  } else if (/player house/.test(text)) {
    category = "house";
    icon = "player-house";
  } else if (/spongewood/.test(text)) {
    icon = "spongewood";
  } else if (/whitewood/.test(text)) {
    icon = "whitewood";
  } else if (/brownwood/.test(text)) {
    icon = "brownwood";
  } else if (/greywood/.test(text)) {
    icon = "greywood";
  } else if (/stonewood/.test(text)) {
    icon = "stonewood";
  } else if (/\bbor(?: chunk)?\b/.test(text)) {
    icon = "bor";
  } else if (/\bsaburra\b/.test(text)) {
    icon = "saburra";
  } else if (/nitre crystal/.test(text)) {
    icon = "crystal";
  } else if (/nymph herb/.test(text)) {
    icon = "nymph-herb";
  } else if (/glimmercap/.test(text)) {
    icon = "glimmercap";
  } else if (/\bsalvia\b/.test(text)) {
    icon = "salvia";
  } else if (/yellow cepa/.test(text)) {
    icon = "yellow-cepa";
  } else if (/sea\s*dew/.test(text)) {
    icon = "sea-dew";
  } else if (/\bbasileus\b/.test(text)) {
    icon = "basileus";
  } else if (/malus fruit/.test(text)) {
    icon = "malus-fruit";
  } else if (/\bcapsicum\b/.test(text)) {
    icon = "capsicum";
  } else if (/convolvulaceae/.test(text)) {
    icon = "convolvulaceae";
  } else if (/lysimachia arvensis/.test(text)) {
    icon = "lysimachia";
  } else if (/muse fruit/.test(text)) {
    icon = "muse-fruit";
  } else if (/\ballium\b/.test(text)) {
    icon = "allium";
  } else if (/brown shorekelp/.test(text)) {
    icon = "shorekelp-brown";
  } else if (/green jambura/.test(text)) {
    icon = "jambura-green";
  } else if (/\bpirum\b/.test(text)) {
    icon = "pirum";
  } else if (/ga(?:i)?llardia/.test(text)) {
    icon = "gaillardia";
  } else if (/\bkaroton\b/.test(text)) {
    icon = "karoton";
  } else if (/palm fruit/.test(text)) {
    icon = "palm-fruit";
  } else if (/\bkaruva\b/.test(text)) {
    icon = "karuva";
  } else if (/\bgamun\b/.test(text)) {
    icon = "gamun";
  } else if (/\b(?:barley|corn|oats?|rice|rye|spelt)\b/.test(text)) {
    category = "flora";
    icon = "grain-herb";
  } else if (/\b(?:bandit|wastrel|wastel)\b/.test(text)) {
    category = "humanoid";
    icon = /veteran/.test(text) ? (/camp|ruins?/.test(text) ? "camp-veteran" : "bandit-veteran")
      : /al[- ]yaban/.test(text) ? (/camp|ruins?/.test(text) ? "camp-al-yaban" : "bandit-al-yaban")
        : /bos koch/.test(text) ? (/camp|ruins?/.test(text) ? "camp-bos-koch" : "bandit-bos-koch")
          : /wastrel|wastel/.test(text) ? (/camp|ruins?/.test(text) ? "camp-wastrel" : "bandit-wastrel")
            : /camp|ruins?/.test(text) ? "camp-bandit" : "bandit";
  } else if (/\b(?:satchel|loot bag|supply bag)\b/.test(text)) {
    category = "satchel";
    icon = "satchel";
  } else if (/\b(?:skill ?book|spell ?book|lore ?book|book|tome)\b/.test(text)) {
    category = "book";
    icon = "book";
  } else if (/\b(?:vendor|merchant|trader|weaponsmith|armou?rsmith|tailor)\b|ranger armou?r hut/.test(text)) {
    category = "vendor";
    icon = /fish/.test(text) ? "vendor-fishing" : /armou?r|tailor|ranger/.test(text) ? "vendor-armor" : /utility/.test(text) ? "vendor-utility" : "vendor";
  } else if (/graveyard/.test(text)) {
    icon = "tombstone";
  } else if (/wayshrine/.test(text)) {
    icon = "wayshrine";
  } else if (/\bwaygate\b/.test(text)) {
    icon = "waygate";
  } else if (/\boasis\b/.test(text)) {
    icon = "oasis";
  } else if (/\bbridge\b/.test(text)) {
    icon = "bridge";
  } else if (/sand\s*worm crater/.test(text)) {
    icon = "crater";
  } else if (/\bruins?\b/.test(text) && !/\bakrep\b/.test(text)) {
    icon = "ruins";
  } else if (/\bsulfur\b/.test(text)) {
    category = "ore";
    icon = "sulfur";
  } else if (category === "keep" || /guild keep/.test(text)) {
    icon = "keep";
  } else if (/barrel/.test(text)) {
    icon = "barrel";
  } else if (category === "chest" || /\bchest\b/.test(text)) {
    icon = "chest";
  } else if (/spider/.test(text) && !/bandit|wastrel|al[- ]yaban|risar/.test(text)) {
    if (category === "cave") icon = "spider-cave";
    else if (/camp|overrun/.test(text)) icon = "camp-spider";
    else icon = "spider-brown";
  } else if (/golden danaburnu/.test(text)) {
    icon = "golden-danaburnu";
  } else if (/\bdanaburnu\b/.test(text)) {
    icon = "danaburnu";
  } else if (/ratzar/.test(text) && category === "cave") {
    icon = "ratzar-cave";
  } else if (/giant kurnas/.test(text)) {
    icon = "kurnas-white";
  } else if (/giant akrep/.test(text)) {
    icon = "scorpion-giant";
  } else if (/\bakrep\b|scorpion/.test(text)) {
    icon = /camp|overrun|ruins/.test(text) ? "camp-akrep" : "scorpion";
  } else if (/ratzar queen/.test(text)) {
    icon = "ratzar-queen";
  } else if (/ratzar (?:alate|alete)/.test(text)) {
    icon = "ratzar-alete";
  } else if (/ratzar hunter/.test(text)) {
    icon = "ratzar-hunter";
  } else if (/ratzar feeder/.test(text)) {
    icon = "ratzar-feeder";
  } else if (/ratzar worker/.test(text)) {
    icon = "ratzar-worker";
  } else if (/ratzar/.test(text)) {
    icon = /camp|overrun/.test(text) ? "camp-ratzar" : "ratzar-worker";
  } else if (/water lizard/.test(text)) {
    icon = "lizard-water";
  } else if (/hunter lizard/.test(text)) {
    icon = "lizard-hunter";
  } else if (/stone lizard/.test(text)) {
    icon = "stone-lizard";
  } else if (/bush pig/.test(text)) {
    icon = "bush-pig";
  } else if (/springbok/.test(text)) {
    icon = "springbok";
  } else if (/gemsbok|gensbok/.test(text)) {
    icon = "gemsbok";
  } else if (/\bibex\b/.test(text)) {
    icon = "ibex";
  } else if (/\birbis\b/.test(text)) {
    icon = "irbis";
  } else if (/terror bird/.test(text)) {
    icon = "terror-bird";
  } else if (/snapping turtle/.test(text)) {
    icon = "snapping-turtle";
  } else if (/black bear/.test(text)) {
    icon = "bear-black";
  } else if (/white bear/.test(text)) {
    icon = "bear-white";
  } else if (/\burial\b/.test(text)) {
    icon = "urial";
  } else if (/molva beast|\bmolva\b/.test(text)) {
    icon = "molva";
  } else if (/tribe rat/.test(text)) {
    icon = "rat";
  } else if (/shore prow(?:l)?er/.test(text)) {
    icon = "shore-prowler";
  } else if (/\brisar\b/.test(text)) {
    icon = /camp|encampment|outpost/.test(text) ? "camp-risar" : "risar";
  } else if (/razorback|\bboar\b/.test(text)) {
    icon = "boar";
  } else if (/\bsator\b/.test(text)) {
    icon = "sator";
  } else if (/coralis crab|\bcrab\b/.test(text)) {
    icon = "crab";
  } else if (/taur dog/.test(text)) {
    icon = "taur-dog";
  } else if (/night snatcher|nightsnatcher/.test(text)) {
    icon = "night-snatcher";
  } else if (/\bbelbus\b/.test(text)) {
    icon = "belbus";
  } else if (/\bcougar\b/.test(text)) {
    icon = "cougar";
  } else if (/\bpanther\b/.test(text)) {
    icon = "panther";
  } else if (/al[- ]yaban/.test(text)) {
    icon = /camp/.test(text) ? "camp-al-yaban" : "bandit-al-yaban";
  } else if (/bos koch/.test(text)) {
    icon = /camp/.test(text) ? "camp-bos-koch" : "bandit-bos-koch";
  } else if (/veteran bandit/.test(text)) {
    icon = /camp/.test(text) ? "camp-veteran" : "bandit-veteran";
  } else if (/jungle bandit/.test(text)) {
    icon = /camp/.test(text) ? "camp-jungle" : "bandit-veteran";
  } else if (/wastrel|wastel/.test(text)) {
    icon = /camp/.test(text) ? "camp-wastrel" : "bandit-wastrel";
  } else if (/nomad/.test(text)) {
    icon = /camp/.test(text) ? "camp-nomad" : "bandit-nomad";
  } else if (/bandit/.test(text)) {
    icon = /camp/.test(text) ? "camp-bandit" : "bandit";
  } else if (/camp/.test(text) && category === "camp") {
    icon = "enemy-camp";
  } else if (category === "fish") {
    icon = "fish";
  } else if (category === "npc") {
    icon = "priest";
  } else if (category === "book") {
    icon = "book";
  } else if (!KNOWN_ICON_KEYS.has(icon)) {
    icon = iconForCategory(category);
  }

  return { category, icon };
}

function normalizeMarker(raw, sourceKind = raw?.sourceKind || "local") {
  if (!raw || !Number.isFinite(Number(raw.x)) || !Number.isFinite(Number(raw.y))) return null;
  if (normalizeCategory(raw.category) === "container-scout") return null;
  const sourceType = clean(raw.sourceType || raw.type || raw.category);
  const label = clean(raw.label || sourceType || "Unnamed marker");
  if (BLOCKED_SOURCE_TYPES.has(sourceType.toLowerCase())) return null;
  if (/\b(?:toghair|apera spica|capsicum|ephedria) field\b/i.test(label)) return null;
  if (/\bspargia reed\b/i.test(`${label} ${sourceType}`)) return null;
  if (sourceKind === "client" && (/^gameplay chest$/i.test(label) || /^bp chest$/i.test(sourceType))) return null;

  const actualSource = ["client", "community", "local"].includes(sourceKind) ? sourceKind : "local";
  const rawNotes = clean(raw.notes);
  const publicNotes = sourceKind === "client" && /(?:exact|extracted|official|client-baked|cooked|affine|package|instance\.db)/i.test(rawNotes)
    ? ""
    : rawNotes;
  const base = {
    ...raw,
    id: clean(raw.id) || `local-${crypto.randomUUID()}`,
    label,
    category: normalizeCategory(raw.category),
    icon: slug(raw.icon || raw.category || "landmark"),
    sourceType,
    sourceKind: actualSource,
    evidenceKind: clean(raw.evidenceKind) ||
      (actualSource === "client" ? "exact" : actualSource === "community" ? "reported" : "local"),
    verified: raw.verified === true,
    confidence: clean(raw.confidence),
    x: Math.max(0, Math.min(MAP_WIDTH, Number(raw.x))),
    y: Math.max(0, Math.min(MAP_HEIGHT, Number(raw.y))),
    nodeCount: Math.max(0, Number(raw.nodeCount) || 0),
    pinCount: parsePinCount(raw.pinCount, label),
    drops: parseDrops(raw.drops),
    notes: publicNotes,
    image: sanitizeMarkerImage(raw.image),
    legacyImageUrl: /^\/assets\/myrland-legacy\/[a-z0-9_-]+\.jpg$/i.test(clean(raw.legacyImageUrl))
      ? clean(raw.legacyImageUrl)
      : "",
    legacyImageAlt: clean(raw.legacyImageAlt).slice(0, 120),
    sourceAuthor: clean(raw.sourceAuthor).slice(0, 80),
    sourceUrl: /^https:\/\//i.test(clean(raw.sourceUrl)) ? clean(raw.sourceUrl).slice(0, 500) : "",
    sourceMarkerId: clean(raw.sourceMarkerId).slice(0, 80),
    manualIcon: Boolean(raw.manualIcon),
    positionMarker: Boolean(raw.positionMarker) || normalizeCategory(raw.category) === "position",
    expiresAt: Number(raw.expiresAt) || 0,
  };
  const styled = resolveMarkerStyle(base);
  const result = base.manualIcon && KNOWN_ICON_KEYS.has(base.icon) ? base : { ...base, ...styled };
  const defaults = markerVisualDefaults(result.icon);
  return {
    ...result,
    markerScale: clampNumber(raw.markerScale, 0.6, 3, defaults.markerScale),
    markerOpacity: clampNumber(raw.markerOpacity, 0.15, 1, defaults.markerOpacity),
  };
}

function loadStoredSet(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(value) ? value.map(clean).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function saveStoredSet(key, values) {
  localStorage.setItem(key, JSON.stringify([...values].sort()));
}

function filterSnapshot() {
  return {
    type: "map.filters.set",
    continent: CONTINENT_KEY,
    searchText: elements.searchInput.value,
    showNames: elements.labelsToggle.checked,
    hiddenCategories: [...hiddenCategories].sort(),
    hiddenResources: [...hiddenResources].sort(),
  };
}

function persistFilterState({ debounce = false } = {}) {
  saveStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY, hiddenCategories);
  saveStoredSet(HIDDEN_RESOURCES_STORAGE_KEY, hiddenResources);
  localStorage.setItem(SEARCH_STORAGE_KEY, elements.searchInput.value);
  localStorage.setItem(SHOW_NAMES_STORAGE_KEY, elements.labelsToggle.checked ? "1" : "0");
  if (!nativeHost || !nativeFilterStateLoaded) return;
  window.clearTimeout(filterSaveTimer);
  const save = () => nativeHost.postMessage(filterSnapshot());
  if (debounce) filterSaveTimer = window.setTimeout(save, 250);
  else save();
}

function restoreNativeFilterState(settings) {
  const state = settings?.mapFilters?.[CONTINENT_KEY];
  if (!state?.initialized) {
    if (filterDefaultsMigrationPending) {
      for (const category of DEFAULT_HIDDEN_CATEGORIES) hiddenCategories.add(category);
      localStorage.setItem(FILTER_DEFAULTS_STORAGE_KEY, FILTER_DEFAULTS_VERSION);
      filterDefaultsMigrationPending = false;
    }
    nativeFilterStateLoaded = true;
    persistFilterState();
    return;
  }

  hiddenCategories = new Set(Array.isArray(state.hiddenCategories) ? state.hiddenCategories : []);
  hiddenResources = new Set(Array.isArray(state.hiddenResources) ? state.hiddenResources : []);
  if (filterDefaultsMigrationPending) {
    for (const category of DEFAULT_HIDDEN_CATEGORIES) hiddenCategories.add(category);
    localStorage.setItem(FILTER_DEFAULTS_STORAGE_KEY, FILTER_DEFAULTS_VERSION);
    filterDefaultsMigrationPending = false;
  }
  elements.searchInput.value = clean(state.searchText);
  elements.labelsToggle.checked = state.showNames === true;
  nativeFilterStateLoaded = true;
  saveStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY, hiddenCategories);
  saveStoredSet(HIDDEN_RESOURCES_STORAGE_KEY, hiddenResources);
  localStorage.setItem(SEARCH_STORAGE_KEY, elements.searchInput.value);
  localStorage.setItem(SHOW_NAMES_STORAGE_KEY, elements.labelsToggle.checked ? "1" : "0");
  renderLayerBrowser(allMarkers());
  updateLayerToggleLabel();
  updateNameButton();
  applyFilters();
}

if (nativeHost) {
  nativeHost.addEventListener("message", (event) => {
    const message = event.data || {};
    if (message.type === "toolsSnapshot") restoreNativeFilterState(message.payload?.settings);
  });
}

function loadLocalMarkers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((marker) => normalizeMarker(marker, "local")).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveLocalMarkers() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localMarkers));
}

function normalizeRoutePoint(raw) {
  const x = Number(Array.isArray(raw) ? raw[0] : raw?.x);
  const y = Number(Array.isArray(raw) ? raw[1] : raw?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(MAP_WIDTH, x)),
    y: Math.max(0, Math.min(MAP_HEIGHT, y)),
  };
}

function normalizeRoute(raw) {
  if (!raw || typeof raw !== "object") return null;
  const points = (Array.isArray(raw.points) ? raw.points : [])
    .slice(0, 2000)
    .map(normalizeRoutePoint)
    .filter(Boolean);
  const color = /^#[0-9a-f]{6}$/i.test(clean(raw.color)) ? clean(raw.color) : "#58b7ff";
  return {
    id: clean(raw.id) || `route-${crypto.randomUUID()}`,
    name: clean(raw.name || "Untitled route").slice(0, 60),
    color,
    width: clampNumber(raw.width, 3, 7, 5),
    loop: raw.loop === true,
    visible: raw.visible !== false,
    points,
    createdAtIso: clean(raw.createdAtIso) || new Date().toISOString(),
    updatedAtIso: clean(raw.updatedAtIso) || new Date().toISOString(),
  };
}

function loadRoutes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ROUTES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 200).map(normalizeRoute).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveRoutes() {
  localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
}

function selectedRoute() {
  return routes.find((route) => route.id === selectedRouteId) || null;
}

function routeDistance(route) {
  if (!route?.points?.length) return 0;
  let distance = 0;
  for (let index = 1; index < route.points.length; index += 1) {
    distance += Math.hypot(
      route.points[index].x - route.points[index - 1].x,
      route.points[index].y - route.points[index - 1].y,
    );
  }
  if (route.loop && route.points.length > 2) {
    const first = route.points[0];
    const last = route.points.at(-1);
    distance += Math.hypot(first.x - last.x, first.y - last.y);
  }
  return distance;
}

function routeStats(route) {
  const stops = route?.points?.length || 0;
  const distance = routeDistance(route);
  return `${stops} ${stops === 1 ? "stop" : "stops"} | ${Math.round(distance).toLocaleString()} map units`;
}

function renderRoutePlanner() {
  const selected = selectedRoute();
  const fragment = document.createDocumentFragment();
  for (const route of routes) {
    const row = document.createElement("div");
    row.className = `route-list-row${route.id === selectedRouteId ? " is-selected" : ""}${route.visible ? "" : " is-hidden"}`;
    row.style.setProperty("--route-color", route.color);
    row.innerHTML = `
      <button class="route-visibility-button" type="button" data-route-visible="${escapeHtml(route.id)}" title="${route.visible ? "Hide" : "Show"} route">
        <i data-lucide="${route.visible ? "eye" : "eye-off"}"></i>
      </button>
      <button class="route-select-button" type="button" data-route-select="${escapeHtml(route.id)}">
        <span class="route-color-swatch"></span>
        <span><strong>${escapeHtml(route.name)}</strong><small>${escapeHtml(routeStats(route))}</small></span>
      </button>
      <button class="route-edit-button" type="button" data-route-edit="${escapeHtml(route.id)}" title="Route settings"><i data-lucide="settings-2"></i></button>`;
    fragment.append(row);
  }
  elements.routeList.replaceChildren(fragment);
  elements.routeEmptyState.hidden = routes.length > 0;
  elements.routeActiveControls.hidden = !selected;
  if (selected) {
    elements.routeActiveName.textContent = selected.name;
    elements.routeActiveStats.textContent = routeStats(selected);
  }
  elements.routeUndoBtn.disabled = !selected?.points?.length;
  elements.routeReverseBtn.disabled = !selected || selected.points.length < 2;
  elements.routeShareBtn.disabled = !selected || selected.points.length < 2;
  elements.routeDrawBtn.classList.toggle("is-active", routeDrawMode);
  elements.routeDrawBtn.innerHTML = routeDrawMode
    ? `<i data-lucide="check"></i> Finish drawing`
    : `<i data-lucide="mouse-pointer-click"></i> Add stops`;
  elements.routesMapBtn.classList.toggle("is-active", routesVisible);
  elements.routesMapBtn.innerHTML = routesVisible
    ? `<i data-lucide="route"></i> Routes on`
    : `<i data-lucide="eye-off"></i> Routes off`;
  lucide.createIcons();
}

function routeLatLngs(route) {
  const points = route.points.map((point) => L.latLng(point.y, point.x));
  if (route.loop && points.length > 2) points.push(points[0]);
  return points;
}

function routeWaypointIcon(route, index) {
  const isStart = index === 0;
  const isFinish = index === route.points.length - 1 && route.points.length > 1;
  const label = isStart ? "S" : isFinish ? "F" : String(index + 1);
  const stateClass = isStart ? " is-start" : isFinish ? " is-finish" : "";
  return L.divIcon({
    className: "route-waypoint-icon",
    html: `<span class="route-waypoint${stateClass}" style="--route-color:${route.color}">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function renderRoutes() {
  routeLayer.clearLayers();
  if (!routesVisible) return;
  for (const route of routes) {
    if (!route.visible || !route.points.length) continue;
    const latlngs = routeLatLngs(route);
    if (latlngs.length > 1) {
      L.polyline(latlngs, {
        pane: "routePane",
        color: "#02050a",
        weight: route.width + 5,
        opacity: .78,
        interactive: false,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(routeLayer);
      L.polyline(latlngs, {
        pane: "routePane",
        color: route.color,
        weight: route.width,
        opacity: .96,
        interactive: false,
        lineJoin: "round",
        lineCap: "round",
        className: route.id === selectedRouteId ? "nexus-route-line is-selected" : "nexus-route-line",
      }).addTo(routeLayer);
    }
    if (route.id !== selectedRouteId) continue;
    route.points.forEach((point, index) => {
      const handle = L.marker([point.y, point.x], {
        icon: routeWaypointIcon(route, index),
        draggable: true,
        keyboard: false,
        riseOnHover: true,
        autoPan: true,
      }).addTo(routeLayer);
      handle.bindTooltip(index === 0 ? "Route start" : index === route.points.length - 1 ? "Route finish" : `Stop ${index + 1}`, {
        direction: "top",
        offset: [0, -12],
      });
      handle.on("dragend", (event) => {
        const latlng = event.target.getLatLng();
        const current = selectedRoute();
        if (!current?.points[index]) return;
        current.points[index] = normalizeRoutePoint({ x: latlng.lng, y: latlng.lat });
        current.updatedAtIso = new Date().toISOString();
        saveRoutes();
        renderRoutePlanner();
        renderRoutes();
      });
      handle.on("contextmenu", (event) => {
        if (event.originalEvent) {
          L.DomEvent.preventDefault(event.originalEvent);
          L.DomEvent.stopPropagation(event.originalEvent);
        }
        removeRoutePoint(route.id, index);
      });
    });
  }
}

function selectRoute(routeId) {
  if (!routes.some((route) => route.id === routeId)) return;
  selectedRouteId = routeId;
  renderRoutePlanner();
  renderRoutes();
}

function setRouteDrawMode(enabled) {
  if (enabled && !selectedRoute()) {
    openRouteDialog();
    return;
  }
  routeDrawMode = Boolean(enabled);
  if (routeDrawMode) {
    if (placementPreset) setPlacementPreset(null);
    if (editMode) setEditMode(false);
  }
  document.getElementById("map").classList.toggle("route-draw-mode", routeDrawMode);
  document.getElementById("map").style.cursor = routeDrawMode || placementPreset ? "crosshair" : "";
  renderRoutePlanner();
  if (routeDrawMode) showToast("Route drawing active. Click the map to add stops; right-click a numbered stop to remove it.", 4200);
}

function addRoutePoint(latlng) {
  const route = selectedRoute();
  if (!route) return;
  const point = normalizeRoutePoint({ x: latlng.lng, y: latlng.lat });
  if (!point) return;
  const previous = route.points.at(-1);
  if (previous && Math.hypot(previous.x - point.x, previous.y - point.y) < .25) return;
  route.points.push(point);
  route.updatedAtIso = new Date().toISOString();
  saveRoutes();
  renderRoutePlanner();
  renderRoutes();
}

function removeRoutePoint(routeId, index) {
  const route = routes.find((entry) => entry.id === routeId);
  if (!route?.points?.[index]) return;
  route.points.splice(index, 1);
  route.updatedAtIso = new Date().toISOString();
  saveRoutes();
  renderRoutePlanner();
  renderRoutes();
}

function openRouteDialog(route = null) {
  editingRouteId = route?.id || null;
  elements.routeDialogTitle.textContent = route ? "Edit route" : "Create route";
  elements.routeName.value = route?.name || `New ${CONTINENT.name} route`;
  elements.routeColor.value = route?.color || "#58b7ff";
  elements.routeWidth.value = String(route?.width || 5);
  elements.routeLoop.checked = route?.loop === true;
  elements.deleteRouteBtn.hidden = !route;
  elements.routeDialog.showModal();
  elements.routeName.focus();
  elements.routeName.select();
}

function closeRouteDialog() {
  editingRouteId = null;
  elements.routeDialog.close();
}

function saveRouteDialog(event) {
  event.preventDefault();
  const name = clean(elements.routeName.value);
  if (!name) return;
  const existing = routes.find((route) => route.id === editingRouteId);
  if (existing) {
    existing.name = name.slice(0, 60);
    existing.color = elements.routeColor.value;
    existing.width = clampNumber(elements.routeWidth.value, 3, 7, 5);
    existing.loop = elements.routeLoop.checked;
    existing.updatedAtIso = new Date().toISOString();
    selectedRouteId = existing.id;
  } else {
    const route = normalizeRoute({
      id: `route-${crypto.randomUUID()}`,
      name,
      color: elements.routeColor.value,
      width: elements.routeWidth.value,
      loop: elements.routeLoop.checked,
      visible: true,
      points: [],
    });
    routes.push(route);
    selectedRouteId = route.id;
  }
  saveRoutes();
  closeRouteDialog();
  renderRoutePlanner();
  renderRoutes();
  setRouteDrawMode(true);
}

function deleteEditingRoute() {
  const route = routes.find((entry) => entry.id === editingRouteId);
  if (!route || !window.confirm(`Delete private route "${route.name}"?`)) return;
  routes = routes.filter((entry) => entry.id !== route.id);
  selectedRouteId = routes[0]?.id || null;
  saveRoutes();
  closeRouteDialog();
  setRouteDrawMode(false);
  renderRoutePlanner();
  renderRoutes();
  showToast("Private route deleted.");
}

function routeSharePayload(route) {
  return {
    v: 1,
    c: CONTINENT_KEY,
    n: route.name,
    o: route.color,
    w: route.width,
    l: route.loop,
    p: route.points.map((point) => [Number(point.x.toFixed(1)), Number(point.y.toFixed(1))]),
  };
}

function routeCode(route) {
  const bytes = new TextEncoder().encode(JSON.stringify(routeSharePayload(route)));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return `MNR1-${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
}

function decodeRouteCode(value) {
  const code = clean(value);
  if (!code.startsWith("MNR1-") || code.length > 500000) throw new Error("That is not a valid Mortal Nexus route code.");
  const encoded = code.slice(5).replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(encoded + "=".repeat((4 - encoded.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (payload?.v !== 1 || !Array.isArray(payload.p)) throw new Error("This route code uses an unsupported format.");
  if (payload.c !== CONTINENT_KEY) {
    const destination = payload.c === "myrland" ? "Myrland" : "Sarducaa";
    throw new Error(`This is a ${destination} route. Switch maps before importing it.`);
  }
  const route = normalizeRoute({
    name: payload.n,
    color: payload.o,
    width: payload.w,
    loop: payload.l,
    points: payload.p,
    visible: true,
  });
  if (!route || route.points.length < 2) throw new Error("The route code does not contain enough valid stops.");
  return route;
}

function openRouteShareDialog(route = null) {
  elements.routeCodeDialogTitle.textContent = route ? "Share route" : "Import route";
  elements.routeCodeHelp.textContent = route
    ? "Copy this code to share only the selected route. It contains no account, marker, or Firebase data."
    : `Paste a ${CONTINENT.name} route code below. The imported route will be saved privately on this computer.`;
  elements.routeCodeText.value = route ? routeCode(route) : "";
  elements.routeCodeStatus.textContent = "Route codes work without Firebase or an editor account.";
  elements.copyRouteCodeBtn.hidden = !route;
  elements.importRouteCodeBtn.hidden = Boolean(route);
  elements.routeCodeDialog.showModal();
  elements.routeCodeText.focus();
  if (route) elements.routeCodeText.select();
}

function closeRouteCodeDialog() {
  elements.routeCodeDialog.close();
}

async function copyCurrentRouteCode() {
  const value = elements.routeCodeText.value;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    elements.routeCodeText.select();
    document.execCommand("copy");
  }
  elements.routeCodeStatus.textContent = "Route code copied. Only this route is included.";
}

function importRouteCode() {
  try {
    const route = decodeRouteCode(elements.routeCodeText.value);
    route.id = `route-${crypto.randomUUID()}`;
    route.name = `${route.name} (imported)`.slice(0, 60);
    routes.push(route);
    selectedRouteId = route.id;
    saveRoutes();
    closeRouteCodeDialog();
    renderRoutePlanner();
    renderRoutes();
    map.fitBounds(L.latLngBounds(route.points.map((point) => [point.y, point.x])), { padding: [70, 70], maxZoom: 2 });
    showToast(`Imported private route: ${route.name}`, 4000);
  } catch (error) {
    elements.routeCodeStatus.textContent = error?.message || "That route code could not be imported.";
  }
}

function normalizeMapEdits(raw) {
  const hidden = {};
  const positions = {};
  const overrides = {};
  const hiddenEntries = Array.isArray(raw?.hiddenIds)
    ? raw.hiddenIds.map((id) => [id, true])
    : Object.entries(raw?.hidden || {});

  for (const [rawId, value] of hiddenEntries) {
    const id = clean(rawId);
    if (id && value && !["__proto__", "constructor", "prototype"].includes(id)) hidden[id] = true;
  }

  for (const [rawId, position] of Object.entries(raw?.positions || {})) {
    const id = clean(rawId);
    const x = Number(position?.x);
    const y = Number(position?.y);
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (["__proto__", "constructor", "prototype"].includes(id)) continue;
    positions[id] = {
      x: Math.max(0, Math.min(MAP_WIDTH, x)),
      y: Math.max(0, Math.min(MAP_HEIGHT, y)),
    };
  }
  for (const [rawId, override] of Object.entries(raw?.overrides || {})) {
    const id = clean(rawId);
    if (!id || ["__proto__", "constructor", "prototype"].includes(id) || !override || typeof override !== "object") {
      continue;
    }
    overrides[id] = {
      label: clean(override.label || "Unnamed marker").slice(0, 80),
      category: normalizeCategory(override.category),
      icon: slug(override.icon || override.category || "landmark"),
      manualIcon: override.manualIcon !== false,
      sourceType: clean(override.sourceType).slice(0, 50),
      pinCount: Math.max(0, Number(override.pinCount) || 0),
      drops: parseDrops(override.drops).slice(0, 80),
      notes: clean(override.notes).slice(0, 800),
      image: sanitizeMarkerImage(override.image),
      markerScale: clampNumber(
        override.markerScale,
        0.6,
        3,
        markerVisualDefaults(slug(override.icon || "landmark")).markerScale,
      ),
      markerOpacity: clampNumber(
        override.markerOpacity,
        0.15,
        1,
        markerVisualDefaults(slug(override.icon || "landmark")).markerOpacity,
      ),
    };
  }
  return { hidden, positions, overrides };
}

function loadMapEdits() {
  try {
    return normalizeMapEdits(JSON.parse(localStorage.getItem(MAP_EDITS_STORAGE_KEY) || "{}"));
  } catch {
    return normalizeMapEdits({});
  }
}

function saveMapEdits() {
  localStorage.setItem(MAP_EDITS_STORAGE_KEY, JSON.stringify(mapEdits));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function catalogEditCount() {
  return new Set([
    ...Object.keys(mapEdits.hidden),
    ...Object.keys(mapEdits.positions),
    ...Object.keys(mapEdits.overrides),
  ]).size;
}

function markerIconFile(iconName) {
  return ICON_FILES[iconName] || `${KNOWN_ICON_KEYS.has(iconName) ? iconName : "landmark"}.svg`;
}

function iconUrl(marker) {
  return `/assets/map-icons/${markerIconFile(marker.icon)}`;
}

function iconArtworkHtml(iconName) {
  const key = slug(iconName || "landmark");
  const sprite = ICON_SPRITES[key];
  if (!sprite) {
    return `<img class="map-icon-art" src="/assets/map-icons/${escapeHtml(markerIconFile(key))}" alt="" />`;
  }

  const [atlas, columns, rows, column, row] = sprite;
  const x = columns > 1 ? (column / (columns - 1)) * 100 : 0;
  const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  return `<span class="map-icon-art map-icon-atlas" aria-hidden="true" style="--icon-atlas:url('/assets/map-icons/${atlas}');--icon-atlas-size:${columns * 100}% ${rows * 100}%;--icon-atlas-x:${x}%;--icon-atlas-y:${y}%"></span>`;
}

function iconForCategory(category) {
  const defaults = {
    ore: "grey-ore",
    flora: "herb",
    wood: "whitewood",
    "argus-sponge": "argus-sponge",
    creature: "creature",
    bug: "beetle",
    mount: "horse",
    humanoid: "bandit",
    npc: "priest",
    chest: "chest",
    cave: "cave",
    dungeon: "dungeon",
    camp: "enemy-camp",
    town: "town",
    keep: "keep",
    landmark: "landmark",
    fish: "fish",
    book: "book",
    satchel: "satchel",
    vendor: "vendor",
    service: "service-crafting",
    position: "my-location",
    house: "player-house",
  };
  return defaults[category] || "landmark";
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || titleCase(category);
}

function markerColor(marker) {
  if (marker.positionMarker) return CATEGORY_COLORS.position;
  if (marker.accessControlled && marker.visibility === "guild") return marker.guild?.color === "green" ? "#63d49d" : "#61a7ff";
  if (marker.sourceKind === "local") return CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.local;
  return CATEGORY_COLORS[marker.category] || "#8cb4ed";
}

function sourceLabel(marker) {
  if (marker.accessControlled) return marker.visibility === "private" ? "Only me" : marker.visibility === "friends" ? "Friends" : marker.visibility === "guild" ? marker.guild?.name || "Guild" : "Shared";
  if (marker.sourceKind === "client") return "Nexus";
  if (marker.sourceKind === "community") return "Community";
  return "Shared";
}

function resourceFilterKey(category, sourceType) {
  return `${clean(category).toLowerCase()}|${clean(sourceType).toLowerCase()}`;
}

function isExpired(marker) {
  return marker.expiresAt > 0 && marker.expiresAt <= Date.now();
}

function effectiveCatalogMarkers() {
  return applyApprovedMapOverrides(catalogMarkers
    .filter((marker) => !hasOwn(mapEdits.hidden, marker.id))
    .map((marker) => {
      const override = mapEdits.overrides[marker.id];
      const customized = override
        ? normalizeMarker({ ...marker, ...override, id: marker.id, x: marker.x, y: marker.y }, marker.sourceKind)
        : marker;
      const position = mapEdits.positions[marker.id];
      return position
        ? { ...(customized || marker), x: position.x, y: position.y, locallyMoved: true }
        : (customized || marker);
    }));
}

function allMarkers() {
  return [...effectiveCatalogMarkers(), ...applyApprovedMapOverrides(localMarkers), ...restrictedMarkers].filter((marker) => !isExpired(marker));
}

function applyApprovedMapOverrides(markers) {
  return markers.flatMap((marker) => {
    const override = approvedMapOverrides.get(marker.id);
    if (!override) return [marker];
    if (override.hidden) return [];
    const corrected = normalizeMarker({
      ...marker,
      ...(override.marker || {}),
      id: marker.id,
      sourceKind: marker.sourceKind,
      communityCorrected: true,
    }, marker.sourceKind);
    return corrected ? [enrichMarker(corrected)] : [marker];
  });
}

async function loadRestrictedMarkers() {
  try {
    const [response, guildResponse, overridesResponse, proposalsResponse, feedbackResponse] = await Promise.all([
      fetch(`/api/nexus-community/community/markers?map=${encodeURIComponent(MAP_VARIANT_KEY)}`, { cache: "no-store" }),
      fetch("/api/nexus-community/guild", { cache: "no-store" }),
      fetch(`/api/nexus-community/community/map-overrides?map=${encodeURIComponent(MAP_VARIANT_KEY)}`, { cache: "no-store" }),
      fetch(`/api/nexus-community/community/marker-proposals?map=${encodeURIComponent(MAP_VARIANT_KEY)}`, { cache: "no-store" }),
      fetch(`/api/nexus-community/community/marker-feedback?map=${encodeURIComponent(MAP_VARIANT_KEY)}`, { cache: "no-store" }),
    ]);
    if (!response.ok) return;
    const payload = await response.json();
    if (guildResponse.ok) communityGuild = (await guildResponse.json()).guild || null;
    if (overridesResponse.ok) {
      const overridesPayload = await overridesResponse.json();
      approvedMapOverrides = new Map((overridesPayload.overrides || []).map((entry) => [entry.targetId, entry]));
    }
    if (proposalsResponse.ok) {
      const proposalsPayload = await proposalsResponse.json();
      updateContributionsBadge(proposalsPayload.pendingCount);
    }
    if (feedbackResponse.ok) {
      const feedbackPayload = await feedbackResponse.json();
      markerFeedback = new Map((feedbackPayload.feedback || []).map((entry) => [entry.targetId, entry]));
    }
    accountAvailable = true;
    restrictedMarkers = (payload.markers || [])
      .map((marker) => normalizeMarker({ ...marker, accessControlled: true }, "local"))
      .filter(Boolean)
      .map(enrichMarker);
    refreshSharedData();
    applyEditorState(editorSession);
  } catch (error) {
    console.error("Restricted markers could not be loaded", error);
  }
}

function updateContributionsBadge(value) {
  const count = Math.max(0, Number(value) || 0);
  elements.contributionsBadge.textContent = count > 99 ? "99+" : String(count);
  elements.contributionsBadge.hidden = count === 0;
}

function contributionSnapshotHtml(marker, title) {
  if (!marker) return `<div class="contribution-snapshot"><span>${escapeHtml(title)}</span><strong>Marker removed</strong><small>No replacement</small></div>`;
  return `<div class="contribution-snapshot"><span>${escapeHtml(title)}</span><strong>${escapeHtml(marker.label || "Untitled marker")}</strong><small>${escapeHtml(categoryLabel(marker.category || "landmark"))} / ${Number(marker.x || 0).toFixed(1)}, ${Number(marker.y || 0).toFixed(1)}</small></div>`;
}

function renderContributionQueue(payload) {
  const proposals = payload.proposals || [];
  const pending = proposals.filter((entry) => entry.status === "pending").length;
  elements.contributionsEyebrow.textContent = payload.editor ? "Editor review desk" : "Community map";
  elements.contributionsTitle.textContent = payload.editor ? "Map contributions" : "My contributions";
  elements.contributionsSummary.textContent = payload.editor
    ? `${pending} contribution${pending === 1 ? "" : "s"} waiting for review`
    : `${proposals.length} submission${proposals.length === 1 ? "" : "s"} in your history`;
  elements.contributionsHelp.textContent = payload.editor
    ? "Every approved change is applied to the shared map and credited to its contributor."
    : "Editors verify public discoveries and corrections before they reach everyone. You can keep up to 50 submissions pending at a time.";
  elements.contributionsList.innerHTML = proposals.length ? proposals.map((entry) => {
    const actionLabel = entry.action === "create" ? "New marker" : entry.action === "remove" ? "Incorrect marker" : "Marker correction";
    const reviewed = entry.status !== "pending";
    return `<article class="contribution-card">
      <div class="contribution-main">
        <div class="contribution-head"><div><strong>${escapeHtml(actionLabel)} / ${escapeHtml(entry.proposed?.label || entry.original?.label || "Map marker")}</strong><small>${escapeHtml(entry.submittedBy)} / ${new Date(entry.createdAt).toLocaleString()}</small></div><span class="contribution-status ${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</span></div>
        <p class="contribution-reason">${escapeHtml(entry.reason)}</p>
        <div class="contribution-diff">${contributionSnapshotHtml(entry.original, "Current")}${window.lucide ? `<i data-lucide="arrow-right"></i>` : ""}${contributionSnapshotHtml(entry.proposed, entry.action === "remove" ? "Requested" : "Proposed")}</div>
      </div>
      <aside class="contribution-review">
        ${payload.editor && !reviewed ? `<textarea data-review-note="${escapeHtml(entry.id)}" maxlength="500" placeholder="Optional reviewer note"></textarea><div class="contribution-review-actions"><button class="approve-contribution" type="button" data-review-contribution="${escapeHtml(entry.id)}" data-decision="approve">Approve</button><button class="danger-button" type="button" data-review-contribution="${escapeHtml(entry.id)}" data-decision="reject">Reject</button></div>` : `<p class="contribution-review-note">${entry.reviewer ? `Reviewed by ${escapeHtml(entry.reviewer)}.` : "Awaiting editor review."}${entry.reviewerNote ? `<br>${escapeHtml(entry.reviewerNote)}` : ""}</p>`}
      </aside>
    </article>`;
  }).join("") : `<div class="contributions-empty">${payload.editor ? "No contributions are waiting for review." : "No submissions yet. Add a marker or suggest a correction from any POI."}</div>`;
  window.lucide?.createIcons?.();
}

async function loadContributionQueue(open = true) {
  if (!accountAvailable && open) return showToast("Sign in to view map contributions.", 4500);
  try {
    const response = await fetch(`/api/nexus-community/community/marker-proposals?map=${encodeURIComponent(MAP_VARIANT_KEY)}&status=all`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Contributions could not be loaded.");
    updateContributionsBadge(payload.pendingCount);
    renderContributionQueue(payload);
    if (open && !elements.contributionsDialog.open) elements.contributionsDialog.showModal();
  } catch (error) {
    if (open) showToast(error.message, 5200);
  }
}

async function reviewContribution(id, decision) {
  const note = elements.contributionsList.querySelector(`[data-review-note="${CSS.escape(id)}"]`)?.value || "";
  try {
    const response = await fetch(`/api/nexus-community/community/marker-proposals/${encodeURIComponent(id)}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Contribution review failed.");
    await loadRestrictedMarkers();
    await loadContributionQueue(false);
    showToast(decision === "approve" ? "Contribution approved and published." : "Contribution rejected.", 4500);
  } catch (error) {
    showToast(error.message, 5600);
  }
}

function beginSuggestedMove(marker) {
  if (!accountAvailable) return showToast("Sign in to suggest a marker move.", 4500);
  map.closePopup();
  setPlacementPreset(null);
  proposalMoveTarget = marker;
  document.getElementById("map").style.cursor = "crosshair";
  elements.cancelPlacementBtn.hidden = false;
  showToast(`Click the corrected location for ${marker.label}.`, 4500);
}

async function submitMarkerFeedback(marker, vote) {
  if (!accountAvailable) return showToast("Sign in to confirm map locations.", 4500);
  const current = markerFeedback.get(marker.id)?.myVote || "";
  const nextVote = current === vote ? "clear" : vote;
  try {
    const response = await fetch("/api/nexus-community/community/marker-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ map: MAP_VARIANT_KEY, targetId: marker.id, vote: nextVote }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Feedback could not be saved.");
    markerFeedback.set(marker.id, payload.feedback);
    map.closePopup();
    scheduleMapRender();
    showToast(nextVote === "clear" ? "Your POI vote was removed." : nextVote === "confirmed" ? "You confirmed this POI." : "You marked this POI as incorrect.", 3600);
  } catch (error) {
    showToast(error.message, 5200);
  }
}

const MAJOR_TOWN_SOURCE_IDS = new Set([
  "LM_City_Bakti",
  "LM_City_CaveCamp",
  "LM_City_Fabernum",
  "LM_City_GaulKor",
  "LM_City_Hyllspeia",
  "LM_City_JungleCamp",
  "LM_City_Kranesh",
  "LM_City_Meduli",
  "LM_City_Moh-Ki",
  "LM_City_MorinKhur",
  "LM_City_Tindrem_Main_01",
  "LM_City_Toxai",
  "LM_City_Vadda",
]);

function renderTownLabels() {
  townLabelLayer.clearLayers();
  if (CONTINENT_KEY !== "myrland") return;
  for (const marker of effectiveCatalogMarkers()) {
    if (!MAJOR_TOWN_SOURCE_IDS.has(marker.sourceMarkerId)) continue;
    const icon = L.divIcon({
      className: "major-town-label-host",
      html: `<span class="major-town-label">${escapeHtml(marker.label)}</span>`,
      iconSize: [180, 34],
      iconAnchor: [90, 17],
    });
    L.marker([marker.y, marker.x], { icon, interactive: false, keyboard: false }).addTo(townLabelLayer);
  }
}

function normalizeLoot(raw) {
  if (!raw || typeof raw !== "object") return null;
  const yields = Array.isArray(raw.yields)
    ? raw.yields
      .map((entry) => ({
        material: clean(entry?.material || entry?.name),
        qty: Number(entry?.qty) || 0,
      }))
      .filter((entry) => entry.material)
    : [];
  const trophySource = raw.trophies || raw.trophy || [];
  const trophies = Array.isArray(trophySource)
    ? trophySource
      .map((entry) => ({ name: clean(entry?.name), value: clean(entry?.value) }))
      .filter((entry) => entry.name)
    : [];
  const petPoints = raw.petPoints && typeof raw.petPoints === "object"
    ? {
        subSpecies: clean(raw.petPoints.subSpecies),
        trackedLevels: clean(raw.petPoints.trackedLevels),
        firstKnownCost: clean(raw.petPoints.firstKnownCost),
        lastKnownCost: clean(raw.petPoints.lastKnownCost),
      }
    : null;
  const combatProfiles = Array.isArray(raw.combatProfiles)
    ? raw.combatProfiles.map((entry) => ({
        profileType: clean(entry?.profileType),
        label: clean(entry?.label),
        family: clean(entry?.family),
        level: clean(entry?.level),
        hp: clean(entry?.hp),
        ppCost: clean(entry?.ppCost),
        attackRange: clean(entry?.attackRange),
        averageAttack: clean(entry?.averageAttack),
        attacksPerMinute: clean(entry?.attacksPerMinute),
        damagePerMinute: clean(entry?.damagePerMinute),
      })).filter((entry) => entry.label)
    : [];
  if (!yields.length && !trophies.length && !raw.lore && !raw.loreRoot && !petPoints && !combatProfiles.length) return null;
  return {
    creature: clean(raw.creature),
    carcassBasis: Math.max(0, Number(raw.carcassBasis) || 0),
    carcassLabel: clean(raw.carcassLabel),
    loreRoot: clean(raw.loreRoot),
    lore: clean(raw.lore),
    yields,
    trophies,
    petPoints,
    combatProfiles,
  };
}

function lootCandidates(marker) {
  const text = markerText(marker);
  const candidates = [marker.sourceType, marker.label]
    .map((value) => clean(value).replace(/^\d+\s*x\s*/i, "").replace(/\s+(?:camp|field|spot)$/i, ""))
    .filter(Boolean);
  if (/giant akrep/.test(text)) candidates.unshift("Akrep");
  if (/spider/.test(text) && !/bandit|wastrel|al[- ]yaban|risar/.test(text)) candidates.unshift("Mountain Spider");
  if (/golden danaburnu/.test(text)) candidates.unshift("Golden Danaburnu");
  if (/campad(?:on|odon)/.test(text)) candidates.unshift("Campodon");
  if (/platybelodon/.test(text)) candidates.unshift("Platybelodon");
  if (/tagmaton soldier/.test(text)) candidates.unshift("Tagmaton Soldier (Legacy)");
  if (/\bguar\b/.test(text)) candidates.unshift("Gaur");
  return [...new Set(candidates.map((value) => value.toLowerCase()))];
}

function decodedLootScope(marker) {
  if (["creature", "bug", "mount", "humanoid", "camp"].includes(marker.category)) return "mob";
  if (marker.category === "npc") return "npc";
  if (marker.category === "chest") return "container";
  if (["flora", "ore", "wood", "argus-sponge"].includes(marker.category)) return "resource";
  return "";
}

function decodedLootAlias(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\.\&s/gi, "'s")
    .replace(/&%s/gi, "'s")
    .replace(/&s/gi, "'s")
    .replace(/\bwhiteeood\b/g, "whitewood")
    .replace(/\bgensbok\b/g, "gemsbok")
    .replace(/\bratzar alete\b/g, "ratzar alate")
    .replace(/\bgreen spicca\b/g, "green spica")
    .replace(/^\d+\s*x\s*/, "")
    .replace(/\(\s*\d+\s+nodes?\s*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodedLootCandidateForms(value) {
  const base = decodedLootAlias(value);
  if (!base) return [];
  const simplified = base
    .replace(/\b(?:field|nodes?|spot|stand|spawn|herd|packs?|grove|overrun|camp|cave|exterior|entrance)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [...new Set([base, simplified].filter(Boolean))];
}

function decodedLootCandidates(marker) {
  const scope = decodedLootScope(marker);
  if (!scope) return [];
  const aliases = [...new Set([
    ...decodedLootCandidateForms(marker.label),
    ...decodedLootCandidateForms(marker.sourceType),
    ...(Array.isArray(marker.aliases) ? marker.aliases.flatMap(decodedLootCandidateForms) : []),
  ])];
  const keys = [];
  if (scope === "container" && marker.pinCount) {
    for (const alias of aliases) keys.push(`${scope}|${alias}|pin:${marker.pinCount}`);
  }
  for (const alias of aliases) keys.push(`${scope}|${alias}`);
  return [...new Set(keys)];
}

function enrichMarker(marker) {
  let lootProfile = normalizeLoot(marker.butchery);
  if (!lootProfile) {
    for (const candidate of lootCandidates(marker)) {
      if (lootCatalog.has(candidate)) {
        lootProfile = lootCatalog.get(candidate);
        break;
      }
    }
  }
  let decodedLootProfile = null;
  for (const candidate of decodedLootCandidates(marker)) {
    if (decodedLootCatalog.has(candidate)) {
      decodedLootProfile = decodedLootCatalog.get(candidate);
      break;
    }
  }
  return { ...marker, lootProfile, decodedLootProfile };
}

async function loadCatalog(url, expectedFormat, sourceKind) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.format !== expectedFormat || !Array.isArray(payload.markers)) {
    throw new Error(`${url}: unsupported catalog`);
  }
  const markers = CONTINENT_KEY === "myrland" && url.endsWith("/myrland-community-markers.json")
    ? payload.markers.filter((marker) => !MYRLAND_CLUSTERED_CROP_TYPES.has(
        slug(marker.sourceType || marker.label),
      ))
    : payload.markers;
  return markers.map((marker) => normalizeMarker(marker, sourceKind)).filter(Boolean);
}

async function loadLootCatalog() {
  const urls = [
    "/assets/data/sarducaa-creature-loot.json",
    "/assets/data/creature-butchery.json",
  ];
  const payloads = await Promise.all(urls.map(async (url) => {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Creature loot: ${url} HTTP ${response.status}`);
    return response.json();
  }));
  const result = new Map();
  for (const payload of payloads) {
    const entries = payload?.profiles || payload || {};
    for (const [name, raw] of Object.entries(entries)) {
      const profile = normalizeLoot(raw);
      if (profile) result.set(name.toLowerCase(), profile);
    }
  }
  return result;
}

async function loadDecodedLootCatalog() {
  const response = await fetch("/assets/data/sarducaa-decoded-loot-index.json", { cache: "no-cache" });
  if (!response.ok) throw new Error(`Decoded loot index: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.format !== "mortal-nexus-sarducaa-decoded-loot-index" || !payload.entries) {
    throw new Error("Decoded loot index: unsupported catalog");
  }
  return new Map(Object.entries(payload.entries));
}

function identityTokens(marker) {
  const preferred = marker.label || marker.sourceType;
  return clean(preferred)
    .toLowerCase()
    .replace(/\b\d+\s*x\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\b(?:field|nodes?|entrances?|exterior|marker|overrun|large|old|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function compatibleCategory(a, b) {
  if (a.category === b.category) return true;
  const place = new Set(["town", "keep", "cave", "dungeon", "camp", "landmark", "npc"]);
  const encounter = new Set(["camp", "humanoid", "bug", "creature"]);
  return (place.has(a.category) && place.has(b.category)) ||
    (encounter.has(a.category) && encounter.has(b.category));
}

function sameIdentity(a, b) {
  const aTokens = identityTokens(a);
  const bTokens = identityTokens(b);
  if (!aTokens.length || !bTokens.length) return false;
  const aKey = aTokens.join(" ");
  const bKey = bTokens.join(" ");
  if (aKey === bKey) return true;
  const aSet = new Set(aTokens);
  const overlap = bTokens.filter((token) => aSet.has(token)).length;
  const score = overlap / Math.max(aTokens.length, bTokens.length);
  return overlap >= 2 && score >= .67;
}

function markerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function canMergeMarkers(a, b) {
  if (!compatibleCategory(a, b)) return false;
  if (a.category === "service" || b.category === "service") {
    return false;
  }
  const distance = markerDistance(a, b);
  const crossSource = a.sourceKind !== b.sourceKind;
  const sameResource = GATHERING_CATEGORIES.has(a.category) &&
    GATHERING_CATEGORIES.has(b.category) &&
    resourceFilterKey(a.category, a.sourceType || a.label) === resourceFilterKey(b.category, b.sourceType || b.label);
  if (crossSource && sameResource) return distance <= 18;
  if (GATHERING_CATEGORIES.has(a.category) || GATHERING_CATEGORIES.has(b.category)) return false;
  const hasWorldLocation = a.evidenceKind === "world-location-marker" || b.evidenceKind === "world-location-marker";
  if (hasWorldLocation && sameIdentity(a, b)) {
    const categories = new Set([a.category, b.category]);
    if (categories.has("town") || categories.has("keep")) return distance <= 180;
    if (categories.has("cave") || categories.has("dungeon")) return distance <= 140;
    if ([...categories].some((category) => ["camp", "humanoid", "bug", "creature"].includes(category))) {
      return distance <= 115;
    }
    return distance <= 80;
  }
  if (crossSource && distance <= 9 && a.category === b.category) return true;
  if (!sameIdentity(a, b)) return false;
  if (crossSource) return distance <= 24;
  return distance <= (a.sourceKind === "client" ? 12 : 7);
}

function mergeUniqueDrops(a, b) {
  return [...new Set([...parseDrops(a), ...parseDrops(b)])];
}

function mergeMarkerData(primary, secondary) {
  const aliases = [...new Set([
    ...(primary.aliases || []),
    ...(secondary.aliases || []),
    secondary.label,
  ].map(clean).filter((value) => value && value !== primary.label))];
  return {
    ...primary,
    aliases,
    notes: primary.notes || secondary.notes,
    sourceAuthor: primary.sourceAuthor || secondary.sourceAuthor,
    sourceUrl: primary.sourceUrl || secondary.sourceUrl,
    sourceMarkerId: primary.sourceMarkerId || secondary.sourceMarkerId,
    pinCount: Math.max(primary.pinCount || 0, secondary.pinCount || 0),
    nodeCount: Math.max(primary.nodeCount || 0, secondary.nodeCount || 0),
    drops: mergeUniqueDrops(primary.drops, secondary.drops),
    lootProfile: primary.lootProfile || secondary.lootProfile,
    butchery: primary.butchery || secondary.butchery,
    taming: primary.taming || secondary.taming,
    confirmCount: Math.max(Number(primary.confirmCount) || 0, Number(secondary.confirmCount) || 0),
    mergedSources: [...new Set([...(primary.mergedSources || []), secondary.id])],
  };
}

function dedupeMarkers(markers) {
  const ranked = [...markers].sort((a, b) => {
    const rank = { client: 0, community: 1, local: 2 };
    return rank[a.sourceKind] - rank[b.sourceKind];
  });
  const result = [];
  const exactKeys = new Set();

  for (const marker of ranked) {
    const exactKey = `${marker.sourceKind}|${slug(marker.sourceType || marker.label)}|${marker.x.toFixed(2)}|${marker.y.toFixed(2)}`;
    if (exactKeys.has(exactKey)) continue;
    exactKeys.add(exactKey);

    const matchIndex = result.findIndex((candidate) => canMergeMarkers(candidate, marker));
    if (matchIndex >= 0) {
      result[matchIndex] = mergeMarkerData(result[matchIndex], marker);
    } else {
      result.push(marker);
    }
  }
  return result;
}

async function initialize() {
  try {
    const [catalogGroups, loadedLoot, loadedDecodedLoot] = await Promise.all([
      Promise.all(CONTINENT.catalogs.map(([url, format, sourceKind]) => loadCatalog(url, format, sourceKind))),
      loadLootCatalog(),
      loadDecodedLootCatalog(),
    ]);
    lootCatalog = loadedLoot;
    decodedLootCatalog = loadedDecodedLoot;
    localMarkers = localMarkers.map(enrichMarker);
    const importedMarkers = catalogGroups.flat();
    catalogMarkers = dedupeMarkers(importedMarkers.map(enrichMarker));
    renderTownLabels();
    populateControls();
    applyFilters();
    elements.loadingState.hidden = true;
    const removed = importedMarkers.length - catalogMarkers.length;
    showToast(`Loaded ${catalogMarkers.length.toLocaleString()} ${CONTINENT.name} locations. Removed ${removed.toLocaleString()} confirmed duplicates.`);
    if (STANDALONE_MODE) {
      accountAvailable = true;
      elements.syncBadge.hidden = true;
      elements.contributionsBtn.hidden = true;
      elements.editNodesBtn.hidden = true;
      elements.importBtn.hidden = true;
      document.getElementById("editorButton")?.setAttribute("hidden", "");
      applyEditorState(editorSession);
    } else {
      initializeFirebaseSync();
      await loadRestrictedMarkers();
      window.setInterval(loadRestrictedMarkers, 15000);
    }
  } catch (error) {
    console.error(error);
    elements.loadingState.innerHTML =
      `<strong>Could not load the local catalogs</strong><small>${escapeHtml(error.message)}</small>`;
  }
}

function getResourceDefinitions(markers) {
  const definitions = new Map();
  for (const marker of markers) {
    if (!TYPE_FILTER_CATEGORIES.has(marker.category) || !marker.sourceType) continue;
    const key = resourceFilterKey(marker.category, marker.sourceType);
    const existing = definitions.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    definitions.set(key, {
      key,
      category: marker.category,
      label: titleCase(marker.sourceType),
      count: 1,
      color: CATEGORY_COLORS[marker.category],
      icon: marker.icon || iconForCategory(marker.category),
    });
  }
  return [...definitions.values()];
}

function rememberLayerSectionState(details, key, defaultOpen) {
  details.dataset.layerSectionKey = key;
  details.open = layerSectionOpenState.has(key)
    ? layerSectionOpenState.get(key)
    : defaultOpen;
  details.addEventListener("toggle", () => layerSectionOpenState.set(key, details.open));
  return details;
}

function captureLayerSectionState() {
  for (const details of elements.layerBrowser.querySelectorAll("details[data-layer-section-key]")) {
    layerSectionOpenState.set(details.dataset.layerSectionKey, details.open);
  }
}

function typeSubgroup(category, count, definitions, { label = categoryLabel(category), icon = iconForCategory(category), open = false } = {}) {
  const subgroup = document.createElement("details");
  subgroup.className = "resource-subgroup";
  rememberLayerSectionState(subgroup, `category:${category}`, open);
  const body = document.createElement("div");
  body.className = "resource-subgroup-body";
  const matching = definitions
    .filter((definition) => definition.category === category)
    .sort((a, b) => a.label.localeCompare(b.label));

  const summary = createGroupSummary(icon, label, count);
  summary.classList.add("has-master-toggle");
  const masterToggle = document.createElement("input");
  masterToggle.type = "checkbox";
  masterToggle.className = "category-master-toggle";
  masterToggle.setAttribute("aria-label", `Show or hide all ${label}`);
  const visibleTypeCount = hiddenCategories.has(category)
    ? 0
    : matching.filter((definition) => !hiddenResources.has(definition.key)).length;
  masterToggle.checked = visibleTypeCount === matching.length;
  masterToggle.indeterminate = visibleTypeCount > 0 && visibleTypeCount < matching.length;
  masterToggle.title = masterToggle.checked ? `Hide all ${label}` : `Show all ${label}`;
  masterToggle.addEventListener("click", (event) => event.stopPropagation());
  masterToggle.addEventListener("change", () => {
    if (masterToggle.checked) {
      hiddenCategories.delete(category);
      for (const definition of matching) hiddenResources.delete(definition.key);
    } else {
      hiddenCategories.add(category);
    }
    persistFilterState();
    renderLayerBrowser(allMarkers());
    updateLayerToggleLabel();
    applyFilters();
  });
  summary.insertBefore(masterToggle, summary.querySelector(".layer-chevron"));
  subgroup.append(summary);

  for (const definition of matching) {
    body.append(createLayerRow({
      ...definition,
      checked: !hiddenCategories.has(category) && !hiddenResources.has(definition.key),
      featured: category === "argus-sponge",
      onChange: (visible) => {
        if (visible) {
          if (hiddenCategories.has(category)) {
            for (const sibling of matching) hiddenResources.add(sibling.key);
          }
          hiddenCategories.delete(category);
          hiddenResources.delete(definition.key);
        } else {
          hiddenResources.add(definition.key);
        }
        saveStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY, hiddenCategories);
        saveStoredSet(HIDDEN_RESOURCES_STORAGE_KEY, hiddenResources);
        persistFilterState();
        updateLayerToggleLabel();
        applyFilters();
      },
    }));
  }
  subgroup.append(body);
  return subgroup;
}

function createLayerRow({ key, label, count, color, icon, checked, onChange, featured = false }) {
  const row = document.createElement("label");
  row.className = `layer-row${featured ? " is-featured" : ""}`;
  row.style.setProperty("--category-color", color || "#8cb4ed");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;
  checkbox.dataset.layerKey = key;
  checkbox.setAttribute("aria-label", `${checked ? "Hide" : "Show"} ${label}`);
  const updateToggleHint = () => {
    const action = checkbox.checked ? "Hide" : "Show";
    checkbox.setAttribute("aria-label", `${action} ${label}`);
    row.title = `${action} ${label}`;
  };
  checkbox.addEventListener("change", () => {
    updateToggleHint();
    onChange(checkbox.checked);
  });
  updateToggleHint();

  const iconBox = document.createElement("span");
  iconBox.className = "layer-row-icon";
  iconBox.innerHTML = iconArtworkHtml(icon);

  const name = document.createElement("span");
  name.className = "layer-row-name";
  name.textContent = label;

  const amount = document.createElement("span");
  amount.className = "layer-row-count";
  amount.textContent = Number(count || 0).toLocaleString();

  row.append(checkbox, iconBox, name, amount);
  return row;
}

function createGroupSummary(icon, label, count) {
  const summary = document.createElement("summary");
  summary.title = `Expand or collapse ${label}`;
  summary.innerHTML = `
    ${iconArtworkHtml(icon)}
    <strong>${escapeHtml(label)}</strong>
    <small>${Number(count || 0).toLocaleString()}</small>
    <i class="layer-chevron" data-lucide="chevron-down"></i>`;
  return summary;
}

function categoryToggleRow(category, count) {
  return createLayerRow({
    key: category,
    label: categoryLabel(category),
    count,
    color: CATEGORY_COLORS[category],
    icon: iconForCategory(category),
    checked: !hiddenCategories.has(category),
    featured: category === "position",
    onChange: (visible) => {
      if (visible) hiddenCategories.delete(category);
      else hiddenCategories.add(category);
      saveStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY, hiddenCategories);
      persistFilterState();
      updateLayerToggleLabel();
      applyFilters();
    },
  });
}

function renderLayerBrowser(markers) {
  captureLayerSectionState();
  const counts = new Map();
  for (const marker of markers) counts.set(marker.category, (counts.get(marker.category) || 0) + 1);
  const resources = getResourceDefinitions(markers);
  const fragment = document.createDocumentFragment();

  for (const group of CATEGORY_GROUPS) {
    const categories = group.categories.filter((category) => counts.has(category));
    if (!categories.length) continue;
    const details = document.createElement("details");
    details.className = "layer-group";
    rememberLayerSectionState(details, `group:${group.key}`, true);
    details.append(createGroupSummary(
      group.icon,
      group.label,
      categories.reduce((sum, category) => sum + counts.get(category), 0),
    ));
    const body = document.createElement("div");
    body.className = "layer-group-body";
    for (const category of categories) {
      const typeCount = resources.filter((resource) => resource.category === category).length;
      body.append(typeCount > 1
        ? typeSubgroup(category, counts.get(category), resources, {
            open: CONTINENT_KEY === "myrland" && ["creature", "bug", "humanoid", "mount"].includes(category),
          })
        : categoryToggleRow(category, counts.get(category)));
    }
    details.append(body);
    fragment.append(details);
  }

  const gatheringDetails = document.createElement("details");
  gatheringDetails.className = "layer-group";
  rememberLayerSectionState(gatheringDetails, "group:gathering", true);
  const gatheringCount = RESOURCE_GROUPS.reduce((sum, group) => sum + (counts.get(group.category) || 0), 0);
  gatheringDetails.append(createGroupSummary("herb", "Gathering & loot", gatheringCount));
  const gatheringBody = document.createElement("div");
  gatheringBody.className = "layer-group-body";

  for (const group of RESOURCE_GROUPS) {
    if (!counts.has(group.category)) continue;
    if (!GATHERING_CATEGORIES.has(group.category)) {
      gatheringBody.append(categoryToggleRow(group.category, counts.get(group.category)));
      continue;
    }

    gatheringBody.append(typeSubgroup(group.category, counts.get(group.category), resources, {
      label: group.label,
      icon: group.icon,
      open: group.category === "argus-sponge",
    }));
  }
  gatheringDetails.append(gatheringBody);
  fragment.append(gatheringDetails);

  elements.layerBrowser.replaceChildren(fragment);
  lucide.createIcons();
}

function renderQuickAdd() {
  const fragment = document.createDocumentFragment();
  for (const preset of QUICK_ADD_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-add-button";
    button.disabled = !isEditor();
    button.dataset.presetKey = preset.key;
    button.title = `Add ${preset.label}`;
    button.style.setProperty("--preset-color", CATEGORY_COLORS[preset.category] || CATEGORY_COLORS.local);
    button.innerHTML = `
      ${iconArtworkHtml(preset.icon)}
      <span class="quick-add-label">${escapeHtml(preset.label)}</span>`;
    button.addEventListener("click", () => setPlacementPreset(
      placementPreset?.key === preset.key ? null : preset,
    ));
    fragment.append(button);
  }
  elements.quickAddGrid.replaceChildren(fragment);
}

function fillSelect(select, options, defaultLabel = "") {
  const current = select.value;
  select.replaceChildren();
  if (defaultLabel) select.add(new Option(defaultLabel, ""));
  for (const [value, label] of options) select.add(new Option(label, value));
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderMarkerIconPicker() {
  const selected = elements.markerIcon.value || iconForCategory(elements.markerCategory.value);
  const query = clean(elements.markerKindSearch?.value).toLowerCase();
  const fragment = document.createDocumentFragment();
  for (const [key, label] of ICON_OPTIONS) {
    const preset = markerPresetForIcon(key, label);
    const searchText = `${label} ${preset.category} ${preset.sourceType}`.toLowerCase();
    if (query && !searchText.includes(query) && key !== selected) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marker-icon-option";
    button.dataset.iconKey = key;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(key === selected));
    button.classList.toggle("is-selected", key === selected);
    button.disabled = elements.markerIcon.disabled;
    button.title = label;
    button.innerHTML = `
      ${iconArtworkHtml(key)}
      <span>${escapeHtml(label)}</span>
      <small>${escapeHtml(categoryLabel(preset.category))}</small>`;
    button.addEventListener("click", () => {
      const previousIcon = elements.markerIcon.value;
      elements.markerIcon.value = key;
      elements.markerCategory.value = preset.category;
      elements.markerType.value = preset.sourceType;
      if (!elements.markerLabel.value.trim()) elements.markerLabel.value = label;
      if (previousIcon !== key && !editingId) {
        const defaults = markerVisualDefaults(key);
        elements.markerScale.value = String(defaults.markerScale);
        elements.markerOpacity.value = String(defaults.markerOpacity);
        updateMarkerAppearanceReadout();
      }
      renderMarkerIconPicker();
    });
    fragment.append(button);
  }
  elements.markerIconPicker.replaceChildren(fragment);
}

function populateControls() {
  const markers = allMarkers();
  const categories = [...new Set([...Object.keys(CATEGORY_COLORS), ...markers.map((marker) => marker.category)])]
    .filter((category) => category !== "local")
    .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  fillSelect(elements.markerCategory, categories.map((category) => [category, categoryLabel(category)]));
  fillSelect(elements.markerIcon, ICON_OPTIONS);
  renderMarkerIconPicker();
  renderQuickAdd();
  renderLayerBrowser(markers);
  updateLayerToggleLabel();
}

function currentCategoryKeys(markers = allMarkers()) {
  return [...new Set(markers.map((marker) => marker.category).filter(Boolean))];
}

function updateLayerToggleLabel() {
  const keys = currentCategoryKeys();
  const allHidden = keys.length > 0 && keys.every((key) => hiddenCategories.has(key));
  elements.toggleAllLayersBtn.textContent = allHidden ? "Show all" : "Hide all";
}

function flattenSearchValue(value, output = []) {
  if (value == null) return output;
  if (Array.isArray(value)) {
    for (const entry of value) flattenSearchValue(entry, output);
  } else if (typeof value === "object") {
    for (const entry of Object.values(value)) flattenSearchValue(entry, output);
  } else {
    output.push(clean(value));
  }
  return output;
}

function markerSearchText(marker) {
  return flattenSearchValue({
    label: marker.label,
    aliases: marker.aliases,
    sourceType: marker.sourceType,
    category: categoryLabel(marker.category),
    notes: marker.notes,
    contributor: marker.sourceAuthor,
    drops: marker.drops,
    loot: marker.lootProfile,
    decodedLoot: marker.decodedLootProfile,
    taming: marker.taming,
    town: marker.town,
  }).join(" ").toLowerCase();
}

function applyFilters() {
  const query = clean(elements.searchInput.value).toLowerCase();
  const availableMarkers = allMarkers().sort((a, b) => a.label.localeCompare(b.label));
  filteredMarkers = availableMarkers
    .filter((marker) => {
      if (hiddenCategories.has(marker.category)) return false;
      if (
        TYPE_FILTER_CATEGORIES.has(marker.category) &&
        marker.sourceType &&
        hiddenResources.has(resourceFilterKey(marker.category, marker.sourceType))
      ) return false;
      return true;
    });

  searchMatchedMarkerIds = query
    ? new Set(
        availableMarkers
          .filter((marker) => markerSearchText(marker).includes(query))
          .map((marker) => marker.id),
      )
    : new Set();

  if (query) {
    const matchingMarkers = availableMarkers.filter((marker) => searchMatchedMarkerIds.has(marker.id));
    if (elements.searchIsolateToggle.checked) {
      filteredMarkers = matchingMarkers;
    } else {
      const visibleIds = new Set(filteredMarkers.map((marker) => marker.id));
      filteredMarkers = [
        ...filteredMarkers,
        ...matchingMarkers.filter((marker) => !visibleIds.has(marker.id)),
      ].sort((a, b) => a.label.localeCompare(b.label));
    }
  }

  updateCounters();
  updateEditControls();
  scheduleMapRender();
}

function updateCounters() {
  const markers = allMarkers();
  elements.totalCount.textContent = markers.length.toLocaleString();
  elements.visibleCount.textContent = filteredMarkers.length.toLocaleString();
  elements.clientCount.textContent = markers.filter((marker) => marker.sourceKind === "client").length.toLocaleString();
  elements.communityCount.textContent = markers.filter((marker) => marker.sourceKind === "community").length.toLocaleString();
}

let renderFrame = 0;
let markerRenderGeneration = 0;
const staticMarkerSignatureCache = new WeakMap();
function markersForCurrentView() {
  const bounds = map.getBounds().pad(.12);
  const visible = filteredMarkers.filter((marker) => bounds.contains([marker.y, marker.x]));
  return { visible, rendered: visible };
}

function markerRenderSignature(marker) {
  let staticSignature = staticMarkerSignatureCache.get(marker);
  if (!staticSignature) {
    const image = sanitizeMarkerImage(marker.image);
    const imageKey = image
      ? `${image.name}:${image.size}:${image.dataUrl.length}:${image.dataUrl.slice(-24)}`
      : "";
    staticSignature = JSON.stringify({
      x: marker.x,
      y: marker.y,
      label: marker.label,
      category: marker.category,
      icon: marker.icon,
      sourceType: marker.sourceType,
      sourceKind: marker.sourceKind,
      nodeCount: marker.nodeCount,
      pinCount: marker.pinCount,
      drops: marker.drops,
      lootProfile: marker.lootProfile,
      decodedLootKey: marker.decodedLootProfile?.key || "",
      notes: marker.notes,
      sourceAuthor: marker.sourceAuthor,
      sourceMarkerId: marker.sourceMarkerId,
      image: imageKey,
      markerScale: marker.markerScale,
      markerOpacity: marker.markerOpacity,
      positionMarker: marker.positionMarker,
      expiresAt: marker.expiresAt,
      locallyMoved: marker.locallyMoved,
    });
    staticMarkerSignatureCache.set(marker, staticSignature);
  }
  const feedback = markerFeedback.get(marker.id);
  return `${staticSignature}|labels:${elements.labelsToggle.checked}|match:${searchMatchedMarkerIds.has(marker.id)}|edit:${editMode}|confirmed:${feedback?.confirmed || 0}|incorrect:${feedback?.incorrect || 0}|vote:${feedback?.myVote || ""}`;
}
function scheduleMapRender() {
  cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(renderMap);
}

function renderMap() {
  const generation = ++markerRenderGeneration;
  const zoom = map.getZoom();
  const overviewScale = CONTINENT.key === "myrland"
    ? Math.min(1, Math.max(0.20, 0.20 + ((zoom - CONTINENT.minZoom) * 0.20)))
    : 1;
  map.getContainer().style.setProperty("--overview-marker-scale", overviewScale.toFixed(2));
  const { visible, rendered } = markersForCurrentView();
  const wanted = new Map(rendered.map((marker) => [marker.id, marker]));

  for (const [id, entry] of renderedLayerById) {
    const marker = wanted.get(id);
    if (marker && entry.signature === markerRenderSignature(marker)) continue;
    markerLayer.removeLayer(entry.layer);
    renderedLayerById.delete(id);
  }

  const missing = rendered.filter((marker) => !renderedLayerById.has(marker.id));
  addMarkerLayersBatched(missing, generation);

  const query = clean(elements.searchInput.value);
  const matchReadout = query
    ? `${searchMatchedMarkerIds.size.toLocaleString()} ${searchMatchedMarkerIds.size === 1 ? "match" : "matches"} pulsing | `
    : "";
  elements.viewReadout.textContent =
    `${matchReadout}${visible.length.toLocaleString()} shown | zoom ${map.getZoom().toFixed(2)}`;
}

function addMarkerLayersBatched(markers, generation) {
  if (!markers.length) return;
  let index = 0;
  const batchSize = markers.length > 500 ? 90 : markers.length > 220 ? 140 : markers.length;
  const addBatch = () => {
    if (generation !== markerRenderGeneration) return;
    const stop = Math.min(markers.length, index + batchSize);
    for (; index < stop; index += 1) {
      const marker = markers[index];
      if (renderedLayerById.has(marker.id)) continue;
      renderedLayerById.set(marker.id, {
        layer: addMarkerLayer(marker),
        signature: markerRenderSignature(marker),
      });
    }
    if (index < markers.length) requestAnimationFrame(addBatch);
  };
  addBatch();
}

function addMarkerLayer(marker) {
  const labelsHidden = elements.labelsToggle.checked || marker.positionMarker ? "" : "is-hidden";
  const positionClass = marker.positionMarker ? " is-position" : "";
  const playerHouseClass = marker.icon === "player-house" ? " is-player-house" : "";
  const searchMatchClass = searchMatchedMarkerIds.has(marker.id) ? " is-search-match" : "";
  const feedback = markerFeedback.get(marker.id);
  const feedbackHover = feedback && (feedback.confirmed || feedback.incorrect)
    ? `<small class="marker-feedback-hover"><span class="is-confirmed">${feedback.confirmed || 0} confirmed</span><span class="is-incorrect">${feedback.incorrect || 0} incorrect</span></small>`
    : "";
  const icon = L.divIcon({
    className: "intel-marker",
    html: `
      <span class="marker-shell${positionClass}${playerHouseClass}${searchMatchClass}" style="--marker-color:${markerColor(marker)};--marker-scale:${marker.markerScale};--marker-opacity:${marker.markerOpacity}">
        <span class="marker-pin">${iconArtworkHtml(marker.icon)}</span>
        <span class="marker-label ${labelsHidden}">${escapeHtml(marker.label)}${feedbackHover}</span>
      </span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
  const layer = L.marker([marker.y, marker.x], {
    icon,
    keyboard: false,
    riseOnHover: true,
    draggable: editMode && !marker.accessControlled,
    autoPan: true,
  }).bindPopup(() => popupHtml(marker), { maxWidth: 380 });
  if (marker.legacyImageUrl) {
    layer.bindTooltip(() => legacyHoverHtml(marker), {
      direction: "top",
      offset: [0, -20],
      opacity: 1,
      className: "legacy-poi-tooltip-shell",
    });
  }
  layer.on("click", (event) => {
    if (!routeDrawMode) return;
    if (event.originalEvent) {
      L.DomEvent.preventDefault(event.originalEvent);
      L.DomEvent.stopPropagation(event.originalEvent);
    }
    layer.closePopup();
    addRoutePoint(event.latlng);
  });
  layer.on("popupopen", (event) => wirePopup(event.popup.getElement(), marker));
  layer.on("contextmenu", (event) => {
    if (event.originalEvent) {
      L.DomEvent.preventDefault(event.originalEvent);
      L.DomEvent.stopPropagation(event.originalEvent);
    }
    layer.closePopup();
    showMarkerContextMenu(marker, event.originalEvent);
  });
  layer.on("dragstart", () => {
    hideMarkerContextMenu();
    layer.closePopup();
  });
  layer.on("dragend", (event) => moveMarker(marker, event.target.getLatLng()));
  layer.addTo(markerLayer);
  layer.__intelId = marker.id;
  return layer;
}

function formatQuantity(value) {
  return Number(value) > 0 ? Number(value).toLocaleString() : "";
}

function formatDecodedChance(value) {
  const percent = Number(value) * 100;
  if (!Number.isFinite(percent)) return "Unknown chance";
  if (Math.abs(percent - 100) < 0.0000001) return "Guaranteed";
  const digits = percent >= 10 ? 1 : percent >= 1 ? 2 : 4;
  return `${percent.toFixed(digits).replace(/\.?0+$/, "")}%`;
}

function formatDecodedQuantity(item) {
  const min = Number(item?.min);
  const max = Number(item?.max);
  if (!Number.isFinite(min)) return "";
  return min === max
    ? min.toLocaleString()
    : `${min.toLocaleString()}-${max.toLocaleString()}`;
}

function decodedLootHtml(decoded) {
  if (!decoded?.profiles?.length) return "";
  const profiles = decoded.profiles.map((profile, profileIndex) => {
    const definitions = Array.isArray(profile.internalNames) ? profile.internalNames : [];
    const definitionText = definitions.length > 2
      ? `${definitions.slice(0, 2).join(" · ")} · +${definitions.length - 2} equivalent definitions`
      : definitions.join(" · ");
    const items = (profile.items || []).map((item) => `
      <li>
        <span>${escapeHtml(item.name)}</span>
        <strong>${escapeHtml(formatDecodedChance(item.chance))}${formatDecodedQuantity(item) ? ` · ${escapeHtml(formatDecodedQuantity(item))}` : ""}</strong>
      </li>`).join("");
    return `
      <details class="decoded-loot-profile"${profileIndex === 0 ? " open" : ""}>
        <summary><span>${escapeHtml(profile.label)}</span><strong>${(profile.items || []).length} recorded rolls</strong></summary>
        ${definitionText ? `<p>${escapeHtml(definitionText)}</p>` : ""}
        <ul class="loot-list decoded-loot-list">${items}</ul>
      </details>`;
  }).join("");
  return `
    <div class="decoded-loot">
      <div class="decoded-loot-heading"><span>Decoded Content.db</span><strong>${decoded.definitionCount} definitions</strong></div>
      ${profiles}
      <a class="loot-database-link" href="/loot">Open full Loot Database</a>
    </div>`;
}

function lootHtml(marker) {
  const profile = marker.lootProfile;
  const decoded = marker.decodedLootProfile;
  const manualDrops = parseDrops(marker.drops);
  if (!profile && !decoded && !manualDrops.length) {
    if (!["creature", "bug", "mount", "humanoid"].includes(marker.category)) return "";
    return `
      <section class="loot-panel loot-panel-empty">
        <h4>Drops & butchery</h4>
        <p>No verified drop table is available for this exact enemy type yet.</p>
      </section>`;
  }

  const rows = [];
  for (const entry of profile?.yields || []) {
    rows.push(`<li><span>${escapeHtml(entry.material)}</span><strong>${escapeHtml(formatQuantity(entry.qty))}</strong></li>`);
  }
  for (const entry of profile?.trophies || []) {
    rows.push(`<li><span>${escapeHtml(entry.name)}</span><strong>${escapeHtml(entry.value || "Trophy")}</strong></li>`);
  }
  for (const item of manualDrops) {
    if (!rows.some((row) => row.toLowerCase().includes(escapeHtml(item).toLowerCase()))) {
      rows.push(`<li><span>${escapeHtml(item)}</span><strong>Drop</strong></li>`);
    }
  }

  const lore = [profile?.loreRoot, profile?.lore].filter(Boolean).join(" · ");
  const carcassBasis = profile?.carcassBasis
    ? `<p class="loot-basis">Butchery yield per <strong>${profile.carcassBasis.toLocaleString()}</strong> carcass</p>`
    : "";
  const petPointRows = profile?.petPoints
    ? [
        ["Species", profile.petPoints.subSpecies],
        ["Tracked levels", profile.petPoints.trackedLevels],
        ["First known PP", profile.petPoints.firstKnownCost],
        ["Last known PP", profile.petPoints.lastKnownCost],
      ].filter(([, value]) => value)
    : [];
  const petPointHtml = petPointRows.length
    ? `<div class="creature-intel-block"><h5>Pet point progression</h5><dl class="creature-stat-grid">${petPointRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></div>`
    : "";
  const combatHtml = (profile?.combatProfiles || []).map((entry) => {
    const stats = [
      ["Level", entry.level],
      ["Health", entry.hp],
      ["Pet points", entry.ppCost],
      ["Attack", entry.attackRange],
      ["Average hit", entry.averageAttack],
      ["Attacks/min", entry.attacksPerMinute],
      ["Damage/min", entry.damagePerMinute],
    ].filter(([, value]) => value);
    return `<details class="creature-combat-profile"><summary>${escapeHtml(entry.label)}<span>${escapeHtml(entry.profileType)}</span></summary><dl class="creature-stat-grid">${stats.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></details>`;
  }).join("");
  return `
    <section class="loot-panel">
      <h4>Creature drops & butchery</h4>
      ${carcassBasis}
      ${rows.length ? `<ul class="loot-list">${rows.join("")}</ul>` : ""}
      ${lore ? `<p class="loot-lore">Lore: ${escapeHtml(lore)}</p>` : ""}
      ${petPointHtml}
      ${combatHtml}
      ${decodedLootHtml(decoded)}
    </section>`;
}

function markerImageHtml(marker) {
  const image = sanitizeMarkerImage(marker.image);
  if (!image) return "";
  return `
    <figure class="popup-picture">
      <button type="button" data-open-marker-image="${escapeHtml(marker.id)}" aria-label="Enlarge picture for ${escapeHtml(marker.label)}">
        <img src="${image.dataUrl}" alt="${escapeHtml(marker.label)} POI" />
      </button>
      <figcaption>${escapeHtml(image.name || "POI picture")} · click to enlarge</figcaption>
    </figure>`;
}

function legacyImageHtml(marker) {
  if (!marker.legacyImageUrl) return "";
  const alt = marker.legacyImageAlt || marker.label;
  return `
    <figure class="popup-picture legacy-popup-picture">
      <img src="${escapeHtml(marker.legacyImageUrl)}" alt="${escapeHtml(alt)}" loading="lazy" />
      <figcaption>Archived Myrland field image</figcaption>
    </figure>`;
}

function legacyHoverHtml(marker) {
  const detail = marker.notes
    ? `<p>${escapeHtml(marker.notes)}</p>`
    : marker.sourceType
      ? `<p>${escapeHtml(marker.sourceType)}</p>`
      : "";
  return `
    <article class="legacy-poi-hover">
      <img src="${escapeHtml(marker.legacyImageUrl)}" alt="${escapeHtml(marker.legacyImageAlt || marker.label)}" loading="lazy" />
      <div><strong>${escapeHtml(marker.label)}</strong>${detail}</div>
    </article>`;
}

function popupHtml(marker) {
  const feedback = markerFeedback.get(marker.id) || { confirmed: 0, incorrect: 0, myVote: "" };
  const sourceDetail =
    marker.accessControlled
      ? `${marker.visibility === "private" ? "Private marker" : marker.visibility === "friends" ? "Friends-only marker" : marker.visibility === "guild" ? `${marker.guild?.name || "Guild"}-only marker` : "Public marker"}${marker.ownerName ? ` by ${marker.ownerName}` : ""}`
      : marker.sourceKind === "client"
      ? "Added by Nexus"
      : marker.sourceKind === "community"
        ? "Community-reported location"
        : marker.positionMarker
          ? "Temporary shared position"
          : "Shared Firebase marker";
  const movedBadge = marker.locallyMoved ? `<span>Moved by community</span>` : "";
  const contributorBadge = marker.sourceAuthor
    ? `<span>Reported by ${escapeHtml(marker.sourceAuthor)}</span>`
    : "";
  const canDirectEdit = STANDALONE_MODE
    ? marker.sourceKind === "local" && !marker.accessControlled
    : marker.accessControlled ? (marker.canEdit || editorSession.isEditor) : isEditor();
  const editActions = marker.accessControlled && canDirectEdit
    ? `<div class="popup-actions"><button type="button" data-edit-marker="${escapeHtml(marker.id)}">Edit details</button></div>`
    : !STANDALONE_MODE && !canDirectEdit && accountAvailable
    ? `<div class="popup-actions">
         <button type="button" class="contribute-button" data-suggest-marker="${escapeHtml(marker.id)}"><i data-lucide="pencil-line"></i> Suggest correction</button>
         <button type="button" class="contribute-button" data-suggest-move="${escapeHtml(marker.id)}"><i data-lucide="move"></i> Suggest move</button>
         <button type="button" class="report-button" data-report-marker="${escapeHtml(marker.id)}"><i data-lucide="flag"></i> Report wrong</button>
       </div>`
    : !canDirectEdit
    ? ""
    : marker.sourceKind === "local"
    ? `<div class="popup-actions">
        <button type="button" data-edit-marker="${escapeHtml(marker.id)}">Edit details</button>
        <button type="button" class="danger-button" data-remove-marker="${escapeHtml(marker.id)}">Delete node</button>
      </div>`
    : editMode
      ? `<p class="popup-edit-hint">Drag this marker to move it for everyone using the app.</p>
         <div class="popup-actions">
           <button type="button" data-edit-marker="${escapeHtml(marker.id)}">Edit details</button>
           ${marker.locallyMoved ? `<button type="button" data-reset-position="${escapeHtml(marker.id)}">Reset position</button>` : ""}
           <button type="button" class="danger-button" data-remove-marker="${escapeHtml(marker.id)}">Remove node</button>
         </div>`
      : `<div class="popup-actions">
           <button type="button" data-edit-marker="${escapeHtml(marker.id)}">Edit details</button>
           <button type="button" data-enable-edit="${escapeHtml(marker.id)}">Move / remove</button>
         </div>`;
  const expiresIn = marker.expiresAt > Date.now()
    ? `<span>Expires in ${Math.max(1, Math.ceil((marker.expiresAt - Date.now()) / 60000))} min</span>`
    : "";
  const reportedMembers = [...new Set((marker.reportedMembers || [])
    .map(clean)
    .filter((value) => value && value !== marker.label))];
  const reportedMembersHtml = reportedMembers.length
    ? `<p class="popup-notes"><strong>Reported here:</strong> ${reportedMembers.map(escapeHtml).join(" · ")}</p>`
    : "";
  return `
    <article class="popup-card">
      <header class="popup-head" style="--marker-color:${markerColor(marker)}">
        <span class="popup-icon">${iconArtworkHtml(marker.icon)}</span>
        <div><h3>${escapeHtml(marker.label)}</h3><span>${escapeHtml(categoryLabel(marker.category))}</span></div>
      </header>
      <div class="popup-body">
        <div class="popup-badges">
          <span>${escapeHtml(sourceDetail)}</span>
          ${marker.category === "service" ? `<span class="popup-verified">Typed gameplay actor</span>` : ""}
          ${movedBadge}
          ${contributorBadge}
          ${marker.communityCorrected ? `<span class="popup-verified">Community correction approved</span>` : ""}
          ${expiresIn}
          ${marker.sourceType ? `<span>${escapeHtml(marker.sourceType)}</span>` : ""}
          ${marker.nodeCount ? `<span>${marker.nodeCount.toLocaleString()} nodes</span>` : ""}
          ${marker.pinCount ? `<span>${marker.pinCount.toLocaleString()} pins</span>` : ""}
          ${marker.icon === "player-house" ? `<span>${marker.markerScale.toFixed(2)}x size</span><span>${Math.round(marker.markerOpacity * 100)}% opacity</span>` : ""}
        </div>
        ${marker.notes ? `<p class="popup-notes">${escapeHtml(marker.notes)}</p>` : ""}
        ${reportedMembersHtml}
        ${legacyImageHtml(marker)}
        ${markerImageHtml(marker)}
        ${lootHtml(marker)}
        <div class="marker-feedback-panel">
          <div><strong>Is this POI accurate?</strong><small>Community checks are visible to everyone.</small></div>
          <div class="marker-feedback-actions">
            <button type="button" class="feedback-confirm${feedback.myVote === "confirmed" ? " is-selected" : ""}" data-marker-feedback="confirmed"><i data-lucide="badge-check"></i> Confirm <span>${feedback.confirmed || 0}</span></button>
            <button type="button" class="feedback-incorrect${feedback.myVote === "incorrect" ? " is-selected" : ""}" data-marker-feedback="incorrect"><i data-lucide="circle-alert"></i> Incorrect <span>${feedback.incorrect || 0}</span></button>
          </div>
        </div>
        <div class="popup-meta">Map ${marker.x.toFixed(1)}, ${marker.y.toFixed(1)}${
          Number.isFinite(Number(marker.worldX))
            ? ` · ${marker.locallyMoved ? "Original world" : "World"} ${Number(marker.worldX).toFixed(1)}, ${Number(marker.worldY).toFixed(1)}, ${Number(marker.worldZ).toFixed(1)}`
            : ""
        }</div>
        ${editActions}
      </div>
    </article>`;
}

function wirePopup(container, marker) {
  container?.querySelector("[data-open-marker-image]")?.addEventListener("click", () => {
    const image = sanitizeMarkerImage(marker.image);
    if (image) openMarkerImageViewer(marker, image);
  });
  container?.querySelector("[data-edit-marker]")?.addEventListener("click", () => openMarkerDialog(marker));
  container?.querySelector("[data-suggest-marker]")?.addEventListener("click", () => openMarkerDialog(marker, null, null, "update"));
  container?.querySelector("[data-suggest-move]")?.addEventListener("click", () => beginSuggestedMove(marker));
  container?.querySelector("[data-report-marker]")?.addEventListener("click", () => openMarkerDialog(marker, null, null, "remove"));
  container?.querySelector("[data-enable-edit]")?.addEventListener("click", () => {
    map.closePopup();
    setEditMode(true);
    showToast("Edit mode enabled. Drag a node to move it, or open it again to remove it.", 4600);
  });
  container?.querySelector("[data-remove-marker]")?.addEventListener("click", () => removeMarker(marker));
  container?.querySelector("[data-reset-position]")?.addEventListener("click", () => resetMarkerPosition(marker));
  container?.querySelectorAll("[data-marker-feedback]").forEach((button) => button.addEventListener("click", () => submitMarkerFeedback(marker, button.dataset.markerFeedback)));
  window.lucide?.createIcons?.();
}

function createMarkerContextMenu() {
  const menu = document.createElement("div");
  menu.className = "marker-context-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <div class="marker-context-heading">
      <span>Selected marker</span>
      <strong data-context-marker-name></strong>
    </div>
    <button type="button" data-context-duplicate role="menuitem">
      <i data-lucide="copy-plus"></i>
      <span><strong>Duplicate marker</strong><small>Create a shared copy nearby</small></span>
    </button>`;
  document.body.appendChild(menu);
  menu.querySelector("[data-context-duplicate]").addEventListener("click", () => {
    const marker = menu.__marker;
    hideMarkerContextMenu();
    if (marker) duplicateMarker(marker);
  });
  return menu;
}

function hideMarkerContextMenu() {
  markerContextMenu.hidden = true;
  markerContextMenu.__marker = null;
}

function showMarkerContextMenu(marker, originalEvent) {
  if (!requireEditorAccess()) return;
  markerContextMenu.__marker = marker;
  markerContextMenu.querySelector("[data-context-marker-name]").textContent = marker.label;
  markerContextMenu.hidden = false;
  markerContextMenu.style.left = "0px";
  markerContextMenu.style.top = "0px";
  lucide.createIcons();
  const menuRect = markerContextMenu.getBoundingClientRect();
  const margin = 10;
  const requestedX = Number(originalEvent?.clientX) || window.innerWidth / 2;
  const requestedY = Number(originalEvent?.clientY) || window.innerHeight / 2;
  markerContextMenu.style.left = `${Math.max(margin, Math.min(requestedX, window.innerWidth - menuRect.width - margin))}px`;
  markerContextMenu.style.top = `${Math.max(margin, Math.min(requestedY, window.innerHeight - menuRect.height - margin))}px`;
}

function duplicatePosition(marker) {
  const zoom = map.getZoom();
  const origin = map.project([marker.y, marker.x], zoom);
  for (const offset of [L.point(28, 28), L.point(-28, 28), L.point(28, -28), L.point(-28, -28)]) {
    const candidate = map.unproject(origin.add(offset), zoom);
    if (MAP_BOUNDS.contains(candidate)) return { x: candidate.lng, y: candidate.lat };
  }
  return {
    x: Math.max(0, Math.min(MAP_WIDTH, marker.x + 20)),
    y: Math.max(0, Math.min(MAP_HEIGHT, marker.y + 20)),
  };
}

function duplicateMarker(marker) {
  if (!requireEditorAccess()) return;
  const position = duplicatePosition(marker);
  const now = new Date().toISOString();
  const duplicate = normalizeMarker({
    id: `local-${crypto.randomUUID()}`,
    label: marker.label,
    category: marker.category,
    sourceType: marker.sourceType,
    icon: marker.icon,
    x: position.x,
    y: position.y,
    nodeCount: marker.nodeCount,
    pinCount: marker.pinCount,
    drops: marker.drops,
    notes: marker.notes,
    image: marker.image,
    markerScale: marker.markerScale,
    markerOpacity: marker.markerOpacity,
    manualIcon: true,
    createdAtIso: now,
    updatedAtIso: now,
  }, "local");
  if (!duplicate) return;
  localMarkers.push(enrichMarker(duplicate));
  saveLocalMarkers();
  sendCloudWrite(() => firebaseSync.saveSharedMarker(duplicate, {
    action: "shared-marker-duplicated",
  }));
  populateControls();
  setEditMode(true);
  applyFilters();
  map.setView([duplicate.y, duplicate.x], Math.max(2, map.getZoom()), { animate: true });
  showSharedResult(
    `${marker.label} duplicated for everyone. The new marker is ready to drag.`,
    `${marker.label} duplicated in the offline cache and will sync after Firebase connects.`,
  );
}

function moveMarker(marker, latlng) {
  if (!requireEditorAccess()) {
    scheduleMapRender();
    return;
  }
  const x = Math.max(0, Math.min(MAP_WIDTH, Number(latlng.lng)));
  const y = Math.max(0, Math.min(MAP_HEIGHT, Number(latlng.lat)));
  if (marker.sourceKind === "local") {
    let updatedMarker = null;
    localMarkers = localMarkers.map((candidate) => {
      if (candidate.id !== marker.id) return candidate;
      updatedMarker = { ...candidate, x, y, updatedAtIso: new Date().toISOString() };
      return updatedMarker;
    });
    saveLocalMarkers();
    if (updatedMarker) sendCloudWrite(() => firebaseSync.saveSharedMarker(updatedMarker, {
      action: "shared-marker-moved",
    }));
  } else {
    delete mapEdits.hidden[marker.id];
    mapEdits.positions[marker.id] = { x, y };
    saveMapEdits();
    sendCloudWrite(() => firebaseSync.saveCatalogEdit(marker.id, { x, y }, {
      action: "catalog-marker-moved",
      targetLabel: marker.label,
    }));
  }
  applyFilters();
  showSharedResult(
    `${marker.label} moved to ${x.toFixed(1)}, ${y.toFixed(1)} for everyone.`,
    `${marker.label} moved in the offline cache and will sync after Firebase connects.`,
  );
}

function removeMarker(marker) {
  if (!requireEditorAccess()) return;
  const action = marker.sourceKind === "local" ? "delete for everyone" : "remove for everyone";
  if (!window.confirm(`Are you sure you want to ${action} "${marker.label}"?`)) return;
  if (marker.sourceKind === "local") {
    localMarkers = localMarkers.filter((candidate) => candidate.id !== marker.id);
    saveLocalMarkers();
    sendCloudWrite(() => firebaseSync.deleteSharedMarker(marker.id, {
      action: "shared-marker-deleted",
      targetLabel: marker.label,
    }));
  } else {
    mapEdits.hidden[marker.id] = true;
    delete mapEdits.positions[marker.id];
    saveMapEdits();
    sendCloudWrite(() => firebaseSync.saveCatalogEdit(marker.id, { hidden: true }, {
      action: "catalog-marker-removed",
      targetLabel: marker.label,
    }));
  }
  map.closePopup();
  populateControls();
  applyFilters();
  showSharedResult(
    `${marker.label} removed from the shared map.`,
    `${marker.label} was removed from the offline cache and will sync after Firebase connects.`,
  );
}

function resetMarkerPosition(marker) {
  if (!requireEditorAccess()) return;
  if (marker.sourceKind === "local" || !hasOwn(mapEdits.positions, marker.id)) return;
  delete mapEdits.positions[marker.id];
  saveMapEdits();
  sendCloudWrite(() => firebaseSync.resetCatalogEdit(marker.id, {
    action: "catalog-marker-restored",
    targetLabel: marker.label,
  }));
  map.closePopup();
  applyFilters();
  showSharedResult(
    `${marker.label} restored to its original position for everyone.`,
    `${marker.label} was restored in the offline cache and will sync after Firebase connects.`,
  );
}

function focusMarker(marker) {
  const openMarker = () => {
    renderMap();
    renderedLayerById.get(marker.id)?.layer.openPopup();
  };
  map.once("moveend", openMarker);
  map.setView([marker.y, marker.x], Math.max(2, map.getZoom()), { animate: true });
  window.setTimeout(openMarker, 320);
}

function setEditMode(enabled) {
  if (enabled && !requireEditorAccess()) return;
  if (enabled && routeDrawMode) setRouteDrawMode(false);
  editMode = enabled;
  if (enabled) setPlacementPreset(null);
  updateEditControls();
  scheduleMapRender();
}

function updateEditControls() {
  elements.editNodesBtn.classList.toggle("is-active", editMode);
  elements.editNodesBtn.innerHTML = editMode
    ? `<i data-lucide="move"></i> Editing nodes`
    : `<i data-lucide="mouse-pointer-2"></i> Edit nodes`;
  document.getElementById("map").classList.toggle("node-edit-mode", editMode);
  lucide.createIcons();
}

function setPlacementPreset(preset) {
  if (preset && !STANDALONE_MODE && !(isEditor() || accountAvailable)) return showToast("Sign in to add a map marker.", 4500);
  if (preset && routeDrawMode) setRouteDrawMode(false);
  if (preset && editMode) setEditMode(false);
  placementPreset = preset;
  proposalMoveTarget = null;
  document.getElementById("map").style.cursor = preset ? "crosshair" : "";
  elements.cancelPlacementBtn.hidden = !preset;
  elements.positionBtn.classList.toggle("is-active", preset?.key === "position");
  elements.addMarkerBtn.classList.toggle("is-active", preset?.key === "custom");
  elements.addMarkerBtn.innerHTML = preset?.key === "custom"
    ? `<i data-lucide="crosshair"></i> Click map to place`
    : `<i data-lucide="map-pin-plus"></i> Custom marker`;
  for (const button of elements.quickAddGrid.querySelectorAll("[data-preset-key]")) {
    button.classList.toggle("is-active", button.dataset.presetKey === preset?.key);
  }
  if (preset) showToast(`${preset.label}: click the map to place it.`, 1800);
  lucide.createIcons();
}

async function setPendingMarkerImage(file, fallbackName = "POI picture") {
  if (!file?.type?.startsWith("image/")) {
    showToast("Choose a PNG, JPEG, or WebP picture.", 4500);
    return;
  }
  if (file.size > MARKER_IMAGE_MAX_SOURCE_BYTES) {
    showToast("That picture is larger than the 15 MB upload limit.", 5000);
    return;
  }

  markerImageBusy = true;
  renderMarkerImageEditor();
  try {
    pendingMarkerImage = await compressMarkerImage(file, fallbackName);
    showToast("POI picture ready. Save the marker to publish it.", 3600);
  } catch (error) {
    console.error(error);
    showToast(error?.message || "That picture could not be prepared.", 5000);
  } finally {
    markerImageBusy = false;
    renderMarkerImageEditor();
  }
}

async function compressMarkerImage(file, fallbackName) {
  const source = await decodeImageFile(file);
  try {
    let width = source.width;
    let height = source.height;
    const initialScale = Math.min(1, MARKER_IMAGE_MAX_DIMENSION / Math.max(width, height));
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    const qualities = [0.84, 0.76, 0.68, 0.58, 0.48, 0.4];
    let output = null;
    for (const quality of qualities) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source.image, 0, 0, width, height);
      output = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (output && output.size <= MARKER_IMAGE_MAX_STORED_BYTES) break;
      width = Math.max(1, Math.round(width * 0.84));
      height = Math.max(1, Math.round(height * 0.84));
    }

    if (!output || output.size > MARKER_IMAGE_MAX_STORED_BYTES) {
      throw new Error("The picture could not be reduced below the 700 KB marker limit.");
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("The prepared picture could not be read."));
      reader.readAsDataURL(output);
    });
    return {
      dataUrl,
      name: clean(file.name || fallbackName).slice(0, 80) || fallbackName,
      type: output.type || "image/webp",
      width,
      height,
      size: output.size,
    };
  } finally {
    source.close?.();
  }
}

async function decodeImageFile(file) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The selected picture could not be decoded."));
      element.src = url;
    });
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function renderMarkerImageEditor() {
  const image = sanitizeMarkerImage(pendingMarkerImage);
  const hasImage = Boolean(image);
  elements.markerImagePreview.hidden = !hasImage;
  elements.markerImageEmpty.hidden = hasImage;
  elements.removeMarkerImageBtn.hidden = !hasImage;
  elements.markerImageDropzone.disabled = markerImageBusy;
  elements.uploadMarkerImageBtn.disabled = markerImageBusy;
  elements.removeMarkerImageBtn.disabled = markerImageBusy;
  if (hasImage) elements.markerImagePreview.src = image.dataUrl;
  else elements.markerImagePreview.removeAttribute("src");
  elements.markerImageStatus.textContent = markerImageBusy
    ? "Preparing picture..."
    : hasImage
      ? `${image.width} × ${image.height} · ${formatFileSize(image.size)}`
      : "Paste or upload";
}

function openMarkerImageViewer(marker, image) {
  elements.markerImageViewerImage.src = image.dataUrl;
  elements.markerImageViewerImage.alt = `${marker.label} enlarged POI picture`;
  elements.markerImageViewerCaption.textContent = image.name
    ? `${marker.label} · ${image.name}`
    : marker.label;
  elements.markerImageViewer.showModal();
}

function closeMarkerImageViewer() {
  if (elements.markerImageViewer.open) elements.markerImageViewer.close();
}

function openMarkerDialog(marker = null, latlng = null, preset = null, proposalAction = "") {
  const proposing = ["update", "remove"].includes(proposalAction);
  if (marker?.accessControlled && !(marker.canEdit || editorSession.isEditor) && !proposing) return showToast("You do not have permission to edit this marker.", 4200);
  if (marker && !marker.accessControlled && !proposing && !STANDALONE_MODE && !requireEditorAccess()) return;
  if (!marker && !accountAvailable && !requireEditorAccess()) return;
  if (proposing && !accountAvailable) return showToast("Sign in to Mortal Nexus before submitting a map correction.", 5000);
  dialogPreset = preset;
  markerProposalAction = proposalAction;
  proposalMoveTarget = null;
  editingId = marker?.id || null;
  editingMarkerSnapshot = marker;
  dialogOriginalPosition = marker ? { x: marker.x, y: marker.y } : null;
  const isPosition = Boolean(marker?.positionMarker || preset?.positionMarker);
  elements.dialogTitle.textContent = proposalAction === "remove"
    ? "Report an incorrect marker"
    : proposalAction === "update"
      ? "Suggest a correction"
      : marker ? "Edit marker" : isPosition ? "Share my position" : `Add ${preset?.label || "marker"}`;
  elements.markerDialogEyebrow.textContent = proposing ? "Community contribution" : "Map marker";
  elements.markerLabel.value = marker?.label || "";
  elements.markerVisibility.value = STANDALONE_MODE ? "private" : proposing ? "public" : marker?.visibility || (marker && !marker.accessControlled ? "public" : "private");
  elements.markerVisibility.disabled = STANDALONE_MODE || proposing || Boolean(marker && !marker.accessControlled);
  const publicOption = elements.markerVisibility.querySelector('option[value="public"]');
  publicOption.disabled = !accountAvailable && !editorSession.isEditor;
  publicOption.textContent = editorSession.isEditor ? "Everyone" : "Everyone (editor review required)";
  const guildOption = elements.markerVisibility.querySelector('option[value="guild"]');
  guildOption.disabled = !communityGuild;
  guildOption.textContent = communityGuild ? `My guild (${communityGuild.name})` : "My guild (join one first)";
  elements.markerCategory.value = marker?.category || preset?.category || "landmark";
  elements.markerIcon.value = marker?.icon || preset?.icon || iconForCategory(elements.markerCategory.value);
  elements.markerType.value = marker?.sourceType || preset?.sourceType || "";
  elements.markerPinCount.value = marker?.pinCount || "";
  elements.markerX.value = (latlng?.lng ?? marker?.x ?? MAP_WIDTH / 2).toFixed(1);
  elements.markerY.value = (latlng?.lat ?? marker?.y ?? MAP_HEIGHT / 2).toFixed(1);
  elements.markerDrops.value = parseDrops(marker?.drops).join("\n");
  elements.markerNotes.value = marker?.notes || "";
  const appearance = markerVisualDefaults(marker?.icon || preset?.icon);
  elements.markerScale.value = String(marker?.markerScale ?? preset?.markerScale ?? appearance.markerScale);
  elements.markerOpacity.value = String(marker?.markerOpacity ?? preset?.markerOpacity ?? appearance.markerOpacity);
  updateMarkerAppearanceReadout();
  elements.markerKindSearch.value = "";
  pendingMarkerImage = sanitizeMarkerImage(marker?.image);
  markerImageBusy = false;
  elements.deleteLocalBtn.hidden = !marker || proposing;
  elements.positionExpiryNote.hidden = !isPosition;
  const reportOnly = proposalAction === "remove";
  elements.markerCategory.disabled = isPosition || reportOnly;
  elements.markerIcon.disabled = isPosition || reportOnly;
  elements.markerType.disabled = isPosition || reportOnly;
  elements.markerPinCount.disabled = isPosition || reportOnly;
  elements.markerDrops.disabled = isPosition || reportOnly;
  elements.markerLabel.disabled = reportOnly;
  elements.markerX.disabled = reportOnly;
  elements.markerY.disabled = reportOnly;
  elements.markerNotes.disabled = reportOnly;
  elements.markerScale.disabled = reportOnly;
  elements.markerOpacity.disabled = reportOnly;
  elements.markerContributionReason.hidden = !proposing;
  elements.markerProposalReason.required = proposing;
  elements.markerProposalReason.value = "";
  elements.saveMarkerBtn.innerHTML = proposing
    ? `<i data-lucide="send"></i> ${proposalAction === "remove" ? "Submit report" : "Submit for review"}`
    : `<i data-lucide="save"></i> Save marker`;
  renderMarkerIconPicker();
  renderMarkerImageEditor();
  elements.markerDialog.showModal();
  (reportOnly ? elements.markerProposalReason : elements.markerLabel).focus();
  lucide.createIcons();
}

function closeMarkerDialog() {
  elements.markerDialog.close();
  editingId = null;
  dialogPreset = null;
  markerProposalAction = "";
  pendingMarkerImage = null;
  markerImageBusy = false;
  editingMarkerSnapshot = null;
  dialogOriginalPosition = null;
  elements.markerVisibility.disabled = false;
  elements.markerLabel.disabled = false;
  elements.markerX.disabled = false;
  elements.markerY.disabled = false;
  elements.markerNotes.disabled = false;
  elements.markerScale.disabled = false;
  elements.markerOpacity.disabled = false;
  elements.markerContributionReason.hidden = true;
  elements.markerProposalReason.required = false;
  for (const control of [
    elements.markerCategory,
    elements.markerIcon,
    elements.markerType,
    elements.markerPinCount,
    elements.markerDrops,
  ]) control.disabled = false;
  renderMarkerIconPicker();
}

async function saveMarker(event) {
  event.preventDefault();
  const visibility = elements.markerVisibility.value;
  if (!STANDALONE_MODE && visibility === "public" && !isEditor() && !accountAvailable) return showToast("Sign in to submit a public marker.", 5000);
  if (!STANDALONE_MODE && visibility !== "public" && !accountAvailable) return showToast("Sign in to Mortal Nexus to save a personal marker.", 5000);
  if (!STANDALONE_MODE && visibility === "guild" && !communityGuild) return showToast("Create or join a guild from Friends first.", 5000);
  if (markerImageBusy) {
    showToast("Wait for the POI picture to finish processing.", 3600);
    return;
  }
  const existing = editingMarkerSnapshot || localMarkers.find((candidate) => candidate.id === editingId);
  const isPosition = Boolean(existing?.positionMarker || dialogPreset?.positionMarker);
  const now = new Date();
  const selectedX = Number(elements.markerX.value);
  const selectedY = Number(elements.markerY.value);
  const details = {
    label: elements.markerLabel.value,
    category: isPosition ? "position" : elements.markerCategory.value,
    sourceType: isPosition ? "Shared position" : elements.markerType.value,
    icon: isPosition ? "my-location" : elements.markerIcon.value,
    manualIcon: true,
    pinCount: isPosition ? 0 : Number(elements.markerPinCount.value),
    drops: isPosition ? [] : parseDrops(elements.markerDrops.value),
    notes: elements.markerNotes.value,
    image: isPosition ? null : pendingMarkerImage,
    markerScale: isPosition ? 1 : Number(elements.markerScale.value),
    markerOpacity: isPosition ? 1 : Number(elements.markerOpacity.value),
    visibility,
  };

  if (STANDALONE_MODE) {
    const marker = normalizeMarker({
      id: existing?.sourceKind === "local" ? existing.id : editingId || `local-${crypto.randomUUID()}`,
      ...details,
      visibility: "private",
      x: selectedX,
      y: selectedY,
      positionMarker: isPosition,
      expiresAt: isPosition
        ? (existing?.expiresAt > Date.now() ? existing.expiresAt : Date.now() + POSITION_LIFETIME_MS)
        : 0,
      createdAtIso: existing?.createdAtIso || now.toISOString(),
      updatedAtIso: now.toISOString(),
    }, "local");
    if (!marker) return;
    const enriched = enrichMarker(marker);
    localMarkers = localMarkers.filter((candidate) => candidate.id !== marker.id);
    localMarkers.push(enriched);
    saveLocalMarkers();
    populateControls();
    closeMarkerDialog();
    applyFilters();
    focusMarker(enriched);
    showToast(isPosition ? "Position saved on this PC for 10 minutes." : "Marker saved on this PC.");
    return;
  }

  const proposalAction = markerProposalAction || (visibility === "public" && !isEditor() ? "create" : "");
  if (proposalAction) {
    const reason = elements.markerProposalReason.value.trim();
    if (reason.length < 4) return showToast("Briefly explain what you found or what is wrong.", 4500);
    const proposedMarker = normalizeMarker({
      ...existing,
      ...details,
      id: existing?.id || "",
      x: selectedX,
      y: selectedY,
      createdAtIso: existing?.createdAtIso || now.toISOString(),
      updatedAtIso: now.toISOString(),
    }, existing?.sourceKind || "local");
    try {
      const response = await fetch("/api/nexus-community/community/marker-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          map: MAP_VARIANT_KEY,
          action: proposalAction,
          targetId: existing?.id || "",
          targetSource: existing?.accessControlled ? "account" : existing?.sourceKind === "local" ? "firebase" : proposalAction === "create" ? "new" : "catalog",
          original: existing || null,
          proposed: proposalAction === "remove" ? null : proposedMarker,
          reason,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Contribution could not be submitted.");
      closeMarkerDialog();
      await loadContributionQueue(false);
      showToast("Contribution submitted. An editor will review it before the public map changes.", 6000);
    } catch (error) {
      showToast(error.message, 6000);
    }
    return;
  }

  if (visibility !== "public" || existing?.accessControlled) {
    const marker = normalizeMarker({
      id: existing?.accessControlled ? existing.id : undefined,
      ...details,
      x: selectedX,
      y: selectedY,
      createdAtIso: existing?.createdAtIso || now.toISOString(),
      updatedAtIso: now.toISOString(),
    }, "local");
    if (!marker) return;
    try {
      const response = await fetch("/api/nexus-community/community/markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: existing?.accessControlled ? existing.id : "",
          map: MAP_VARIANT_KEY,
          visibility,
          marker,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || "Marker could not be saved.");
      closeMarkerDialog();
      await loadRestrictedMarkers();
      const saved = restrictedMarkers.find((candidate) => candidate.id === payload.marker.id);
      if (saved) focusMarker(saved);
      showToast(`Marker saved for ${visibility === "private" ? "you only" : visibility === "friends" ? "your friends" : visibility === "guild" ? communityGuild?.name || "your guild" : "everyone"}.`);
    } catch (error) {
      showToast(error.message, 6000);
    }
    return;
  }

  if (existing && existing.sourceKind !== "local") {
    const override = normalizeMapEdits({ overrides: { [existing.id]: details } }).overrides[existing.id];
    if (!override) return;
    mapEdits.overrides[existing.id] = override;
    delete mapEdits.hidden[existing.id];
    const moved = !dialogOriginalPosition ||
      Math.abs(selectedX - dialogOriginalPosition.x) > 0.01 ||
      Math.abs(selectedY - dialogOriginalPosition.y) > 0.01;
    if (moved) {
      mapEdits.positions[existing.id] = {
        x: Math.max(0, Math.min(MAP_WIDTH, selectedX)),
        y: Math.max(0, Math.min(MAP_HEIGHT, selectedY)),
      };
    }
    saveMapEdits();
    sendCloudWrite(() => firebaseSync.saveCatalogEdit(existing.id, {
      hasDetails: true,
      hidden: false,
      ...override,
      ...(moved ? mapEdits.positions[existing.id] : {}),
    }, {
      action: "catalog-marker-details-updated",
      targetLabel: override.label,
    }));
    closeMarkerDialog();
    populateControls();
    applyFilters();
    const updated = allMarkers().find((candidate) => candidate.id === existing.id);
    if (updated) focusMarker(updated);
    showSharedResult(
      "POI details saved for everyone.",
      "POI details were cached and will sync when Firebase reconnects.",
    );
    return;
  }

  const marker = normalizeMarker({
    id: editingId || `local-${crypto.randomUUID()}`,
    ...details,
    x: selectedX,
    y: selectedY,
    positionMarker: isPosition,
    expiresAt: isPosition
      ? (existing?.expiresAt > Date.now() ? existing.expiresAt : Date.now() + POSITION_LIFETIME_MS)
      : 0,
    createdAtIso: existing?.createdAtIso || now.toISOString(),
    updatedAtIso: now.toISOString(),
  }, "local");
  if (!marker) return;
  const enriched = enrichMarker(marker);
  localMarkers = localMarkers.filter((candidate) => candidate.id !== marker.id);
  localMarkers.push(enriched);
  saveLocalMarkers();
  sendCloudWrite(() => firebaseSync.saveSharedMarker(marker, {
    action: existing ? "shared-marker-updated" : "shared-marker-created",
  }));
  populateControls();
  closeMarkerDialog();
  applyFilters();
  focusMarker(enriched);
  showSharedResult(
    isPosition ? "Your position is visible to everyone for 10 minutes." : "Shared marker saved for everyone.",
    isPosition ? "Your position is cached and will sync when Firebase reconnects." : "Marker saved in the offline cache and will sync after Firebase connects.",
  );
}

async function deleteEditingMarker() {
  if (!editingId) return;
  const existing = editingMarkerSnapshot || restrictedMarkers.find((marker) => marker.id === editingId) || localMarkers.find((marker) => marker.id === editingId);
  if (existing?.accessControlled) {
    if (!(existing.canEdit || editorSession.isEditor)) return showToast("You do not have permission to delete this marker.");
    try {
      const response = await fetch(`/api/nexus-community/community/markers/${encodeURIComponent(existing.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Marker could not be deleted.");
      closeMarkerDialog();
      await loadRestrictedMarkers();
      showToast("Marker deleted.");
    } catch (error) {
      showToast(error.message, 5000);
    }
    return;
  }
  if (STANDALONE_MODE && existing?.sourceKind === "local") {
    localMarkers = localMarkers.filter((marker) => marker.id !== editingId);
    closeMarkerDialog();
    saveLocalMarkers();
    populateControls();
    applyFilters();
    showToast("Marker deleted from this PC.");
    return;
  }
  if (!requireEditorAccess()) return;
  if (existing?.sourceKind !== "local") {
    closeMarkerDialog();
    removeMarker(existing);
    return;
  }
  const markerId = editingId;
  localMarkers = localMarkers.filter((marker) => marker.id !== markerId);
  saveLocalMarkers();
  sendCloudWrite(() => firebaseSync.deleteSharedMarker(markerId, {
    action: "shared-marker-deleted",
    targetLabel: existing?.label,
  }));
  closeMarkerDialog();
  populateControls();
  applyFilters();
  showSharedResult(
    "Shared marker deleted for everyone.",
    "Marker deleted from the offline cache and will sync after Firebase connects.",
  );
}

function toggleAllCategories() {
  const keys = currentCategoryKeys();
  const shouldShow = keys.length > 0 && keys.every((key) => hiddenCategories.has(key));
  if (shouldShow) hiddenResources.clear();
  for (const key of keys) {
    if (shouldShow) hiddenCategories.delete(key);
    else hiddenCategories.add(key);
  }
  saveStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY, hiddenCategories);
  saveStoredSet(HIDDEN_RESOURCES_STORAGE_KEY, hiddenResources);
  persistFilterState();
  renderLayerBrowser(allMarkers());
  updateLayerToggleLabel();
  applyFilters();
}

function clearFilters() {
  elements.searchInput.value = "";
  hiddenCategories.clear();
  hiddenResources.clear();
  saveStoredSet(HIDDEN_CATEGORIES_STORAGE_KEY, hiddenCategories);
  saveStoredSet(HIDDEN_RESOURCES_STORAGE_KEY, hiddenResources);
  persistFilterState();
  renderLayerBrowser(allMarkers());
  updateLayerToggleLabel();
  applyFilters();
}

function updateNameButton() {
  elements.labelsMapBtn.innerHTML = elements.labelsToggle.checked
    ? `<i data-lucide="tags"></i> Hide names`
    : `<i data-lucide="tags"></i> Show names`;
  lucide.createIcons();
}

function exportBackup() {
  const payload = {
    format: "mortal-nexus-desktop-shared-backup",
    version: 3,
    exportedAt: new Date().toISOString(),
    markers: localMarkers,
    mapEdits,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mortal-nexus-shared-map-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Backed up ${localMarkers.length.toLocaleString()} shared markers and ${catalogEditCount().toLocaleString()} catalog edits.`);
}

async function importBackup(file) {
  if (!requireEditorAccess()) return;
  const payload = JSON.parse(await file.text());
  if (
    !["mortal-nexus-desktop-shared-backup", "mortal-nexus-desktop-local-backup"].includes(payload?.format) ||
    !Array.isArray(payload.markers)
  ) throw new Error("That file is not a Mortal Nexus map backup.");
  const imported = payload.markers.map((marker) => normalizeMarker(marker, "local")).filter(Boolean);
  const importedEdits = normalizeMapEdits(payload.mapEdits || {});
  const editCount = new Set([
    ...Object.keys(importedEdits.hidden),
    ...Object.keys(importedEdits.positions),
    ...Object.keys(importedEdits.overrides),
  ]).size;
  if (!window.confirm(`Replace the shared map with ${imported.length} markers and ${editCount} catalog edits from this backup?`)) return;
  localMarkers = dedupeMarkers(imported).map(enrichMarker);
  mapEdits = importedEdits;
  saveLocalMarkers();
  saveMapEdits();
  sendCloudWrite(() => firebaseSync.replaceSharedData(localMarkers, mapEdits));
  populateControls();
  applyFilters();
  showSharedResult(
    `Restored ${localMarkers.length.toLocaleString()} shared markers and ${editCount.toLocaleString()} catalog edits.`,
    "Backup restored in the offline cache and will sync after Firebase connects.",
  );
}

function setSyncStatus(state, message = "") {
  const settings = {
    connecting: ["cloud", "Connecting..."],
    live: ["cloud", "Live sync"],
    offline: ["cloud-off", "Offline cache"],
    error: ["triangle-alert", "Sync error"],
  };
  const [icon, label] = settings[state] || settings.error;
  elements.syncBadge.dataset.state = state;
  elements.syncBadge.title = message || label;
  elements.syncBadge.innerHTML = `<i data-lucide="${icon}"></i> ${label}`;
  lucide.createIcons();
}

function cloudMapEdits(records) {
  const result = normalizeMapEdits({});
  for (const record of Object.values(records || {})) {
    const id = clean(record?.id);
    if (!id) continue;
    if (record.hidden) result.hidden[id] = true;
    const x = Number(record.x);
    const y = Number(record.y);
    if (!record.hidden && Number.isFinite(x) && Number.isFinite(y)) {
      result.positions[id] = {
        x: Math.max(0, Math.min(MAP_WIDTH, x)),
        y: Math.max(0, Math.min(MAP_HEIGHT, y)),
      };
    }
    if (record.hasDetails) {
      const override = normalizeMapEdits({ overrides: { [id]: record } }).overrides[id];
      if (override) result.overrides[id] = override;
    }
  }
  return result;
}

function cloudSharedMarkers(records) {
  return Object.values(records || {})
    .filter((record) => record && !record.deleted)
    .map((record) => normalizeMarker(record, "local"))
    .filter(Boolean)
    .map(enrichMarker);
}

function refreshSharedData() {
  populateControls();
  applyFilters();
}

function executeCloudWrite(operation) {
  Promise.resolve()
    .then(operation)
    .catch((error) => {
      console.error(error);
      setSyncStatus("error", error.message);
      showToast(`Firebase sync failed: ${error.message}`, 6000);
    });
}

function sendCloudWrite(operation) {
  if (!firebaseSync?.isEditor()) {
    requireEditorAccess();
    return false;
  }
  if (!firebaseSync?.isReady()) {
    pendingCloudWrites.push(operation);
    return false;
  }
  executeCloudWrite(operation);
  return true;
}

function flushPendingCloudWrites() {
  while (pendingCloudWrites.length && firebaseSync?.isReady()) executeCloudWrite(pendingCloudWrites.shift());
}

function showSharedResult(sharedMessage, cachedMessage) {
  showToast(firebaseSync?.isReady() ? sharedMessage : cachedMessage, firebaseSync?.isReady() ? 2800 : 5000);
}

function isEditor() {
  return Boolean(editorSession.isEditor && firebaseSync?.isEditor());
}

function requireEditorAccess() {
  if (isEditor()) return true;
  showToast("Sign in with an editor account to change the shared map.", 5200);
  window.dispatchEvent(new CustomEvent("mortal-nexus:open-editor"));
  return false;
}

function applyEditorState(nextState) {
  editorSession = {
    isEditor: Boolean(nextState?.isEditor),
    username: clean(nextState?.username),
    email: clean(nextState?.email),
  };
  if (!editorSession.isEditor && editMode) setEditMode(false);
  elements.addMarkerBtn.disabled = !(STANDALONE_MODE || editorSession.isEditor || accountAvailable);
  elements.contributionsBtn.disabled = STANDALONE_MODE || !accountAvailable;
  elements.editNodesBtn.disabled = !editorSession.isEditor;
  elements.positionBtn.disabled = !(STANDALONE_MODE || editorSession.isEditor);
  elements.importBtn.disabled = !editorSession.isEditor;
  for (const button of elements.quickAddGrid.querySelectorAll("button")) {
    button.disabled = !(STANDALONE_MODE || editorSession.isEditor || accountAvailable);
  }
  window.dispatchEvent(new CustomEvent("mortal-nexus:editor-state", { detail: editorSession }));
  scheduleMapRender();
}

async function connectFirebaseSync(attempt = 0) {
  window.clearTimeout(firebaseRetryTimer);
  firebaseRetryTimer = 0;
  try {
    await firebaseSync.start();
    flushPendingCloudWrites();
  } catch (error) {
    console.error(error);
    const delay = Math.min(30000, 1500 * (2 ** Math.min(attempt, 5)));
    if (attempt === 0) {
      const reason = clean(error?.message);
      showToast(
        reason
          ? `Myrland live sync could not connect: ${reason} Retrying automatically.`
          : "Myrland live sync could not connect. Retrying automatically.",
        7500,
      );
    }
    firebaseRetryTimer = window.setTimeout(() => connectFirebaseSync(attempt + 1), delay);
  }
}

function initializeFirebaseSync() {
  firebaseSync = createFirebaseSync({
    rootPath: CONTINENT.firebaseRoot,
    onStatus: setSyncStatus,
    onCatalogEdits: (records) => {
      mapEdits = cloudMapEdits(records);
      saveMapEdits();
      refreshSharedData();
    },
    onSharedMarkers: (records) => {
      localMarkers = cloudSharedMarkers(records);
      saveLocalMarkers();
      refreshSharedData();
    },
    onEditorState: applyEditorState,
    onHistory: (records) => {
      window.dispatchEvent(new CustomEvent("mortal-nexus:history", { detail: records }));
    },
  });
  window.mortalNexusEditor = {
    login: (username, password) => firebaseSync.login(username, password),
    logout: () => firebaseSync.logout(),
    undo: (entry) => firebaseSync.undoHistory(entry),
    saveHouseHunter: (house) => firebaseSync.saveHouseHunter(house),
    removeHouseHunter: (id) => firebaseSync.removeHouseHunter(id),
    state: () => firebaseSync.editorState(),
  };
  window.dispatchEvent(new CustomEvent("mortal-nexus:editor-api-ready"));
  connectFirebaseSync();
}

function showToast(message, duration = 2800) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, duration);
}

elements.searchInput.addEventListener("input", () => {
  applyFilters();
  persistFilterState({ debounce: true });
});
elements.searchIsolateToggle.addEventListener("change", () => {
  localStorage.setItem(SEARCH_ISOLATE_STORAGE_KEY, elements.searchIsolateToggle.checked ? "1" : "0");
  applyFilters();
});
elements.toggleAllLayersBtn.addEventListener("click", toggleAllCategories);
elements.clearFiltersBtn.addEventListener("click", clearFilters);
elements.fitBtn.addEventListener("click", () => fitContinentBounds(true));
elements.labelsToggle.addEventListener("change", () => {
  updateNameButton();
  scheduleMapRender();
  persistFilterState();
});
elements.labelsMapBtn.addEventListener("click", () => {
  elements.labelsToggle.checked = !elements.labelsToggle.checked;
  updateNameButton();
  scheduleMapRender();
  persistFilterState();
});
elements.addMarkerBtn.addEventListener("click", () => setPlacementPreset(
  placementPreset?.key === "custom"
    ? null
    : { key: "custom", label: "Custom marker", category: "landmark", sourceType: "", icon: "landmark" },
));
elements.positionBtn.addEventListener("click", () => setPlacementPreset(
  placementPreset?.key === "position"
    ? null
    : {
      key: "position",
      label: "My position",
      category: "position",
      sourceType: "Shared position",
      icon: "my-location",
      positionMarker: true,
    },
));
elements.cancelPlacementBtn.addEventListener("click", () => setPlacementPreset(null));
elements.contributionsBtn.addEventListener("click", () => loadContributionQueue(true));
elements.closeContributionsBtn.addEventListener("click", () => elements.contributionsDialog.close());
elements.doneContributionsBtn.addEventListener("click", () => elements.contributionsDialog.close());
elements.refreshContributionsBtn.addEventListener("click", () => loadContributionQueue(false));
elements.contributionsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-contribution]");
  if (button) reviewContribution(button.dataset.reviewContribution, button.dataset.decision);
});
elements.editNodesBtn.addEventListener("click", () => setEditMode(!editMode));
elements.newRouteBtn.addEventListener("click", () => openRouteDialog());
elements.routeDrawBtn.addEventListener("click", () => setRouteDrawMode(!routeDrawMode));
elements.routeUndoBtn.addEventListener("click", () => {
  const route = selectedRoute();
  if (route?.points?.length) removeRoutePoint(route.id, route.points.length - 1);
});
elements.routeReverseBtn.addEventListener("click", () => {
  const route = selectedRoute();
  if (!route || route.points.length < 2) return;
  route.points.reverse();
  route.updatedAtIso = new Date().toISOString();
  saveRoutes();
  renderRoutePlanner();
  renderRoutes();
  showToast("Route direction reversed.");
});
elements.routeShareBtn.addEventListener("click", () => {
  const route = selectedRoute();
  if (route?.points?.length >= 2) openRouteShareDialog(route);
});
elements.routeImportBtn.addEventListener("click", () => openRouteShareDialog());
elements.routesMapBtn.addEventListener("click", () => {
  routesVisible = !routesVisible;
  localStorage.setItem(ROUTES_VISIBLE_STORAGE_KEY, routesVisible ? "1" : "0");
  renderRoutePlanner();
  renderRoutes();
});
elements.routeList.addEventListener("click", (event) => {
  const visibleButton = event.target.closest("[data-route-visible]");
  if (visibleButton) {
    const route = routes.find((entry) => entry.id === visibleButton.dataset.routeVisible);
    if (!route) return;
    route.visible = !route.visible;
    route.updatedAtIso = new Date().toISOString();
    saveRoutes();
    renderRoutePlanner();
    renderRoutes();
    return;
  }
  const editButton = event.target.closest("[data-route-edit]");
  if (editButton) {
    const route = routes.find((entry) => entry.id === editButton.dataset.routeEdit);
    if (route) openRouteDialog(route);
    return;
  }
  const selectButton = event.target.closest("[data-route-select]");
  if (selectButton) selectRoute(selectButton.dataset.routeSelect);
});
elements.routeForm.addEventListener("submit", saveRouteDialog);
elements.closeRouteDialogBtn.addEventListener("click", closeRouteDialog);
elements.cancelRouteDialogBtn.addEventListener("click", closeRouteDialog);
elements.deleteRouteBtn.addEventListener("click", deleteEditingRoute);
elements.closeRouteCodeDialogBtn.addEventListener("click", closeRouteCodeDialog);
elements.copyRouteCodeBtn.addEventListener("click", copyCurrentRouteCode);
elements.importRouteCodeBtn.addEventListener("click", importRouteCode);
elements.exportBtn.addEventListener("click", exportBackup);
elements.importBtn.addEventListener("click", () => elements.importInput.click());
elements.importInput.addEventListener("change", async () => {
  try {
    if (elements.importInput.files[0]) await importBackup(elements.importInput.files[0]);
  } catch (error) {
    showToast(error.message, 5000);
  } finally {
    elements.importInput.value = "";
  }
});
elements.markerCategory.addEventListener("change", () => {
  elements.markerIcon.value = iconForCategory(elements.markerCategory.value);
  const defaults = markerVisualDefaults(elements.markerIcon.value);
  elements.markerScale.value = String(defaults.markerScale);
  elements.markerOpacity.value = String(defaults.markerOpacity);
  updateMarkerAppearanceReadout();
  renderMarkerIconPicker();
});
elements.markerIcon.addEventListener("change", renderMarkerIconPicker);
elements.markerVisibility.addEventListener("change", () => {
  if (editingMarkerSnapshot || isEditor()) return;
  const publicSubmission = elements.markerVisibility.value === "public";
  markerProposalAction = publicSubmission ? "create" : "";
  elements.markerContributionReason.hidden = !publicSubmission;
  elements.markerProposalReason.required = publicSubmission;
  elements.saveMarkerBtn.innerHTML = publicSubmission
    ? `<i data-lucide="send"></i> Submit for review`
    : `<i data-lucide="save"></i> Save marker`;
  window.lucide?.createIcons?.();
});
function updateMarkerAppearanceReadout() {
  elements.markerScaleValue.textContent = `${Number(elements.markerScale.value || 1).toFixed(2)}x`;
  elements.markerOpacityValue.textContent = `${Math.round(Number(elements.markerOpacity.value || 1) * 100)}%`;
}
elements.markerScale.addEventListener("input", updateMarkerAppearanceReadout);
elements.markerOpacity.addEventListener("input", updateMarkerAppearanceReadout);
elements.markerKindSearch.addEventListener("input", renderMarkerIconPicker);
elements.markerImageDropzone.addEventListener("click", () => {
  if (!markerImageBusy) elements.markerImageInput.click();
});
elements.uploadMarkerImageBtn.addEventListener("click", () => {
  if (!markerImageBusy) elements.markerImageInput.click();
});
elements.markerImageInput.addEventListener("change", async () => {
  const file = elements.markerImageInput.files?.[0];
  elements.markerImageInput.value = "";
  if (file) await setPendingMarkerImage(file);
});
elements.removeMarkerImageBtn.addEventListener("click", () => {
  pendingMarkerImage = null;
  renderMarkerImageEditor();
});
elements.markerImageDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.markerImageDropzone.classList.add("is-dragging");
});
elements.markerImageDropzone.addEventListener("dragleave", () => {
  elements.markerImageDropzone.classList.remove("is-dragging");
});
elements.markerImageDropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  elements.markerImageDropzone.classList.remove("is-dragging");
  const file = Array.from(event.dataTransfer?.files || []).find((entry) => entry.type.startsWith("image/"));
  if (file) await setPendingMarkerImage(file);
});
document.addEventListener("paste", async (event) => {
  if (!elements.markerDialog.open || markerImageBusy) return;
  const item = Array.from(event.clipboardData?.items || []).find((entry) => entry.type.startsWith("image/"));
  const file = item?.getAsFile();
  if (!file) return;
  event.preventDefault();
  await setPendingMarkerImage(file, "Pasted picture");
});
elements.closeMarkerImageViewerBtn.addEventListener("click", closeMarkerImageViewer);
elements.markerImageViewer.addEventListener("click", (event) => {
  if (event.target === elements.markerImageViewer) closeMarkerImageViewer();
});
elements.markerImageViewer.addEventListener("close", () => {
  elements.markerImageViewerImage.removeAttribute("src");
  elements.markerImageViewerCaption.textContent = "";
});
elements.markerForm.addEventListener("submit", saveMarker);
elements.markerForm.addEventListener("invalid", (event) => {
  const field = event.target;
  const label = field === elements.markerX
    ? `X must be between 0 and ${MAP_WIDTH}.`
    : field === elements.markerY
      ? `Y must be between 0 and ${MAP_HEIGHT}.`
      : "Give this marker a name before saving.";
  showToast(label, 5000);
}, true);
elements.deleteLocalBtn.addEventListener("click", deleteEditingMarker);
elements.closeDialogBtn.addEventListener("click", closeMarkerDialog);
elements.cancelDialogBtn.addEventListener("click", closeMarkerDialog);

map.on("click", (event) => {
  if (routeDrawMode) {
    addRoutePoint(event.latlng);
    return;
  }
  if (proposalMoveTarget) {
    const marker = proposalMoveTarget;
    proposalMoveTarget = null;
    document.getElementById("map").style.cursor = "";
    elements.cancelPlacementBtn.hidden = true;
    openMarkerDialog(marker, event.latlng, null, "update");
    return;
  }
  if (!placementPreset) return;
  const preset = placementPreset;
  setPlacementPreset(null);
  openMarkerDialog(null, event.latlng, preset);
});
map.on("moveend zoomend", scheduleMapRender);
map.on("movestart zoomstart click", hideMarkerContextMenu);
document.addEventListener("pointerdown", (event) => {
  if (!markerContextMenu.hidden && !markerContextMenu.contains(event.target)) hideMarkerContextMenu();
});
window.addEventListener("blur", hideMarkerContextMenu);
window.addEventListener("resize", hideMarkerContextMenu);
window.addEventListener("keydown", (event) => {
  if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
    event.preventDefault();
    elements.searchInput.focus();
  }
  if (event.key === "Escape" && !markerContextMenu.hidden) hideMarkerContextMenu();
  else if (event.key === "Escape" && (placementPreset || proposalMoveTarget)) setPlacementPreset(null);
  else if (event.key === "Escape" && routeDrawMode) setRouteDrawMode(false);
  else if (event.key === "Escape" && editMode) setEditMode(false);
});

window.setInterval(() => {
  if (localMarkers.some(isExpired)) {
    localMarkers = localMarkers.filter((marker) => !isExpired(marker));
    saveLocalMarkers();
    populateControls();
    applyFilters();
  }
}, 30000);

elements.searchInput.value = localStorage.getItem(SEARCH_STORAGE_KEY) || "";
elements.searchIsolateToggle.checked = localStorage.getItem(SEARCH_ISOLATE_STORAGE_KEY) === "1";
elements.labelsToggle.checked = localStorage.getItem(SHOW_NAMES_STORAGE_KEY) === "1";
updateNameButton();
renderRoutePlanner();
renderRoutes();
lucide.createIcons();
initialize();
