// Zlatokop - úrovně sestavené z jednoduchých stavebních příkazů (28x16).
// Chodníky: řádky 2,5,8,11,14 (A..E); podlahy z cihel v řádcích 3,6,9,12; řádek 15 je beton.
(function (root) {
    'use strict';
    var W = 28, H = 16;
    function mk(name, guards, fn) {
        var g = [], i, j;
        for (i = 0; i < H; i++) { g.push([]); for (j = 0; j < W; j++) { g[i].push(' '); } }
        var thin = [];
        for (i = 0; i < H; i++) { thin.push([]); }
        var L = { name: name, guards: [], gold: [], start: [1, 14], exit: 14, nG: guards };
        var b = {
            set: function (x, y, c) { g[y][x] = c; },
            row: function (y, x1, x2, c) { for (var x = x1; x <= x2; x++) { g[y][x] = c; } },
            brick: function (y, x1, x2) { b.row(y, x1, x2 === undefined ? x1 : x2, '#'); },
            conc: function (y, x1, x2) { b.row(y, x1, x2 === undefined ? x1 : x2, '='); },
            gap: function (y, x1, x2) { b.row(y, x1, x2, ' '); },
            rope: function (y, x1, x2) { b.row(y, x1, x2, '-'); },
            lad: function (x, y1, y2) { for (var y = y1; y <= y2; y++) { g[y][x] = 'H'; } },
            std: function () { [3, 6, 9, 12].forEach(function (y) { b.row(y, 0, W - 1, '#'); }); },
            // komora: stěny v x1 a x2 v řádcích y1..y2 (uvnitř zlato; dovnitř se kope shora, ven dolů)
            chamber: function (x1, x2, y1, y2) {
                for (var y = y1; y <= y2; y++) { g[y][x1] = '#'; g[y][x2] = '#'; }
                for (var x = x1 + 1; x < x2; x++) { thin[y1 - 1][x] = true; thin[y2 + 1][x] = true; }
            },
            gold: function () { for (var i = 0; i < arguments.length; i += 2) { L.gold.push([arguments[i], arguments[i + 1]]); } },
            guard: function () { for (var i = 0; i < arguments.length; i += 2) { L.guards.push([arguments[i], arguments[i + 1]]); } },
            start: function (x, y) { L.start = [x, y]; },
            exit: function (x) { L.exit = x; for (var y = 0; y <= 2; y++) { g[y][x] = 'E'; } }
        };
        b.conc(15, 0, W - 1);
        fn(b);
        // podlahy jsou dvouřádkové (řádek f a f+1): vykopaná díra je pak jáma, ve které strážce uvízne;
        // jen střecha a dno komor jsou tenké (propadne se skrz)
        [3, 6, 9, 12].forEach(function (f) {
            for (var x = 0; x < W; x++) {
                if ((g[f][x] === '#' || g[f][x] === '=') && g[f + 1][x] === ' ' && !thin[f][x]) { g[f + 1][x] = g[f][x]; }
            }
        });
        L.g = g.map(function (r) { return r.join(''); });
        return L;
    }

    var LV = [];

    LV.push(mk('ÚVODNÍ ŠTOLA', 1, function (b) {
        b.std();
        b.lad(21, 11, 14); b.lad(6, 8, 11); b.lad(22, 5, 8); b.lad(5, 2, 5);
        b.exit(14); b.start(2, 14);
        b.gold(10, 14, 25, 11, 10, 8, 16, 5, 25, 2, 10, 2);
        b.guard(24, 5);
    }));

    LV.push(mk('ZAZDĚNÝ POKLAD', 2, function (b) {
        b.std();
        b.lad(3, 11, 14); b.lad(25, 8, 14); b.lad(4, 5, 8); b.lad(24, 2, 5);
        b.chamber(11, 17, 10, 11);
        b.exit(14); b.start(2, 14);
        b.gold(13, 11, 15, 11, 8, 14, 22, 14, 8, 8, 18, 8, 10, 5, 20, 5);
        b.guard(24, 8, 16, 2);
    }));

    LV.push(mk('LANOVÉ MOSTY', 2, function (b) {
        b.std();
        b.gap(6, 9, 18); b.rope(5, 9, 18);
        b.gap(9, 9, 18); b.rope(8, 9, 18);
        b.lad(1, 11, 14); b.lad(26, 8, 11); b.lad(1, 5, 8); b.lad(26, 2, 5);
        b.exit(14); b.start(3, 14);
        b.gold(6, 14, 14, 14, 22, 14, 13, 11, 5, 8, 22, 8, 13, 5, 22, 5, 5, 2);
        b.guard(20, 11, 14, 2);
    }));

    LV.push(mk('BETONOVÁ VĚŽ', 3, function (b) {
        b.std();
        b.conc(6, 10, 17); b.conc(9, 0, 7); b.conc(12, 20, 27);
        b.lad(26, 11, 14); b.lad(1, 8, 11); b.lad(26, 5, 8); b.lad(1, 2, 5);
        b.gap(12, 3, 4); b.gap(9, 20, 21); b.gap(6, 5, 6);
        b.rope(11, 3, 4); b.rope(8, 20, 21); b.rope(5, 5, 6);
        b.exit(12); b.start(14, 14);
        b.gold(3, 14, 23, 14, 5, 11, 12, 11, 21, 11, 8, 8, 24, 8, 3, 5, 14, 5, 22, 2, 7, 2);
        b.guard(24, 11, 12, 8, 4, 2);
    }));

    LV.push(mk('DVĚ KOMORY', 3, function (b) {
        b.std();
        b.lad(3, 11, 14); b.lad(5, 5, 11); b.lad(26, 2, 8);
        b.chamber(8, 14, 7, 8); b.chamber(16, 22, 10, 11);
        b.exit(14); b.start(14, 14);
        b.gold(10, 8, 12, 8, 18, 11, 20, 11, 6, 14, 20, 14, 8, 5, 22, 5, 6, 2, 21, 2);
        b.guard(7, 11, 24, 8, 12, 2);
    }));

    LV.push(mk('ŽEBŘÍKOVÝ LES', 3, function (b) {
        b.std();
        b.lad(5, 11, 14); b.lad(14, 11, 14); b.lad(23, 11, 14);
        b.lad(9, 8, 11); b.lad(19, 8, 11);
        b.lad(5, 5, 8); b.lad(14, 5, 8); b.lad(23, 5, 8);
        b.lad(9, 2, 5); b.lad(19, 2, 5);
        b.exit(26); b.start(2, 14);
        b.gold(8, 14, 18, 14, 26, 14, 2, 11, 12, 11, 25, 11, 7, 8, 16, 8, 3, 5, 11, 5, 21, 5, 4, 2, 14, 2);
        b.guard(16, 14, 6, 8, 25, 5);
    }));

    LV.push(mk('PROPAST', 4, function (b) {
        b.std();
        b.gap(6, 6, 21); b.rope(5, 6, 21);
        b.gap(9, 6, 21); b.rope(8, 6, 21);
        b.gap(12, 6, 21); b.rope(11, 6, 21);
        b.lad(1, 11, 14); b.lad(26, 8, 11); b.lad(1, 5, 8); b.lad(26, 2, 5);
        b.lad(26, 11, 14); b.lad(1, 8, 11);
        b.exit(13); b.start(3, 14);
        b.gold(13, 14, 22, 14, 10, 11, 17, 11, 3, 11, 12, 8, 3, 8, 24, 8, 9, 5, 18, 5, 8, 2, 20, 2);
        b.guard(24, 14, 13, 11, 24, 5, 10, 2);
    }));

    LV.push(mk('SCHODIŠTĚ', 4, function (b) {
        b.std();
        b.lad(1, 8, 14); b.lad(26, 2, 11);
        b.chamber(5, 9, 10, 11); b.chamber(18, 22, 4, 5);
        b.conc(9, 10, 16);
        b.rope(11, 12, 14); b.gap(12, 12, 14);
        b.exit(20); b.start(14, 14);
        b.gold(6, 11, 8, 11, 19, 5, 21, 5, 13, 11, 15, 11, 4, 8, 14, 8, 13, 14, 24, 14, 6, 2, 13, 2);
        b.guard(24, 11, 15, 8, 10, 2, 24, 5);
    }));

    LV.push(mk('KOMÍNY', 4, function (b) {
        b.std();
        b.lad(3, 11, 14); b.lad(13, 11, 14); b.lad(24, 11, 14);
        b.lad(8, 8, 11); b.lad(19, 8, 11);
        b.lad(3, 5, 8); b.lad(13, 5, 8); b.lad(24, 5, 8);
        b.lad(8, 2, 5); b.lad(19, 2, 5);
        b.chamber(21, 25, 7, 8); b.chamber(0, 5, 10, 11);
        b.gap(6, 10, 11); b.gap(9, 14, 15);
        b.exit(11); b.start(16, 14);
        b.gold(22, 8, 24, 8, 2, 11, 4, 11, 6, 14, 20, 14, 10, 11, 16, 11, 5, 5, 16, 5, 21, 5, 4, 2, 15, 2, 23, 2);
        b.guard(26, 14, 12, 8, 22, 5, 14, 2);
    }));

    LV.push(mk('DŮLNÍ LABYRINT', 4, function (b) {
        b.std();
        b.conc(3, 12, 14); b.conc(6, 0, 3); b.conc(9, 24, 27);
        b.gap(6, 8, 10); b.gap(9, 4, 6); b.gap(12, 16, 18); b.gap(3, 22, 23); b.rope(2, 22, 23);
        b.rope(5, 8, 10); b.rope(8, 4, 6); b.rope(11, 16, 18);
        b.lad(1, 11, 14); b.lad(21, 11, 14); b.lad(26, 8, 11); b.lad(12, 8, 11);
        b.lad(25, 5, 8); b.lad(14, 5, 8); b.lad(5, 2, 5); b.lad(20, 2, 5);
        b.chamber(7, 11, 10, 11);
        b.exit(16); b.start(10, 14);
        b.gold(9, 11, 5, 14, 14, 14, 25, 14, 17, 11, 9, 8, 22, 8, 2, 8, 16, 5, 24, 5, 2, 5, 9, 2, 25, 2);
        b.guard(24, 14, 5, 11, 20, 8, 13, 2);
    }));

    LV.push(mk('VĚŽ ZLATA', 4, function (b) {
        b.std();
        b.lad(1, 2, 14); b.lad(26, 2, 14);
        b.chamber(5, 11, 4, 5); b.chamber(14, 22, 7, 8); b.chamber(4, 12, 10, 11);
        b.conc(6, 24, 25);
        b.exit(13); b.start(14, 14);
        b.gold(7, 5, 9, 5, 16, 8, 20, 8, 6, 11, 10, 11, 3, 14, 10, 14, 24, 8, 15, 2, 24, 2, 3, 2);
        b.guard(24, 11, 3, 8, 17, 5, 10, 2);
    }));

    LV.push(mk('LANOVÁ DRÁHA', 4, function (b) {
        b.std();
        b.gap(3, 5, 22); b.rope(2, 5, 22);
        b.gap(6, 3, 8); b.gap(6, 15, 20); b.rope(5, 3, 8); b.rope(5, 15, 20);
        b.gap(9, 8, 19); b.rope(8, 8, 19);
        b.gap(12, 3, 9); b.gap(12, 16, 24); b.rope(11, 3, 9); b.rope(11, 16, 24);
        b.lad(1, 11, 14); b.lad(13, 11, 14); b.lad(26, 11, 14);
        b.lad(26, 8, 11); b.lad(4, 8, 11);
        b.lad(1, 5, 8); b.lad(13, 5, 8); b.lad(26, 5, 8);
        b.lad(2, 2, 5); b.lad(25, 2, 5);
        b.exit(13); b.start(14, 14);
        b.gold(7, 14, 20, 14, 6, 11, 21, 11, 14, 8, 10, 8, 18, 8, 5, 5, 18, 5, 8, 2, 16, 2, 23, 2);
        b.guard(5, 14, 24, 11, 22, 5, 20, 8);
    }));

    LV.push(mk('POSLEDNÍ ŽÍLA', 5, function (b) {
        b.std();
        b.conc(9, 10, 15); b.conc(6, 5, 8); b.conc(6, 19, 22);
        b.gap(12, 3, 4); b.rope(11, 3, 4); b.gap(12, 23, 24); b.rope(11, 23, 24);
        b.lad(1, 2, 14); b.lad(26, 2, 14); b.lad(13, 2, 5);
        b.chamber(17, 23, 7, 8); b.chamber(4, 9, 10, 11);
        b.exit(11); b.start(14, 14);
        b.gold(19, 8, 21, 8, 6, 11, 8, 11, 3, 14, 10, 14, 18, 14, 24, 14, 5, 5, 12, 5, 24, 5, 3, 2, 22, 2);
        b.guard(13, 14, 24, 11, 12, 8, 7, 2, 8, 5);
    }));

    root.ZK = root.ZK || {};
    root.ZK.LEVELS = LV;
})(typeof window !== 'undefined' ? window : globalThis);
