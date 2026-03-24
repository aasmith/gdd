// api.js — fetch wrappers for all endpoints

const SaveStatus = {
  _el: null,
  _timeout: null,

  get el() {
    if (!this._el) this._el = document.getElementById("save-status");
    return this._el;
  },

  show(state, msg) {
    const el = this.el;
    if (!el) return;
    clearTimeout(this._timeout);
    el.textContent = msg;
    el.className = state;
    if (state === "saved") {
      this._timeout = setTimeout(() => el.classList.add("fade"), 2000);
    }
  },

  async wrap(fn) {
    this.show("saving", "Saving\u2026");
    try {
      const result = await fn();
      this.show("saved", "Saved");
      return result;
    } catch (e) {
      this.show("error", "Error saving");
      throw e;
    }
  },
};

const API = {
  async getSettings() {
    return (await fetch("/api/settings")).json();
  },

  async updateSettings(data) {
    return SaveStatus.wrap(() => fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async getGddMethods() {
    return (await fetch("/api/gdd_methods")).json();
  },

  async createMethod(data) {
    return SaveStatus.wrap(() => fetch("/api/gdd_methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async updateMethod(id, data) {
    return SaveStatus.wrap(() => fetch(`/api/gdd_methods/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async deleteMethod(id) {
    return SaveStatus.wrap(() => fetch(`/api/gdd_methods/${id}`, { method: "DELETE" }).then(r => r.json()));
  },

  async getCrops() {
    return (await fetch("/api/crops")).json();
  },

  async createCrop(data) {
    return SaveStatus.wrap(() => fetch("/api/crops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async updateCrop(id, data) {
    return SaveStatus.wrap(() => fetch(`/api/crops/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async deleteCrop(id) {
    return SaveStatus.wrap(() => fetch(`/api/crops/${id}`, { method: "DELETE" }).then(r => r.json()));
  },

  async getSheets() {
    return (await fetch("/api/sheets")).json();
  },

  async createSheet(data) {
    return SaveStatus.wrap(() => fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async updateSheet(id, data) {
    return SaveStatus.wrap(() => fetch(`/api/sheets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async deleteSheet(id) {
    return SaveStatus.wrap(() => fetch(`/api/sheets/${id}`, { method: "DELETE" }).then(r => r.json()));
  },

  async getPlantings(sheetId) {
    const url = sheetId ? `/api/plantings?sheet_id=${sheetId}` : "/api/plantings";
    return (await fetch(url)).json();
  },

  async createPlanting(data) {
    return SaveStatus.wrap(() => fetch("/api/plantings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async updatePlanting(id, data) {
    return SaveStatus.wrap(() => fetch(`/api/plantings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()));
  },

  async deletePlanting(id) {
    return SaveStatus.wrap(() => fetch(`/api/plantings/${id}`, { method: "DELETE" }).then(r => r.json()));
  },

  async getSeasonCurve(methodId, year) {
    const url = `/api/gdd/cumulative?method_id=${methodId}` + (year ? `&year=${year}` : "");
    return (await fetch(url)).json();
  },
};
