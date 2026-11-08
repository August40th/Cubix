/* ============================================================
   Cubix — game.js
   Game actions: turn, undo, shuffle, reset, and the status line.
   Glues state.js (rules) to render.js (drawing).

   Needs: config.js, geometry.js, state.js, colors.js, render.js
   ============================================================ */
(function (C) {
  "use strict";

  var S = C.state;

  C.updateStatus = function () {
    document.getElementById("btn-undo").disabled = S.history.length === 0;
    var el = document.getElementById("status-text");
    if (C.isSolved()) {
      el.innerHTML = '<span class="solved">Solved</span> — cube restored in ' +
                     S.moves + " move" + (S.moves === 1 ? "" : "s") + ".";
    } else {
      el.textContent = S.moves + " move" + (S.moves === 1 ? "" : "s");
    }
  };

  // One click = one genuine 60-degree turn: animate, then commit the change.
  C.spin = function (vx, vy, dir) {
    if (S.animating) return;
    var fp = C.findFlipPointAt(vx, vy);
    if (!fp) return;
    C.animateSpin(vx, vy, dir, function () {
      C.applyStep(fp, dir, true);
      S.moves++;
      C.render();
      C.updateStatus();
    });
  };

  // Undo plays the last turn backwards, then restores the saved state.
  C.undo = function () {
    if (S.animating) return;
    var h = S.history[S.history.length - 1];
    if (!h) return;
    C.animateSpin(h.vx, h.vy, -h.dir, function () {
      S.history.pop();
      C.restoreFromHistory(h);
      S.moves = Math.max(0, S.moves - 1);
      C.render();
      C.updateStatus();
    });
  };

  C.shuffle = function (steps) {
    if (S.animating) return;
    C.scramble(steps);
    C.render();
    C.updateStatus();
  };

  C.reset = function () {
    if (S.animating) return;
    C.resetState();
    C.render();
    C.updateStatus();
  };
})(window.Cubix);
