/* ============================================================
   Cubix — state.js
   The live puzzle state and the rules for changing it.
   No drawing and no DOM in this file.

   Two things are tracked independently:
     match : which down-triangle each up-triangle is paired with (tile SHAPE)
     color : which paint each tile carries                       (tile COLOR)

   Needs: config.js, geometry.js
   ============================================================ */
(function (C) {
  "use strict";

  var key = C.key, L = C.L;

  // Always read C.state.match / C.state.color at call time —
  // reset() replaces those objects.
  var S = C.state = {
    match: {},
    color: {},
    history: [],      // stack of recorded turns, used by Undo
    moves: 0,
    animating: false  // set by render.js while a spin is playing
  };

  C.resetState = function () {
    S.match = Object.assign({}, C.solvedMatch);
    S.color = Object.assign({}, C.solvedColor);
    S.history = [];
    S.moves = 0;
  };

  // ---- rotation points ----
  // A rotation point is an interior lattice vertex surrounded by 6 triangles
  // that are currently paired into one of the 2 valid local tilings (A or B).
  C.findFlipPointAt = function (vx, vy) {
    var U = [[vx, vy], [vx - 1, vy], [vx, vy - 1]].map(function (p) { return key(p[0], p[1]); });
    var D = [[vx - 1, vy], [vx, vy - 1], [vx - 1, vy - 1]].map(function (p) { return key(p[0], p[1]); });
    if (!U.every(function (k) { return C.hexUps.has(k); }))   return null;
    if (!D.every(function (k) { return C.hexDowns.has(k); })) return null;

    var kU0 = U[0], kU1 = U[1], kU2 = U[2];
    var kD0 = D[0], kD1 = D[1], kD2 = D[2];
    var m = S.match, state = null;
    if      (m[kU0] === kD0 && m[kU1] === kD2 && m[kU2] === kD1) state = "A";
    else if (m[kU1] === kD0 && m[kU2] === kD2 && m[kU0] === kD1) state = "B";
    if (!state) return null;

    return { vx: vx, vy: vy, kU0: kU0, kU1: kU1, kU2: kU2, kD0: kD0, kD1: kD1, kD2: kD2, state: state };
  };

  C.findAllFlipPoints = function () {
    var pts = [];
    for (var x = 0; x <= L; x++) {
      for (var y = 0; y <= L; y++) {
        var fp = C.findFlipPointAt(x, y);
        if (fp) pts.push(fp);
      }
    }
    return pts;
  };

  // ---- one 60-degree turn of the 3-tile cluster ----
  // The local tiling always flips to the other of its two valid states. Because
  // that flip's own geometry shifts the "seam" by 60 degrees one step and back
  // the next, a constant turn direction only permutes the paint every OTHER
  // step; the step in between is a pure shape flip with the paint held in place.
  //   dir =  1 : anticlockwise     dir = -1 : clockwise
  C.applyStep = function (fp, dir, record) {
    var m = S.match, c = S.color;

    if (record) {
      var prevMatch = {}, prevColor = {};
      [fp.kU0, fp.kU1, fp.kU2].forEach(function (k) { prevMatch[k] = m[k]; prevColor[k] = c[k]; });
      S.history.push({
        vx: fp.vx, vy: fp.vy, dir: dir,
        kU0: fp.kU0, kU1: fp.kU1, kU2: fp.kU2,
        prevMatch: prevMatch, prevColor: prevColor
      });
    }

    if (fp.state === "A") { m[fp.kU1] = fp.kD0; m[fp.kU2] = fp.kD2; m[fp.kU0] = fp.kD1; }
    else                  { m[fp.kU0] = fp.kD0; m[fp.kU1] = fp.kD2; m[fp.kU2] = fp.kD1; }

    var c0 = c[fp.kU0], c1 = c[fp.kU1], c2 = c[fp.kU2];
    if (dir === 1 && fp.state === "A") {
      c[fp.kU1] = c0; c[fp.kU2] = c1; c[fp.kU0] = c2;
    } else if (dir === -1 && fp.state === "B") {
      c[fp.kU0] = c1; c[fp.kU1] = c2; c[fp.kU2] = c0;
    }
    // otherwise: pure shape flip — paint stays on its up-triangle
  };

  // Put back the 3 tiles a recorded turn changed (used by Undo).
  C.restoreFromHistory = function (h) {
    Object.assign(S.match, h.prevMatch);
    Object.assign(S.color, h.prevColor);
  };

  C.isSolved = function () {
    return C.upList.every(function (u) {
      var k = key(u.x, u.y);
      return S.match[k] === C.solvedMatch[k] && S.color[k] === C.solvedColor[k];
    });
  };

  // Start from solved, then make `steps` random turns (not recorded for Undo).
  // Every scramble is reachable from solved, so it is always solvable.
  C.scramble = function (steps) {
    C.resetState();
    var last = null;
    for (var i = 0; i < steps; i++) {
      var pts = C.findAllFlipPoints();
      if (!pts.length) break;
      var pool = pts.filter(function (f) { return !(last && f.vx === last.vx && f.vy === last.vy); });
      if (!pool.length) pool = pts;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      C.applyStep(pick, Math.random() < 0.5 ? 1 : -1, false);
      last = { vx: pick.vx, vy: pick.vy };
    }
  };

  C.resetState();
})(window.Cubix);
