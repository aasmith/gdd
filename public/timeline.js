// timeline.js — D3 Gantt chart with drag-to-create and drag-to-move
const Timeline = {
  margin: { top: 54, right: 16, bottom: 30, left: 16 },
  barHeight: 28,
  barGap: 6,
  minHeight: 400,
  successionSnapPx: 20, // pixels from bar end to trigger succession snap

  snapEnabled: false,

  init(container, settings) {
    this.container = container;
    this.settings = settings;
    this.plantings = [];
    this.rowData = []; // [{plantDate, endDate, ...}, ...] grouped by row
    this.onPlantingCreated = null;
    this.onPlantingUpdated = null;
    this.onPlantingClicked = null;

    const year = new Date().getFullYear();
    this.seasonStart = new Date(`${year}-${settings.season_start}T00:00:00`);
    this.seasonEnd = new Date(`${year}-${settings.season_end}T00:00:00`);

    this.setupSvg();
    this.setupDropZone();
  },

  setupSvg() {
    const el = this.container;
    const width = el.clientWidth - this.margin.left - this.margin.right;

    this.width = width;
    this.xScale = d3.scaleTime()
      .domain([this.seasonStart, this.seasonEnd])
      .range([0, width]);

    el.innerHTML = "";
    this.svg = d3.select(el)
      .append("svg")
      .attr("width", width + this.margin.left + this.margin.right)
      .attr("height", this.minHeight);

    this.g = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // X axis — months
    this.g.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0,-14)")
      .call(d3.axisTop(this.xScale)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat("%b"))
        .tickSize(0))
      .select(".domain").remove();

    // X axis — weekly dates aligned to gridline day
    const weekDay = this.settings.week_line_day ?? 6;
    const weekDates = [];
    const wd = new Date(this.seasonStart);
    while (wd <= this.seasonEnd) {
      if (wd.getDay() === weekDay) weekDates.push(new Date(wd));
      wd.setDate(wd.getDate() + 1);
    }
    this.g.append("g")
      .attr("class", "x-axis-dates")
      .selectAll("text")
      .data(weekDates)
      .enter()
      .append("text")
      .attr("x", d => this.xScale(d))
      .attr("y", -3)
      .attr("text-anchor", "middle")
      .attr("fill", "#999")
      .attr("font-size", "9px")
      .text(d => `${d.getMonth() + 1}/${d.getDate()}`);

    // Today line
    const today = new Date();
    if (today >= this.seasonStart && today <= this.seasonEnd) {
      this.g.append("line")
        .attr("class", "today-line")
        .attr("x1", this.xScale(today))
        .attr("x2", this.xScale(today))
        .attr("y1", 0)
        .attr("y2", this.minHeight)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3");

      this.g.append("text")
        .attr("x", this.xScale(today))
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#e74c3c")
        .attr("font-size", "11px")
        .text("Today");
    }

    // Weekly gridlines group (behind everything)
    this.gridGroup = this.g.append("g").attr("class", "grid-lines");
    this.drawWeekLines(this.settings.week_line_day ?? 6);

    // Ghost bar for drag preview
    this.ghost = this.g.append("rect")
      .attr("class", "ghost-bar")
      .attr("y", 0)
      .attr("height", this.barHeight)
      .attr("rx", 3)
      .attr("fill", "rgba(45, 80, 22, 0.2)")
      .attr("stroke", "#2d5016")
      .attr("stroke-dasharray", "4,2")
      .attr("display", "none");

    // Succession indicator
    this.successionHighlight = this.g.append("rect")
      .attr("class", "succession-highlight")
      .attr("width", 4)
      .attr("height", this.barHeight)
      .attr("rx", 2)
      .attr("fill", "#f0a030")
      .attr("display", "none");

    // Bars group
    this.barsGroup = this.g.append("g").attr("class", "bars");
  },

  // --- Auto-packing ---

  // Assign rows to plantings. Respects existing row assignments,
  // auto-packs any with row === null into the first available row.
  _packRows(data) {
    // Sort by plant date for packing
    const sorted = [...data].sort((a, b) => a.plantDate - b.plantDate);
    const rows = []; // rows[i] = latest end date in that row

    sorted.forEach(d => {
      if (d.row != null) {
        // Explicit row assignment — ensure rows array is big enough
        while (rows.length <= d.row) rows.push(null);
        d._row = d.row;
        // Update row end date
        if (!rows[d._row] || d.endDate > rows[d._row]) {
          rows[d._row] = d.endDate;
        }
      }
    });

    // Pack unassigned
    sorted.forEach(d => {
      if (d.row != null) return;
      let placed = false;
      for (let r = 0; r < rows.length; r++) {
        if (!rows[r] || d.plantDate >= rows[r]) {
          d._row = r;
          rows[r] = d.endDate;
          placed = true;
          break;
        }
      }
      if (!placed) {
        d._row = rows.length;
        rows.push(d.endDate);
      }
    });

    this.numRows = rows.length || 1;
    return data;
  },

  // Find which bar's end is near the given pixel coordinates
  _findSuccessionTarget(mx, my) {
    for (const d of this._renderData || []) {
      const barEndX = this.xScale(d.endDate);
      const barY = d._row * (this.barHeight + this.barGap);
      if (Math.abs(mx - barEndX) < this.successionSnapPx &&
          my >= barY && my <= barY + this.barHeight) {
        return d;
      }
    }
    return null;
  },

  setupDropZone() {
    const el = this.container;

    el.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";

      const crop = this._dragCrop;
      if (!crop) return;

      const [mx, my] = d3.pointer(e, this.g.node());

      // Check for succession snap
      const target = this._findSuccessionTarget(mx, my);
      let date, row;

      if (target) {
        // Snap to end of target bar
        const endDateStr = GDD.dateForGdd(target.gdd_method_id, target.plant_date, target.gdd_required);
        date = endDateStr ? new Date(endDateStr + "T00:00:00") : null;
        row = target._row;
        if (date) {
          this.successionHighlight
            .attr("x", this.xScale(date) - 2)
            .attr("y", row * (this.barHeight + this.barGap))
            .attr("display", null);
        }
      } else {
        const rawDate = this.xScale.invert(mx);
        date = this._snapDate(rawDate);
        row = Math.max(0, Math.floor(my / (this.barHeight + this.barGap)));
        this.successionHighlight.attr("display", "none");
      }

      if (!date) {
        this.ghost.attr("display", "none");
        return;
      }

      const dateStr = this._formatDate(date);
      const endDateStr = GDD.dateForGdd(crop.gdd_method_id, dateStr, crop.gdd);
      const y = row * (this.barHeight + this.barGap);

      if (endDateStr) {
        const x = this.xScale(date);
        const endDate = new Date(endDateStr + "T00:00:00");
        const w = this.xScale(endDate) - x;
        this.ghost
          .attr("x", x).attr("y", y)
          .attr("width", Math.max(w, 2))
          .attr("fill", "rgba(45, 80, 22, 0.2)")
          .attr("stroke", "#2d5016")
          .attr("display", null);
      } else {
        const x = this.xScale(date);
        const w = this.xScale(this.seasonEnd) - x;
        this.ghost
          .attr("x", x).attr("y", y)
          .attr("width", Math.max(w, 2))
          .attr("fill", "rgba(231, 76, 60, 0.2)")
          .attr("stroke", "#e74c3c")
          .attr("display", null);
      }

      this._dropInfo = { dateStr, row };
    });

    el.addEventListener("dragleave", () => {
      this.ghost.attr("display", "none")
        .attr("fill", "rgba(45, 80, 22, 0.2)")
        .attr("stroke", "#2d5016");
      this.successionHighlight.attr("display", "none");
    });

    el.addEventListener("drop", async e => {
      e.preventDefault();
      this.ghost.attr("display", "none")
        .attr("fill", "rgba(45, 80, 22, 0.2)")
        .attr("stroke", "#2d5016");
      this.successionHighlight.attr("display", "none");

      let crop;
      try {
        crop = JSON.parse(e.dataTransfer.getData("application/json"));
      } catch { return; }

      const [mx, my] = d3.pointer(e, this.g.node());

      // Check for succession snap
      const target = this._findSuccessionTarget(mx, my);
      let dateStr, row;

      if (target) {
        const endDateStr = GDD.dateForGdd(target.gdd_method_id, target.plant_date, target.gdd_required);
        dateStr = endDateStr;
        row = target._row;
      } else {
        const date = this._snapDate(this.xScale.invert(mx));
        dateStr = this._formatDate(date);
        row = Math.max(0, Math.floor(my / (this.barHeight + this.barGap)));
      }

      if (dateStr && this.onPlantingCreated) {
        this.onPlantingCreated(crop, dateStr, row);
      }
    });

    // Track drag crop from sidebar
    document.addEventListener("dragstart", e => {
      try {
        const data = e.dataTransfer.getData("application/json");
        if (data) this._dragCrop = JSON.parse(data);
      } catch {}
    });

    document.getElementById("crop-list").addEventListener("dragstart", e => {
      const item = e.target.closest(".crop-item");
      if (!item) return;
      const cropId = parseInt(item.dataset.cropId);
      const crop = Sidebar.crops.find(c => c.id === cropId);
      if (crop) this._dragCrop = crop;
    });
  },

  setPlantings(plantings) {
    this.plantings = plantings;
    this.render();
  },

  render() {
    const self = this;
    const data = this.plantings.map(p => {
      const plantDate = new Date(p.plant_date + "T00:00:00");
      const endDateStr = GDD.dateForGdd(p.gdd_method_id, p.plant_date, p.gdd_required);
      const endDate = endDateStr
        ? new Date(endDateStr + "T00:00:00")
        : this.seasonEnd;
      const willFinish = endDateStr !== null;
      return { ...p, plantDate, endDate, willFinish };
    });

    this._packRows(data);
    this._renderData = data;

    // Resize SVG
    const height = Math.max(
      this.minHeight,
      this.numRows * (this.barHeight + this.barGap) + 60
    );
    this.svg.attr("height", height + this.margin.top + this.margin.bottom);
    this.g.select(".today-line").attr("y2", height);
    this.gridGroup.selectAll("line").attr("y2", height);

    // Bars
    const bars = this.barsGroup.selectAll(".planting-group")
      .data(data, d => d.id);

    bars.exit().remove();

    const enter = bars.enter().append("g")
      .attr("class", "planting-group");

    enter.append("rect").attr("class", "planting-bar");
    enter.append("text").attr("class", "planting-label");
    enter.append("text").attr("class", "drag-start-label");
    enter.append("text").attr("class", "drag-end-label");

    const merged = enter.merge(bars);

    merged.attr("transform", d => `translate(0, ${d._row * (this.barHeight + this.barGap)})`);

    merged.select(".planting-bar")
      .attr("x", d => this.xScale(d.plantDate))
      .attr("width", d => Math.max(this.xScale(d.endDate) - this.xScale(d.plantDate), 4))
      .attr("height", this.barHeight)
      .attr("rx", 3)
      .attr("fill", d => d.willFinish ? "#5a9e3a" : "#e74c3c")
      .attr("opacity", 0.85)
      .attr("cursor", "grab")
      .attr("stroke", d => self.selectedId === d.id ? "#ff0000" : "none")
      .attr("stroke-width", d => self.selectedId === d.id ? 2 : 0)
      .attr("paint-order", "stroke")
      .on("click", function(event, d) {
        event.stopPropagation();
        self.selectedId = d.id;
        self.barsGroup.selectAll(".planting-bar")
          .attr("stroke", dd => dd.id === d.id ? "#ff0000" : "none")
          .attr("stroke-width", dd => dd.id === d.id ? 2 : 0);
        // Show start/end date labels on selected bar
        self.barsGroup.selectAll(".planting-group").each(function(dd) {
          const show = dd.id === d.id;
          const group = d3.select(this);
          group.select(".drag-start-label")
            .attr("x", self.xScale(dd.plantDate) - 4)
            .attr("display", show ? null : "none")
            .text(dd.plant_date);
          const endDateStr = GDD.dateForGdd(dd.gdd_method_id, dd.plant_date, dd.gdd_required);
          const endDate = endDateStr ? new Date(endDateStr + "T00:00:00") : self.seasonEnd;
          group.select(".drag-end-label")
            .attr("x", self.xScale(endDate) + 4)
            .attr("display", show ? null : "none")
            .text(endDateStr || "n/a");
        });
        if (self.onPlantingClicked) self.onPlantingClicked(d);
      })
      .call(d3.drag()
        .on("start", function(event, d) {
          d3.select(this).attr("opacity", 1);
          d._dragOffsetX = event.x - self.xScale(d.plantDate);
          d._dragStartRow = d._row;
        })
        .on("drag", function(event, d) {
          const newDate = self._snapDate(self.xScale.invert(event.x - (d._dragOffsetX || 0)));
          const dateStr = self._formatDate(newDate);
          const endDateStr = GDD.dateForGdd(d.gdd_method_id, dateStr, d.gdd_required);
          const endDate = endDateStr
            ? new Date(endDateStr + "T00:00:00")
            : self.seasonEnd;
          const willFinish = endDateStr !== null;

          // Vertical row movement — use absolute cursor position in the SVG
          const [, absY] = d3.pointer(event, self.g.node());
          const newRow = Math.max(0, Math.floor(absY / (self.barHeight + self.barGap)));
          d._dragRow = newRow;

          d3.select(this.parentNode)
            .attr("transform", `translate(0, ${newRow * (self.barHeight + self.barGap)})`);

          d3.select(this)
            .attr("x", self.xScale(newDate))
            .attr("width", Math.max(self.xScale(endDate) - self.xScale(newDate), 4))
            .attr("fill", willFinish ? "#5a9e3a" : "#e74c3c");

          // Move label too
          d3.select(this.parentNode).select(".planting-label")
            .attr("x", self.xScale(newDate) + 6);

          // Show start/end dates outside the bar
          d3.select(this.parentNode).select(".drag-start-label")
            .attr("x", self.xScale(newDate) - 4)
            .attr("display", null)
            .text(dateStr);

          const endX = self.xScale(endDate);
          d3.select(this.parentNode).select(".drag-end-label")
            .attr("x", endX + 4)
            .attr("display", null)
            .text(endDateStr || "n/a");

          d._dragDate = dateStr;
        })
        .on("end", function(event, d) {
          d3.select(this).attr("opacity", 0.85);
          d3.select(this.parentNode).select(".drag-start-label")
            .attr("display", "none");
          d3.select(this.parentNode).select(".drag-end-label")
            .attr("display", "none");

          const dateChanged = d._dragDate && d._dragDate !== d.plant_date;
          const rowChanged = d._dragRow != null && d._dragRow !== d._dragStartRow;

          if (!dateChanged && !rowChanged) return;

          const newDate = d._dragDate || d.plant_date;
          const newRow = d._dragRow ?? d._row;

          // Check for overlaps in the target row
          const overlaps = self._findOverlaps(d.id, newDate, d.gdd_method_id, d.gdd_required, newRow);

          if (overlaps.length > 0) {
            // Save undo state
            const undoState = { id: d.id, plant_date: d.plant_date, row: d.row };
            self._showConflictBar(d, newDate, newRow, overlaps, undoState);
          } else if (self.onPlantingUpdated) {
            const updates = {};
            if (dateChanged) updates.plant_date = newDate;
            if (rowChanged) updates.row = newRow;
            self.onPlantingUpdated(d.id, updates);
          }
        })
      );

    merged.select(".planting-label")
      .attr("x", d => this.xScale(d.plantDate) + 6)
      .attr("y", this.barHeight / 2 + 4)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .text(d => {
        const gddSoFar = GDD.gddBetween(d.gdd_method_id, d.plant_date,
          self._formatDate(new Date()));
        return `${d.crop_name} ${d.variety || ""} (${Math.round(gddSoFar)}/${d.gdd_required})`;
      });

    merged.select(".drag-start-label")
      .attr("y", this.barHeight / 2 + 4)
      .attr("fill", "#666")
      .attr("font-size", "11px")
      .attr("text-anchor", "end")
      .attr("display", "none");

    merged.select(".drag-end-label")
      .attr("y", this.barHeight / 2 + 4)
      .attr("fill", "#666")
      .attr("font-size", "11px")
      .attr("display", "none");
  },

  // Find plantings in the same row that overlap with a proposed placement
  _findOverlaps(movedId, plantDateStr, methodId, gddRequired, row) {
    const endDateStr = GDD.dateForGdd(methodId, plantDateStr, gddRequired);
    const startDate = new Date(plantDateStr + "T00:00:00");
    const endDate = endDateStr ? new Date(endDateStr + "T00:00:00") : this.seasonEnd;

    return (this._renderData || []).filter(d => {
      if (d.id === movedId) return false;
      if (d._row !== row) return false;
      // Overlap: bars intersect if one starts before the other ends and vice versa
      return d.plantDate < endDate && d.endDate > startDate;
    });
  },

  // Show a conflict resolution bar near the dropped planting
  _showConflictBar(movedPlanting, newDate, newRow, overlaps, undoState) {
    this._dismissConflictBar();

    const bar = document.createElement("div");
    bar.id = "conflict-bar";
    bar.innerHTML = `
      <span>Overlap detected</span>
      <button id="conflict-push">Auto-pack</button>
      <button id="conflict-undo">Undo</button>
    `;
    document.body.appendChild(bar);

    const self = this;

    document.getElementById("conflict-push").addEventListener("click", async () => {
      self._dismissConflictBar();
      if (self.onPlantingPush) {
        await self.onPlantingPush(movedPlanting, newDate, newRow);
      }
    });

    document.getElementById("conflict-undo").addEventListener("click", async () => {
      self._dismissConflictBar();
      if (self.onPlantingUpdated) {
        await self.onPlantingUpdated(undoState.id, {
          plant_date: undoState.plant_date,
          row: undoState.row,
        });
      }
    });
  },

  _dismissConflictBar() {
    const existing = document.getElementById("conflict-bar");
    if (existing) existing.remove();
  },

  drawWeekLines(dayOfWeek) {
    this.gridGroup.selectAll("*").remove();
    const d = new Date(this.seasonStart);
    while (d <= this.seasonEnd) {
      if (d.getDay() === dayOfWeek) {
        const x = this.xScale(d);
        this.gridGroup.append("line")
          .attr("x1", x).attr("x2", x)
          .attr("y1", 0).attr("y2", this.minHeight)
          .attr("stroke", "#e0e0e0")
          .attr("stroke-width", 0.5);
      }
      d.setDate(d.getDate() + 1);
    }
  },

  _snapDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (this.snapEnabled) {
      // Snap to weekly gridline day
      const weekDay = this.settings.week_line_day ?? 6;
      const diff = (d.getDay() - weekDay + 7) % 7;
      d.setDate(d.getDate() - diff);
    }
    return d;
  },

  _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
};
