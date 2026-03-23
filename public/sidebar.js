// sidebar.js — crop palette and GDD method management
const Sidebar = {
  crops: [],
  methods: [],
  onCropsChanged: null,
  onMethodsChanged: null,

  init(crops, methods) {
    this.crops = crops;
    this.methods = methods;
    this.cropContainer = document.getElementById("crop-list");
    this.methodContainer = document.getElementById("method-list");

    document.getElementById("add-crop-btn").addEventListener("click", () => this.showCropForm());
    document.getElementById("add-method-btn").addEventListener("click", () => this.showMethodForm());

    this.renderMethods();
    this.renderCrops();
  },

  // --- GDD Methods ---

  renderMethods() {
    const el = this.methodContainer;
    el.innerHTML = "";

    this.methods.forEach(method => {
      const item = document.createElement("div");
      item.className = "method-item";
      item.innerHTML = `
        <div class="method-info">
          <strong>${method.name}</strong>
          <span class="method-range">${method.base_f}\u00b0\u2013${method.cap_f}\u00b0F</span>
        </div>
        <div class="item-actions">
          <button class="btn-edit" title="Edit">\u270e</button>
          <button class="btn-delete" title="Delete">\u00d7</button>
        </div>
      `;
      item.querySelector(".btn-edit").addEventListener("click", () => this.showMethodForm(method, item));
      item.querySelector(".btn-delete").addEventListener("click", () => this.deleteMethod(method));
      el.appendChild(item);
    });
  },

  showMethodForm(existing, replaceEl) {
    const editing = !!existing;
    const form = document.createElement("div");
    form.className = "sidebar-form";
    form.innerHTML = `
      <input type="text" id="mf-name" placeholder="Name (e.g. Warm)" value="${editing ? existing.name : ""}">
      <input type="number" id="mf-base" placeholder="Base \u00b0F" value="${editing ? existing.base_f : ""}">
      <input type="number" id="mf-cap" placeholder="Cap \u00b0F" value="${editing ? existing.cap_f : ""}">
      <div class="form-buttons">
        <button class="btn-save">${editing ? "Update" : "Add"}</button>
        <button class="btn-cancel">Cancel</button>
      </div>
    `;

    form.querySelector(".btn-save").addEventListener("click", async () => {
      const data = {
        name: form.querySelector("#mf-name").value,
        base_f: parseFloat(form.querySelector("#mf-base").value),
        cap_f: parseFloat(form.querySelector("#mf-cap").value),
      };
      if (!data.name || isNaN(data.base_f) || isNaN(data.cap_f)) return;

      if (editing) {
        await API.updateMethod(existing.id, data);
      } else {
        await API.createMethod(data);
      }
      if (this.onMethodsChanged) this.onMethodsChanged();
    });

    form.querySelector(".btn-cancel").addEventListener("click", () => {
      if (editing && replaceEl) {
        form.replaceWith(replaceEl);
      } else {
        form.remove();
      }
    });

    if (editing && replaceEl) {
      replaceEl.replaceWith(form);
    } else {
      this.methodContainer.appendChild(form);
    }
  },

  async deleteMethod(method) {
    if (!confirm(`Delete method "${method.name}"?`)) return;
    await API.deleteMethod(method.id);
    if (this.onMethodsChanged) this.onMethodsChanged();
  },

  // --- Crops ---

  renderCrops() {
    const el = this.cropContainer;
    el.innerHTML = "";

    this.crops.forEach(crop => {
      const item = document.createElement("div");
      item.className = "crop-item";
      item.draggable = true;
      item.dataset.cropId = crop.id;
      item.innerHTML = `
        <div class="crop-header">
          <strong>${crop.name}</strong>
          <div class="item-actions">
            <button class="btn-edit" title="Edit">\u270e</button>
            <button class="btn-delete" title="Delete">\u00d7</button>
          </div>
        </div>
        <div class="variety">${crop.variety || ""}</div>
        <div class="gdd-info">${crop.gdd} GDD (${crop.gdd_method_name})</div>
      `;

      item.addEventListener("dragstart", e => {
        e.dataTransfer.setData("application/json", JSON.stringify(crop));
        e.dataTransfer.effectAllowed = "copy";
      });

      item.querySelector(".btn-edit").addEventListener("click", e => {
        e.stopPropagation();
        this.showCropForm(crop, item);
      });

      item.querySelector(".btn-delete").addEventListener("click", e => {
        e.stopPropagation();
        this.deleteCrop(crop);
      });

      el.appendChild(item);
    });
  },

  showCropForm(existing, replaceEl) {
    const editing = !!existing;
    const form = document.createElement("div");
    form.className = "sidebar-form";

    const methodOptions = this.methods.map(m =>
      `<option value="${m.id}" ${editing && existing.gdd_method_id === m.id ? "selected" : ""}>${m.name} (${m.base_f}\u00b0\u2013${m.cap_f}\u00b0F)</option>`
    ).join("");

    form.innerHTML = `
      <input type="text" id="cf-name" placeholder="Crop name" value="${editing ? existing.name : ""}">
      <input type="text" id="cf-variety" placeholder="Variety" value="${editing ? (existing.variety || "") : ""}">
      <input type="number" id="cf-gdd" placeholder="GDD" value="${editing ? existing.gdd : ""}">
      <select id="cf-method">${methodOptions}</select>
      <div class="form-buttons">
        <button class="btn-save">${editing ? "Update" : "Add"}</button>
        <button class="btn-cancel">Cancel</button>
      </div>
    `;

    form.querySelector(".btn-save").addEventListener("click", async () => {
      const data = {
        name: form.querySelector("#cf-name").value,
        variety: form.querySelector("#cf-variety").value || null,
        gdd: parseInt(form.querySelector("#cf-gdd").value),
        gdd_method_id: parseInt(form.querySelector("#cf-method").value),
      };
      if (!data.name || isNaN(data.gdd)) return;

      if (editing) {
        await API.updateCrop(existing.id, data);
      } else {
        await API.createCrop(data);
      }
      if (this.onCropsChanged) this.onCropsChanged();
    });

    form.querySelector(".btn-cancel").addEventListener("click", () => {
      if (editing && replaceEl) {
        form.replaceWith(replaceEl);
      } else {
        form.remove();
      }
    });

    if (editing && replaceEl) {
      replaceEl.replaceWith(form);
    } else {
      this.cropContainer.appendChild(form);
    }
  },

  async deleteCrop(crop) {
    if (!confirm(`Delete crop "${crop.name} ${crop.variety || ""}"?`)) return;
    await API.deleteCrop(crop.id);
    if (this.onCropsChanged) this.onCropsChanged();
  },
};
