// app.js — init and glue
document.addEventListener("DOMContentLoaded", async () => {
  const year = new Date().getFullYear();

  // Load all data
  const [settings, methods, crops, plantings] = await Promise.all([
    API.getSettings(),
    API.getGddMethods(),
    API.getCrops(),
    API.getPlantings(),
  ]);

  // Preload GDD curves for all methods
  async function loadCurves(methods) {
    await Promise.all(methods.map(async m => {
      const curve = await API.getSeasonCurve(m.id, year);
      GDD.loadCurve(m.id, curve);
    }));
  }
  await loadCurves(methods);

  // Init sidebar
  Sidebar.init(crops, methods);

  // Init timeline
  Timeline.init(document.getElementById("timeline"), settings);
  Timeline.setPlantings(plantings);

  // Init detail panel
  Detail.init();

  // Refresh helpers
  async function refreshPlantings() {
    const updated = await API.getPlantings();
    Timeline.setPlantings(updated);
  }

  async function refreshCrops() {
    const updated = await API.getCrops();
    Sidebar.crops = updated;
    Sidebar.renderCrops();
    await refreshPlantings(); // plantings include crop data
  }

  async function refreshMethods() {
    const updated = await API.getGddMethods();
    Sidebar.methods = updated;
    Sidebar.renderMethods();
    await loadCurves(updated);
    await refreshCrops(); // crops include method data
  }

  // Wire up: sidebar callbacks
  Sidebar.onCropsChanged = refreshCrops;
  Sidebar.onMethodsChanged = refreshMethods;

  // Wire up: create planting on drop
  Timeline.onPlantingCreated = async (crop, dateStr) => {
    await API.createPlanting({ crop_id: crop.id, plant_date: dateStr });
    await refreshPlantings();
  };

  // Wire up: update planting on drag-move
  Timeline.onPlantingUpdated = async (id, data) => {
    await API.updatePlanting(id, data);
    await refreshPlantings();
  };

  // Wire up: click to show detail
  Timeline.onPlantingClicked = (planting) => {
    Detail.show(planting);
  };

  // Wire up: save from detail panel
  Detail.onSave = async (id, data) => {
    await API.updatePlanting(id, data);
    await refreshPlantings();
  };

  // Wire up: delete from detail panel
  Detail.onDelete = async (id) => {
    await API.deletePlanting(id);
    await refreshPlantings();
  };
});
