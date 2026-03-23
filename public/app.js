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

  // Snap toggle
  const snapBtn = document.getElementById("snap-btn");
  snapBtn.addEventListener("click", () => {
    Timeline.snapEnabled = !Timeline.snapEnabled;
    snapBtn.classList.toggle("active", Timeline.snapEnabled);
  });

  // GDD chart toggle
  GddChart.init(document.getElementById("gdd-chart"), settings, methods);
  const chartBtn = document.getElementById("chart-btn");
  const chartEl = document.getElementById("gdd-chart");
  chartBtn.addEventListener("click", () => {
    const showing = chartEl.classList.toggle("hidden");
    chartBtn.classList.toggle("active", !showing);
    if (!showing) GddChart.render();
  });

  // Options panel
  const optionsPanel = document.getElementById("options-panel");
  const optSeasonStart = document.getElementById("opt-season-start");
  const optSeasonEnd = document.getElementById("opt-season-end");
  const optWeekDay = document.getElementById("opt-week-day");

  optSeasonStart.value = settings.season_start;
  optSeasonEnd.value = settings.season_end;
  optWeekDay.value = settings.week_line_day ?? 6;

  document.getElementById("options-btn").addEventListener("click", () => {
    optionsPanel.classList.toggle("hidden");
  });

  document.getElementById("options-save").addEventListener("click", async () => {
    const updated = await API.updateSettings({
      season_start: optSeasonStart.value,
      season_end: optSeasonEnd.value,
      week_line_day: parseInt(optWeekDay.value),
    });
    optionsPanel.classList.add("hidden");
    // Reload the page to rebuild the timeline with new season bounds
    location.reload();
  });
});
