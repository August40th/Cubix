/* ============================================================
   Cubix — ui.js
   Wires the buttons and color pickers to the game.

   Needs: everything above it (config, geometry, state, colors,
   render, game)
   ============================================================ */
(function (C) {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var inTop   = $("col-top");
  var inLeft  = $("col-left");
  var inRight = $("col-right");
  var inDot   = $("col-dot");

  // Make the page match C.theme: swatches, CSS variable for the dots.
  function syncPickersFromTheme() {
    var t = C.theme;
    inTop.value   = t.palette.top;
    inLeft.value  = t.palette.left;
    inRight.value = t.palette.right;
    inDot.value   = t.dotColor;
  }
  C.applyDotColor = function () {
    document.documentElement.style.setProperty("--dot-color", C.theme.dotColor);
  };

  C.initUI = function () {
    // ---- game buttons ----
    $("btn-easy").addEventListener("click",  function () { C.shuffle(C.SHUFFLE_EASY); });
    $("btn-hard").addEventListener("click",  function () { C.shuffle(C.SHUFFLE_HARD); });
    $("btn-undo").addEventListener("click",  C.undo);
    $("btn-reset").addEventListener("click", C.reset);

    // ---- color pickers ----
    inTop.addEventListener("input",   function () { C.theme.palette.top   = inTop.value;   C.render(); });
    inLeft.addEventListener("input",  function () { C.theme.palette.left  = inLeft.value;  C.render(); });
    inRight.addEventListener("input", function () { C.theme.palette.right = inRight.value; C.render(); });
    inDot.addEventListener("input",   function () { C.theme.dotColor = inDot.value; C.applyDotColor(); });

    $("btn-default-colors").addEventListener("click", function () {
      C.theme.palette  = Object.assign({}, C.DEFAULT_PALETTE);
      C.theme.dotColor = C.DEFAULT_DOT_COLOR;
      syncPickersFromTheme();
      C.applyDotColor();
      C.render();
    });

    $("btn-random-colors").addEventListener("click", function () {
      var t = C.randomTheme();
      C.theme.palette  = t.palette;
      C.theme.dotColor = t.dotColor;
      syncPickersFromTheme();
      C.applyDotColor();
      C.render();
    });

    syncPickersFromTheme();
    C.applyDotColor();
  };
})(window.Cubix);
