export const versionToRegion = {
  "red": "kanto",
  "blue": "kanto",
  "yellow": "kanto",
  "fire red": "kanto",
  "leaf green": "kanto",
  "gold": "johto",
  "silver": "johto",
  "crystal": "johto",
  "heart gold": "johto",
  "soul silver": "johto",
  "ruby": "hoenn",
  "sapphire": "hoenn",
  "emerald": "hoenn",
  "omega ruby": "hoenn",
  "alpha sapphire": "hoenn",
  "diamond": "sinnoh",
  "pearl": "sinnoh",
  "platinum": "sinnoh",
  "brilliant diamond": "sinnoh",
  "shining pearl": "sinnoh",
  "black": "unova",
  "white": "unova",
  "black 2": "unova",
  "white 2": "unova",
  "x": "kalos",
  "y": "kalos",
  "sun": "alola",
  "moon": "alola",
  "ultra sun": "alola",
  "ultra moon": "alola",
  "sword": "galar",
  "shield": "galar",
  "scarlet": "paldea",
  "violet": "paldea"
};

export const regionData = {
  kanto: {
    id: 1,
    name: "Kanto",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/2",
    originalVersions: ["red", "blue", "yellow"],
    remakes: ["fire red", "leaf green"]
  },
  johto: {
    id: 2,
    name: "Johto",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/3",
    originalVersions: ["gold", "silver", "crystal"],
    remakes: ["heart gold", "soul silver"]
  },
  hoenn: {
    id: 3,
    name: "Hoenn",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/4",
    originalVersions: ["ruby", "sapphire", "emerald"],
    remakes: ["omega ruby", "alpha sapphire"]
  },
  sinnoh: {
    id: 4,
    name: "Sinnoh",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/5",
    originalVersions: ["diamond", "pearl", "platinum"],
    remakes: ["brilliant diamond", "shining pearl"]
  },
  unova: {
    id: 5,
    name: "Unova",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/8",
    originalVersions: ["black", "white"],
    remakes: ["black 2", "white 2"]
  },
  kalos: {
    id: 6,
    name: "Kalos",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/12",
    originalVersions: ["x", "y"],
    remakes: []
  },
  alola: {
    id: 7,
    name: "Alola",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/16",
    originalVersions: ["sun", "moon"],
    remakes: ["ultra sun", "ultra moon"]
  },
  galar: {
    id: 8,
    name: "Galar",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/27",
    originalVersions: ["sword", "shield"],
    remakes: []
  },
  paldea: {
    id: 9,
    name: "Paldea",
    pokedexUrl: "https://pokeapi.co/api/v2/pokedex/31",
    originalVersions: ["scarlet", "violet"],
    remakes: []
  }
};

// Lagre dynamiske verdier i modulen
export let currentVersion = (localStorage.getItem("currentVersion") || "fire red").toLowerCase();
export let currentRegion = versionToRegion[currentVersion] || "kanto";

let _dexMode = "regional";
export function getDexMode() {
  return _dexMode;
}
export function setDexMode(mode) {
  _dexMode = mode;
}

let _dexNumbers = {};
export function getDexNumbers() {
  return _dexNumbers;
}
export function setDexNumbers(obj) {
  _dexNumbers = obj;
}

let _dexEntries = [];
export function getDexEntries() {
  return _dexEntries;
}
export function setDexEntries(arr) {
  _dexEntries = arr;
}

let _allLocations = [];
export function getAllLocations() {
  return _allLocations;
}
export function setAllLocations(arr) {
  _allLocations = arr;
}

export const pokemonIdCache = {};
export const locationCache = {};

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function displayName(ver) {
  const map = {
    "fire red": "Fire Red",
    "leaf green": "Leaf Green",
    "heart gold": "Heart Gold",
    "soul silver": "Soul Silver",
    "omega ruby": "Omega Ruby",
    "alpha sapphire": "Alpha Sapphire",
    "brilliant diamond": "Brilliant Diamond",
    "shining pearl": "Shining Pearl",
    "black 2": "Black 2",
    "white 2": "White 2",
    "ultra sun": "Ultra Sun",
    "ultra moon": "Ultra Moon"
  };
  return map[ver.toLowerCase()] || capitalize(ver);
}

export function apiVersionName(ver) {
  const map = {
    "fire red": "firered",
    "leaf green": "leafgreen",
    "heart gold": "heartgold",
    "soul silver": "soulsilver",
    "omega ruby": "omega-ruby",
    "alpha sapphire": "alpha-sapphire",
    "brilliant diamond": "brilliant-diamond",
    "shining pearl": "shining-pearl",
    "black 2": "black-2",
    "white 2": "white-2",
    "ultra sun": "ultra-sun",
    "ultra moon": "ultra-moon"
  };
  const lower = ver.toLowerCase();
  return map[lower] || lower;
}

// Versjonsvelger
export function renderVersionSelect(onChangeCallback) {
  const container = document.getElementById("version-select-container");
  if (!container) return;

  container.innerHTML = "";

  // Sortert liste med alle versjoner
  const sortedVersions = [
    "red", "blue", "yellow",
    "silver", "gold", "crystal",
    "ruby", "sapphire", "emerald",
    "fire red", "leaf green",
    "diamond", "pearl", "platinum",
    "heart gold", "soul silver",
    "black", "white", "black 2", "white 2",
    "x", "y", "omega ruby", "alpha sapphire",
    "sun", "moon", "ultra sun", "ultra moon",
    "sword", "shield", "brilliant diamond", "shining pearl",
    "scarlet", "violet"
  ];

  const select = document.createElement("select");
  select.id = "version-select";

  sortedVersions.forEach(ver => {
    if (!versionToRegion.hasOwnProperty(ver)) return;
    const option = document.createElement("option");
    option.value = ver;
    option.textContent = displayName(ver);
    select.appendChild(option);
  });

  select.value = currentVersion;

  select.onchange = async () => {
    currentVersion = select.value.toLowerCase();
    localStorage.setItem("currentVersion", currentVersion);
    currentRegion = versionToRegion[currentVersion] || "kanto";

    if (onChangeCallback) {
      await onChangeCallback(currentRegion);
    }
  };

  container.appendChild(select);
}
