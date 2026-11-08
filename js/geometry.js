/* ============================================================
   Cubix — geometry.js
   The fixed, never-changing facts about the board:
     - which triangles make up the hexagon
     - what the SOLVED arrangement looks like
     - which outer edges belong to which face (the guide ring)
     - how lattice coordinates map to pixels

   Needs: config.js
   ============================================================ */
(function (C) {
  "use strict";

  var N = C.N, L = C.L, key = C.key, parse = C.parse;

  // ---- the hexagon's unit triangles (up- and down-pointing) ----
  var hexUps = new Set();
  var hexDowns = new Set();
  for (var x = 0; x < L; x++) {
    for (var y = 0; y < L; y++) {
      if (x + y <= L - 1 && x < 2 * N && y < 2 * N && x + y >= N)     hexUps.add(key(x, y));
      if (x + y <= L - 2 && x < 2 * N && y < 2 * N && x + y >= N - 1) hexDowns.add(key(x, y));
    }
  }
  var upList = Array.from(hexUps).map(parse);

  // ---- solved reference: three flat faces of a solid cube ----
  function solvedDownFor(x, y) {
    if (x < N && y >= N) return { x: x, y: y };                          // top face
    if (y < N && x + y >= N && x + y <= 2 * N - 1) return { x: x - 1, y: y }; // left face
    return { x: x, y: y - 1 };                                           // right face
  }
  function tileType(u, d) {
    if (d.x === u.x     && d.y === u.y) return "top";
    if (d.x === u.x - 1 && d.y === u.y) return "left";
    return "right";
  }

  var solvedMatch = {}, solvedColor = {};
  upList.forEach(function (u) {
    var d = solvedDownFor(u.x, u.y);
    solvedMatch[key(u.x, u.y)] = key(d.x, d.y);
    solvedColor[key(u.x, u.y)] = tileType(u, d);
  });

  // ---- outer boundary edges, tagged with the solved face they belong to
  //      (two of the hexagon's six sides per color — the guide ring) ----
  function edgeKey(p1, p2) {
    var a = (p1[0] < p2[0] || (p1[0] === p2[0] && p1[1] < p2[1])) ? p1 : p2;
    var b = (a === p1) ? p2 : p1;
    return a[0] + "," + a[1] + "|" + b[0] + "," + b[1];
  }
  var edgeCount = {}, edgeInfo = {};
  function addTriEdges(isUp, x, y) {
    var v = isUp ? [[x, y], [x + 1, y], [x, y + 1]]
                 : [[x + 1, y], [x, y + 1], [x + 1, y + 1]];
    [[v[0], v[1]], [v[1], v[2]], [v[0], v[2]]].forEach(function (pair) {
      var ek = edgeKey(pair[0], pair[1]);
      edgeCount[ek] = (edgeCount[ek] || 0) + 1;
      edgeInfo[ek] = { isUp: isUp, x: x, y: y, p1: pair[0], p2: pair[1] };
    });
  }
  hexUps.forEach(function (k)   { var p = parse(k); addTriEdges(true,  p.x, p.y); });
  hexDowns.forEach(function (k) { var p = parse(k); addTriEdges(false, p.x, p.y); });

  var solvedUpForDown = {};
  Object.keys(solvedMatch).forEach(function (uk) { solvedUpForDown[solvedMatch[uk]] = uk; });

  var boundaryEdges = [];
  Object.keys(edgeCount).forEach(function (ek) {
    if (edgeCount[ek] !== 1) return;          // interior edge — shared by two triangles
    var own = edgeInfo[ek];
    var uk = own.isUp ? key(own.x, own.y) : solvedUpForDown[key(own.x, own.y)];
    boundaryEdges.push({ p1: own.p1, p2: own.p2, type: solvedColor[uk] });
  });

  // ---- projection: lattice coordinates -> pixels ----
  function to2d(x, y) { return { X: x + 0.5 * y, Y: -(y * C.SQ3 / 2) }; }

  var bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  hexUps.forEach(function (k) {
    var p = parse(k);
    [[p.x, p.y], [p.x + 1, p.y], [p.x, p.y + 1]].forEach(function (v) {
      var q = to2d(v[0], v[1]);
      if (q.X < bx0) bx0 = q.X;  if (q.X > bx1) bx1 = q.X;
      if (q.Y < by0) by0 = q.Y;  if (q.Y > by1) by1 = q.Y;
    });
  });
  var W = (bx1 - bx0) * C.UNIT + C.PAD * 2;
  var H = (by1 - by0) * C.UNIT + C.PAD * 2;

  function P(x, y) {
    var p = to2d(x, y);
    return { x: (p.X - bx0) * C.UNIT + C.PAD, y: (p.Y - by0) * C.UNIT + C.PAD };
  }

  // ---- publish ----
  C.hexUps = hexUps;
  C.hexDowns = hexDowns;
  C.upList = upList;
  C.solvedMatch = solvedMatch;
  C.solvedColor = solvedColor;
  C.boundaryEdges = boundaryEdges;
  C.to2d = to2d;
  C.P = P;
  C.W = W;
  C.H = H;
})(window.Cubix);
