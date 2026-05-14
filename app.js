// app — wires the slices together and subscribes them to the store.
(function () {
  function boot() {
    const root = document.getElementById('root');

    window.mountLoader(document.body);

    const chrome = window.mountChrome(root);

    // Reader + toc live inside chrome body
    const shell = h('div', { class: 'dir-d-shell' });
    const tocMount = h('div', { class: 'dir-d-toc-mount' });
    const readerMount = h('div', { class: 'dir-d-reader-mount', style: { minWidth: 0, height: '100%' } });
    shell.appendChild(tocMount);
    shell.appendChild(readerMount);

    const toc = window.mountToc(tocMount);
    const reader = window.mountReader(readerMount);

    function attachShellOnce() {
      const slot = chrome.bodySlot();
      if (slot && !slot.contains(shell)) {
        clear(slot);
        slot.appendChild(shell);
      }
      const state = window.STORE.get();
      const hasToc = (state.model?.chapters?.length || 0) >= 1;
      shell.classList.toggle('no-toc', !hasToc);
    }

    window.STORE.subscribe((state) => {
      chrome.render(state);
      attachShellOnce();
      toc.render(state);
      reader.render(state);
    });
  }

  // Wait for the default model load before booting so the first render has data.
  window.EM.defaultModelPromise.then(() => {
    const def = (typeof window.defaultSample === 'function') ? window.defaultSample() : null;
    if (def) window.STORE.setSample(def);
    boot();
  });
})();
