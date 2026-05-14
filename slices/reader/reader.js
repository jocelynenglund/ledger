// reader — the scrollable read-through. Splits slices into chapter sections,
// marks the active card, scrolls it into view, and applies lane filtering
// to element rows in-place (no re-render on filter change).
(function () {
  const ROMAN = ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
  const toRoman = (n) => ROMAN[n] || String(n);

  function mountReader(host) {
    const root = h('div', { class: 'dir-d-scroll' });
    const doc = h('div', { class: 'dir-d-doc' });
    root.appendChild(doc);
    host.appendChild(root);

    let lastModel = null;
    let lastActive = -1;
    let lastHidden = null;
    let cardByIndex = {};

    function render(state) {
      const { model, activeIndex, hiddenLanes } = state;

      if (!model) {
        clear(doc);
        lastModel = null;
        return;
      }

      // Rebuild structure when model swaps
      if (model !== lastModel) {
        clear(doc);
        cardByIndex = {};
        const chapters = model.chapters || [];
        const showHeaders = chapters.length > 1;

        chapters.forEach((c, ci) => {
          const section = h('section', { class: 'dir-d-section' });
          if (showHeaders) {
            section.appendChild(h('header', { class: 'dir-d-section-head' },
              h('div', { class: 'dir-d-section-eyebrow' },
                h('span', { class: 'dir-d-section-roman' }, toRoman(ci + 1)),
                h('span', {}, 'chapter'),
              ),
              h('h2', { class: 'dir-d-section-title' }, c.name),
            ));
          }
          c.sliceIndices.forEach(idx => {
            const card = window.createSliceCard(model.slices[idx], idx);
            cardByIndex[idx] = card;
            section.appendChild(card);
          });
          doc.appendChild(section);
        });

        lastModel = model;
        lastActive = -1;
        lastHidden = null;
        root.scrollTop = 0;
      }

      // Update active highlight + scroll
      if (activeIndex !== lastActive) {
        if (lastActive >= 0 && cardByIndex[lastActive]) {
          cardByIndex[lastActive].classList.remove('is-active');
        }
        const card = cardByIndex[activeIndex];
        if (card) {
          card.classList.add('is-active');
          const top = card.offsetTop - 24;
          root.scrollTo({ top, behavior: 'smooth' });
        }
        lastActive = activeIndex;
      }

      // Lane filter: toggle .is-hidden-by-lane on rows directly
      if (hiddenLanes !== lastHidden) {
        root.querySelectorAll('.dir-d-elrow').forEach(row => {
          const lane = row.dataset.lane;
          row.classList.toggle('is-hidden-by-lane', hiddenLanes.has(lane));
        });
        lastHidden = hiddenLanes;
      }
    }

    return { el: root, render };
  }

  window.mountReader = mountReader;
})();
