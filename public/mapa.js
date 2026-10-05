// Makes the world map on /destinacions zoomable and draggable. Progressive enhancement: without
// this script the map is a still picture with linked pins. The pins carry their position in map
// units (data-x / data-y); zooming only changes the svg viewBox and recomputes their percentages.
(function () {
  var box = document.querySelector('.world-map');
  if (!box) return;
  var svg = box.querySelector('.map-art');
  var pins = Array.prototype.slice.call(box.querySelectorAll('.map-pin'));
  if (!svg || !pins.length) return;

  var MAP_W = 1000;
  var MAP_H = 446;
  var MIN_W = 45;
  var vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  var aspect = vb[2] / vb[3];
  var MAX_W = Math.min(MAP_W, MAP_H * aspect);
  var home = { x: vb[0], y: vb[1], w: vb[2] };
  var view = { x: home.x, y: home.y, w: home.w };

  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  function render() {
    var h = view.w / aspect;
    svg.setAttribute('viewBox', view.x.toFixed(2) + ' ' + view.y.toFixed(2) + ' ' + view.w.toFixed(2) + ' ' + h.toFixed(2));
    pins.forEach(function (a) {
      var left = ((parseFloat(a.dataset.x) - view.x) / view.w) * 100;
      var top = ((parseFloat(a.dataset.y) - view.y) / h) * 100;
      a.style.left = left.toFixed(2) + '%';
      a.style.top = top.toFixed(2) + '%';
      a.classList.toggle('left', left > 72);
      a.style.visibility = left < -4 || left > 104 || top < -6 || top > 106 ? 'hidden' : 'visible';
      a.tabIndex = a.style.visibility === 'hidden' ? -1 : 0;
    });
    box.classList.toggle('zoomed', view.w < home.w - 1);
    box.classList.toggle('far', view.w > 420);
    zoomIn.disabled = view.w <= MIN_W + 0.5;
    zoomOut.disabled = view.w >= MAX_W - 0.5;
  }

  // Zoom by `factor` (<1 zooms in) keeping the map point under (fx, fy) — fractions of the box — fixed.
  function zoomAt(factor, fx, fy) {
    var w = clamp(view.w * factor, MIN_W, MAX_W);
    var h = view.w / aspect;
    var nh = w / aspect;
    var px = view.x + fx * view.w;
    var py = view.y + fy * h;
    view.x = clamp(px - fx * w, 0, MAP_W - w);
    view.y = clamp(py - fy * nh, 0, MAP_H - nh);
    view.w = w;
    render();
  }

  function panBy(dxPx, dyPx) {
    var r = box.getBoundingClientRect();
    var h = view.w / aspect;
    view.x = clamp(view.x - (dxPx / r.width) * view.w, 0, MAP_W - view.w);
    view.y = clamp(view.y - (dyPx / r.height) * h, 0, MAP_H - h);
    render();
  }

  // Controls
  var controls = document.createElement('div');
  controls.className = 'map-controls';
  function button(label, aria, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', onClick);
    controls.appendChild(b);
    return b;
  }
  var zoomIn = button('+', 'Amplia el mapa', function () { zoomAt(0.6, 0.5, 0.5); });
  var zoomOut = button('−', 'Redueix el mapa', function () { zoomAt(1 / 0.6, 0.5, 0.5); });
  button('⟲', 'Torna a la vista inicial', function () { view = { x: home.x, y: home.y, w: home.w }; render(); });
  box.appendChild(controls);
  box.classList.add('is-zoomable');

  // Drag (one pointer) and pinch (two pointers)
  var pointers = {};
  var moved = 0;
  var pinchDist = 0;

  function count() {
    return Object.keys(pointers).length;
  }
  function dist() {
    var p = Object.keys(pointers).map(function (k) { return pointers[k]; });
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  box.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.map-controls')) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    moved = 0;
    if (count() === 2) pinchDist = dist();
    box.setPointerCapture(e.pointerId);
  });

  box.addEventListener('pointermove', function (e) {
    var p = pointers[e.pointerId];
    if (!p) return;
    var dx = e.clientX - p.x;
    var dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (count() === 1) {
      box.classList.add('dragging');
      panBy(dx, dy);
    } else if (count() === 2) {
      var d = dist();
      if (pinchDist) {
        var r = box.getBoundingClientRect();
        var pts = Object.keys(pointers).map(function (k) { return pointers[k]; });
        var cx = ((pts[0].x + pts[1].x) / 2 - r.left) / r.width;
        var cy = ((pts[0].y + pts[1].y) / 2 - r.top) / r.height;
        zoomAt(pinchDist / d, clamp(cx, 0, 1), clamp(cy, 0, 1));
      }
      pinchDist = d;
    }
  });

  function release(e) {
    delete pointers[e.pointerId];
    pinchDist = 0;
    if (!count()) box.classList.remove('dragging');
  }
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);

  // A drag that started on a pin must not follow its link.
  box.addEventListener('click', function (e) {
    if (moved > 6) {
      e.preventDefault();
      e.stopPropagation();
      moved = 0;
    }
  }, true);

  // Ctrl/⌘ + wheel (also what a trackpad pinch sends) zooms; plain wheel keeps scrolling the page.
  box.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var r = box.getBoundingClientRect();
    zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }, { passive: false });

  box.addEventListener('dblclick', function (e) {
    if (e.target.closest('.map-pin') || e.target.closest('.map-controls')) return;
    var r = box.getBoundingClientRect();
    zoomAt(0.6, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });

  render();
})();
