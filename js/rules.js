// Zlatokop - čistá pravidla pohybu po mřížce (sdílí hra i ověřovací skripty)
// Terén: ' ' vzduch, '#' cihla, '=' beton, 'H' žebřík, '-' lano, 'E' skrytý žebřík (jako vzduch), 'o' otevřená díra
(function (root) {
    'use strict';
    var W = 28, H = 16;
    function T(g, x, y) {
        if (x < 0 || x >= W || y < 0 || y >= H) { return '='; }
        return g[y][x];
    }
    function solid(c) { return c === '#' || c === '='; }
    function supported(g, x, y) {
        var c = T(g, x, y);
        if (c === 'H' || c === '-') { return true; }
        var b = T(g, x, y + 1);
        return b === '#' || b === '=' || b === 'H';
    }
    // možné tahy [dx,dy] z políčka; forceSup = stojí na něčem navíc (uvízlý strážce pod hráčem)
    function moves(g, x, y, forceSup) {
        var out = [], c = T(g, x, y);
        if (!forceSup && !supported(g, x, y)) {
            if (!solid(T(g, x, y + 1))) { out.push([0, 1]); }
            return out;
        }
        if (c === 'o') {
            // výstup z díry šikmo nahoru na okraj
            if (!solid(T(g, x, y - 1))) {
                if (!solid(T(g, x - 1, y - 1))) { out.push([-1, -1]); }
                if (!solid(T(g, x + 1, y - 1))) { out.push([1, -1]); }
            }
            return out;
        }
        if (!solid(T(g, x - 1, y))) { out.push([-1, 0]); }
        if (!solid(T(g, x + 1, y))) { out.push([1, 0]); }
        if (c === 'H' && T(g, x, y - 1) === 'H') { out.push([0, -1]); }
        if (!solid(T(g, x, y + 1))) { out.push([0, 1]); }
        return out;
    }
    // lze z (x,y) kopat cihlu (x+dx,y+1)?
    function canDig(g, x, y, dx) {
        if (!supported(g, x, y)) { return false; }
        var s = T(g, x + dx, y);
        if (s !== ' ' && s !== 'E') { return false; }
        return T(g, x + dx, y + 1) === '#' && T(g, x, y) !== 'o';
    }
    var R = { W: W, H: H, T: T, solid: solid, supported: supported, moves: moves, canDig: canDig };
    root.ZK = root.ZK || {};
    root.ZK.rules = R;
})(typeof window !== 'undefined' ? window : globalThis);
