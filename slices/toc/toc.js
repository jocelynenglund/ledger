// toc — chapter sidebar for the read-through. Chapters collapse to an
// overview by default; the chapter containing the active slice auto-expands.
// Clicking a chapter header toggles its slice list without jumping the doc;
// the small chevron is the affordance.
(function () {
  const ROMAN = ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
  const toRoman = (n) => ROMAN[n] || String(n);

  function mountToc(host) {
    const root = h('aside', { class: 'dir-d-toc', style: { display: 'none' } });
    host.appendChild(root);

    let lastModel = null;
    let lastActive = -1;
    let openChapters = new Set();   // chapter ids the user has expanded
    let collapseAllBtn = null;

    function render(state) {
      const { model, activeIndex } = state;

      if (!model || !model.chapters || model.chapters.length <= 1) {
        root.style.display = 'none';
        lastModel = model;
        return;
      }

      if (model !== lastModel) {
        clear(root);
        root.style.display = '';
        openChapters = new Set();   // reset on model swap

        const head = h('div', { class: 'dir-d-toc-head' },
          h('div', { class: 'dir-d-toc-eyebrow' }, 'contents'),
          h('div', { class: 'dir-d-toc-headtools' },
            h('button', {
              class: 'dir-d-toc-tool',
              title: 'Expand all',
              onclick: () => { model.chapters.forEach(c => openChapters.add(c.id)); applyOpenState(); },
            }, 'expand'),
            h('button', {
              class: 'dir-d-toc-tool',
              title: 'Collapse all',
              onclick: () => { openChapters = new Set(); applyOpenState(); },
            }, 'collapse'),
          ),
        );
        root.appendChild(head);

        const ol = h('ol', { class: 'dir-d-toc-list' });
        model.chapters.forEach((c, ci) => {
          ol.appendChild(buildChapter(c, ci, model));
        });
        root.appendChild(ol);
        lastModel = model;
        lastActive = -1;
      }

      // Auto-expand chapter containing the active slice
      if (activeIndex !== lastActive) {
        const activeChapter = model.chapters.find(c => c.sliceIndices.includes(activeIndex));
        if (activeChapter && !openChapters.has(activeChapter.id)) {
          openChapters.add(activeChapter.id);
        }
        applyOpenState();

        const activeChapterIdx = model.chapters.indexOf(activeChapter);
        root.querySelectorAll('.dir-d-toc-chapter').forEach((li, i) => {
          li.classList.toggle('is-active', i === activeChapterIdx);
        });
        root.querySelectorAll('.dir-d-toc-slice').forEach(btn => {
          const idx = Number(btn.dataset.idx);
          btn.classList.toggle('is-current', idx === activeIndex);
        });
        lastActive = activeIndex;
      }
    }

    function applyOpenState() {
      root.querySelectorAll('.dir-d-toc-chapter').forEach(li => {
        const id = li.dataset.chapterId;
        li.classList.toggle('is-open', openChapters.has(id));
      });
    }

    function buildChapter(c, ci, model) {
      const sliceList = h('ul', { class: 'dir-d-toc-slices' },
        ...c.sliceIndices.map(idx => {
          const slice = model.slices[idx];
          return h('li', {},
            h('button', {
              class: 'dir-d-toc-slice',
              'data-idx': String(idx),
              onclick: () => window.STORE.setActive(idx),
            },
              h('span', { class: 'dir-d-toc-slice-n' }, String(idx + 1).padStart(2, '0')),
              h('span', { class: 'dir-d-toc-slice-title' }, slice.title),
              h('span', { class: 'dir-d-toc-slice-type is-' + slice.sliceType.toLowerCase().replace('_', '-') }),
            ),
          );
        }),
      );

      // Chevron toggles open/closed without navigating; chapter name navigates.
      const toggleChevron = h('button', {
        class: 'dir-d-toc-chevron',
        title: 'Expand chapter',
        onclick: (e) => {
          e.stopPropagation();
          if (openChapters.has(c.id)) openChapters.delete(c.id);
          else openChapters.add(c.id);
          applyOpenState();
        },
      }, chevron());

      const firstIdx = c.sliceIndices[0];
      return h('li', { class: 'dir-d-toc-chapter', 'data-chapter-id': c.id },
        h('div', { class: 'dir-d-toc-chapter-row' },
          toggleChevron,
          h('button', {
            class: 'dir-d-toc-chapter-btn',
            onclick: () => {
              openChapters.add(c.id);
              applyOpenState();
              window.STORE.setActive(firstIdx);
            },
          },
            h('span', { class: 'dir-d-toc-roman' }, toRoman(ci + 1)),
            h('span', { class: 'dir-d-toc-chapter-name' }, c.name),
            h('span', { class: 'dir-d-toc-count' }, String(c.sliceIndices.length)),
          ),
        ),
        sliceList,
      );
    }

    function chevron() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '10'); svg.setAttribute('height', '10');
      svg.setAttribute('viewBox', '0 0 10 10'); svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6');
      svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M3 2.5l3 2.5-3 2.5');
      svg.appendChild(p);
      return svg;
    }

    return { el: root, render };
  }

  window.mountToc = mountToc;
})();
