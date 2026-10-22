// Zlatokop - hra ve stylu Lode Runner (mřížka 28x16, kopání děr, strážci s hledáním cesty)
(function () {
    'use strict';
    var R = ZK.rules, LEVELS = ZK.LEVELS;
    var W = 28, H = 16, CW = 9, CH = 11, OX = 2, OY = 16;
    var KEY = 'zlatokop';
    // časování (ticky, 50 za sekundu)
    var T_PL = 6, T_FALL = 4, T_LAD = 7, T_ROPE = 8, T_OUT = 14, DIG_T = 14, OPEN_T = 280, CLOSE_T = 28;
    var C = { K: 0, B: 1, R: 2, M: 3, G: 4, CY: 5, Y: 6, W: 7, BR: 10, BM: 11, BG: 12, BCY: 13, BY: 14, BW: 15 };

    var st = 'title', stT = 0;
    var lvl = 0, lives = 5, score = 0, hi = 0, newHi = false;
    var G, gold, holes, holeAt, P, guards, goldLeft, exitOn, exitFlash, msg, msgT, rnd, tick = 0;
    var opts = { noGuards: false };

    // ---------- sprity 9x11
    var PAL_P = { h: 14, b: 15, k: 13, s: 9 };
    var PAL_G = { h: 14, b: 11, k: 3, s: 10 };
    var SP = {
        run0: ['...hhh...', '..hhhhh..', '..hhhhh..', '...hhh...', '..bbbbb..', '.bbbbbbb.', '.b.bbb.b.', '...bbb...', '..bb.bb..', '..bb.bb..', '.kk...kk.'],
        run1: ['...hhh...', '..hhhhh..', '..hhhhh..', '...hhh...', '..bbbbb..', '..bbbbb..', '..bbbbb..', '...bbb...', '...bbb...', '..bb.bb..', '..kk.kk..'],
        clm0: ['...hhh...', '.b.hhh.b.', '.bbhhhbb.', '..bbbbb..', '..bbbbb..', '...bbb...', '...bbb...', '..bb.....', '..bb.....', '.kk......', '.........'],
        clm1: ['...hhh...', '.b.hhh.b.', '.bbhhhbb.', '..bbbbb..', '..bbbbb..', '...bbb...', '...bbb...', '.....bb..', '.....bb..', '......kk.', '.........'],
        hang: ['.b.....b.', '.b.hhh.b.', '.bbhhhbb.', '..bbbbb..', '..bbbbb..', '...bbb...', '...bbb...', '..bb.bb..', '..bb.bb..', '.kk...kk.', '.........'],
        dead: ['.........', '.........', '.........', '.........', '.........', '.........', '.hh......', 'hhhbbbbb.', '.hhbbbbbk', '.........', '.........'],
        bag: ['.........', '.........', '...yyy...', '....y....', '..yyyyy..', '.yyyYyyy.', '.yyYYYyy.', '.yyyYyyy.', '..yyyyy..', '.........', '.........']
    };
    var PAL_BAG = { y: 14, Y: 6 };
    var BRICK = ['RRRR.RRRR', 'rrrr.rrrr', 'rrrr.rrrr', '.........', 'R.RRRR.RR', 'r.rrrr.rr', 'r.rrrr.rr', '.........', 'RRRR.RRRR', 'rrrr.rrrr', 'rrrr.rrrr'];
    var PAL_BRICK = { R: 10, r: 2 };

    // ---------- úroveň
    function loadLevel(n) {
        var L = LEVELS[n];
        G = L.g.map(function (r) { return r.split(''); });
        gold = []; holes = []; holeAt = [];
        for (var y = 0; y < H; y++) { gold.push([]); holeAt.push([]); for (var x = 0; x < W; x++) { gold[y].push(false); holeAt[y].push(null); } }
        L.gold.forEach(function (p) { gold[p[1]][p[0]] = true; });
        goldLeft = L.gold.length;
        exitOn = false; exitFlash = 0;
        P = newActor(L.start[0], L.start[1]); P.dig = 0; P.dead = false; P.dir = 1;
        guards = [];
        if (!opts.noGuards) {
            L.guards.forEach(function (p, i) {
                var g = newActor(p[0], p[1]); g.id = i; g.carry = false; g.cd = 0; g.trap = 0; g.rs = 0; g.wait = 0; g.dir = i % 2 ? 1 : -1;
                guards.push(g);
            });
        }
        rnd = Z.rng(1000 + n * 77);
        msg = ''; msgT = 0;
    }
    function newActor(x, y) { return { x: x, y: y, px: x, py: y, mv: null, dir: 1, an: 0 }; }
    function startMove(a, dx, dy, dur) {
        a.px = a.x; a.py = a.y; a.x += dx; a.y += dy; a.mv = { dx: dx, dy: dy, t: 0, dur: dur };
        if (dx) { a.dir = dx; }
        a.an++;
    }
    function stepMove(a) { if (a.mv && ++a.mv.t >= a.mv.dur) { a.mv = null; return true; } return false; }

    function revealExit() {
        exitOn = true; exitFlash = 90;
        for (var y = 0; y < H; y++) { for (var x = 0; x < W; x++) { if (G[y][x] === 'E') { G[y][x] = 'H'; } } }
        say('ŽEBŘÍK VEN!', 120);
        Z.snd.win();
    }
    function say(s, t) { msg = s; msgT = t; }
    function addScore(n) { score += n; }

    function guardAt(x, y, except) {
        for (var i = 0; i < guards.length; i++) {
            var g = guards[i];
            if (g !== except && g.rs === 0 && g.x === x && g.y === y) { return g; }
        }
        return null;
    }
    function standOnGuard(x, y) { var g = guardAt(x, y + 1); return !!(g && g.trap > 0); }

    // ---------- díry
    function startDig(x, y) {
        var h = { x: x, y: y, t: 0 };
        holes.push(h); holeAt[y][x] = h;
    }
    function updHoles() {
        for (var i = holes.length - 1; i >= 0; i--) {
            var h = holes[i];
            h.t++;
            if (h.t === DIG_T) { G[h.y][h.x] = 'o'; }
            if (h.t >= DIG_T + OPEN_T + CLOSE_T) {
                G[h.y][h.x] = '#'; holeAt[h.y][h.x] = null; holes.splice(i, 1);
                if (P.x === h.x && P.y === h.y && !P.dead) { killPlayer(); }
                for (var j = 0; j < guards.length; j++) {
                    var g = guards[j];
                    if (g.rs === 0 && g.x === h.x && g.y === h.y) { killGuard(g); }
                }
                // zlato zasypané v cihle se nevyskytuje (zlato se pouští nad dírou)
            }
        }
    }
    function killGuard(g) {
        addScore(75); Z.snd.hit();
        g.mv = null; g.trap = 0; g.carry = false; g.rs = 140 + (rnd() * 60 | 0);
        g.x = -5; g.y = -5;
    }
    function respawn(g) {
        var best = null, bd = -1, cand = [];
        for (var y = 1; y <= 8; y++) {
            for (var x = 0; x < W; x++) {
                var c = G[y][x];
                if ((c === ' ' || c === 'E') && R.supported(G, x, y) && !gold[y][x] && !guardAt(x, y) && Math.abs(x - P.x) + Math.abs(y - P.y) > 9) { cand.push([x, y]); }
            }
        }
        if (cand.length) { var p = cand[(rnd() * cand.length) | 0]; g.x = p[0]; g.y = p[1]; } else {
            var L = LEVELS[lvl].guards[g.id]; g.x = L[0]; g.y = L[1];
        }
        g.px = g.x; g.py = g.y; g.mv = null; g.rs = 0; g.wait = 0;
    }

    // ---------- hráč
    function killPlayer() {
        if (P.dead) { return; }
        P.dead = true; setState('dying'); Z.snd.die();
    }
    function arrivePlayer() {
        if (gold[P.y][P.x]) {
            gold[P.y][P.x] = false; goldLeft--; addScore(250); Z.snd.coin();
            if (goldLeft <= 0 && !exitOn) { revealExit(); }
        }
    }
    function updPlayer() {
        var p = P;
        if (p.mv) { if (stepMove(p)) { arrivePlayer(); } if (p.mv) { return; } }
        if (p.dig > 0) { p.dig--; return; }
        var x = p.x, y = p.y;
        if (exitOn && y === 0) { return; }
        var sup = R.supported(G, x, y) || standOnGuard(x, y);
        var mv = R.moves(G, x, y, sup);
        function has(dx, dy) { for (var i = 0; i < mv.length; i++) { if (mv[i][0] === dx && mv[i][1] === dy) { return true; } } return false; }
        if (!sup) { startMove(p, 0, 1, T_FALL); return; }
        var I = Z.input, c = G[y][x];
        // kopání: fire doleva, alt doprava
        var dd = I.down('fire') ? -1 : (I.down('alt') ? 1 : 0);
        if (dd && R.canDig(G, x, y, dd) && !holeAt[y + 1][x + dd] && !gold[y][x + dd] && !guardAt(x + dd, y) && !guardAt(x + dd, y + 1)) {
            startDig(x + dd, y + 1); p.dig = DIG_T; p.dir = dd; p.digging = DIG_T; Z.snd.shoot(); return;
        }
        var L = I.down('left'), Rr = I.down('right'), U = I.down('up'), D = I.down('down');
        if (c === 'o') {
            if ((L || U) && has(-1, -1)) { startMove(p, -1, -1, T_OUT); return; }
            if ((Rr || U) && has(1, -1)) { startMove(p, 1, -1, T_OUT); return; }
            return;
        }
        if (U && has(0, -1)) { startMove(p, 0, -1, T_LAD); return; }
        if (D && has(0, 1)) { startMove(p, 0, 1, c === 'H' || G[y + 1][x] === 'H' ? T_LAD : T_PL); return; }
        if (L && has(-1, 0)) { startMove(p, -1, 0, c === '-' ? T_ROPE : T_PL); return; }
        if (Rr && has(1, 0)) { startMove(p, 1, 0, c === '-' ? T_ROPE : T_PL); return; }
        if (L) { p.dir = -1; } else if (Rr) { p.dir = 1; }
    }

    // ---------- strážci
    function bfsStep(g, tx, ty) {
        // nejkratší cesta po mřížce k cíli; vrací první tah [dx,dy] nebo null
        var start = g.y * W + g.x, goal = ty * W + tx;
        if (start === goal) { return null; }
        var prev = new Int16Array(W * H).fill(-2), q = [start], qi = 0;
        prev[start] = -1;
        var blocked = {};
        guards.forEach(function (o) { if (o !== g && o.rs === 0 && o.trap > 0) { blocked[o.y * W + o.x] = true; } });
        var flip = rnd() < 0.5;
        while (qi < q.length) {
            var k = q[qi++], x = k % W, y = (k / W) | 0;
            if (k === goal) { break; }
            var ms = R.moves(G, x, y, false);
            if (flip) { ms = ms.slice().reverse(); }
            for (var i = 0; i < ms.length; i++) {
                var nk = (y + ms[i][1]) * W + x + ms[i][0];
                if (prev[nk] === -2 && !blocked[nk]) { prev[nk] = k; q.push(nk); }
            }
        }
        if (prev[goal] === -2) { return undefined; }
        var cur = goal;
        while (prev[cur] !== start) { cur = prev[cur]; }
        return [(cur % W) - g.x, ((cur / W) | 0) - g.y];
    }
    function arriveGuard(g) {
        if (G[g.y][g.x] === 'o' && R.supported(G, g.x, g.y)) {
            g.trap = Math.max(110, 230 - lvl * 8); Z.snd.tick();
            if (g.carry) {
                g.carry = false;
                var ay = g.y - 1;
                if (ay >= 0 && !R.solid(G[ay][g.x]) && !gold[ay][g.x]) { gold[ay][g.x] = true; } else { goldLeft--; if (goldLeft <= 0 && !exitOn) { revealExit(); } }
            }
            return;
        }
        if (gold[g.y][g.x] && !g.carry && rnd() < 0.6) {
            g.carry = true; gold[g.y][g.x] = false; g.cd = 120 + (rnd() * 260 | 0);
        }
    }
    function gdur() { return Math.max(5, 9 - Math.floor(lvl / 4)); }
    function updGuard(g) {
        if (g.rs > 0) { if (--g.rs === 0) { respawn(g); } return; }
        if (g.mv) { if (stepMove(g)) { arriveGuard(g); } if (g.mv) { return; } }
        var x = g.x, y = g.y;
        if (g.trap > 0) {
            if (--g.trap > 0) { return; }
            var d = rnd() < 0.5 ? -1 : 1, ms = R.moves(G, x, y, false), ok = null;
            for (var i = 0; i < ms.length; i++) { if (ms[i][1] === -1 && !guardAt(x + ms[i][0], y - 1, g) && (!ok || ms[i][0] === d)) { ok = ms[i]; } }
            if (ok) { startMove(g, ok[0], ok[1], T_OUT + 4); } else { g.trap = 8; }
            return;
        }
        if (!R.supported(G, x, y) && !standOnGuard(x, y)) { startMove(g, 0, 1, T_FALL); return; }
        if (g.carry) {
            if (--g.cd <= 0) {
                if (!gold[y][x] && G[y][x] !== 'H' && G[y][x] !== 'o') { gold[y][x] = true; g.carry = false; } else { g.cd = 20; }
            }
        }
        if (P.dead) { return; }
        if (g.wait > 0) { g.wait--; return; }
        var step = bfsStep(g, P.x, P.y), ms2;
        if (step === undefined) {
            // hráč nedosažitelný: jdi vodorovně k němu, jinak se potuluj
            ms2 = R.moves(G, x, y, false);
            step = null;
            var want = P.x < x ? -1 : 1;
            for (var j = 0; j < ms2.length; j++) { if (ms2[j][1] === 0 && ms2[j][0] === want) { step = ms2[j]; } }
            if (!step && ms2.length && rnd() < 0.3) { step = ms2[(rnd() * ms2.length) | 0]; }
        }
        if (!step) { return; }
        if (guardAt(x + step[0], y + step[1], g)) {
            g.wait = 6 + (rnd() * 10 | 0);
            ms2 = R.moves(G, x, y, false);
            if (ms2.length && rnd() < 0.4) { var s2 = ms2[(rnd() * ms2.length) | 0]; if (!guardAt(x + s2[0], y + s2[1], g)) { startMove(g, s2[0], s2[1], gdur()); } }
            return;
        }
        var dur = gdur();
        if (step[1] === 0 && G[y][x] === '-') { dur += 1; }
        if (step[1] === -1 && step[0] !== 0) { dur = T_OUT + 4; }
        else if (step[1] !== 0) { dur = step[1] > 0 && R.supported(G, x, y) === false ? T_FALL : dur + 1; }
        startMove(g, step[0], step[1], dur);
    }
    function checkCatch() {
        if (P.dead) { return; }
        for (var i = 0; i < guards.length; i++) {
            var g = guards[i];
            if (g.rs > 0) { continue; }
            if (g.x === P.x && g.y === P.y) { killPlayer(); return; }
            if (g.mv && P.mv && g.px === P.x && g.py === P.y && P.px === g.x && P.py === g.y) { killPlayer(); return; }
        }
    }

    // ---------- stavy
    function setState(s) { st = s; stT = 0; Z.pauseOk = (s === 'play'); }
    function startGame() {
        lvl = 0; lives = 5; score = 0; newHi = false;
        beginLevel();
    }
    function beginLevel() { loadLevel(lvl); setState('intro'); }

    function updPlay() {
        tick++;
        updHoles();
        if (P.dead) { return; }
        updPlayer();
        guards.forEach(updGuard);
        checkCatch();
        if (msgT > 0) { msgT--; }
        if (exitFlash > 0) { exitFlash--; }
        if (!P.dead && exitOn && P.y === 0 && !P.mv) {
            addScore(1000 + lives * 100); setState('clear'); Z.snd.win();
        }
    }

    function logic() {
        stT++;
        var I = Z.input;
        if (st === 'title') {
            if (stT > 15 && (I.hit('fire') || I.hit('alt'))) { startGame(); }
        } else if (st === 'intro') {
            if (stT > 90 || (stT > 20 && I.hit('fire'))) { setState('play'); }
        } else if (st === 'play') {
            updPlay();
        } else if (st === 'dying') {
            updHoles();
            if (stT > 90) {
                lives--;
                if (lives <= 0) { hi = Z.hi.submit(KEY, score); newHi = score >= hi && score > 0; setState('over'); Z.snd.over(); } else { beginLevel(); }
            }
        } else if (st === 'clear') {
            if (stT > 110) {
                lvl++;
                if (lvl % 4 === 0 && lives < 9) { lives++; }
                if (lvl >= LEVELS.length) { hi = Z.hi.submit(KEY, score + lives * 500); score += lives * 500; newHi = score >= hi; setState('win'); } else { beginLevel(); }
            }
        } else if (st === 'over' || st === 'win') {
            if (stT > 60 && (I.hit('fire') || I.hit('alt')) || stT > 700) { setState('title'); hi = Z.hi.get(KEY); }
        }
    }

    // ---------- kreslení
    function px(cx) { return OX + cx * CW; }
    function py(cy) { return OY + cy * CH; }
    function drawBrick(x, y, h) {
        if (!h) { Z.spriteC(x, y, BRICK, PAL_BRICK); return; }
        var f;
        if (h.t < DIG_T) { f = Math.round(CH * h.t / DIG_T); Z.spriteC(x, y + f, BRICK.slice(f), PAL_BRICK); return; }
        if (h.t < DIG_T + OPEN_T) { return; }
        f = Math.round(CH * (h.t - DIG_T - OPEN_T) / CLOSE_T);
        if (f > 0) { Z.spriteC(x, y + CH - f, BRICK.slice(CH - f), PAL_BRICK); }
    }
    function drawTiles() {
        for (var y = 0; y < H; y++) {
            for (var x = 0; x < W; x++) {
                var c = G[y][x], X = px(x), Y = py(y);
                if (c === '#') { drawBrick(X, Y, holeAt[y][x]); }
                else if (c === 'o') { drawBrick(X, Y, holeAt[y][x]); }
                else if (c === '=') {
                    Z.rect(X, Y, CW, CH, 7); Z.rect(X, Y, CW, 1, 15); Z.rect(X, Y, 1, CH, 15); Z.rect(X, Y + CH - 1, CW, 1, 5); Z.rect(X + CW - 1, Y, 1, CH, 5);
                    Z.pix(X + 4, Y + 5, 0);
                } else if (c === 'H') {
                    var col = exitFlash > 0 && (exitFlash >> 2) % 2 ? 15 : 13;
                    Z.rect(X + 1, Y, 1, CH, col); Z.rect(X + 7, Y, 1, CH, col);
                    for (var r = 1; r < CH; r += 3) { Z.rect(X + 1, Y + r, 7, 1, col); }
                } else if (c === '-') {
                    Z.rect(X, Y + 1, CW, 1, 14); Z.rect(X, Y + 2, CW, 1, 6);
                }
                if (gold[y][x]) { Z.spriteC(X, Y, SP.bag, PAL_BAG); }
            }
        }
    }
    function actorPos(a) {
        var fx = a.x, fy = a.y;
        if (a.mv) { var k = 1 - a.mv.t / a.mv.dur; fx -= a.mv.dx * k; fy -= a.mv.dy * k; }
        return [OX + Math.round(fx * CW), OY + Math.round(fy * CH)];
    }
    function drawActor(a, pal, isP) {
        var p = actorPos(a), s, c = G[a.y][a.x], cp = a.mv ? G[a.py][a.px] : c;
        if (c === 'H' && a.mv && a.mv.dy !== 0) { s = (a.an & 1) ? SP.clm0 : SP.clm1; }
        else if (c === '-' || (cp === '-' && a.mv && a.mv.dy === 0)) { s = SP.hang; }
        else if (c === 'H' && !a.mv && R.T(G, a.x, a.y + 1) !== '#' && R.T(G, a.x, a.y + 1) !== '=' ) { s = (a.an & 1) ? SP.clm0 : SP.clm1; }
        else { s = (a.mv && (a.an & 1)) ? SP.run1 : SP.run0; }
        var y = p[1];
        if (s === SP.hang) { y += 1; }
        Z.spriteCS(p[0], y, s, pal, 1, a.dir < 0);
        if (!isP && a.carry) { Z.spriteC(p[0] + 2, y - 5, SP.bag.slice(2, 9), PAL_BAG); }
    }
    function hud() {
        Z.text(2, 2, 'SKÓRE ' + Z.pad(score, 6), 14);
        Z.text(130, 2, 'REKORD ' + Z.pad(Z.hi.get(KEY), 6), 5);
        Z.text(2, 10, 'ÚROVEŇ ' + Z.pad(lvl + 1, 2), 15);
        Z.text(90, 10, 'ZLATO ' + Z.pad(Math.max(0, goldLeft), 2), 14);
        Z.text(170, 10, 'ŽIVOTŮ ' + lives, 12);
    }
    function banner(lines, y0, col) {
        lines.forEach(function (l, i) { Z.text(128, y0 + i * 10, l, col, { align: 'center' }); });
    }
    function drawTitle() {
        Z.cls(0, 7); Z.border = 0;
        var t = 'ZLATOKOP';
        Z.text(128 + 2, 14 + 2, t, 2, { scale: 3, align: 'center' });
        Z.text(128, 14, t, 14, { scale: 3, align: 'center' });
        // ozdobný pás cihel a hrdinové
        for (var i = 0; i < 28; i++) { Z.spriteC(OX + i * CW, 50, BRICK, PAL_BRICK); }
        var f = (stT >> 3) & 1;
        Z.spriteCS(60, 39, f ? SP.run0 : SP.run1, PAL_P, 1, false);
        Z.spriteC(110, 39, SP.bag, PAL_BAG);
        Z.spriteC(130, 39, SP.bag, PAL_BAG);
        Z.spriteCS(190 - ((stT >> 1) % 40), 39, f ? SP.run1 : SP.run0, PAL_G, 1, true);
        banner(['SEBER VŠECHNO ZLATO A VYLEZ', 'ŽEBŘÍKEM NAHORU. STRÁŽCE TĚ HONÍ!'], 66, 15);
        banner(['KOPEJ DÍRY DO CIHEL: STRÁŽCE', 'V DÍŘE UVÍZNE. POZOR, DÍRA SE ZAZDÍ!'], 92, 6);
        banner(['ŠIPKY/WASD  POHYB A LEZENÍ', 'MEZERNÍK/Z  KOP VLEVO   X  KOP VPRAVO', 'P  PAUZA     M  ZVUK'], 120, 13);
        banner(['REKORD ' + Z.pad(Z.hi.get(KEY), 6)], 158, 14);
        if ((stT >> 4) & 1) { banner(['STISKNI MEZERNÍK'], 174, 10); }
    }
    function drawPlay() {
        Z.cls(0, 7);
        Z.border = (st === 'dying') ? 2 : 0;
        hud();
        drawTiles();
        guards.forEach(function (g) { if (g.rs === 0) { drawActor(g, PAL_G, false); } });
        if (P.dead) {
            var p = actorPos(P), k = Math.min(1, stT / 40);
            if (stT < 30) { Z.spriteCS(p[0], p[1] - Math.round(Math.sin(k * 3.1416) * 6), SP.run0, PAL_P, 1, P.dir < 0); }
            else { Z.spriteCS(p[0], p[1], SP.dead, PAL_P, 1, P.dir < 0); }
        } else if (st !== 'clear' || true) {
            drawActor(P, PAL_P, true);
        }
        // pruh pro kopání
        if (P.digging && P.dig > 0) {
            var p2 = actorPos(P), bx = p2[0] + (P.dir > 0 ? CW : -CW), by = p2[1] + CH;
            Z.rect(bx + 3, by - 4, 3, 3, (tick >> 1) & 1 ? 14 : 15);
        }
        if (msgT > 0 && st === 'play') { Z.rect(60, 90, 136, 14, 0); Z.text(128, 93, msg, 14, { align: 'center' }); }
        if (st === 'intro') {
            Z.rect(36, 66, 184, 52, 0); Z.frame(36, 66, 184, 52, 6);
            banner(['ÚROVEŇ ' + (lvl + 1), LEVELS[lvl].name, 'SEBER ' + LEVELS[lvl].gold.length + ' x ZLATO'], 74, 14);
            Z.text(128, 106, 'STRÁŽCI: ' + LEVELS[lvl].nG, 11, { align: 'center' });
        }
        if (st === 'clear') {
            Z.rect(50, 80, 156, 30, 0); Z.frame(50, 80, 156, 30, 4);
            banner(['ÚROVEŇ SPLNĚNA!', '+' + (1000 + lives * 100) + ' BODŮ'], 86, 12);
        }
    }
    function drawOver() {
        drawPlay();
        Z.rect(44, 70, 168, 60, 0); Z.frame(44, 70, 168, 60, 2);
        if (st === 'win') {
            banner(['VYHRÁL JSI!', 'DŮL JE VYBRÁN DO ZRNKA.', 'SKÓRE ' + Z.pad(score, 6)], 76, 14);
        } else {
            banner(['KONEC HRY', 'SKÓRE ' + Z.pad(score, 6)], 78, 10);
        }
        banner([newHi ? 'NOVÝ REKORD!' : 'REKORD ' + Z.pad(Z.hi.get(KEY), 6)], 108, newHi ? 12 : 5);
    }
    function draw() {
        if (st === 'title') { drawTitle(); }
        else if (st === 'over' || st === 'win') { drawOver(); }
        else { drawPlay(); }
    }

    hi = Z.hi.get(KEY);
    Z.init({
        title: 'Zlatokop',
        touch: [
            { act: 'left', label: '◀' }, { act: 'up', label: '▲' }, { act: 'down', label: '▼' }, { act: 'right', label: '▶' },
            { act: 'fire', label: 'KOP ◀', cls: 'big' }, { act: 'alt', label: 'KOP ▶', cls: 'big' }
        ]
    });
    Z.run({ tick: logic, draw: draw });

    window.GAME = {
        get st() { return st; }, get P() { return P; }, get guards() { return guards; }, get G() { return G; },
        get gold() { return gold; }, get goldLeft() { return goldLeft; }, get lvl() { return lvl; }, get lives() { return lives; },
        get score() { return score; }, get exitOn() { return exitOn; }, get holes() { return holes; },
        opts: opts, setLevel: function (n) { lvl = n; }, startGame: startGame, beginLevel: beginLevel,
        setState: setState, setLives: function (n) { lives = n; }
    };
})();
