import {
  getDexMode,
  setDexMode,
  getDexNumbers,
  setDexNumbers,
  getDexEntries,
  setDexEntries,
  getAllLocations,
  setAllLocations,
  capitalize,
  displayName,
  apiVersionName,
  regionData,
  currentVersion,
  currentRegion,
  pokemonIdCache,
  locationCache,
} from "../common.js";

import * as debug from "../debug.js";

const dpSwarmPokemonData = [
  
];

const dpRadarExclusivePokemonData = [
  
];

export async function loadLocations() {
  debug.debugLog("loadLocations kalt for Johto");
  const res = await fetch(`https://pokeapi.co/api/v2/region/${regionData.johto.id}`);
  if (!res.ok) {
    debug.debugLog("Klarte ikke hente region data");
    return;
  }
  const data = await res.json();

  setAllLocations(data.locations.map(loc => ({
    name: prettifyName(loc.name),
    slug: loc.name
  })));

  debug.debugLog("renderLocationDropdown kalt med", getAllLocations().length, "lokasjoner");
  renderLocationDropdown(getAllLocations());

  debug.debugLog("loadLocations ferdig, lokasjoner lastet:", getAllLocations().length);
}

export function renderLocationDropdown(locations) {
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

  const natDexBtn = document.createElement("button");
  natDexBtn.textContent = "📗 Nasjonal Pokédex";
  natDexBtn.onclick = () => showNationalDex();
  container.appendChild(natDexBtn);
}

export function setSavedLocationIfExists() {
  debug.debugLog("setSavedLocationIfExists kalt");
  const lastLocation = localStorage.getItem("lastSelectedLocation");
  const locSelect = document.getElementById("location-select");
  if (locSelect) {
    if (lastLocation && getAllLocations().some(loc => loc.slug === lastLocation)) {
      locSelect.value = lastLocation;
      fetchAreaData(lastLocation);
      debug.debugLog("Setter siste valgte lokasjon:", lastLocation);
    } else {
      locSelect.value = "";
      clearEncounters();
    }
  }
}

async function fetchAreaData(slug) {
  const output = document.getElementById("encounters");
  output.innerHTML = "Laster...";

  try {
    const locationRes = await fetch(`https://pokeapi.co/api/v2/location/${slug}`);
    if (!locationRes.ok) {
      output.innerHTML = "Klarte ikke å hente område data.";
      return;
    }
    const locationData = await locationRes.json();

    if (!locationData.areas || locationData.areas.length === 0) {
      output.innerHTML = "Ingen underområder funnet.";
      return;
    }

    // Finn første underområde med encounter data som ikke er tomt
    let data = null;
    for (const area of locationData.areas) {
      const res = await fetch(`https://pokeapi.co/api/v2/location-area/${area.name}`);
      if (res.ok) {
        const areaData = await res.json();
        if (areaData.pokemon_encounters && areaData.pokemon_encounters.length > 0) {
          data = areaData;
          break;
        }
      }
    }
    if (!data) {
      output.innerHTML = "Ingen encounter data funnet for området.";
      return;
    }

    const versions = getRelevantVersions();

    const versionGroups = {};
    versions.forEach(v => (versionGroups[v] = {}));

    const isBDSP = ["brilliant-diamond", "shining-pearl"].includes(apiVersionName(currentVersion));
    const fallbackDPPVersions = ["diamond", "pearl", "platinum"].map(apiVersionName);

    function isInGbaSlot2Lists(name) {
      const allGba = [].concat(
        gbaSlot2Data.ruby,
        gbaSlot2Data.sapphire,
        gbaSlot2Data.emerald,
        gbaSlot2Data.firered,
        gbaSlot2Data.leafgreen,
        gbaSlot2Data.any
      );
      return allGba.includes(name);
    }

    function hasValidDexNumber(name) {
      return (dexNumbers[name] || 0) !== 0;
    }

    const swarmSet = new Set();
    const radarSet = new Set();

    // Sjekk om valgt versjon er remake
    const regionInfo = regionData[currentRegion];
    const currentIsRemake = regionInfo?.remakes?.some(v => apiVersionName(v) === apiVersionName(currentVersion)) || false;

for (const entry of data.pokemon_encounters) {
  for (const version of entry.version_details) {
    let versionName = version.version.name;

    if (isBDSP && fallbackDPPVersions.includes(versionName)) {
      versionName = apiVersionName("diamond");
    }

    if (!versions.includes(versionName)) continue;

    for (const detail of version.encounter_details) {
      const method = detail.method.name;
      const name = entry.pokemon.name;

      if (isBDSP && !hasValidDexNumber(name) && isInGbaSlot2Lists(name)) {
        continue;
      }

      const comparingIsRemake = regionInfo?.remakes?.some(v => apiVersionName(v) === versionName) || false;

      if (
        versionName !== apiVersionName(currentVersion) &&
        currentIsRemake === comparingIsRemake &&
        versionGroups[apiVersionName(currentVersion)]?.[method]?.[name]
      ) {
        continue;
      }

          if (!versionGroups[versionName][method]) versionGroups[versionName][method] = {};

          if (!versionGroups[versionName][method][name] ||
              versionGroups[versionName][method][name].chance < detail.chance) {
            versionGroups[versionName][method][name] = {
              name,
              chance: detail.chance
            };
          }

          if (dpSwarmPokemonData.includes(name)) swarmSet.add(name);
          if (dpRadarExclusivePokemonData.includes(name)) radarSet.add(name);
        }
      }
    }

    output.innerHTML = "";
    const orderedMethods = ["walk", "cave", "surf", "old-rod", "good-rod", "super-rod"];
    const orderedVersions = [apiVersionName(currentVersion), ...versions.filter(v => v !== apiVersionName(currentVersion))];

    for (const version of orderedVersions) {
      const groups = versionGroups[version];
      if (!groups || !Object.keys(groups).length) continue;

      const section = document.createElement("div");
      const label = version === apiVersionName(currentVersion)
        ? `⭐ ${displayName(currentVersion)}`
        : regionInfo.originalVersions.includes(version) ? `🟥 ${displayName(version)}` : `🟦 ${displayName(version)}`;
      section.innerHTML = `<h2>${label}</h2>`;

      for (const method of orderedMethods) {
        const encounters = groups[method];
        if (!encounters) continue;

        const lines = [];
        for (const name in encounters) {
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
  } catch (e) {
    const output = document.getElementById("encounters");
    output.innerHTML = "Feil ved lasting av encounter-data.";
    console.error("Feil i fetchAreaData:", e);
  }
}



function getRelevantVersions() {
  const region = regionData[currentRegion] || {};
  const remakes = Array.isArray(region.remakes) ? region.remakes : [];
  const originalVersions = Array.isArray(region.originalVersions) ? region.originalVersions : [];

  const isCurrentRemake = remakes.includes(currentVersion);

  const relevantList = isCurrentRemake ? remakes : originalVersions;

  return relevantList.map(v => apiVersionName(v));
}


function prettifyName(name) {
  return name
    .split("-")
    .map(capitalize)
    .join(" ");
}

function methodNameToLabel(method) {
  const labels = {
    walk: "Gress",
    cave: "Hule",
    surf: "Surfing",
    "old-rod": "Fisking (Old Rod)",
    "good-rod": "Fisking (Good Rod)",
    "super-rod": "Fisking (Super Rod)",
    "rock-smash": "Rock Smash",
    headbutt: "Headbutt",
  };
  return labels[method] || method;
}

async function getPokemonIdByName(name) {
  if (pokemonIdCache[name]) return pokemonIdCache[name];
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
  if (!res.ok) return null;
  const data = await res.json();
  pokemonIdCache[name] = data.id;
  return data.id;
}

function getCaughtList() {
  return JSON.parse(localStorage.getItem("caughtList") || "[]");
}
function isCaught(name) {
  const list = getCaughtList().map(n => n.toLowerCase());
  return list.includes(name.toLowerCase());
}
function toggleCaught(name, checkbox) {
  let list = getCaughtList().map(n => n.toLowerCase());
  const lowerName = name.toLowerCase();

  if (checkbox.checked) {
    if (!list.includes(lowerName)) list.push(lowerName);
  } else {
    list = list.filter(n => n !== lowerName);
  }

  localStorage.setItem("caughtList", JSON.stringify(list));
  updateCaughtCounter();
}
function updateCaughtCounter() {
  const counter = document.getElementById("caught-counter");
  const dexEntries = getDexEntries();
  if (!counter || !dexEntries.length) return;
  const caught = getCaughtList().filter(name => dexEntries.includes(name)).length;
  const percent = Math.round((caught / dexEntries.length) * 100);
  counter.textContent = `Fanget: ${caught}/${dexEntries.length} (${percent}%)`;
}

async function formatLine(name) {
  const id = await getPokemonIdByName(name.toLowerCase());
  if (!id) return "";
  const iconUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  const checked = isCaught(name) ? "checked" : "";

  const dexNumbers = getDexNumbers();
  let dexNum = dexNumbers[name] || 0;

  let dexNumStr = getDexMode() === "regional" ? dexNum.toString().padStart(3, "0") : dexNum.toString().padStart(4, "0");

  return `
    <div class="icon-entry">
      <label>
        ${capitalize(name)} - ${dexNumStr}
        <input type="checkbox" ${checked} onchange="window.johtoToggleCaught('${name}', this)">
      </label><br>
      <img src="${iconUrl}" alt="${name}" title="${capitalize(name)}" width="128" height="128" onclick="window.johtoShowLocations('${name}')">
    </div>
  `;
}

export async function showRegionalDex() {
  debug.debugLog("showRegionalDex kalt");
  setDexMode("regional");
  const output = document.getElementById("encounters");
  output.innerHTML = "Laster regional dex...";

  try {
    const dexUrl = regionData.johto.pokedexUrl;
    debug.debugLog("Fetcher pokedex fra:", dexUrl);

    const res = await fetch(dexUrl);
    debug.debugLog("Fetch respons mottatt:", res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP error ${res.status}: ${text}`);
    }

    const data = await res.json();
    debug.debugLog("JSON parsed, pokemon_entries finnes?", data.pokemon_entries && data.pokemon_entries.length);

    setDexEntries(data.pokemon_entries.map(e => e.pokemon_species.name));

    const newDexNumbers = {};
    data.pokemon_entries.forEach(entry => {
      newDexNumbers[entry.pokemon_species.name] = entry.entry_number;
    });
    setDexNumbers(newDexNumbers);

    await renderDex(output, "Johto");
    debug.debugLog("showRegionalDex ferdig");
  } catch (e) {
    debug.debugLog("Feil i showRegionalDex:", e);
    output.innerHTML = `Feil ved lasting av regional dex:<br><pre>${e.message || e}</pre>`;
  }
}

export async function showNationalDex() {
  debug.debugLog("showNationalDex kalt");
  setDexMode("national");
  const output = document.getElementById("encounters");
  output.innerHTML = "Laster nasjonal dex...";

  try {
    const res = await fetch("https://pokeapi.co/api/v2/pokedex/3");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP error ${res.status}: ${text}`);
    }
    const data = await res.json();

    setDexEntries(data.pokemon_entries.map(e => e.pokemon_species.name));

    const newDexNumbers = {};
    data.pokemon_entries.forEach(entry => {
      newDexNumbers[entry.pokemon_species.name] = entry.entry_number;
    });
    setDexNumbers(newDexNumbers);

    await renderDex(output, "Nasjonal");
    debug.debugLog("showNationalDex ferdig");
  } catch (e) {
    debug.debugLog("Feil i showNationalDex:", e);
    output.innerHTML = `Feil ved lasting av nasjonal dex:<br><pre>${e.message || e}</pre>`;
  }
}

async function renderDex(output, titleRegion) {
  debug.debugLog("renderDex kalt for", titleRegion);
  output.innerHTML = `
    <h2>📘 ${getDexMode() === "regional" ? "Regional Pokédex – " + titleRegion : "Nasjonal Pokédex"}</h2>
    <input type="text" id="search" placeholder="Søk etter Pokémon..." oninput="window.johtoFilterDex()">
    <div id="caught-counter"></div>
    <div id="dex-list" class="icon-grid"></div>
  `;

  const dexList = document.getElementById("dex-list");
  const dexEntries = getDexEntries();
  for (const name of dexEntries) {
    const line = await formatLine(name);
    if (line) dexList.innerHTML += line;
  }

  updateCaughtCounter();
}

export function filterDex() {
  const term = document.getElementById("search").value.toLowerCase();
  const dexList = document.getElementById("dex-list");
  dexList.querySelectorAll(".icon-entry").forEach(entry => {
    const title = entry.querySelector("img").title.toLowerCase();
    entry.style.display = title.includes(term) ? "" : "none";
  });
}

export async function showLocations(name) {
  if (locationCache[name]) return showLocationPopup(name, locationCache[name]);

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    if (!res.ok) return;
    const data = await res.json();

    const locRes = await fetch(data.location_area_encounters);
    if (!locRes.ok) return;

    const locData = await locRes.json();

    const apiVer = apiVersionName(currentVersion);

    const areas = locData
      .filter(e => e.version_details.some(v => v.version.name === apiVer))
      .map(e => e.location_area.name)
      .map(slug => slug.replace(`${currentRegion}-`, "").replace("-area", "").split("-").map(capitalize).join(" "));

    locationCache[name] = areas;
    showLocationPopup(name, areas);
  } catch (e) {
    debug.debugLog("Feil i showLocations:", e);
  }
}

function showLocationPopup(name, areas) {
  const formatted = areas.length ? areas.join("\n") : "Ingen lokasjoner funnet.";
  alert(`${capitalize(name)} finnes i:\n\n${formatted}`);
}

function clearEncounters() {
  const output = document.getElementById("encounters");
  output.innerHTML = "";
}

// Eksporter funksjoner for inline bruk i HTML
window.johtoToggleCaught = toggleCaught;
window.johtoShowLocations = showLocations;
window.johtoFilterDex = filterDex;
