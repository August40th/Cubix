/* ============================================================
   Cubix — colors.js
   The current color theme plus the color math used by the
   "Random colors" button. No DOM in this file.

   Needs: config.js
   ============================================================ */
(function (C) {
  "use strict";

  // ---- the live theme (render.js reads this on every draw) ----
  C.theme = {
    palette:  Object.assign({}, C.DEFAULT_PALETTE),
    dotColor: C.DEFAULT_DOT_COLOR
  };

  // ---- basic conversions ----
  // Darken (amt < 1) or lighten (amt > 1) a "#rrggbb" color.
  C.shade = function (hex, amt) {
    var n = parseInt(hex.replace("#", ""), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function clamp(v) { return Math.max(0, Math.min(255, Math.round(v * amt))); }
    return "#" + [clamp(r), clamp(g), clamp(b)].map(function (v) {
      return v.toString(16).padStart(2, "0");
    }).join("");
  };

  C.hslToHex = function (h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    var toHex = function (v) { return Math.round(v * 255).toString(16).padStart(2, "0"); };
    return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  };

  // ---- contrast math (WCAG relative luminance) ----
  C.relLuminance = function (hex) {
    var c = hex.replace("#", "");
    var chan = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    var r = chan(parseInt(c.slice(0, 2), 16));
    var g = chan(parseInt(c.slice(2, 4), 16));
    var b = chan(parseInt(c.slice(4, 6), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  C.contrastRatio = function (hexA, hexB) {
    var L1 = C.relLuminance(hexA), L2 = C.relLuminance(hexB);
    var lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  function linToSrgb(v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
  function luminanceToGray(L) {
    var c = Math.round(Math.max(0, Math.min(1, linToSrgb(Math.max(0, Math.min(1, L))))) * 255);
    var hex = c.toString(16).padStart(2, "0");
    return "#" + hex + hex + hex;
  }

  // ---- random theme ----
  // Returns { palette, dotColor } without touching the live theme.
  C.randomTheme = function () {
    // Three well-spread hues, one per face: ~120 degrees apart with a little
    // jitter so it isn't mechanical, but never close enough to be confused.
    var base = Math.random() * 360;
    var jitter = function () { return Math.random() * 30 - 15; };
    var hues = [base, base + 120 + jitter(), base + 240 + jitter()];
    var s = 55 + Math.random() * 20;

    // A modest lightness gap per face: enough to tell faces apart by brightness
    // alone, but narrow enough that ONE rotation-point color can still read
    // against all three (a wide gap forces it to fight a near-white and a
    // near-black face at once).
    var lightness = [61 + Math.random() * 6, 47 + Math.random() * 6, 35 + Math.random() * 6];
    var order = [0, 1, 2].sort(function () { return Math.random() - 0.5; });

    var palette = {
      top:   C.hslToHex(hues[0] % 360, s, lightness[order[0]]),
      left:  C.hslToHex(hues[1] % 360, s, lightness[order[1]]),
      right: C.hslToHex(hues[2] % 360, s, lightness[order[2]])
    };

    // Rotation-point color: try white, near-black, and the optimal mid-gray
    // between the lightest and darkest face (the luminance that splits their
    // contrast ratio evenly). Keep whichever has the best WORST-case contrast
    // against all three faces.
    var backdrops = [palette.top, palette.left, palette.right];
    var lums = backdrops.map(C.relLuminance);
    var Lmax = Math.max.apply(null, lums), Lmin = Math.min.apply(null, lums);
    var optimalGray = luminanceToGray(Math.sqrt((Lmax + 0.05) * (Lmin + 0.05)) - 0.05);

    var best = "#ffffff", bestScore = -Infinity;
    ["#ffffff", "#111111", optimalGray].forEach(function (cand) {
      var worst = Math.min.apply(null, backdrops.map(function (bg) { return C.contrastRatio(cand, bg); }));
      if (worst > bestScore) { bestScore = worst; best = cand; }
    });

    return { palette: palette, dotColor: best };
  };
})(window.Cubix);
