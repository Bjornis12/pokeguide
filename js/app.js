let currentVersion = localStorage.getItem("currentVersion") || "ruby";
let currentRegion = null;
let dexMode = "regional"; // "regional" eller "national"
const locationCache = {};
let allLocations = [];
let dexEntries = [];
let dexNumbers = {}; // name -> dex number i nåværende dex

// Cache max alder i ms (24 timer)
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

const versionToRegion = {
  red: "kanto",
  blue: "kanto",
  yellow: "kanto",
  firered: "kanto",
  leafgreen: "kanto",
  gold: "johto",
  silver: "johto",
  crystal: "johto",
  ruby: "hoenn",
  sapphire: "hoenn",
  emerald: "hoenn",
  "omega-ruby": "hoenn",
  "alpha-sapphire": "hoenn",
  diamond: "sinnoh",
  pearl: "sinnoh",
  platinum: "sinnoh",
  black: "unova",
  white: "unova",
  "black-2": "unova",
  "white-2": "unova",
  x: "kalos",
  y: "kalos",
  sun: "alola",
  moon: "alola",
  "ultra-sun": "alola",
  "ultra-moon": "alola",
  sword: "galar",
  shield: "galar",
  scarlet: "paldea",
  violet: "paldea"
};

const regionData = {
  kanto: {
    id: 1,
    name: "Kanto",
    versions: ["red","blue","yellow","firered","leafgreen"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/2"
  },
  johto: {
    id: 2,
    name: "Johto",
    versions: ["gold","silver","crystal"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/3"
  },
  hoenn: {
    id: 3,
    name: "Hoenn",
    versions: ["ruby","sapphire","emerald","omega-ruby","alpha-sapphire"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/4"
  },
  sinnoh: {
    id: 4,
    name: "Sinnoh",
    versions: ["diamond","pearl","platinum"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/5"
  },
  unova: {
    id: 5,
    name: "Unova",
    versions: ["black","white","black-2","white-2"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/8"
  },
  kalos: {
    id: 6,
    name: "Kalos",
    versions: ["x","y"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/12"
  },
  alola: {
    id: 7,
    name: "Alola",
    versions: ["sun","moon","ultra-sun","ultra-moon"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/16"
  },
  galar: {
    id: 8,
    name: "Galar",
    versions: ["sword","shield"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/27"
  },
  paldea: {
    id: 9,
    name: "Paldea",
    versions: ["scarlet","violet"],
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/37"
  }
};

// --- Cache-funksjon med tidsbegrensning ---
async function fetchWithCache(url, cacheKey) {
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_MAX_AGE) {
        return data;
      }
    } catch {
      // Hvis parsing feiler, fall gjennom og hent på nytt
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  const data = await res.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

// --- Cache Pokémon IDer i localStorage ---
async function getPokemonIdByName(name) {
  const cacheKey = `pokemonId_${name}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, id } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_MAX_AGE) {
        return id;
      }
    } catch {}
  }

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), id: data.id }));
  return data.id;
}

// --- Init app ---
async function init() {
  currentRegion = versionToRegion[currentVersion];
  renderVersionSelect();
  await loadLocations(currentRegion);
  setSavedLocationIfExists();
  updateCaughtCounter();
  await showRegionalDex();
}

// --- Render versjonsvelger (all spill) ---
function renderVersionSelect() {
  const container = document.getElementById("version-select-container");
  container.innerHTML = "";

  const select = document.createElement("select");
  select.id = "version-select";

  const allVersions = Object.keys(versionToRegion).sort();

  allVersions.forEach(ver => {
    const option = document.createElement("option");
    option.value = ver;
    option.textContent = capitalize(ver);
    select.appendChild(option);
  });

  select.value = currentVersion;
  select.onchange = async () => {
    currentVersion = select.value;
    localStorage.setItem("currentVersion", currentVersion);

    const newRegion = versionToRegion[currentVersion];
    if (newRegion !== currentRegion) {
      currentRegion = newRegion;
      await loadLocations(currentRegion);
    }
    setSavedLocationIfExists();
    updateCaughtCounter();

    const locSelect = document.getElementById("location-select");
    if (locSelect && locSelect.value) await fetchAreaData(locSelect.value);

    if (dexMode === "regional") await showRegionalDex();
    else if (dexMode === "national") await showNationalDex();
  };

  container.appendChild(select);
}

// --- Last lokasjoner for region ---
async function loadLocations(regionKey) {
  const data = await fetchWithCache(`https://pokeapi.co/api/v2/region/${regionData[regionKey].id}`, `region_${regionKey}_locations`);
  allLocations = data.locations.map(loc => ({
    name: prettifyName(loc.name),
    slug: loc.name
  }));
  renderLocationDropdown(allLocations);
}

// --- Render lokasjons-dropdown ---
function renderLocationDropdown(locations) {
  const container = document.getElementById("location-list");
  container.innerHTML = "";

  locations.sort((a, b) => {
    const aIsRoute = a.name.toLowerCase().startsWith("route");
    const bIsRoute = b.name.toLowerCase().startsWith("route");
    if (aIsRoute && !bIsRoute) return -1;
    if (!aIsRoute && bIsRoute) return 1;
    return a.name.localeCompare(b.name);
  });

  const select = document.createElement("select");
  select.id = "location-select";
  select.onchange = () => {
    const slug = select.value;
    localStorage.setItem("lastSelectedLocation", slug);
    if (slug) fetchAreaData(slug);
  };

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Velg område --";
  select.appendChild(defaultOption);

  locations.forEach(loc => {
    const option = document.createElement("option");
    option.value = loc.slug;
    option.textContent = loc.name;
    select.appendChild(option);
  });

  container.appendChild(select);

  // Knapp for regional dex
  const dexBtn = document.createElement("button");
  dexBtn.textContent = "📘 Regional Pokédex";
  dexBtn.onclick = () => showRegionalDex();
  container.appendChild(document.createElement("br"));
  container.appendChild(dexBtn);

  // Knapp for nasjonal dex
  const natDexBtn = document.createElement("button");
  natDexBtn.textContent = "📗 Nasjonal Pokédex";
  natDexBtn.onclick = () => showNationalDex();
  container.appendChild(natDexBtn);
}

// --- Sett lagret lokasjon hvis finnes ---
function setSavedLocationIfExists() {
  const lastLocation = localStorage.getItem("lastSelectedLocation");
  const locSelect = document.getElementById("location-select");
  if (locSelect) {
    if (lastLocation && allLocations.some(loc => loc.slug === lastLocation)) {
      locSelect.value = lastLocation;
      fetchAreaData(lastLocation);
    } else {
      locSelect.value = "";
      clearEncounters();
    }
  }
}

// --- Tøm encounter-visning ---
function clearEncounters() {
  const output = document.getElementById("encounters");
  output.innerHTML = "";
}

// --- Hent encounter data og vis Pokémon for valgt område ---
async function fetchAreaData(slug) {
  const output = document.getElementById("encounters");
  output.innerHTML = "Laster...";

  const locationData = await fetchWithCache(`https://pokeapi.co/api/v2/location/${slug}`, `location_${slug}`);
  if (!locationData || !locationData.areas || locationData.areas.length === 0) {
    output.innerHTML = "Ingen underområder funnet.";
    return;
  }

  const areaSlug = locationData.areas[0].name;
  const data = await fetchWithCache(`https://pokeapi.co/api/v2/location-area/${areaSlug}`, `location_area_${areaSlug}`);
  if (!data) {
    output.innerHTML = "Klarte ikke å hente encounter data.";
    return;
  }

  const versions = regionData[currentRegion].versions;
  const versionGroups = {};
  versions.forEach(v => (versionGroups[v] = {}));

  for (const entry of data.pokemon_encounters) {
    for (const version of entry.version_details) {
      const versionName = version.version.name;
      if (!versions.includes(versionName)) continue;

      for (const detail of version.encounter_details) {
        const method = detail.method.name;
        const name = entry.pokemon.name;

        if (!versionGroups[versionName][method]) versionGroups[versionName][method] = {};

        if (!versionGroups[versionName][method][name] ||
            versionGroups[versionName][method][name].chance < detail.chance) {
          versionGroups[versionName][method][name] = {
            name,
            chance: detail.chance
          };
        }
      }
    }
  }

  output.innerHTML = "";
  const orderedMethods = ["walk", "cave", "surf", "old-rod", "good-rod", "super-rod"];
  const orderedVersions = [currentVersion, ...versions.filter(v => v !== currentVersion)];

  for (const version of orderedVersions) {
    const groups = versionGroups[version];
    if (!Object.keys(groups).length) continue;

    const section = document.createElement("div");
    const label = version === currentVersion
      ? `⭐ ${capitalize(version)}`
      : version === "ruby" ? "🟥 Ruby" : version === "sapphire" ? "🟦 Sapphire" : "🟩 Emerald";
    section.innerHTML = `<h2>${label}</h2>`;

    for (const method of orderedMethods) {
      const encounters = groups[method];
      if (!encounters) continue;

      const lines = [];
      for (const name in encounters) {
        if (version !== currentVersion &&
            versionGroups[currentVersion][method] &&
            versionGroups[currentVersion][method][name]) continue;

        const line = await formatLine(name);
        if (line) lines.push(line);
      }

      if (!lines.length) continue;

      const methodLabel = methodNameToLabel(method);
      const div = document.createElement("div");
      div.innerHTML = `<h3>${methodLabel}:</h3><div class="icon-grid">${lines.join("")}</div>`;
      section.appendChild(div);
    }

    if (section.children.length > 1) {
      output.appendChild(section);
    }
  }

  if (!output.innerHTML) {
    output.innerHTML = "Ingen Pokémon funnet.";
  }
}

// --- Formater navn ---
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function prettifyName(name) {
  return name.split("-").map(capitalize).join(" ");
}

// --- Metode-labels ---
function methodNameToLabel(method) {
  const labels = {
    "walk": "Gress",
    "cave": "Hule",
    "surf": "Surfing",
    "old-rod": "Fisking (Old Rod)",
    "good-rod": "Fisking (Good Rod)",
    "super-rod": "Fisking (Super Rod)",
    "rock-smash": "Rock Smash",
    "headbutt": "Headbutt"
  };
  return labels[method] || method;
}

// --- Sjekk fanget-lista ---
function getCaughtList() {
  return JSON.parse(localStorage.getItem("caughtList") || "[]");
}
function isCaught(name) {
  return getCaughtList().includes(name);
}
function toggleCaught(name) {
  let list = getCaughtList();
  if (list.includes(name)) list = list.filter(n => n !== name);
  else list.push(name);
  localStorage.setItem("caughtList", JSON.stringify(list));
  updateCaughtCounter();
}

// --- Oppdater fanget-teller ---
function updateCaughtCounter() {
  const counter = document.getElementById("caught-counter");
  if (!counter || !dexEntries.length) return;
  const caught = getCaughtList().filter(name => dexEntries.includes(name)).length;
  const percent = Math.round((caught / dexEntries.length) * 100);
  counter.textContent = `Fanget: ${caught}/${dexEntries.length} (${percent}%)`;
}

// --- Formater linje i dex med nummer og checkbox ---
async function formatLine(name) {
  const id = await getPokemonIdByName(name.toLowerCase());
  if (!id) return "";
  const iconUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  const checked = isCaught(name) ? "checked" : "";

  let dexNum = dexNumbers[name] || 0;
  let dexNumStr = dexMode === "regional"
    ? dexNum.toString().padStart(3, "0")
    : dexNum.toString().padStart(4, "0");

  return `
    <div class="icon-entry" onclick="toggleCaught('${name}')">
      <label>
        ${capitalize(name)} - ${dexNumStr}
        <input type="checkbox" ${checked} onchange="toggleCaught('${name}'); event.stopPropagation();">
      </label><br>
      <img src="${iconUrl}" alt="${name}" title="${capitalize(name)}" width="128" height="128" onclick="showLocations('${name}'); event.stopPropagation();">
    </div>
  `;
}

// --- Vis regional dex ---
async function showRegionalDex() {
  dexMode = "regional";
  const output = document.getElementById("encounters");
  output.innerHTML = "Laster regional dex...";

  try {
    const data = await fetchWithCache(regionData[currentRegion].pokedexUrl, `pokedex_${currentRegion}`);
    dexEntries = data.pokemon_entries.map(e => e.pokemon_species.name);

    dexNumbers = {};
    data.pokemon_entries.forEach(entry => {
      dexNumbers[entry.pokemon_species.name] = entry.entry_number;
    });

    await renderDex(output, currentRegion);
  } catch {
    output.innerHTML = "Klarte ikke å hente regional dex.";
  }
}

// --- Vis nasjonal dex ---
async function showNationalDex() {
  dexMode = "national";
  const output = document.getElementById("encounters");
  output.innerHTML = "Laster nasjonal dex...";

  try {
    const data = await fetchWithCache("https://pokeapi.co/api/v2/pokedex/1", "pokedex_national");
    dexEntries = data.pokemon_entries.map(e => e.pokemon_species.name);

    dexNumbers = {};
    data.pokemon_entries.forEach(entry => {
      dexNumbers[entry.pokemon_species.name] = entry.entry_number;
    });

    await renderDex(output, "Nasjonal");
  } catch {
    output.innerHTML = "Klarte ikke å hente nasjonal dex.";
  }
}

// --- Render dex liste ---
async function renderDex(output, titleRegion) {
  output.innerHTML = `
    <h2>📘 ${dexMode === "regional" ? "Regional Pokédex – " + capitalize(titleRegion) : "Nasjonal Pokédex"}</h2>
    <input type="text" id="search" placeholder="Søk etter Pokémon..." oninput="filterDex()">
    <div id="caught-counter"></div>
    <div id="dex-list" class="icon-grid"></div>
  `;

  const dexList = document.getElementById("dex-list");
  for (const name of dexEntries) {
    const line = await formatLine(name);
    if (line) dexList.innerHTML += line;
  }

  updateCaughtCounter();
}

// --- Filtrering i dex ---
function filterDex() {
  const term = document.getElementById("search").value.toLowerCase();
  const dexList = document.getElementById("dex-list");
  dexList.querySelectorAll(".icon-entry").forEach(entry => {
    const title = entry.querySelector("img").title.toLowerCase();
    entry.style.display = title.includes(term) ? "" : "none";
  });
}

// --- Vis lokasjoner for Pokémon ---
async function showLocations(name) {
  if (locationCache[name]) return showLocationPopup(name, locationCache[name]);

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    if (!res.ok) return;
    const data = await res.json();

    const locRes = await fetch(data.location_area_encounters);
    if (!locRes.ok) return;
    const locData = await locRes.json();

    const areas = locData
      .filter(e => e.version_details.some(v => v.version.name === currentVersion))
      .map(e => e.location_area.name)
      .map(slug => slug.replace(`${currentRegion}-`, "").replace("-area", "").split("-").map(capitalize).join(" "));

    locationCache[name] = areas;
    showLocationPopup(name, areas);
  } catch {}
}

// --- Vis popup med lokasjoner ---
function showLocationPopup(name, areas) {
  const formatted = areas.length ? areas.join("\n") : "Ingen lokasjoner funnet.";
  alert(`${capitalize(name)} finnes i:\n\n${formatted}`);
}

init();
