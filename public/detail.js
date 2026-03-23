// detail.js — planting detail popover
const Detail = {
  panel: null,
  onSave: null,
  onDelete: null,

  init() {
    this.panel = document.getElementById("detail-panel");
    document.addEventListener("click", e => {
      if (!this.panel.contains(e.target)) this.hide();
    });
  },

  show(planting) {
    this.current = planting;
    const gddSoFar = GDD.gddBetween(
      planting.gdd_method_id,
      planting.plant_date,
      Timeline._formatDate(new Date())
    );
    const endDateStr = GDD.dateForGdd(
      planting.gdd_method_id, planting.plant_date, planting.gdd_required
    );
    const remaining = GDD.remainingFrom(planting.gdd_method_id, planting.plant_date);

    this.panel.innerHTML = `
      <h3>${planting.crop_name} <span style="color:#888;font-weight:normal">${planting.variety || ""}</span></h3>
      <div style="margin:8px 0;font-size:13px;color:#666">
        ${planting.gdd_method_name} &middot; ${planting.gdd_required} GDD needed<br>
        ${Math.round(gddSoFar)} GDD accumulated<br>
        Projected harvest: <strong>${endDateStr || "won't finish"}</strong>
      </div>
      <div style="margin-top:12px">
        <label>Plant date<br>
          <input type="date" id="detail-plant-date" value="${planting.plant_date}">
        </label>
      </div>
      <div style="margin-top:8px">
        <label>Seeding date<br>
          <input type="date" id="detail-seeding-date" value="${planting.seeding_date || ""}">
        </label>
      </div>
      <div style="margin-top:8px">
        <label>Emergence date<br>
          <input type="date" id="detail-emergence-date" value="${planting.emergence_date || ""}">
        </label>
      </div>
      <div style="margin-top:8px">
        <label>First harvest<br>
          <input type="date" id="detail-first-harvest" value="${planting.first_harvest || ""}">
        </label>
      </div>
      <div style="margin-top:8px">
        <label>Removal date<br>
          <input type="date" id="detail-removal-date" value="${planting.removal_date || ""}">
        </label>
      </div>
      <div style="margin-top:8px">
        <label>Notes<br>
          <textarea id="detail-notes" rows="3" style="width:100%;resize:vertical">${planting.notes || ""}</textarea>
        </label>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button id="detail-save" style="flex:1;padding:6px;background:#2d5016;color:white;border:none;border-radius:4px;cursor:pointer">Save</button>
        <button id="detail-delete" style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
      </div>
    `;

    document.getElementById("detail-save").addEventListener("click", () => {
      const data = {
        plant_date: document.getElementById("detail-plant-date").value,
        seeding_date: document.getElementById("detail-seeding-date").value || null,
        emergence_date: document.getElementById("detail-emergence-date").value || null,
        first_harvest: document.getElementById("detail-first-harvest").value || null,
        removal_date: document.getElementById("detail-removal-date").value || null,
        notes: document.getElementById("detail-notes").value || null,
      };
      if (this.onSave) this.onSave(planting.id, data);
      this.hide();
    });

    document.getElementById("detail-delete").addEventListener("click", () => {
      if (confirm("Delete this planting?")) {
        if (this.onDelete) this.onDelete(planting.id);
        this.hide();
      }
    });

    this.panel.classList.remove("hidden");
  },

  hide() {
    this.panel.classList.add("hidden");
    Timeline.selectedId = null;
    Timeline.barsGroup.selectAll(".planting-bar")
      .attr("stroke", "none")
      .attr("stroke-width", 0);
  },
};
