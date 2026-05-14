// Read-only viewer state: which slice is active, which lanes are hidden.
// Model itself comes from window.EM. The store re-emits when either the
// model OR the local state changes — components subscribe once and render.
(function () {
  const listeners = new Set();
  const state = {
    model: window.EM.getModel(),
    activeIndex: 0,
    hiddenLanes: new Set(),
    currentSample: null,   // null = custom upload or empty; else a SAMPLES entry
  };

  function publish() {
    listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  }

  function setActive(i) {
    const total = state.model?.slices?.length || 0;
    if (total === 0) return;
    const next = Math.max(0, Math.min(total - 1, i));
    if (next === state.activeIndex) return;
    state.activeIndex = next;
    publish();
  }

  function toggleLane(lane) {
    const h = new Set(state.hiddenLanes);
    h.has(lane) ? h.delete(lane) : h.add(lane);
    state.hiddenLanes = h;
    publish();
  }

  // When the underlying model swaps, drop lane filter + reset to first slice.
  window.EM.subscribe((m) => {
    state.model = m;
    state.activeIndex = 0;
    state.hiddenLanes = new Set();
    publish();
  });

  function setSample(sample) {
    state.currentSample = sample || null;
    publish();
  }

  window.STORE = {
    get: () => state,
    subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    setActive,
    toggleLane,
    isHidden: (lane) => state.hiddenLanes.has(lane),
    setSample,
  };
})();
