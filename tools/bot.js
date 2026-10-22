// Bot pro testy: hledá nejkratší cestu ke zlatu/východu (BFS podle pravidel hry), když to nejde, vybere kopání.
function makeBot(g) {
    const GM = g.sandbox.GAME, R = g.sandbox.ZK.rules, W = 28, H_ = 16;
    let plan = null, stuck = 0, lastKey = '';
    const ACTS = ['left', 'right', 'up', 'down', 'fire', 'alt'];
    function targets() {
        const t = [];
        if (GM.exitOn) { for (let x = 0; x < W; x++) { t.push(x); } return 'exit'; }
        for (let y = 0; y < H_; y++) for (let x = 0; x < W; x++) if (GM.gold[y][x]) t.push(y * W + x);
        return t;
    }
    function bfs(G, sx, sy) {
        const prev = new Map([[sy * W + sx, -1]]), q = [sy * W + sx];
        for (let i = 0; i < q.length; i++) {
            const k = q[i], x = k % W, y = (k / W) | 0;
            for (const [dx, dy] of R.moves(G, x, y, false)) {
                const n = (y + dy) * W + x + dx;
                if (!prev.has(n)) { prev.set(n, k); q.push(n); }
            }
        }
        return prev;
    }
    function isTarget(k, t) { return t === 'exit' ? (k < W) : t.indexOf(k) >= 0; }
    function firstStep(prev, from, to) {
        let c = to; if (c === from) return null;
        while (prev.get(c) !== from) c = prev.get(c);
        return [(c % W) - (from % W), ((c / W) | 0) - ((from / W) | 0)];
    }
    function pickPlan(G, prev, t) {
        // najdi kopání, po kterém je cíl dosažitelný (jinak to, co nejvíc zvětší dosažitelnou množinu)
        let best = null;
        for (const [k, d] of dist(prev)) {
            const x = k % W, y = (k / W) | 0;
            for (const dx of [-1, 1]) {
                if (!R.canDig(G, x, y, dx) || GM.holes.some(h => h.x === x + dx && h.y === y + 1)) continue;
                if (GM.gold[y][x + dx]) continue;
                G[y + 1][x + dx] = 'o';
                const p2 = bfs(G, x, y);
                G[y + 1][x + dx] = '#';
                let hit = false; for (const kk of p2.keys()) if (isTarget(kk, t)) { hit = true; break; }
                const score = (hit ? 100000 : 0) + p2.size * 5 - d;
                if (!best || score > best.score) best = { k, dx, score, hit };
            }
        }
        return best;
    }
    function dist(prev) {
        const m = new Map();
        const dd = k => { if (m.has(k)) return m.get(k); let c = k, n = 0; while (prev.get(c) !== -1) { c = prev.get(c); n++; } m.set(k, n); return n; };
        for (const k of prev.keys()) dd(k);
        return m;
    }
    function hold(set) { ACTS.forEach(a => { if (set.has(a)) g.press(a); else g.release(a); }); }
    return {
        act() {
            const P = GM.P, G = GM.G;
            if (GM.st !== 'play' || P.dig > 0 || P.dead) { if (GM.st !== 'play') hold(new Set()); return; }
            const here = P.y * W + P.x;
            const t = targets();
            if (t !== 'exit' && t.length === 0) { hold(new Set()); return; }
            const prev = bfs(G, P.x, P.y);
            let goal = null, bd = 1e9; const dm = dist(prev);
            for (const k of prev.keys()) if (isTarget(k, t) && dm.get(k) < bd) { bd = dm.get(k); goal = k; }
            if (goal !== null && !(t !== 'exit' && goal === here)) {
                plan = null;
                const s = firstStep(prev, here, goal);
                const keys = new Set();
                if (s) {
                    if (s[1] === 1) keys.add('down'); else if (s[1] === -1 && s[0] === 0) keys.add('up');
                    else if (s[0] === -1) keys.add('left'); else if (s[0] === 1) keys.add('right');
                    if (s[1] === -1 && s[0] !== 0) keys.add(s[0] < 0 ? 'left' : 'right');
                }
                hold(keys); return;
            }
            // nutné kopat (nejdřív počkej, až se zavřou staré díry)
            if (!plan) { plan = pickPlan(G, prev, t); if (plan && !plan.hit && GM.holes.length > 0) { plan = null; hold(new Set()); return; } }
            if (!plan) { hold(new Set()); return; }
            const pk = plan.k;
            if (here === pk) {
                if (R.canDig(G, P.x, P.y, plan.dx)) { hold(new Set([plan.dx < 0 ? 'fire' : 'alt'])); plan.tries = (plan.tries || 0) + 1; if (plan.tries > 3) plan = null; }
                else plan = null;
                return;
            }
            const s = firstStep(prev, here, pk);
            if (!s) { plan = null; return; }
            const keys = new Set();
            if (s[1] === 1) keys.add('down'); else if (s[1] === -1 && s[0] === 0) keys.add('up');
            else if (s[0] === -1) keys.add('left'); else if (s[0] === 1) keys.add('right');
            hold(keys);
        },
        reset() { plan = null; hold(new Set()); }
    };
}

module.exports = makeBot;
