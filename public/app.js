// app.js — init and glue
document.addEventListener("DOMContentLoaded", async () => {
  // Load base data
  const [settings, methods, crops, sheets] = await Promise.all([
    API.getSettings(),
    API.getGddMethods(),
    API.getCrops(),
    API.getSheets(),
  ]);

  let activeSheet = null;
  let activeYear = new Date().getFullYear();

  // GDD curves keyed by year: { year: true } tracks what's loaded
  const loadedYears = {};

  async function loadCurvesForYear(yr) {
    if (loadedYears[yr]) return;
    await Promise.all(methods.map(async m => {
      const curve = await API.getSeasonCurve(m.id, yr);
      GDD.loadCurve(m.id, curve, yr);
    }));
    loadedYears[yr] = true;
  }

  // Init sidebar
  Sidebar.init(crops, methods);

  // Init timeline (will be re-inited on sheet switch)
  const timelineEl = document.getElementById("timeline");

  // Init detail panel
  Detail.init();

  // --- Sheet management ---

  const yearSelect = document.getElementById("year-select");
  const sheetTabs = document.getElementById("sheet-tabs");
  const addSheetBtn = document.getElementById("add-sheet-btn");
  let selectedYear = new Date().getFullYear();

  function getYears() {
    const years = new Set(sheets.map(s => s.year));
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }

  function renderYearSelect() {
    const years = getYears();
    yearSelect.innerHTML = years.map(y =>
      `<option value="${y}" ${y === selectedYear ? "selected" : ""}>${y}</option>`
    ).join("") + `<option value="manage">Manage\u2026</option>`;
  }

  yearSelect.addEventListener("change", () => {
    if (yearSelect.value === "manage") {
      yearSelect.value = selectedYear; // revert dropdown
      openManagePanel();
      return;
    }
    selectedYear = parseInt(yearSelect.value);
    renderSheetTabs();
    const yearSheets = sheets.filter(s => s.year === selectedYear);
    if (yearSheets.length) {
      switchSheet(yearSheets[0]);
    } else {
      activeSheet = null;
      Timeline.setPlantings([]);
    }
  });

  function renderSheetTabs() {
    sheetTabs.innerHTML = "";
    const yearSheets = sheets.filter(s => s.year === selectedYear);
    yearSheets.forEach(s => {
      const tab = document.createElement("button");
      tab.className = "sheet-tab" + (activeSheet && activeSheet.id === s.id ? " active" : "");
      tab.textContent = s.name;

      tab.addEventListener("click", () => switchSheet(s));
      tab.addEventListener("dblclick", () => editSheet(s));
      tab.addEventListener("contextmenu", e => {
        e.preventDefault();
        if (confirm(`Delete sheet "${s.name}" and all its plantings?`)) {
          deleteSheet(s);
        }
      });
      sheetTabs.appendChild(tab);
    });
  }

  addSheetBtn.addEventListener("click", () => {
    const name = prompt("Sheet name:", "New Sheet");
    if (!name) return;
    createSheet(name, selectedYear);
  });

  async function createSheet(name, year) {
    const s = await API.createSheet({ name, year });
    sheets.push(s);
    selectedYear = year;
    renderYearSelect();
    await switchSheet(s);
  }

  async function editSheet(sheet) {
    const name = prompt("Sheet name:", sheet.name);
    if (!name) return;
    const updated = await API.updateSheet(sheet.id, { name });
    Object.assign(sheet, updated);
    renderSheetTabs();
  }

  async function deleteSheet(sheet) {
    await API.deleteSheet(sheet.id);
    const idx = sheets.findIndex(s => s.id === sheet.id);
    sheets.splice(idx, 1);
    renderYearSelect();
    if (activeSheet && activeSheet.id === sheet.id) {
      const yearSheets = sheets.filter(s => s.year === selectedYear);
      if (yearSheets.length) {
        await switchSheet(yearSheets[0]);
      } else {
        activeSheet = null;
        Timeline.setPlantings([]);
        renderSheetTabs();
      }
    } else {
      renderSheetTabs();
    }
  }

  // --- Manage panel ---

  const managePanel = document.getElementById("manage-panel");
  const manageContent = document.getElementById("manage-content");

  document.getElementById("manage-close").addEventListener("click", closeManagePanel);
  document.getElementById("manage-add-year").addEventListener("click", async () => {
    const yr = prompt("Add year:", String(new Date().getFullYear()));
    if (!yr || isNaN(parseInt(yr))) return;
    const year = parseInt(yr);
    // Check if year already has sheets
    if (sheets.some(s => s.year === year)) {
      alert(`${year} already exists.`);
      return;
    }
    await createSheet("Garden", year);
    renderManageContent();
  });

  function openManagePanel() {
    renderManageContent();
    managePanel.classList.remove("hidden");
  }

  function closeManagePanel() {
    managePanel.classList.add("hidden");
    renderYearSelect();
    renderSheetTabs();
  }

  function renderManageContent() {
    manageContent.innerHTML = "";
    const years = getYears();

    years.forEach(year => {
      const group = document.createElement("div");
      group.className = "manage-year-group";

      const yearSheets = sheets.filter(s => s.year === year);

      const header = document.createElement("div");
      header.className = "manage-year-header";
      header.innerHTML = `<strong>${year}</strong>`;

      const deleteYearBtn = document.createElement("button");
      deleteYearBtn.className = "manage-year-delete";
      deleteYearBtn.textContent = "Delete year";
      deleteYearBtn.addEventListener("click", async () => {
        if (!confirm(`Delete year ${year} and all its sheets and plantings?`)) return;
        for (const s of [...yearSheets]) {
          await API.deleteSheet(s.id);
          const idx = sheets.findIndex(ss => ss.id === s.id);
          if (idx >= 0) sheets.splice(idx, 1);
        }
        // If we deleted the selected year, switch
        if (selectedYear === year) {
          const remaining = getYears();
          selectedYear = remaining[0] || new Date().getFullYear();
        }
        renderManageContent();
        renderYearSelect();
        // Switch to a valid sheet
        const yearSheets2 = sheets.filter(s => s.year === selectedYear);
        if (yearSheets2.length) {
          await switchSheet(yearSheets2[0]);
        } else {
          activeSheet = null;
          Timeline.setPlantings([]);
          renderSheetTabs();
        }
      });
      header.appendChild(deleteYearBtn);
      group.appendChild(header);

      yearSheets.forEach(s => {
        const item = document.createElement("div");
        item.className = "manage-sheet-item";
        item.innerHTML = `
          <span>${s.name}</span>
          <div class="item-actions">
            <button class="btn-edit" title="Rename">\u270e</button>
            <button class="btn-delete" title="Delete">\u00d7</button>
          </div>
        `;
        item.querySelector(".btn-edit").addEventListener("click", async () => {
          const name = prompt("Sheet name:", s.name);
          if (!name) return;
          const updated = await API.updateSheet(s.id, { name });
          Object.assign(s, updated);
          renderManageContent();
          renderSheetTabs();
        });
        item.querySelector(".btn-delete").addEventListener("click", async () => {
          if (!confirm(`Delete sheet "${s.name}"?`)) return;
          await API.deleteSheet(s.id);
          const idx = sheets.findIndex(ss => ss.id === s.id);
          if (idx >= 0) sheets.splice(idx, 1);
          renderManageContent();
          if (activeSheet && activeSheet.id === s.id) {
            const remaining = sheets.filter(ss => ss.year === selectedYear);
            if (remaining.length) {
              await switchSheet(remaining[0]);
            } else {
              activeSheet = null;
              Timeline.setPlantings([]);
              renderSheetTabs();
            }
          }
        });
        group.appendChild(item);
      });

      // Add sheet button for this year
      const addBtn = document.createElement("button");
      addBtn.className = "manage-add-sheet";
      addBtn.textContent = "+ Add sheet";
      addBtn.addEventListener("click", async () => {
        const name = prompt("Sheet name:", "New Sheet");
        if (!name) return;
        await createSheet(name, year);
        renderManageContent();
      });
      group.appendChild(addBtn);

      manageContent.appendChild(group);
    });
  }

  async function switchSheet(sheet) {
    activeSheet = sheet;
    activeYear = sheet.year;
    renderSheetTabs();

    // Load GDD curves for this year
    await loadCurvesForYear(activeYear);
    GDD.activeYear = activeYear;

    // Re-init timeline with this year's season bounds
    const yearSettings = { ...settings, _year: activeYear };
    Timeline.init(timelineEl, yearSettings, activeYear);
    wireTimeline();

    // Load plantings for this sheet
    await refreshPlantings();

    // Update chart if visible
    const chartEl = document.getElementById("gdd-chart");
    if (!chartEl.classList.contains("hidden")) {
      GddChart.init(chartEl, settings, methods, activeYear);
      GddChart.render();
    }
  }

  // --- Refresh helpers ---

  async function refreshPlantings() {
    if (!activeSheet) return;
    const updated = await API.getPlantings(activeSheet.id);
    Timeline.setPlantings(updated);
  }

  async function refreshCrops() {
    const updated = await API.getCrops();
    Sidebar.crops = updated;
    Sidebar.renderCrops();
    await refreshPlantings();
  }

  async function refreshMethods() {
    const updated = await API.getGddMethods();
    Sidebar.methods = updated;
    Sidebar.renderMethods();
    // Reload curves for active year
    loadedYears[activeYear] = false;
    await loadCurvesForYear(activeYear);
    await refreshCrops();
  }

  // Wire up: sidebar callbacks
  Sidebar.onCropsChanged = refreshCrops;
  Sidebar.onMethodsChanged = refreshMethods;

  function wireTimeline() {
    Timeline.onPlantingCreated = async (crop, dateStr, row) => {
      await API.createPlanting({
        crop_id: crop.id,
        plant_date: dateStr,
        row: row,
        sheet_id: activeSheet.id,
      });
      await refreshPlantings();
    };

    Timeline.onPlantingUpdated = async (id, data) => {
      await API.updatePlanting(id, data);
      await refreshPlantings();
    };

    Timeline.onPlantingPush = async (movedPlanting, newDate, newRow) => {
      await API.updatePlanting(movedPlanting.id, { plant_date: newDate, row: newRow });
      const all = await API.getPlantings(activeSheet.id);
      const rowPlantings = all
        .filter(p => p.row === newRow)
        .sort((a, b) => a.plant_date.localeCompare(b.plant_date));

      let cursor = null;
      for (const p of rowPlantings) {
        if (cursor && p.plant_date < cursor) {
          await API.updatePlanting(p.id, { plant_date: cursor });
          const endStr = GDD.dateForGdd(p.gdd_method_id, cursor, p.gdd_required);
          cursor = endStr || cursor;
        } else {
          const endStr = GDD.dateForGdd(p.gdd_method_id, p.plant_date, p.gdd_required);
          cursor = endStr || p.plant_date;
        }
      }
      await refreshPlantings();
    };

    Timeline.onPlantingClicked = (planting) => {
      Detail.show(planting);
    };
  }

  // Wire up: save from detail panel
  Detail.onSave = async (id, data) => {
    await API.updatePlanting(id, data);
    await refreshPlantings();
  };

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
  const chartBtn = document.getElementById("chart-btn");
  const chartEl = document.getElementById("gdd-chart");
  chartBtn.addEventListener("click", () => {
    const showing = chartEl.classList.toggle("hidden");
    chartBtn.classList.toggle("active", !showing);
    if (!showing) {
      GddChart.init(chartEl, settings, methods, activeYear);
      GddChart.render();
    }
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
    await API.updateSettings({
      season_start: optSeasonStart.value,
      season_end: optSeasonEnd.value,
      week_line_day: parseInt(optWeekDay.value),
    });
    optionsPanel.classList.add("hidden");
    location.reload();
  });

  // --- Init ---

  if (sheets.length === 0) {
    await createSheet("Garden", new Date().getFullYear());
  } else {
    // Default to current year
    const currentYear = new Date().getFullYear();
    const yearSheets = sheets.filter(s => s.year === currentYear);
    if (yearSheets.length) {
      selectedYear = currentYear;
    } else {
      // Fall back to most recent year with sheets
      selectedYear = sheets[sheets.length - 1].year;
    }
    renderYearSelect();
    const firstSheet = sheets.filter(s => s.year === selectedYear)[0] || sheets[0];
    await switchSheet(firstSheet);
  }
});
