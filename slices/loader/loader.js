// loader — top-left bar for loading a JSON model from disk or samples.
(function () {
  function mountLoader(host) {
    const fileInput = h('input', {
      type: 'file', accept: '.json,application/json',
      style: { position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: '0' },
      onchange: async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        await loadFile(f);
        e.target.value = '';
      },
    });
    document.body.appendChild(fileInput);

    const loadBtn = h('button', {
      class: 'em-link-btn',
      onclick: () => fileInput.click(),
    }, 'load json');

    const loadCart = h('button', {
      class: 'em-link-btn',
      onclick: () => loadSample('assets/sample.json', 'Cart Shop'),
    }, 'cart shop');
    const loadReg = h('button', {
      class: 'em-link-btn',
      onclick: () => loadSample('assets/registration.json', 'Registration'),
    }, 'registration');

    const bar = h('div', { class: 'em-loader-bar' },
      h('div', { class: 'em-mark' }, 'ib'),
      h('div', { class: 'em-loader-bar-title' }, 'event model · read-through'),
      h('div', { class: 'em-loader-actions' }, loadBtn, loadCart, loadReg),
    );
    host.appendChild(bar);
    return bar;
  }

  async function loadFile(f) {
    try {
      const text = await f.text();
      await window.EM.loadJson(text);
      flashToast('Loaded ' + f.name);
    } catch (e) {
      console.error('[loader] failed to parse JSON:', e);
      flashToast(e.message ? 'Load failed: ' + e.message : 'Could not parse JSON', true);
    }
  }

  async function loadSample(url, label) {
    try {
      const r = await fetch(url);
      const text = await r.text();
      await window.EM.loadJson(text);
      flashToast('Loaded ' + label);
    } catch (e) {
      console.error(e);
      flashToast('Failed to load ' + label, true);
    }
  }

  function flashToast(msg, isError) {
    if (window.EM?.flashToast) return window.EM.flashToast(msg, isError);
    console.log(msg);
  }

  window.mountLoader = mountLoader;
})();
