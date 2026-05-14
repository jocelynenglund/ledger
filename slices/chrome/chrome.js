// chrome — top header, lane filter chips, and slice scrubber.
// Re-renders fully whenever the model swaps; partial updates for
// activeIndex and hiddenLanes changes.
(function () {
  function mountChrome(host) {
    const root = h('div', { class: 'em-chrome' });
    host.appendChild(root);

    let lastModel = null;
    let lastActive = -1;
    let lastHidden = null;

    function render(state) {
      const { model, activeIndex, hiddenLanes } = state;

      if (!model) {
        clear(root);
        root.appendChild(h('div', { class: 'em-loading' }, 'Loading…'));
        lastModel = null;
        return;
      }

      // Full rebuild when model changes (lanes / counts / titles all swap).
      if (model !== lastModel) {
        clear(root);
        root.appendChild(buildHeader(model));
        root.appendChild(buildControls(model));
        root.appendChild(h('div', { class: 'em-chrome-body', id: 'chrome-body-slot' }));
        lastModel = model;
        lastActive = -1;
        lastHidden = null;
      }

      // Partial: active-slice metadata in header
      if (activeIndex !== lastActive) {
        const count = root.querySelector('.em-chrome-count');
        const name = root.querySelector('.em-chrome-slicename');
        const total = model.slices.length;
        if (count) count.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
        if (name) name.textContent = model.slices[activeIndex]?.title || '—';

        const range = root.querySelector('.em-scrub input[type=range]');
        if (range) range.value = String(activeIndex);

        root.querySelectorAll('.em-tick').forEach((b, i) => {
          b.classList.toggle('is-active', i === activeIndex);
        });
        lastActive = activeIndex;
      }

      // Partial: lane chip on/off
      if (hiddenLanes !== lastHidden) {
        root.querySelectorAll('.em-chip').forEach(chip => {
          const lane = chip.dataset.lane;
          chip.classList.toggle('is-off', hiddenLanes.has(lane));
          chip.classList.toggle('is-on', !hiddenLanes.has(lane));
        });
        lastHidden = hiddenLanes;
      }
    }

    function buildHeader(model) {
      return h('div', { class: 'em-chrome-head' },
        h('div', { class: 'em-chrome-titlewrap' },
          h('div', { class: 'em-chrome-eyebrow' },
            h('span', {}, model.context || ''),
            model.chapter ? h('span', { class: 'em-dot' }, '·') : null,
            model.chapter ? h('span', {}, model.chapter) : null,
          ),
          h('h2', { class: 'em-chrome-title' }, 'Read-through'),
          h('div', { class: 'em-chrome-sub' }, 'The model as a numbered document. Sidebar at the left lists chapters — click any heading to jump.'),
        ),
        h('div', { class: 'em-chrome-meta' },
          h('span', { class: 'em-chrome-count' }, '01 / ' + String(model.slices.length).padStart(2, '0')),
          h('span', { class: 'em-chrome-slicename' }, model.slices[0]?.title || '—'),
        ),
      );
    }

    function buildControls(model) {
      const lanes = model.lanes || [];
      const total = model.slices.length;

      const chipRow = h('div', { class: 'em-lane-row' },
        h('span', { class: 'em-label' }, 'lanes'),
        ...lanes.map(lane => h('button', {
          class: 'em-chip is-on',
          'data-lane': lane,
          onclick: () => window.STORE.toggleLane(lane),
        }, h('span', { class: 'em-chip-dot' }), lane)),
      );

      const range = h('input', {
        type: 'range', min: 0, max: Math.max(0, total - 1), value: 0,
        oninput: (e) => window.STORE.setActive(Number(e.target.value)),
      });

      const ticks = h('div', { class: 'em-scrub-ticks' },
        ...model.slices.map((s, i) => h('button', {
          class: 'em-tick' + (i === 0 ? ' is-active' : ''),
          title: s.title,
          onclick: () => window.STORE.setActive(i),
        }, h('span', {}, String(i + 1)))),
      );

      const transport = h('div', { class: 'em-transport' },
        h('button', {
          class: 'em-tbtn',
          title: 'Previous',
          onclick: () => window.STORE.setActive(window.STORE.get().activeIndex - 1),
        }, icon('M18 4L8 12l10 8M6 4v16')),
        h('button', {
          class: 'em-tbtn',
          title: 'Next',
          onclick: () => window.STORE.setActive(window.STORE.get().activeIndex + 1),
        }, icon('M6 4l10 8-10 8M18 4v16')),
        h('div', { class: 'em-scrub' }, range, ticks),
      );

      return h('div', { class: 'em-chrome-controls' }, chipRow, transport);
    }

    function icon(d) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14'); svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6');
      svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
      return svg;
    }

    return { el: root, render, bodySlot: () => root.querySelector('#chrome-body-slot') };
  }

  window.mountChrome = mountChrome;
})();
