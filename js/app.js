import * as common from "./common.js";

let currentRegionModule = null;

async function loadRegionModule(region) {
  try {
    currentRegionModule = await import(`./regions/${region}.js`);
  } catch (e) {
    console.error(`Kunne ikke laste region-modul: ${region}`, e);
    currentRegionModule = null;
  }
}

async function onRegionChange(newRegion) {
  await loadRegionModule(newRegion);
  if (!currentRegionModule) return;
  await currentRegionModule.loadLocations();
  const locSelect = document.getElementById("location-select");
  if (!locSelect || locSelect.value === "") {
    await currentRegionModule.showRegionalDex();
  } else {
    await currentRegionModule.fetchAreaData(locSelect.value);
  }
}

async function init() {
  common.renderVersionSelect(onRegionChange);
  await loadRegionModule(common.currentRegion);
  if (!currentRegionModule) return;
  await currentRegionModule.loadLocations();

  const locSelect = document.getElementById("location-select");
  if (!locSelect || locSelect.value === "") {
    await currentRegionModule.showRegionalDex();
  } else {
    await currentRegionModule.fetchAreaData(locSelect.value);
  }

  const btn = document.getElementById("regional-dex-btn");
  if (btn) btn.onclick = () => currentRegionModule.showRegionalDex();
}

window.addEventListener("load", init);
