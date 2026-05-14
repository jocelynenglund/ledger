// element-row — one command/event/readmodel/processor line item.
(function () {
  const KIND_LABEL = { COMMAND: 'cmd', EVENT: 'evt', READMODEL: 'rm', PROCESSOR: 'proc' };

  function createElementRow(el) {
    const fields = el.fields?.length
      ? h('ul', { class: 'dir-d-elrow-fields' },
          ...el.fields.map((f, i) => h('li', { key: i },
            h('span', { class: 'dir-d-fname' }, f.name),
            h('span', { class: 'dir-d-ftype' }, f.type || ''),
          )),
        )
      : null;

    return h('div', {
      class: 'dir-d-elrow is-' + (el.kind || '').toLowerCase(),
      'data-lane': el.lane || '',
    },
      h('div', { class: 'dir-d-elrow-head' },
        h('span', { class: 'dir-d-elrow-kind' }, KIND_LABEL[el.kind] || (el.kind || '').toLowerCase()),
        h('span', { class: 'dir-d-elrow-title' }, el.title),
        h('span', { class: 'dir-d-elrow-lane' }, el.lane || ''),
      ),
      fields,
    );
  }

  window.createElementRow = createElementRow;
})();
