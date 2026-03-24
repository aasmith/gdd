// api.js — fetch wrappers for all endpoints
const API = {
  async getSettings() {
    return (await fetch("/api/settings")).json();
  },

  async updateSettings(data) {
    return (await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async getGddMethods() {
    return (await fetch("/api/gdd_methods")).json();
  },

  async createMethod(data) {
    return (await fetch("/api/gdd_methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async updateMethod(id, data) {
    return (await fetch(`/api/gdd_methods/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async deleteMethod(id) {
    return (await fetch(`/api/gdd_methods/${id}`, { method: "DELETE" })).json();
  },

  async getCrops() {
    return (await fetch("/api/crops")).json();
  },

  async createCrop(data) {
    return (await fetch("/api/crops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async updateCrop(id, data) {
    return (await fetch(`/api/crops/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async deleteCrop(id) {
    return (await fetch(`/api/crops/${id}`, { method: "DELETE" })).json();
  },

  async getSheets() {
    return (await fetch("/api/sheets")).json();
  },

  async createSheet(data) {
    return (await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async updateSheet(id, data) {
    return (await fetch(`/api/sheets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async deleteSheet(id) {
    return (await fetch(`/api/sheets/${id}`, { method: "DELETE" })).json();
  },

  async getPlantings(sheetId) {
    const url = sheetId ? `/api/plantings?sheet_id=${sheetId}` : "/api/plantings";
    return (await fetch(url)).json();
  },

  async createPlanting(data) {
    return (await fetch("/api/plantings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async updatePlanting(id, data) {
    return (await fetch(`/api/plantings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();
  },

  async deletePlanting(id) {
    return (await fetch(`/api/plantings/${id}`, { method: "DELETE" })).json();
  },

  async getSeasonCurve(methodId, year) {
    const url = `/api/gdd/cumulative?method_id=${methodId}` + (year ? `&year=${year}` : "");
    return (await fetch(url)).json();
  },
};
