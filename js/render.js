/* ============================================================
   Cubix — render.js
   Everything that draws the board (SVG) and animates a turn.
   Reads state; never changes it.

   Needs: config.js, geometry.js, state.js, colors.js
   Calls C.spin() (defined later in game.js) when a point is clicked.
   ============================================================ */
(function (C) {
  "use strict";

  var key = C.key, parse = C.parse, P = C.P, S = C.state;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var svg = document.getElementById("board");
  var tileLayerRef = null, dotLayerRef = null;

  function svgEl(name) { return document.createElementNS(SVG_NS, name); }

  // ---- draw the whole board from the current state ----
  C.render = function () {
    var palette = C.theme.palette;

    svg.setAttribute("viewBox", "0 0 " + C.W + " " + C.H);
    var drawW = Math.min(C.MAX_BOARD_PX, C.W);
    svg.setAttribute("width", drawW);
    svg.setAttribute("height", C.H * drawW / C.W);
    svg.innerHTML = "";

    var tileLayer  = svgEl("g");
    var frameLayer = svgEl("g");
    var dotLayer   = svgEl("g");
    dotLayer.style.transition = "opacity 0.12s ease";

    // -- tiles --
    C.upList.forEach(function (u) {
      var uk = key(u.x, u.y);
      var d = parse(S.match[uk]);
      var type = S.color[uk];

      var upV   = [[u.x, u.y], [u.x + 1, u.y], [u.x, u.y + 1]];
      var downV = [[d.x + 1, d.y], [d.x, d.y + 1], [d.x + 1, d.y + 1]];
      var vs = [];
      upV.concat(downV).forEach(function (v) {
        if (!vs.some(function (w) { return w[0] === v[0] && w[1] === v[1]; })) vs.push(v);
      });

      // sort the 4 corners by angle around the center so the polygon draws cleanly
      var cx = vs.reduce(function (s, v) { return s + v[0]; }, 0) / vs.length;
      var cy = vs.reduce(function (s, v) { return s + v[1]; }, 0) / vs.length;
      var pc = C.to2d(cx, cy);
      vs.sort(function (a, b) {
        var pa = C.to2d(a[0], a[1]), pb = C.to2d(b[0], b[1]);
        return Math.atan2(pa.Y - pc.Y, pa.X - pc.X) - Math.atan2(pb.Y - pc.Y, pb.X - pc.X);
      });

      var pts = vs.map(function (v) {
        var p = P(v[0], v[1]);
        return p.x.toFixed(2) + "," + p.y.toFixed(2);
      }).join(" ");

      var poly = svgEl("polygon");
      poly.setAttribute("points", pts);
      poly.setAttribute("fill", palette[type]);
      poly.setAttribute("stroke", C.shade(palette[type], 0.82));
      poly.setAttribute("data-key", uk);
      poly.setAttribute("class", "tile");
      tileLayer.appendChild(poly);
    });

    // -- guide ring: 2 of the hexagon's 6 outer sides per face color, showing
    //    where each color belongs when solved. Offset outward from the tiles so
    //    it reads as a detached ring rather than a tile edge. --
    var boardCx = C.W / 2, boardCy = C.H / 2;
    C.boundaryEdges.forEach(function (e) {
      var a = P(e.p1[0], e.p1[1]), b = P(e.p2[0], e.p2[1]);
      var nx = (a.x + b.x) / 2 - boardCx, ny = (a.y + b.y) / 2 - boardCy;
      var nlen = Math.hypot(nx, ny) || 1;
      nx /= nlen; ny /= nlen;

      var line = svgEl("line");
      line.setAttribute("x1", a.x + nx * C.RING_OFFSET);
      line.setAttribute("y1", a.y + ny * C.RING_OFFSET);
      line.setAttribute("x2", b.x + nx * C.RING_OFFSET);
      line.setAttribute("y2", b.y + ny * C.RING_OFFSET);
      line.setAttribute("stroke", palette[e.type]);
      line.setAttribute("stroke-width", C.RING_WIDTH);
      line.setAttribute("stroke-linecap", "round");
      frameLayer.appendChild(line);
    });

    // -- rotation points --
    C.findAllFlipPoints().forEach(function (fp) {
      var p = P(fp.vx, fp.vy);
      var g = svgEl("g");
      g.setAttribute("class", "flip-group");

      var hit = svgEl("circle");
      hit.setAttribute("cx", p.x); hit.setAttribute("cy", p.y); hit.setAttribute("r", 15);
      hit.setAttribute("class", "flip-hit");

      var dot = svgEl("circle");
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.setAttribute("r", 4.6);
      dot.setAttribute("class", "flip-dot");
      // random offset so the dots don't all pulse in lockstep
      dot.style.animationDelay = (-(Math.random() * 1.7)).toFixed(2) + "s";

      g.appendChild(hit);
      g.appendChild(dot);

      var affected = [fp.kU0, fp.kU1, fp.kU2];
      g.addEventListener("mouseenter", function () { highlightTiles(tileLayer, affected, true); });
      g.addEventListener("mouseleave", function () { highlightTiles(tileLayer, affected, false); });
      // plain click = clockwise, shift+click or right-click = anticlockwise
      g.addEventListener("click", function (ev) { C.spin(fp.vx, fp.vy, ev.shiftKey ? 1 : -1); });
      g.addEventListener("contextmenu", function (ev) { ev.preventDefault(); C.spin(fp.vx, fp.vy, 1); });
      dotLayer.appendChild(g);
    });

    svg.appendChild(tileLayer);
    svg.appendChild(frameLayer);
    svg.appendChild(dotLayer);
    tileLayerRef = tileLayer;
    dotLayerRef = dotLayer;
  };

  function highlightTiles(tileLayer, keys, on) {
    keys.forEach(function (k) {
      var el = tileLayer.querySelector('[data-key="' + k + '"]');
      if (el) el.classList.toggle("lit", on);
    });
  }

  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // ---- animate the 3 tiles at (vx,vy) turning 60 degrees on screen ----
  // Purely visual. `dir` 1 = anticlockwise, -1 = clockwise. Calls onDone() when
  // finished; the caller decides what state change follows.
  C.animateSpin = function (vx, vy, dir, onDone) {
    S.animating = true;
    if (dotLayerRef) { dotLayerRef.style.opacity = "0"; dotLayerRef.style.pointerEvents = "none"; }

    var pivot = P(vx, vy);
    var fpNow = C.findFlipPointAt(vx, vy);
    var keys = fpNow ? [fpNow.kU0, fpNow.kU1, fpNow.kU2] : [];
    var elems = keys.map(function (k) {
      return tileLayerRef.querySelector('[data-key="' + k + '"]');
    }).filter(Boolean);
    var origPts = elems.map(function (el) {
      return el.getAttribute("points").trim().split(" ").map(function (pair) { return pair.split(",").map(Number); });
    });
    elems.forEach(function (el) { el.classList.add("lit"); });

    var totalDeg = -dir * 60;   // screen-space rotation
    var start = performance.now();

    function frame(now) {
      var t = Math.min(1, (now - start) / C.SPIN_MS);
      var rad = totalDeg * easeInOutQuad(t) * Math.PI / 180;
      var cos = Math.cos(rad), sin = Math.sin(rad);
      elems.forEach(function (el, i) {
        el.setAttribute("points", origPts[i].map(function (pt) {
          var dx = pt[0] - pivot.x, dy = pt[1] - pivot.y;
          return (dx * cos - dy * sin + pivot.x).toFixed(2) + "," + (dx * sin + dy * cos + pivot.y).toFixed(2);
        }).join(" "));
      });
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        S.animating = false;
        onDone();
      }
    }
    requestAnimationFrame(frame);
  };
})(window.Cubix);
