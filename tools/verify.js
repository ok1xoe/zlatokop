// Ověření řešitelnosti úrovní: uzávěr dosažitelnosti s kopáním (díry zůstávají otevřené),
// zlato i východ dosažitelné a z každého dosažitelného políčka se lze vrátit na start (žádná slepá ulička).
const path = require('path');
const root = path.join(__dirname, '..');
global.window = global; // levels.js a rules.js se přichytí na globalThis
require(path.join(root, 'js/rules.js'));
require(path.join(root, 'js/levels.js'));
const R = ZK.rules, W = 28, H = 16;

// graf: běžné tahy v terénu + "kopací" hrany (po vykopání jedné cihly vše, kam se dá z toho místa dojít)
function walk(g, sx, sy) {
    const seen = new Set([sy * W + sx]), q = [[sx, sy]];
    while (q.length) {
        const [x, y] = q.pop();
        for (const [dx, dy] of R.moves(g, x, y)) {
            const k = (y + dy) * W + x + dx;
            if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); }
        }
    }
    return seen;
}
function makeGraph(g) {
    const cache = new Map();
    return function succ(k) {
        if (cache.has(k)) { return cache.get(k); }
        const x = k % W, y = (k / W) | 0, out = new Set();
        R.moves(g, x, y).forEach(([dx, dy]) => out.add((y + dy) * W + x + dx));
        [-1, 1].forEach(dx => {
            if (R.canDig(g, x, y, dx)) {
                g[y + 1][x + dx] = 'o';
                walk(g, x, y).forEach(c => out.add(c));
                g[y + 1][x + dx] = '#';
            }
        });
        out.delete(k);
        const arr = [...out];
        cache.set(k, arr);
        return arr;
    };
}
function reach(succ, k0) {
    const seen = new Set([k0]), q = [k0];
    while (q.length) { const k = q.pop(); for (const n of succ(k)) { if (!seen.has(n)) { seen.add(n); q.push(n); } } }
    return seen;
}
let bad = 0;
ZK.LEVELS.forEach((L, i) => {
    const errs = [];
    if (L.g.length !== H || L.g.some(r => r.length !== W)) { errs.push('špatný rozměr'); }
    const g = L.g.map(r => r.split(''));
    const [sx, sy] = L.start;
    const gtile = g[sy][sx];
    if (gtile !== ' ') { errs.push('start v pevném poli ' + gtile); }
    if (!R.supported(g, sx, sy)) { errs.push('start ve vzduchu'); }
    L.gold.forEach(([x, y]) => { if (R.solid(g[y][x])) { errs.push('zlato ve zdi ' + x + ',' + y); } });
    L.guards.forEach(([x, y]) => { if (R.solid(g[y][x]) || !R.supported(g, x, y)) { errs.push('strážce špatně ' + x + ',' + y); } });
    if (L.guards.length !== L.nG) { errs.push('počet strážců ' + L.guards.length + ' != ' + L.nG); }
    // východ je odhalen až po sebrání zlata, ale cesta k němu musí existovat
    const ge = g.map(r => r.map(c => (c === 'E' ? 'H' : c)));
    const succ = makeGraph(ge);
    const seen = reach(succ, sy * W + sx);
    L.gold.forEach(([x, y]) => { if (!seen.has(y * W + x)) { errs.push('zlato nedosažitelné ' + x + ',' + y); } });
    if (!seen.has(0 * W + L.exit)) { errs.push('východ nedosažitelný'); }
    // návrat na start z každého dosaženého stabilního políčka
    let stuck = 0;
    for (const k of seen) {
        const x = k % W, y = (k / W) | 0;
        if (!R.supported(ge, x, y) || R.solid(ge[y][x])) { continue; }
        if (!reach(succ, k).has(sy * W + sx)) { stuck++; }
    }
    if (stuck) { errs.push('slepých políček: ' + stuck); }
    if (process.env.DBG) { const dead=[]; for (const k of seen) { const x=k%W,y=(k/W)|0; if (R.supported(ge,x,y) && !R.solid(ge[y][x]) && !reach(succ,k).has(sy*W+sx)) dead.push(x+','+y); } console.log('  mrtvá:',dead.join(' ')); }
    console.log((i + 1) + '. ' + L.name + ' zlato=' + L.gold.length + ' strážci=' + L.guards.length + ' ' + (errs.length ? 'CHYBA: ' + errs.join('; ') : 'OK'));
    if (errs.length) { bad++; }
});
console.log(ZK.LEVELS.length + ' úrovní, chyb: ' + bad);
process.exit(bad ? 1 : 0);
