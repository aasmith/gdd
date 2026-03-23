// gdd-chart.js — D3 area chart showing cumulative GDD curves per method
const GddChart = {
  height: 200,
  margin: { top: 20, right: 16, bottom: 30, left: 50 },

  // Color palette for methods
  colors: ["#2d5016", "#7b3294", "#d95f02", "#1b9e77", "#e7298a", "#66a61e", "#e6ab02"],

  init(container, settings, methods) {
    this.container = container;
    this.settings = settings;
    this.methods = methods;

    const year = new Date().getFullYear();
    this.seasonStart = new Date(`${year}-${settings.season_start}T00:00:00`);
    this.seasonEnd = new Date(`${year}-${settings.season_end}T00:00:00`);
  },

  render() {
    const el = this.container;
    el.innerHTML = "";

    const fullWidth = el.clientWidth;
    const width = fullWidth - this.margin.left - this.margin.right;
    const height = this.height;

    const xScale = d3.scaleTime()
      .domain([this.seasonStart, this.seasonEnd])
      .range([0, width]);

    // Find max cumulative across all methods
    let maxCum = 0;
    this.methods.forEach(m => {
      const curve = GDD.getCurve(m.id);
      if (curve.length) {
        maxCum = Math.max(maxCum, curve[curve.length - 1].cumulative);
      }
    });

    const yScale = d3.scaleLinear()
      .domain([0, maxCum * 1.05])
      .range([height, 0]);

    const svg = d3.select(el)
      .append("svg")
      .attr("width", fullWidth)
      .attr("height", height + this.margin.top + this.margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat("%b")));

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => g.selectAll(".tick line").clone()
        .attr("x2", width)
        .attr("stroke", "#e8e8e8")
        .attr("stroke-width", 0.5));

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -38)
      .attr("text-anchor", "middle")
      .attr("fill", "#888")
      .attr("font-size", "11px")
      .text("Cumulative GDD");

    // Today line
    const today = new Date();
    if (today >= this.seasonStart && today <= this.seasonEnd) {
      g.append("line")
        .attr("x1", xScale(today)).attr("x2", xScale(today))
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,3");
    }

    // One line per method
    const line = d3.line()
      .x(d => xScale(new Date(d.date + "T00:00:00")))
      .y(d => yScale(d.cumulative));

    const area = d3.area()
      .x(d => xScale(new Date(d.date + "T00:00:00")))
      .y0(height)
      .y1(d => yScale(d.cumulative));

    this.methods.forEach((m, i) => {
      const curve = GDD.getCurve(m.id);
      if (!curve.length) return;
      const color = this.colors[i % this.colors.length];

      // Split into actual and projected
      const actual = curve.filter(d => !d.projected);
      const projected = curve.filter(d => d.projected);
      // Overlap by one point for seamless join
      if (actual.length && projected.length) {
        projected.unshift(actual[actual.length - 1]);
      }

      // Actual — solid area
      if (actual.length) {
        g.append("path")
          .datum(actual)
          .attr("fill", color)
          .attr("fill-opacity", 0.08)
          .attr("d", area);

        g.append("path")
          .datum(actual)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("d", line);
      }

      // Projected — dashed line, no fill
      if (projected.length) {
        g.append("path")
          .datum(projected)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,3")
          .attr("d", line);
      }
    });

    // Hover tooltip
    const tooltip = g.append("g").attr("display", "none");
    tooltip.append("line")
      .attr("class", "hover-line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#999").attr("stroke-width", 0.5);

    // Tooltip background box
    const tooltipBg = tooltip.append("rect")
      .attr("fill", "white")
      .attr("fill-opacity", 0.92)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    const tooltipText = tooltip.append("g");

    // Dots on each curve at hover position
    const dots = [];
    this.methods.forEach((m, i) => {
      const color = this.colors[i % this.colors.length];
      const dot = g.append("circle")
        .attr("r", 4)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .attr("display", "none");
      dots.push(dot);
    });

    const overlay = g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all");

    overlay.on("mousemove", (event) => {
      const [mx] = d3.pointer(event, g.node());
      const date = xScale.invert(mx);
      const dateStr = Timeline._formatDate(date);

      tooltip.attr("display", null);
      tooltip.select(".hover-line").attr("x1", mx).attr("x2", mx);

      // Find closest method to cursor Y
      const [, my] = d3.pointer(event, g.node());
      let closestIdx = -1;
      let closestDist = Infinity;

      const entries = [];
      this.methods.forEach((m, i) => {
        const curve = GDD.getCurve(m.id);
        const entry = curve.find(d => d.date >= dateStr);
        entries.push(entry);
        if (entry) {
          const cy = yScale(entry.cumulative);
          const dist = Math.abs(my - cy);
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
          dots[i]
            .attr("cx", mx)
            .attr("cy", cy)
            .attr("display", null);
        } else {
          dots[i].attr("display", "none");
        }
      });

      // Build tooltip content
      tooltipText.selectAll("*").remove();
      const padding = 8;
      let ty = padding + 12;

      // Date header
      tooltipText.append("text")
        .attr("x", padding)
        .attr("y", ty)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", "#333")
        .text(dateStr);
      ty += 16;

      this.methods.forEach((m, i) => {
        const entry = entries[i];
        if (!entry) return;
        const color = this.colors[i % this.colors.length];
        const isClosest = i === closestIdx;

        tooltipText.append("text")
          .attr("x", padding)
          .attr("y", ty)
          .attr("font-size", "11px")
          .attr("font-weight", isClosest ? "700" : "400")
          .attr("fill", isClosest ? color : "#555")
          .text(`${m.name}: ${entry.cumulative} (${entry.projected ? "proj" : "actual"})`);
        ty += 15;
      });

      // Size and position the background
      const textBbox = tooltipText.node().getBBox();
      const bgW = textBbox.width + padding * 2;
      const bgH = textBbox.height + padding * 2;

      // Flip tooltip to left side if near right edge
      const tooltipX = (mx + bgW + 12 > width) ? mx - bgW - 8 : mx + 8;

      tooltipBg
        .attr("x", tooltipX)
        .attr("y", 0)
        .attr("width", bgW)
        .attr("height", bgH);

      tooltipText.attr("transform", `translate(${tooltipX}, 0)`);
    });

    overlay.on("mouseleave", () => {
      tooltip.attr("display", "none");
      dots.forEach(d => d.attr("display", "none"));
    });

    // Legend
    const legend = document.createElement("div");
    legend.className = "chart-legend";
    this.methods.forEach((m, i) => {
      const color = this.colors[i % this.colors.length];
      const item = document.createElement("span");
      item.innerHTML = `<span class="swatch" style="background:${color}"></span>${m.name}`;
      legend.appendChild(item);
    });
    el.appendChild(legend);
  },
};
