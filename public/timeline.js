// timeline.js — D3 Gantt chart with drag-to-create and drag-to-move
const Timeline = {
  margin: { top: 54, right: 16, bottom: 30, left: 16 },
  barHeight: 28,
  barGap: 6,
  minHeight: 400,

  snapEnabled: false,

  init(container, settings) {
    this.container = container;
    this.settings = settings;
    this.plantings = [];
    this.onPlantingCreated = null; // callback
    this.onPlantingUpdated = null; // callback
    this.onPlantingClicked = null; // callback

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

    // Bars group
    this.barsGroup = this.g.append("g").attr("class", "bars");
  },

  setupDropZone() {
    const el = this.container;

    el.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";

      // Show ghost bar
      const crop = this._dragCrop;
      if (!crop) return;

      const [mx] = d3.pointer(e, this.g.node());
      const rawDate = this.xScale.invert(mx);
      const date = this._snapDate(rawDate);
      const dateStr = this._formatDate(date);
      const endDateStr = GDD.dateForGdd(crop.gdd_method_id, dateStr, crop.gdd);

      if (endDateStr) {
        const x = this.xScale(date);
        const endDate = new Date(endDateStr + "T00:00:00");
        const w = this.xScale(endDate) - x;
        const y = this.plantings.length * (this.barHeight + this.barGap);

        this.ghost
          .attr("x", x)
          .attr("y", y)
          .attr("width", Math.max(w, 2))
          .attr("display", null);
      } else {
        // Won't finish — show red ghost
        const x = this.xScale(date);
        const w = this.xScale(this.seasonEnd) - x;
        const y = this.plantings.length * (this.barHeight + this.barGap);

        this.ghost
          .attr("x", x)
          .attr("y", y)
          .attr("width", Math.max(w, 2))
          .attr("fill", "rgba(231, 76, 60, 0.2)")
          .attr("stroke", "#e74c3c")
          .attr("display", null);
      }
    });

    el.addEventListener("dragleave", () => {
      this.ghost.attr("display", "none")
        .attr("fill", "rgba(45, 80, 22, 0.2)")
        .attr("stroke", "#2d5016");
    });

    el.addEventListener("drop", async e => {
      e.preventDefault();
      this.ghost.attr("display", "none")
        .attr("fill", "rgba(45, 80, 22, 0.2)")
        .attr("stroke", "#2d5016");

      let crop;
      try {
        crop = JSON.parse(e.dataTransfer.getData("application/json"));
      } catch { return; }

      const [mx] = d3.pointer(e, this.g.node());
      const date = this._snapDate(this.xScale.invert(mx));
      const dateStr = this._formatDate(date);

      if (this.onPlantingCreated) {
        this.onPlantingCreated(crop, dateStr);
      }
    });

    // Track drag crop from sidebar
    document.addEventListener("dragstart", e => {
      try {
        // Will be set after data transfer is available
        const data = e.dataTransfer.getData("application/json");
        if (data) this._dragCrop = JSON.parse(data);
      } catch {
        // getData not available during dragstart in some browsers
      }
    });

    // Fallback: grab crop from sidebar dragstart
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
    const data = this.plantings.map((p, i) => {
      const plantDate = new Date(p.plant_date + "T00:00:00");
      const endDateStr = GDD.dateForGdd(p.gdd_method_id, p.plant_date, p.gdd_required);
      const endDate = endDateStr
        ? new Date(endDateStr + "T00:00:00")
        : this.seasonEnd;
      const willFinish = endDateStr !== null;
      return { ...p, plantDate, endDate, willFinish, index: i };
    });

    // Resize SVG
    const height = Math.max(
      this.minHeight,
      data.length * (this.barHeight + this.barGap) + 60
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
    enter.append("text").attr("class", "drag-end-label");

    const merged = enter.merge(bars);

    merged.attr("transform", (d, i) => `translate(0, ${i * (this.barHeight + this.barGap)})`);

    merged.select(".planting-bar")
      .attr("x", d => this.xScale(d.plantDate))
      .attr("width", d => Math.max(this.xScale(d.endDate) - this.xScale(d.plantDate), 4))
      .attr("height", this.barHeight)
      .attr("rx", 3)
      .attr("fill", d => d.willFinish ? "#5a9e3a" : "#e74c3c")
      .attr("opacity", d => d.projected ? 0.7 : 0.85)
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
        if (self.onPlantingClicked) self.onPlantingClicked(d);
      })
      .call(d3.drag()
        .on("start", function(event, d) {
          d3.select(this).attr("opacity", 1);
          d._dragOffsetX = event.x - self.xScale(d.plantDate);
        })
        .on("drag", function(event, d) {
          const newDate = self._snapDate(self.xScale.invert(event.x - (d._dragOffsetX || 0)));
          const dateStr = self._formatDate(newDate);
          const endDateStr = GDD.dateForGdd(d.gdd_method_id, dateStr, d.gdd_required);
          const endDate = endDateStr
            ? new Date(endDateStr + "T00:00:00")
            : self.seasonEnd;
          const willFinish = endDateStr !== null;

          d3.select(this)
            .attr("x", self.xScale(newDate))
            .attr("width", Math.max(self.xScale(endDate) - self.xScale(newDate), 4))
            .attr("fill", willFinish ? "#5a9e3a" : "#e74c3c");

          // Move label too
          d3.select(this.parentNode).select(".planting-label")
            .attr("x", self.xScale(newDate) + 6);

          // Show end date outside the bar
          const endX = self.xScale(endDate);
          const label = endDateStr || "n/a";
          d3.select(this.parentNode).select(".drag-end-label")
            .attr("x", endX + 4)
            .attr("display", null)
            .text(label);

          d._dragDate = dateStr;
        })
        .on("end", function(event, d) {
          d3.select(this).attr("opacity", 0.85);
          d3.select(this.parentNode).select(".drag-end-label")
            .attr("display", "none");
          if (d._dragDate && d._dragDate !== d.plant_date) {
            if (self.onPlantingUpdated) {
              self.onPlantingUpdated(d.id, { plant_date: d._dragDate });
            }
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

    merged.select(".drag-end-label")
      .attr("y", this.barHeight / 2 + 4)
      .attr("fill", "#666")
      .attr("font-size", "11px")
      .attr("display", "none");
  },

  drawWeekLines(dayOfWeek) {
    this.gridGroup.selectAll("*").remove();
    // Walk from season start to end, draw a line on each matching day
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
    if (!this.snapEnabled) return date;
    const weekDay = this.settings.week_line_day ?? 6;
    const d = new Date(date);
    // Always snap backward to the most recent matching weekday
    const diff = (d.getDay() - weekDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
};
