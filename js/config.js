/* ============================================================
   Cubix — config.js
   Shared constants and tiny helpers. Loaded FIRST.

   All modules hang their public pieces off one global object,
   window.Cubix (aliased as "C" inside each file).
   ============================================================ */
window.Cubix = window.Cubix || {};

(function (C) {
  "use strict";

  // ---- board size ----
  C.N  = 3;                  // hexagon side length (27 tiles)
  C.L  = 3 * C.N;            // side of the big triangle the hexagon is cut from
  C.SQ3 = Math.sqrt(3);

  // ---- drawing ----
  C.UNIT = 46;               // pixels per lattice unit
  C.PAD  = 26;               // padding around the board inside the SVG viewBox
  C.RING_OFFSET = 9;         // how far the colored guide ring sits outside the tiles
  C.RING_WIDTH  = 7;
  C.MAX_BOARD_PX = 560;

  // ---- animation / gameplay ----
  C.SPIN_MS      = 260;      // duration of one 60-degree turn
  C.SHUFFLE_EASY = 30;       // number of random turns for each shuffle button
  C.SHUFFLE_HARD = 220;

  // ---- default colors ----
  C.DEFAULT_PALETTE   = { top: "#e6402a", left: "#f2c230", right: "#3f9142" };
  C.DEFAULT_DOT_COLOR = "#ffffff";

  // ---- lattice-coordinate helpers: "x,y" string keys ----
  C.key   = function (x, y) { return x + "," + y; };
  C.parse = function (k) {
    var p = k.split(",").map(Number);
    return { x: p[0], y: p[1] };
  };
})(window.Cubix);
