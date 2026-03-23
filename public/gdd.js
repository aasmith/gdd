// gdd.js — client-side GDD curve math
// Preloads season curves per method for instant bar-width calculation during drag.

const GDD = {
  curves: {}, // { methodId: [{date, gdd, cumulative, projected}, ...] }

  loadCurve(methodId, data) {
    this.curves[methodId] = data;
  },

  getCurve(methodId) {
    return this.curves[methodId] || [];
  },

  // Find cumulative GDD at a given date for a method
  cumulativeAt(methodId, dateStr) {
    const curve = this.curves[methodId];
    if (!curve) return 0;
    const entry = curve.find(r => r.date >= dateStr);
    if (!entry) return curve.length ? curve[curve.length - 1].cumulative : 0;
    if (entry.date === dateStr) return entry.cumulative;
    // dateStr is before season start
    return 0;
  },

  // Given a start date and GDD target, find the projected end date.
  // Returns null if the crop won't finish within the season.
  dateForGdd(methodId, startDateStr, targetGdd) {
    const curve = this.curves[methodId];
    if (!curve || !curve.length) return null;

    const startIdx = curve.findIndex(r => r.date >= startDateStr);
    if (startIdx < 0) return null;

    // Cumulative at start (before the start date's GDD is counted)
    const baseCum = startIdx > 0 ? curve[startIdx - 1].cumulative : 0;
    const needed = baseCum + targetGdd;

    for (let i = startIdx; i < curve.length; i++) {
      if (curve[i].cumulative >= needed) return curve[i].date;
    }
    return null; // won't finish
  },

  // GDD accumulated between two dates for a given method
  gddBetween(methodId, startDateStr, endDateStr) {
    const startCum = this.cumulativeAt(methodId, startDateStr);
    const endCum = this.cumulativeAt(methodId, endDateStr);
    return Math.max(0, endCum - startCum);
  },

  // Total season GDD for a method
  seasonTotal(methodId) {
    const curve = this.curves[methodId];
    if (!curve || !curve.length) return 0;
    return curve[curve.length - 1].cumulative;
  },

  // GDD remaining from a date to season end
  remainingFrom(methodId, dateStr) {
    const total = this.seasonTotal(methodId);
    const soFar = this.cumulativeAt(methodId, dateStr);
    return Math.max(0, total - soFar);
  },
};
