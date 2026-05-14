/* Event model parser + global state.
   Accepts two formats:
   (A) Slice-based ("config.json"): { slices: [...], context, ... }
   (B) Board-based whiteboard export: { boards, nodes, metadata, ... }
       — reconstructed into slices via edge-walk heuristics.
*/
(function () {
  const TONE = {
    COMMAND:   { key: 'sky',  bg: '#dde6ee', fg: '#3d5b78', edge: '#6b8aa6' },
    EVENT:     { key: 'sun',  bg: '#f7dd86', fg: '#5a4400', edge: '#d9a823' },
    READMODEL: { key: 'sage', bg: '#d0dccb', fg: '#3f5240', edge: '#5a7058' },
    PROCESSOR: { key: 'rust', bg: '#e4a48d', fg: '#9b3a1d', edge: '#c45230' },
    SCREEN:    { key: 'ink',  bg: '#e6dfcd', fg: '#4a4238', edge: '#a39a86' },
    SPEC:      { key: 'paper', bg: '#f6f1e4', fg: '#4a4238', edge: '#c5b99e' },
  };

  // ---------- Format A: native slice schema ----------
  function normalizeSliceFormat(raw) {
    const slices = (raw.slices || []).map((s, idx) => {
      const commands = (s.commands || []).map(c => ({
        kind: 'COMMAND',
        id: c.id, title: c.title, fields: c.fields || [],
        lane: c.lane || 'Interaction',
        deps: c.dependencies || [],
        description: c.description || '',
      }));
      const events = (s.events || []).map(e => ({
        kind: 'EVENT',
        id: e.id, title: e.title, fields: e.fields || [],
        lane: e.lane || 'Events',
        deps: e.dependencies || [],
        description: e.description || '',
      }));
      const readmodels = (s.readmodels || []).map(r => ({
        kind: 'READMODEL',
        id: r.id, title: r.title, fields: r.fields || [],
        lane: r.lane || 'Interaction',
        deps: r.dependencies || [],
        description: r.description || '',
      }));
      const processors = (s.processors || []).map(p => ({
        kind: 'PROCESSOR',
        id: p.id, title: p.title, fields: p.fields || [],
        lane: p.lane || 'Automation',
        deps: p.dependencies || [],
      }));
      return {
        id: s.id,
        index: idx,
        title: s.title,
        sliceType: s.sliceType,
        context: s.context,
        chapter: s.chapter,
        commands, events, readmodels, processors,
        specifications: s.specifications || [],
      };
    });
    return finalize(slices, raw.context || 'Untitled', slices[0]?.chapter || '');
  }

  // ---------- Format B: whiteboard/board schema ----------
  function normalizeBoardFormat(raw) {
    const boardIds = Object.keys(raw.boards || {});
    const allSlices = [];
    let primaryContext = null;

    boardIds.forEach((boardId, bIdx) => {
      const boardName = raw.boards[boardId].name || ('Board ' + (bIdx + 1));
      const meta = raw.metadata?.[boardId] || {};
      const nodesObj = raw.nodes?.[boardId] || {};
      const nodes = nodesObj.nodes || [];
      const edges = nodesObj.edges || [];

      if (!primaryContext) primaryContext = boardName;

      // ---- Extract chapters (CHAPTER meta entries). Fall back to board.
      const chapters = [];
      Object.entries(meta).forEach(([id, m]) => {
        if (m.meta?.type === 'CHAPTER') {
          chapters.push({ id, name: m.meta.name || m.meta.title || 'Chapter' });
        }
      });
      if (chapters.length === 0) {
        chapters.push({ id: boardId, name: boardName });
      }
      const chapterById = {};
      chapters.forEach(c => { chapterById[c.id] = c; });

      // Build node maps
      const byNodeId = {};
      nodes.forEach(n => { byNodeId[n.id] = n; });
      const elemMeta = id => meta[id]?.meta || {};

      // Map each node to its chapter via parentId
      const chapterForNode = (n) => {
        if (chapterById[n.parentId]) return chapterById[n.parentId];
        return chapters[0];
      };

      // ---- Build node → row(lane) map from timelineData on chapter metadata.
      // Each chapter carries its own timelineData with rows (swimlanes) and
      // cells (nodeId → rowId). We merge cells across chapters; the row label
      // becomes the element's lane.
      const nodeToLane = {};
      Object.values(meta).forEach(m => {
        const td = m.meta?.timelineData;
        if (!td) return;
        const rowLabel = {};
        (td.rows || []).forEach(r => { rowLabel[r.id] = r.label; });
        (td.cells || []).forEach(c => {
          if (c.nodeId && rowLabel[c.rowId]) nodeToLane[c.nodeId] = rowLabel[c.rowId];
        });
      });

      // Edge maps: outbound + inbound by element id
      const outEdges = {}; const inEdges = {};
      edges.forEach(e => {
        (outEdges[e.source] ||= []).push(e.target);
        (inEdges[e.target] ||= []).push(e.source);
      });

      // Classify elements
      const elements = [];
      nodes.forEach(n => {
        const m = elemMeta(n.id);
        if (!m.type) return;
        if (['CHAPTER', 'SLICE_BORDER', 'MODEL_CONTEXT', 'SCENARIO'].includes(m.type)) return;
        const ch = chapterForNode(n);
        elements.push({
          id: n.id,
          rawType: m.type,
          kind: kindFor(m.type),
          title: m.title || '(untitled)',
          fields: m.fields || [],
          description: m.description || '',
          lane: nodeToLane[n.id] || laneFor(m.type, ch.name),
          sketched: m.sketched,
          chapter: ch.name,
          chapterId: ch.id,
          imageUrl: n.type === 'image' ? n.data?.url : null,
        });
      });

      const byElId = {};
      elements.forEach(el => { byElId[el.id] = el; });

      // Build dep arrays from edges
      elements.forEach(el => {
        el.deps = [];
        (outEdges[el.id] || []).forEach(toId => {
          const tgt = byElId[toId]; if (!tgt) return;
          el.deps.push({ id: toId, title: tgt.title, type: 'OUTBOUND', elementType: tgt.kind });
        });
        (inEdges[el.id] || []).forEach(fromId => {
          const src = byElId[fromId]; if (!src) return;
          el.deps.push({ id: fromId, title: src.title, type: 'INBOUND', elementType: src.kind });
        });
      });

      // ---- Heuristic slicing ----
      // A "state change" slice for each COMMAND: command + downstream EVENTs
      // (+ any SCREEN that points into the command, included as a screen ref)
      // A "state view" slice for each READMODEL with upstream EVENTs.
      // AUTOMATION: a state change with the processor + downstream events.

      const consumedAsView = new Set(); // readmodel ids attached to a view slice
      const localSlices = [];

      // Walk: COMMAND slices
      elements.filter(e => e.kind === 'COMMAND').forEach(cmd => {
        const downstreamEvents = (outEdges[cmd.id] || [])
          .map(id => byElId[id])
          .filter(el => el && el.kind === 'EVENT');

        const upScreens = (inEdges[cmd.id] || [])
          .map(id => byElId[id]).filter(el => el && el.kind === 'SCREEN');

        localSlices.push({
          id: cmd.id,
          title: cmd.title,
          sliceType: 'STATE_CHANGE',
          chapter: cmd.chapter,
          chapterId: cmd.chapterId,
          context: boardName,
          commands: [cmd],
          events: downstreamEvents,
          readmodels: [],
          processors: [],
          screens: upScreens,
        });
      });

      // Walk: AUTOMATION slices
      elements.filter(e => e.kind === 'PROCESSOR').forEach(proc => {
        const downstream = (outEdges[proc.id] || []).map(id => byElId[id]).filter(Boolean);
        const evs = downstream.filter(el => el.kind === 'EVENT');
        const cmds = downstream.filter(el => el.kind === 'COMMAND');
        localSlices.push({
          id: proc.id,
          title: proc.title,
          sliceType: 'STATE_CHANGE',
          chapter: proc.chapter,
          chapterId: proc.chapterId,
          context: boardName,
          commands: cmds,
          events: evs,
          readmodels: [],
          processors: [proc],
          screens: [],
        });
      });

      // Walk: READMODEL slices
      elements.filter(e => e.kind === 'READMODEL').forEach(rm => {
        const upstreamEvents = (inEdges[rm.id] || [])
          .map(id => byElId[id]).filter(el => el && el.kind === 'EVENT');
        consumedAsView.add(rm.id);
        localSlices.push({
          id: rm.id,
          title: rm.title,
          sliceType: 'STATE_VIEW',
          chapter: rm.chapter,
          chapterId: rm.chapterId,
          context: boardName,
          commands: [],
          events: [],
          readmodels: [rm],
          processors: [],
          screens: [],
        });
      });

      // ---- Attach scenarios as specifications ----
      const allScenarios = [];
      Object.entries(meta).forEach(([id, m]) => {
        const mm = m.meta;
        if (mm?.type !== 'SCENARIO') return;
        const list = mm.givenWhenThenScenario?.scenarios || mm.scenarios || [];
        list.forEach(scn => allScenarios.push({ ownerId: id, scn }));
      });

      allScenarios.forEach(({ scn }) => {
        // Decide which slice this scenario belongs to
        const targets = [
          ...(Array.isArray(scn.then) ? scn.then : []),
          ...(scn.when || []),
        ];
        const targetIds = targets.map(t => t.id).filter(Boolean);
        const sliceForScenario =
          localSlices.find(s =>
            s.commands.some(c => targetIds.includes(c.id)) ||
            s.events.some(e => targetIds.includes(e.id)) ||
            s.readmodels.some(r => targetIds.includes(r.id))
          );
        if (sliceForScenario) {
          sliceForScenario.specifications ||= [];
          sliceForScenario.specifications.push({
            id: scn.id,
            title: scn.title,
            given: scn.given || [],
            when: scn.when || [],
            then: scn.then,
            comments: scn.comments || [],
          });
        }
      });

      // Sort within chapter: state-change first, then state-view; preserve
      // original creation order otherwise.
      const order = orderSlices(localSlices, edges);
      // Group by chapter, in chapter order from metadata
      chapters.forEach(ch => {
        order.filter(s => s.chapterId === ch.id).forEach(s => allSlices.push(s));
      });
      // Anything not assigned to a chapter (shouldn't happen)
      order.filter(s => !chapterById[s.chapterId]).forEach(s => allSlices.push(s));
    });

    // Re-index
    allSlices.forEach((s, i) => { s.index = i; });
    const ctx = boardIds.length > 1
      ? boardIds.map(id => raw.boards[id].name).join(' + ')
      : primaryContext || 'Untitled';
    return finalize(allSlices, ctx, allSlices[0]?.chapter || '');
  }

  function kindFor(rawType) {
    switch (rawType) {
      case 'COMMAND': return 'COMMAND';
      case 'EVENT': return 'EVENT';
      case 'READMODEL': return 'READMODEL';
      case 'AUTOMATION': case 'PROCESSOR': return 'PROCESSOR';
      case 'SCREEN': return 'SCREEN';
      default: return rawType;
    }
  }
  function laneFor(rawType, boardName) {
    switch (rawType) {
      case 'COMMAND': case 'SCREEN': return 'Interaction';
      case 'EVENT': return boardName ? boardName + ' events' : 'Events';
      case 'READMODEL': return boardName ? boardName + ' views' : 'Read models';
      case 'AUTOMATION': case 'PROCESSOR': return 'Automation';
      default: return 'Other';
    }
  }

  function orderSlices(slices, edges) {
    // Topo-ish: walk edges, place command slices first in edge order, then their views.
    const cmdSlices = slices.filter(s => s.sliceType === 'STATE_CHANGE');
    const viewSlices = slices.filter(s => s.sliceType === 'STATE_VIEW');

    // Heuristic: order command slices by their "depth" — number of inbound edges in chain
    const eventToProducerCmd = {};
    cmdSlices.forEach(s => s.events.forEach(e => { eventToProducerCmd[e.id] = s.id; }));
    // Depth: count of upstream command-slices via screens/events
    const cmdDepth = {};
    const visit = (id, seen = new Set()) => {
      if (seen.has(id)) return 0;
      seen.add(id);
      const s = cmdSlices.find(x => x.id === id);
      if (!s) return 0;
      const upstreams = s.screens.flatMap(sc => sc.deps.filter(d => d.type === 'INBOUND').map(d => d.id));
      let max = 0;
      upstreams.forEach(u => {
        if (eventToProducerCmd[u]) max = Math.max(max, 1 + visit(eventToProducerCmd[u], seen));
      });
      return max;
    };
    cmdSlices.forEach(s => { cmdDepth[s.id] = visit(s.id); });
    cmdSlices.sort((a, b) => (cmdDepth[a.id] || 0) - (cmdDepth[b.id] || 0));
    return [...cmdSlices, ...viewSlices];
  }

  // ---------- Common ----------
  function finalize(slices, context, chapter) {
    // Re-tag indexes & build id index
    slices.forEach((s, i) => { s.index = i; s.specifications ||= []; });

    const laneOrder = [];
    slices.forEach(s => {
      [...s.commands, ...s.events, ...s.readmodels, ...s.processors,
       ...(s.screens || [])].forEach(el => {
        if (el.lane && !laneOrder.includes(el.lane)) laneOrder.push(el.lane);
      });
    });

    const byId = {};
    slices.forEach(s => {
      [...s.commands, ...s.events, ...s.readmodels, ...s.processors,
       ...(s.screens || [])].forEach(el => {
        byId[el.id] = { ...el, sliceId: s.id, sliceTitle: s.title, sliceIndex: s.index };
      });
    });

    // Build chapter order from slice traversal
    const chapterOrder = [];
    const chapterMap = {};
    slices.forEach(s => {
      const id = s.chapterId || s.chapter || 'default';
      const name = s.chapter || 'Chapter';
      if (!chapterMap[id]) {
        chapterMap[id] = { id, name, sliceIndices: [] };
        chapterOrder.push(chapterMap[id]);
      }
      chapterMap[id].sliceIndices.push(s.index);
    });

    return { context, chapter, slices, lanes: laneOrder, byId, chapters: chapterOrder };
  }

  function normalize(raw) {
    if (raw && Array.isArray(raw.slices)) return normalizeSliceFormat(raw);
    if (raw && raw.boards && raw.nodes) return normalizeBoardFormat(raw);
    throw new Error('Unrecognized config format — expected `slices` or `boards`+`nodes`.');
  }

  let CURRENT = null;
  const listeners = new Set();
  function publish() { listeners.forEach(fn => { try { fn(CURRENT); } catch (e) { console.error(e); } }); }

  async function loadJson(text) {
    const parsed = JSON.parse(text);
    CURRENT = normalize(parsed);
    publish();
    return CURRENT;
  }

  // Default model is determined by samples.js (the entry marked `default`).
  // We expose a promise app.js awaits before booting; if no default exists
  // (e.g. all samples hidden) we resolve so the UI still mounts with no model.
  const def = (typeof window.defaultSample === 'function') ? window.defaultSample() : null;
  const defaultModelPromise = def
    ? fetch(def.jsonUrl).then(r => r.text()).then(loadJson)
        .catch(err => { console.error('Failed to load default sample:', err); })
    : Promise.resolve();

  function installDropZone() {
    const overlay = document.createElement('div');
    overlay.className = 'em-drop-overlay';
    overlay.innerHTML = `
      <div class="em-drop-card">
        <div class="em-drop-icon">⌑</div>
        <div class="em-drop-title">Drop a config.json</div>
        <div class="em-drop-sub">Slice format or whiteboard export</div>
      </div>`;
    document.body.appendChild(overlay);

    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      dragCounter++;
      overlay.classList.add('is-active');
    });
    window.addEventListener('dragleave', () => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) overlay.classList.remove('is-active');
    });
    window.addEventListener('dragover', (e) => { e.preventDefault(); });
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('is-active');
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const text = await file.text();
      try { await loadJson(text); flashToast('Loaded ' + file.name); }
      catch (err) { console.error(err); flashToast('Could not parse JSON', true); }
    });
  }

  function flashToast(msg, isError) {
    const t = document.createElement('div');
    t.className = 'em-toast' + (isError ? ' is-error' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => {
      t.classList.remove('is-in');
      setTimeout(() => t.remove(), 240);
    }, 1800);
  }

  window.EM = {
    TONE,
    getModel: () => CURRENT,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    loadJson, normalize,
    defaultModelPromise, flashToast,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDropZone);
  } else {
    installDropZone();
  }
})();
