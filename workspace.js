/* Clarity visual investigation workspace — relationship graph.
 * Shows connections between people, places, events, objects, evidence,
 * hypotheses and unanswered questions as an interactive SVG graph. */
(function (global) {
  const NODE_STYLES = {
    person:     { color: '#1f6feb', shape: 'circle',   label: '👤', size: 28 },
    location:   { color: '#1a7f37', shape: 'rect',     label: '📍', size: 26 },
    object:     { color: '#d29922', shape: 'hexagon',   label: '📦', size: 24 },
    event:      { color: '#8250df', shape: 'diamond',  label: '⏱', size: 26 },
    evidence:   { color: '#6b7785', shape: 'doc',      label: '📄', size: 24 },
    hypothesis: { color: '#da3633', shape: 'star',     label: '💡', size: 30 },
    question:   { color: '#f39c12', shape: 'circle',   label: '❓', size: 22 },
    unknown:    { color: '#95a5a6', shape: 'circle',   label: '?',  size: 20 },
  };

  function extractNodes(inv) {
    const nodes = [];
    (inv.people || []).forEach((p) => nodes.push({ id: 'p-' + p.id, label: p.name, type: 'person', data: p }));
    (inv.locations || []).forEach((l) => nodes.push({ id: 'l-' + l.id, label: l.name, type: 'location', data: l }));
    (inv.objects || []).forEach((o) => nodes.push({ id: 'o-' + o.id, label: o.name, type: 'object', data: o }));
    (inv.events || []).forEach((e) => nodes.push({ id: 'e-' + e.id, label: e.time + ': ' + (e.description || '').slice(0, 30), type: 'event', data: e }));
    (inv.evidence || []).forEach((e) => nodes.push({ id: 'v-' + e.id, label: e.title, type: 'evidence', data: e }));
    (inv.hypotheses || []).forEach((h) => nodes.push({ id: 'h-' + h.id, label: (h.text || '').slice(0, 35), type: 'hypothesis', data: h }));
    (inv.unknowns || []).forEach((u, i) => nodes.push({ id: 'u-' + (u.id || i), label: (u.text || u).slice(0, 35), type: 'unknown', data: u }));
    (inv.questions || []).filter((q) => !q.answered).forEach((q, i) => nodes.push({ id: 'q-' + (q.id || i), label: (q.text || '').slice(0, 35), type: 'question', data: q }));
    return nodes;
  }

  function extractEdges(inv, nodes) {
    const edges = [];
    const findNode = (type, dataId) => nodes.find((n) => n.id === type + '-' + dataId);
    const lower = (s) => String(s || '').toLowerCase();

    // Person → Event (name mentioned in description)
    (inv.events || []).forEach((ev) => {
      (inv.people || []).forEach((p) => {
        if (lower(p.name).length > 2 && lower(ev.description).includes(lower(p.name))) {
          edges.push({ source: 'p-' + p.id, target: 'e-' + ev.id, type: 'mention' });
        }
      });
    });

    // Person → Evidence
    (inv.evidence || []).forEach((ev) => {
      (inv.people || []).forEach((p) => {
        if (lower(p.name).length > 2 && lower(ev.detail + ' ' + ev.title).includes(lower(p.name))) {
          edges.push({ source: 'p-' + p.id, target: 'v-' + ev.id, type: 'mention' });
        }
      });
    });

    // Location → Event
    (inv.events || []).forEach((ev) => {
      (inv.locations || []).forEach((loc) => {
        if (lower(loc.name).length > 2 && lower(ev.description).includes(lower(loc.name))) {
          edges.push({ source: 'l-' + loc.id, target: 'e-' + ev.id, type: 'mention' });
        }
      });
    });

    // Object → Evidence
    (inv.evidence || []).forEach((ev) => {
      (inv.objects || []).forEach((obj) => {
        if (lower(obj.name).length > 2 && lower(ev.detail + ' ' + ev.title).includes(lower(obj.name))) {
          edges.push({ source: 'o-' + obj.id, target: 'v-' + ev.id, type: 'mention' });
        }
      });
    });

    // Evidence → Hypothesis (explicit links)
    (inv.hypotheses || []).forEach((h) => {
      (h.supports || []).forEach((eid) => {
        edges.push({ source: 'v-' + eid, target: 'h-' + h.id, type: 'support' });
      });
      (h.contradicts || []).forEach((eid) => {
        edges.push({ source: 'v-' + eid, target: 'h-' + h.id, type: 'contradict' });
      });
    });

    // Event → Evidence (keyword overlap)
    (inv.events || []).forEach((ev) => {
      (inv.evidence || []).forEach((evid) => {
        const evKw = new Set(lower(ev.description).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
        const evidKw = lower(evid.detail + ' ' + evid.title).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => evKw.has(w));
        if (evidKw.length >= 2) {
          edges.push({ source: 'e-' + ev.id, target: 'v-' + evid.id, type: 'relate' });
        }
      });
    });

    // Question → Hypothesis (what would change)
    (inv.questions || []).filter((q) => !q.answered).forEach((q) => {
      (inv.hypotheses || []).forEach((h) => {
        if (lower(q.text).includes(lower(h.text).slice(0, 10)) && lower(h.text).length > 10) {
          edges.push({ source: 'q-' + (q.id || ''), target: 'h-' + h.id, type: 'question' });
        }
      });
    });

    // Unknown → Hypothesis
    (inv.unknowns || []).forEach((u, i) => {
      (inv.hypotheses || []).forEach((h) => {
        const ukw = lower(u.text || u).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
        const hkw = lower(h.text).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => ukw.includes(w));
        if (hkw.length >= 2) {
          edges.push({ source: 'u-' + (u.id || i), target: 'h-' + h.id, type: 'question' });
        }
      });
    });

    return edges;
  }

  function simulate(nodes, edges, width, height, iterations) {
    if (!nodes.length) return;
    const cx = width / 2, cy = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Initialize in a circle
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      n.x = cx + Math.cos(angle) * radius;
      n.y = cy + Math.sin(angle) * radius;
      n.vx = 0;
      n.vy = 0;
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let dx = nodes[i].x - nodes[j].x;
          let dy = nodes[i].y - nodes[j].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = 1; }
          const force = 3000 / (dist * dist);
          nodes[i].vx += (dx / dist) * force;
          nodes[i].vy += (dy / dist) * force;
          nodes[j].vx -= (dx / dist) * force;
          nodes[j].vy -= (dy / dist) * force;
        }
      }
      // Attraction (edges)
      edges.forEach((e) => {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.04;
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force;
        b.vy -= (dy / dist) * force;
      });
      // Center gravity
      nodes.forEach((n) => {
        n.vx += (cx - n.x) * 0.005;
        n.vy += (cy - n.y) * 0.005;
      });
      // Apply
      nodes.forEach((n) => {
        n.x += Math.max(-20, Math.min(20, n.vx * 0.1));
        n.y += Math.max(-20, Math.min(20, n.vy * 0.1));
        n.vx *= 0.85;
        n.vy *= 0.85;
      });
    }

    // Clamp to bounds
    nodes.forEach((n) => {
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(30, Math.min(height - 30, n.y));
    });
  }

  function shapeSvg(type, x, y, style) {
    const s = style.size;
    const c = style.color;
    if (style.shape === 'circle') {
      return `<circle cx="${x}" cy="${y}" r="${s / 2}" fill="${c}" opacity="0.85" stroke="#fff" stroke-width="2"/>`;
    }
    if (style.shape === 'rect') {
      return `<rect x="${x - s/2}" y="${y - s/2}" width="${s}" height="${s}" rx="4" fill="${c}" opacity="0.85" stroke="#fff" stroke-width="2"/>`;
    }
    if (style.shape === 'diamond') {
      const pts = `${x},${y - s/2} ${x + s/2},${y} ${x},${y + s/2} ${x - s/2},${y}`;
      return `<polygon points="${pts}" fill="${c}" opacity="0.85" stroke="#fff" stroke-width="2"/>`;
    }
    if (style.shape === 'hexagon') {
      const h = s / 2;
      const pts = `${x - h},${y} ${x - h/2},${y - h} ${x + h/2},${y - h} ${x + h},${y} ${x + h/2},${y + h} ${x - h/2},${y + h}`;
      return `<polygon points="${pts}" fill="${c}" opacity="0.85" stroke="#fff" stroke-width="2"/>`;
    }
    if (style.shape === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s / 2 : s / 4;
        const a = (i / 10) * 2 * Math.PI - Math.PI / 2;
        pts.push(`${x + Math.cos(a) * r},${y + Math.sin(a) * r}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${c}" opacity="0.85" stroke="#fff" stroke-width="2"/>`;
    }
    if (style.shape === 'doc') {
      return `<rect x="${x - s/2}" y="${y - s/2}" width="${s}" height="${s}" rx="2" fill="${c}" opacity="0.85" stroke="#fff" stroke-width="2"/><path d="M${x + s/4},${y - s/2} L${x + s/2},${y - s/4} L${x + s/4},${y - s/4} Z" fill="rgba(255,255,255,0.3)"/>`;
    }
    return `<circle cx="${x}" cy="${y}" r="${s / 2}" fill="${c}" opacity="0.85" stroke="#fff" stroke-width="2"/>`;
  }

  function edgeColor(type) {
    if (type === 'support') return '#1a7f37';
    if (type === 'contradict') return '#da3633';
    if (type === 'question') return '#f39c12';
    return '#b0b8c0';
  }

  function render(inv, container) {
    const nodes = extractNodes(inv);
    const edges = extractEdges(inv, nodes);
    const width = 800;
    const height = 560;

    if (nodes.length === 0) {
      container.innerHTML = `
        <div class="workspace-empty">
          <p>No data to visualise yet. Add people, evidence, events and hypotheses to see the relationship graph.</p>
        </div>`;
      return;
    }

    // Filter edges to only those with both endpoints present
    const validEdges = edges.filter((e) => nodes.find((n) => n.id === e.source) && nodes.find((n) => n.id === e.target));

    simulate(nodes, validEdges, width, height, 200);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="workspace-svg" preserveAspectRatio="xMidYMid meet">`;

    // Edges
    validEdges.forEach((e) => {
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      const color = edgeColor(e.type);
      const dash = e.type === 'contradict' ? '4 3' : 'none';
      svg += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${e.type === 'support' || e.type === 'contradict' ? 2 : 1}" stroke-dasharray="${dash}" opacity="0.5"/>`;
    });

    // Nodes
    nodes.forEach((n) => {
      const style = NODE_STYLES[n.type] || NODE_STYLES.evidence;
      svg += `<g class="ws-node" data-id="${n.id}">`;
      svg += shapeSvg(n.type, n.x, n.y, style);
      const label = (n.label || '').slice(0, 25);
      svg += `<text x="${n.x}" y="${n.y + style.size / 2 + 14}" text-anchor="middle" class="ws-label" font-size="10">${escapeXml(label)}</text>`;
      svg += `</g>`;
    });

    // Legend
    const legendItems = [
      { type: 'person', label: 'People' },
      { type: 'location', label: 'Locations' },
      { type: 'object', label: 'Objects' },
      { type: 'event', label: 'Events' },
      { type: 'evidence', label: 'Evidence' },
      { type: 'hypothesis', label: 'Hypotheses' },
      { type: 'question', label: 'Questions' },
      { type: 'unknown', label: 'Unknowns' },
    ];
    svg += `<g transform="translate(12, ${height - 130})">`;
    legendItems.forEach((item, i) => {
      const s = NODE_STYLES[item.type];
      const y = i * 15;
      svg += `<circle cx="8" cy="${y + 4}" r="5" fill="${s.color}"/>`;
      svg += `<text x="20" y="${y + 8}" font-size="10" fill="#6b7785">${item.label}</text>`;
    });
    svg += `</g>`;

    // Edge legend
    svg += `<g transform="translate(${width - 140}, ${height - 60})">`;
    svg += `<line x1="0" y1="5" x2="20" y2="5" stroke="#1a7f37" stroke-width="2"/><text x="26" y="9" font-size="10" fill="#6b7785">Supports</text>`;
    svg += `<line x1="0" y1="20" x2="20" y2="20" stroke="#da3633" stroke-width="2" stroke-dasharray="4 3"/><text x="26" y="24" font-size="10" fill="#6b7785">Contradicts</text>`;
    svg += `<line x1="0" y1="35" x2="20" y2="35" stroke="#b0b8c0" stroke-width="1"/><text x="26" y="39" font-size="10" fill="#6b7785">Related</text>`;
    svg += `</g>`;

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  function escapeXml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  const api = { render, extractNodes, extractEdges, NODE_STYLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ClarityWorkspace = api;
}(typeof window !== 'undefined' ? window : globalThis));
