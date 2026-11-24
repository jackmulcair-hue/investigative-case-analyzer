/* Interactive evidence board: draggable entity nodes linked by red "string" connections.
   Decoupled from app.js — call ClarityBoard.init(rootEl, state, persist) after rendering. */
(function () {
  var TYPE_ORDER = ['person', 'evidence', 'event', 'question'];
  var META = {
    person: { icon: '👤', cls: 'person', tag: 'Suspect' },
    evidence: { icon: '🗂', cls: 'evidence', tag: 'Evidence' },
    event: { icon: '⏱', cls: 'event', tag: 'Event' },
    question: { icon: '❓', cls: 'question', tag: 'Question' }
  };
  var CANVAS_H = 560;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }
  function trim(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function buildNodes(state) {
    var nodes = [];
    (state.people || []).forEach(function (p, i) {
      nodes.push({ id: 'p-' + i, type: 'person', title: p.name || 'Unnamed', sub: p.role || '' });
    });
    (state.evidence || []).forEach(function (e, i) {
      nodes.push({ id: 'e-' + i, type: 'evidence', title: e.title || 'Evidence', sub: (e.kind || '') + (e.strength ? ' · ' + e.strength : '') });
    });
    (state.events || []).forEach(function (t, i) {
      nodes.push({ id: 't-' + i, type: 'event', title: t[0] || 'Time', sub: trim(t[1] || 'Event', 38) });
    });
    (state.questions || []).forEach(function (q, i) {
      nodes.push({ id: 'q-' + i, type: 'question', title: 'Open question', sub: trim(q || '', 64) });
    });
    return nodes;
  }

  function autoLayout(nodes, board, canvasW, canvasH) {
    var byType = {};
    nodes.forEach(function (n) { (byType[n.type] = byType[n.type] || []).push(n); });
    var colW = canvasW / TYPE_ORDER.length;
    TYPE_ORDER.forEach(function (type, ci) {
      var list = byType[type] || [];
      var colCenter = colW * (ci + 0.5);
      var step = Math.min(150, (canvasH - 100) / Math.max(1, list.length));
      var startY = Math.max(70, (canvasH - (list.length - 1) * step) / 2);
      list.forEach(function (n, ri) {
        if (board.positions[n.id] == null) {
          board.positions[n.id] = {
            x: (colCenter + (ri % 2 ? 20 : -20)) / canvasW,
            y: (startY + ri * step) / canvasH
          };
        }
      });
    });
  }

  function init(root, state, persist) {
    if (!state.board) state.board = { positions: {}, links: [] };
    var board = state.board;
    var nodes = buildNodes(state);
    var ids = {};
    nodes.forEach(function (n) { ids[n.id] = true; });
    board.links = board.links.filter(function (l) { return ids[l.from] && ids[l.to] && l.from !== l.to; });
    Object.keys(board.positions).forEach(function (id) { if (!ids[id]) delete board.positions[id]; });

    root.innerHTML = '';
    root.classList.add('board-root');

    var toolbar = document.createElement('div');
    toolbar.className = 'board-toolbar';
    toolbar.innerHTML =
      '<button class="btn board-link-btn" data-action="link">🔗 Link mode: off</button>' +
      '<button class="btn" data-action="reset">↺ Reset layout</button>' +
      '<button class="btn danger" data-action="clear">✖ Clear links</button>' +
      '<span class="board-hint"></span>';
    root.appendChild(toolbar);

    var canvas = document.createElement('div');
    canvas.className = 'board-canvas';
    canvas.style.height = CANVAS_H + 'px';
    root.appendChild(canvas);

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'board-svg');
    canvas.appendChild(svg);

    var nodeEls = {};
    nodes.forEach(function (n) {
      var el = document.createElement('div');
      el.className = 'board-node board-' + META[n.type].cls;
      el.dataset.id = n.id;
      el.innerHTML =
        '<span class="board-pin"></span>' +
        '<span class="board-node-icon">' + META[n.type].icon + '</span>' +
        '<span class="board-node-tag">' + META[n.type].tag + '</span>' +
        '<span class="board-node-title">' + escHtml(n.title) + '</span>' +
        '<span class="board-node-sub">' + escHtml(n.sub) + '</span>';
      canvas.appendChild(el);
      nodeEls[n.id] = el;
    });

    var linkMode = false;
    var selected = null;

    function size() { return { w: canvas.clientWidth, h: CANVAS_H }; }

    function placeNodes() {
      var s = size();
      nodes.forEach(function (n) {
        var el = nodeEls[n.id];
        var p = board.positions[n.id] || { x: 0.5, y: 0.5 };
        var ew = el.offsetWidth, eh = el.offsetHeight;
        var cx = Math.max(ew / 2 + 4, Math.min(s.w - ew / 2 - 4, p.x * s.w));
        var cy = Math.max(eh / 2 + 4, Math.min(s.h - eh / 2 - 4, p.y * s.h));
        el.style.left = (cx - ew / 2) + 'px';
        el.style.top = (cy - eh / 2) + 'px';
        el._center = { x: cx, y: cy };
      });
    }

    function drawLinks() {
      var s = size();
      svg.setAttribute('width', s.w);
      svg.setAttribute('height', s.h);
      svg.innerHTML = '';
      board.links.forEach(function (l, i) {
        var a = nodeEls[l.from], b = nodeEls[l.to];
        if (!a || !b) return;
        var p1 = a._center, p2 = b._center;
        var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        var sag = Math.min(42, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.12);
        var d = 'M ' + p1.x + ' ' + p1.y + ' Q ' + mx + ' ' + (my + sag) + ' ' + p2.x + ' ' + p2.y;
        var hit = document.createElementNS(SVGNS, 'path');
        hit.setAttribute('d', d);
        hit.setAttribute('class', 'board-link-hit');
        hit.dataset.idx = i;
        svg.appendChild(hit);
        var line = document.createElementNS(SVGNS, 'path');
        line.setAttribute('d', d);
        line.setAttribute('class', 'board-link-line');
        svg.appendChild(line);
      });
    }

    function updateHint() {
      var hint = toolbar.querySelector('.board-hint');
      var btn = toolbar.querySelector('.board-link-btn');
      if (linkMode) {
        hint.textContent = selected ? 'Tap a second node to link — or tap background to cancel.' : 'Tap a node to start a link. Tap a string to remove it.';
      } else {
        hint.textContent = board.links.length + ' link' + (board.links.length === 1 ? '' : 's') + ' · drag to arrange';
      }
      btn.textContent = '🔗 Link mode: ' + (linkMode ? 'on' : 'off');
      btn.classList.toggle('active', linkMode);
    }

    function render() { placeNodes(); drawLinks(); updateHint(); }

    var s0 = size();
    autoLayout(nodes, board, s0.w || 600, CANVAS_H);
    render();

    // --- drag to reposition ---
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      if (linkMode) return;
      var nodeEl = e.target.closest('.board-node');
      if (!nodeEl) return;
      e.preventDefault();
      drag = { id: nodeEl.dataset.id, el: nodeEl, startX: e.clientX, startY: e.clientY, moved: false };
      nodeEl.classList.add('dragging');
      try { nodeEl.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      var s = size();
      var rect = canvas.getBoundingClientRect();
      var cx = Math.max(drag.el.offsetWidth / 2 + 4, Math.min(s.w - drag.el.offsetWidth / 2 - 4, e.clientX - rect.left));
      var cy = Math.max(drag.el.offsetHeight / 2 + 4, Math.min(s.h - drag.el.offsetHeight / 2 - 4, e.clientY - rect.top));
      drag.el.style.left = (cx - drag.el.offsetWidth / 2) + 'px';
      drag.el.style.top = (cy - drag.el.offsetHeight / 2) + 'px';
      drag.el._center = { x: cx, y: cy };
      board.positions[drag.id] = { x: cx / s.w, y: cy / s.h };
      drawLinks();
    });
    function endDrag(e) {
      if (!drag) return;
      drag.el.classList.remove('dragging');
      try { drag.el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (drag.moved) persist();
      drag = null;
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // --- link mode: tap two nodes to connect, tap a string to remove ---
    canvas.addEventListener('click', function (e) {
      if (!linkMode) return;
      var hit = e.target.closest('.board-link-hit');
      if (hit) {
        board.links.splice(+hit.dataset.idx, 1);
        persist();
        render();
        return;
      }
      var nodeEl = e.target.closest('.board-node');
      if (nodeEl) {
        var id = nodeEl.dataset.id;
        if (!selected) {
          selected = id;
          nodeEl.classList.add('selected');
        } else if (selected === id) {
          nodeEl.classList.remove('selected');
          selected = null;
        } else {
          var exists = board.links.some(function (l) {
            return (l.from === selected && l.to === id) || (l.from === id && l.to === selected);
          });
          if (!exists) {
            board.links.push({ from: selected, to: id });
            persist();
          }
          nodeEls[selected].classList.remove('selected');
          selected = null;
          render();
          return;
        }
        updateHint();
        return;
      }
      if (selected) {
        nodeEls[selected].classList.remove('selected');
        selected = null;
        updateHint();
      }
    });

    // --- toolbar ---
    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var action = btn.dataset.action;
      if (action === 'link') {
        linkMode = !linkMode;
        if (!linkMode && selected) { nodeEls[selected].classList.remove('selected'); selected = null; }
        canvas.classList.toggle('link-mode', linkMode);
        updateHint();
      } else if (action === 'reset') {
        board.positions = {};
        autoLayout(nodes, board, size().w || 600, CANVAS_H);
        persist();
        render();
      } else if (action === 'clear') {
        board.links = [];
        persist();
        render();
      }
    });

    // --- keep lines aligned on resize ---
    function onResize() { placeNodes(); drawLinks(); }
    if (root.__clarityResize) window.removeEventListener('resize', root.__clarityResize);
    root.__clarityResize = onResize;
    window.addEventListener('resize', onResize);
  }

  window.ClarityBoard = { init: init };
})();
