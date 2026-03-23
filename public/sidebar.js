// sidebar.js — crop palette with drag source
const Sidebar = {
  init(crops, container) {
    this.crops = crops;
    this.container = container;
    this.render();
  },

  render() {
    const el = this.container;
    el.innerHTML = "";

    this.crops.forEach(crop => {
      const item = document.createElement("div");
      item.className = "crop-item";
      item.draggable = true;
      item.dataset.cropId = crop.id;
      item.innerHTML = `
        <div><strong>${crop.name}</strong></div>
        <div class="variety">${crop.variety || ""}</div>
        <div class="gdd-info">${crop.gdd} GDD (${crop.gdd_method_name})</div>
      `;

      item.addEventListener("dragstart", e => {
        e.dataTransfer.setData("application/json", JSON.stringify(crop));
        e.dataTransfer.effectAllowed = "copy";
      });

      el.appendChild(item);
    });
  },
};
