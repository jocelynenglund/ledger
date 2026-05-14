// spec-card — given/when/then specification block within a slice.
(function () {
  function createSpecLine(item) {
    const kind = (item.type || 'EVENT').toLowerCase();
    const pairs = (item.fields || []).filter(f => f.example !== undefined);
    return h('div', { class: 'dir-d-specline' },
      h('span', { class: 'dir-d-specline-kind is-' + kind }, (item.type || '').toLowerCase()),
      h('span', { class: 'dir-d-specline-title' }, item.title),
      h('span', { class: 'dir-d-specline-fields' },
        ...pairs.map(f => h('span', { class: 'dir-d-specline-pair' },
          h('span', {}, f.name),
          '=',
          h('em', {}, String(f.example)),
        )),
      ),
    );
  }

  function createSpecCard(spec, n) {
    const isError = spec.then && !Array.isArray(spec.then) && spec.then.type === 'SPEC_ERROR';

    const rows = h('div', { class: 'dir-d-spec-rows' });

    (spec.given || []).forEach(g => {
      rows.appendChild(h('div', { class: 'dir-d-spec-row' },
        h('span', { class: 'dir-d-spec-tag' }, 'given'),
        createSpecLine(g),
      ));
    });
    (spec.when || []).forEach(w => {
      rows.appendChild(h('div', { class: 'dir-d-spec-row' },
        h('span', { class: 'dir-d-spec-tag' }, 'when'),
        createSpecLine(w),
      ));
    });
    if (Array.isArray(spec.then)) {
      spec.then.forEach(t => {
        rows.appendChild(h('div', { class: 'dir-d-spec-row' },
          h('span', { class: 'dir-d-spec-tag' }, 'then'),
          createSpecLine(t),
        ));
      });
    } else if (spec.then) {
      rows.appendChild(h('div', { class: 'dir-d-spec-row' },
        h('span', { class: 'dir-d-spec-tag is-error' }, 'then'),
        h('span', { class: 'dir-d-spec-error' }, '⚠ ' + (spec.then.title || 'error')),
      ));
    }

    return h('div', { class: 'dir-d-spec' + (isError ? ' is-error' : '') },
      h('div', { class: 'dir-d-spec-head' },
        h('span', { class: 'dir-d-spec-n' }, 'spec ' + n),
        h('span', { class: 'dir-d-spec-title' }, spec.title || ''),
      ),
      rows,
    );
  }

  window.createSpecCard = createSpecCard;
})();
