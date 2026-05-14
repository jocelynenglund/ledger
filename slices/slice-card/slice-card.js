// slice-card — one "chapter" of the read-through: number gutter + body
// with elements + specs. Composes element-row + spec-card.
(function () {
  function buildSentence(slice) {
    const cmd = slice.commands[0];
    const evt = slice.events[0];
    const rm  = slice.readmodels[0];
    if (slice.sliceType === 'STATE_VIEW' && rm) {
      const sources = (rm.deps || []).filter(d => d.type === 'INBOUND').map(d => d.title);
      if (sources.length) return 'Projects ' + sources.join(', ') + ' into the ' + rm.title + ' read model.';
      return 'Exposes the ' + rm.title + ' read model.';
    }
    if (cmd && evt) return cmd.title + ' produces ' + evt.title + '.';
    if (evt) return 'Records ' + evt.title + '.';
    if (cmd) return 'Accepts ' + cmd.title + '.';
    return slice.title;
  }

  function createSliceCard(slice, index) {
    const type = (slice.sliceType || '').toLowerCase().replace('_', '-');
    const typeLabel = slice.sliceType === 'STATE_VIEW' ? 'state view' : 'state change';

    const elements = h('div', { class: 'dir-d-elements' });
    const allEls = [
      ...slice.commands,
      ...slice.events,
      ...slice.readmodels,
      ...(slice.processors || []),
    ];
    allEls.forEach(el => elements.appendChild(window.createElementRow(el)));

    const eyebrow = h('div', { class: 'dir-d-eyebrow' },
      h('span', { class: 'dir-d-tag dir-d-tag-' + type }, typeLabel),
      slice.specifications?.length
        ? h('span', { class: 'dir-d-tag dir-d-tag-spec' },
            slice.specifications.length + ' spec' + (slice.specifications.length > 1 ? 's' : ''))
        : null,
    );

    const specs = slice.specifications?.length
      ? h('div', { class: 'dir-d-specs' },
          ...slice.specifications.map((sp, si) => window.createSpecCard(sp, si + 1)))
      : null;

    const card = h('section', {
      class: 'dir-d-chapter',
      'data-idx': String(index),
      onclick: () => window.STORE.setActive(index),
    },
      h('div', { class: 'dir-d-num' },
        h('span', { class: 'dir-d-num-n' }, String(index + 1).padStart(2, '0')),
        h('span', { class: 'dir-d-num-rule' }),
      ),
      h('div', { class: 'dir-d-body' },
        eyebrow,
        h('h3', { class: 'dir-d-title' }, slice.title),
        h('p', { class: 'dir-d-sentence' }, buildSentence(slice)),
        elements,
        specs,
      ),
    );

    return card;
  }

  window.createSliceCard = createSliceCard;
})();
