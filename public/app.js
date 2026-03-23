// app.js — init and glue
document.addEventListener("DOMContentLoaded", async () => {
  // Load all data
  const [settings, methods, crops, plantings] = await Promise.all([
    API.getSettings(),
    API.getGddMethods(),
    API.getCrops(),
    API.getPlantings(),
  ]);

  // Preload GDD curves for all methods
  const year = new Date().getFullYear();
  await Promise.all(methods.map(async m => {
    const curve = await API.getSeasonCurve(m.id, year);
    GDD.loadCurve(m.id, curve);
  }));

  // Init sidebar
  Sidebar.init(crops, document.getElementById("crop-list"));

  // Init timeline
  Timeline.init(document.getElementById("timeline"), settings);
  Timeline.setPlantings(plantings);

  // Init detail panel
  Detail.init();

  // Wire up: create planting on drop
  Timeline.onPlantingCreated = async (crop, dateStr) => {
    await API.createPlanting({ crop_id: crop.id, plant_date: dateStr });
    const updated = await API.getPlantings();
    Timeline.setPlantings(updated);
  };

  // Wire up: update planting on drag-move
  Timeline.onPlantingUpdated = async (id, data) => {
    await API.updatePlanting(id, data);
    const updated = await API.getPlantings();
    Timeline.setPlantings(updated);
  };

  // Wire up: click to show detail
  Timeline.onPlantingClicked = (planting) => {
    Detail.show(planting);
  };

  // Wire up: save from detail panel
  Detail.onSave = async (id, data) => {
    await API.updatePlanting(id, data);
    const updated = await API.getPlantings();
    Timeline.setPlantings(updated);
  };

  // Wire up: delete from detail panel
  Detail.onDelete = async (id) => {
    await API.deletePlanting(id);
    const updated = await API.getPlantings();
    Timeline.setPlantings(updated);
  };
});
