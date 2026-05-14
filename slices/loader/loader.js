// loader — settings affordance in the top-right corner. A small cog opens
// a panel with: load json, sample swaps, and an about blurb pointing to
// app.eventmodelers.de (where source models are authored).
(function () {
  const ABOUT_URL = 'https://app.eventmodelers.de';

  function mountLoader(host) {
    const fileInput = h('input', {
      type: 'file', accept: '.json,application/json',
      style: { position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: '0' },
      onchange: async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        await loadFile(f);
        e.target.value = '';
        close();
      },
    });
    document.body.appendChild(fileInput);

    const visibleSamples = (window.SAMPLES || []).filter(s => s.visible);
    const sampleRows = visibleSamples.map(s =>
      rowBtn('Sample · ' + s.label, () => loadSampleAndClose(s))
    );

    const panel = h('div', { class: 'em-settings-panel', role: 'menu' },
      section('Load',
        rowBtn('Load JSON from disk…', () => fileInput.click()),
        ...sampleRows,
      ),
      section('About',
        h('p', { class: 'em-settings-about' },
          'Ledger is a read-through viewer for event-model JSON. ',
          'Source models are authored in ',
          h('a', { href: ABOUT_URL, target: '_blank', rel: 'noopener', class: 'em-settings-link' }, 'app.eventmodelers.de'),
          ' — export from there, then load here.',
        ),
      ),
    );

    const cog = h('button', {
      class: 'em-settings-cog',
      title: 'Settings',
      'aria-label': 'Settings',
      onclick: (e) => { e.stopPropagation(); toggle(); },
    }, cogIcon());

    const bar = h('div', { class: 'em-settings-bar' }, cog, panel);
    host.appendChild(bar);

    let isOpen = false;
    function toggle() { isOpen ? close() : open(); }
    function open() {
      isOpen = true;
      bar.classList.add('is-open');
      setTimeout(() => document.addEventListener('click', onDocClick), 0);
      document.addEventListener('keydown', onKey);
    }
    function close() {
      isOpen = false;
      bar.classList.remove('is-open');
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    }
    function onDocClick(e) {
      if (!bar.contains(e.target)) close();
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    async function loadSampleAndClose(sample) {
      await loadSample(sample);
      close();
    }

    return bar;
  }

  function section(title, ...children) {
    return h('div', { class: 'em-settings-section' },
      h('div', { class: 'em-settings-section-title' }, title),
      ...children,
    );
  }

  function rowBtn(label, onclick) {
    return h('button', { class: 'em-settings-row', role: 'menuitem', onclick }, label);
  }

  function cogIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '3');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    g.setAttribute('d', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z');
    svg.appendChild(g); svg.appendChild(c);
    return svg;
  }

  async function loadFile(f) {
    try {
      const text = await f.text();
      await window.EM.loadJson(text);
      window.STORE.setSample(null);   // custom upload — no source link
      flashToast('Loaded ' + f.name);
    } catch (e) {
      console.error('[loader] failed to parse JSON:', e);
      flashToast(e.message ? 'Load failed: ' + e.message : 'Could not parse JSON', true);
    }
  }

  async function loadSample(sample) {
    try {
      const r = await fetch(sample.jsonUrl);
      const text = await r.text();
      await window.EM.loadJson(text);
      window.STORE.setSample(sample);
      flashToast('Loaded ' + sample.label);
    } catch (e) {
      console.error(e);
      flashToast('Failed to load ' + sample.label, true);
    }
  }

  function flashToast(msg, isError) {
    if (window.EM?.flashToast) return window.EM.flashToast(msg, isError);
    console.log(msg);
  }

  window.mountLoader = mountLoader;
})();
