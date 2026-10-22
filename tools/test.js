// Testy hry v Node (bez prohlížeče): přechody stavů, NaN, bot, který dohraje všechny úrovně, screenshoty.
//   node tools/test.js [adresář_pro_png]
const path = require('path');
const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const root = path.join(__dirname, '..');
const out = process.argv[2] || '/tmp';
const files = ['speccy.js', 'rules.js', 'levels.js', 'game.js'].map(f => path.join(root, 'js', f));
let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log('CHYBA: ' + m); } else { console.log('ok: ' + m); } }

function fresh() {
    const g = H.load(files);
    g.sandbox.ZK.rules; // existuje
    return g;
}

const makeBot = require('./bot.js');

// ---------- 1) tok stavů a NaN
{
    const g = fresh(), GM = g.sandbox.GAME;
    g.step(30);
    ok(GM.st === 'title', 'start na titulní obrazovce');
    g.png(path.join(out, 'title.png'), 3);
    g.press('fire'); g.step(2); g.release('fire');
    ok(GM.st === 'intro', 'fire spustí hru (úvod úrovně)');
    g.step(100);
    ok(GM.st === 'play', 'po úvodu se hraje');
    g.png(path.join(out, 'play1.png'), 3);
    g.step(500);
    ok(!g.hasNaN({ P: GM.P, g: GM.guards, s: GM.score }), 'žádné NaN po 500 tickách');
}

// ---------- 2) bot bez strážců dohraje všech 13 úrovní
{
    const g = fresh(), GM = g.sandbox.GAME, bot = makeBot(g);
    GM.opts.noGuards = true;
    GM.startGame();
    const N = g.sandbox.ZK.LEVELS.length;
    let lastLvl = -1, ticks = 0, lvlTicks = 0, done = true;
    const per = [];
    while (GM.st !== 'win' && GM.st !== 'over' && GM.st !== 'title' && ticks < 120000) {
        if (GM.lvl !== lastLvl) { if (lastLvl >= 0) per.push(lvlTicks); lastLvl = GM.lvl; lvlTicks = 0; bot.reset(); }
        bot.act(); g.step(1); ticks++; lvlTicks++;
        if (process.env.TR && lvlTicks % 100 === 0) console.log(lvlTicks, GM.P.x, GM.P.y, GM.goldLeft, GM.exitOn, GM.st);
        if (lvlTicks > 8000) { console.log('bot uvízl v úrovni ' + (GM.lvl + 1)); done = false; break; }
        if (ticks === 3000) g.png(path.join(out, 'play_bot.png'), 3);
    }
    if (GM.st === 'win') per.push(lvlTicks);
    ok(GM.st === 'win' && done, 'bot bez strážců dohrál všech ' + N + ' úrovní (ticky na úroveň: ' + per.join(',') + ')');
    g.png(path.join(out, 'win.png'), 3);
    ok(!g.hasNaN({ P: GM.P, s: GM.score }), 'žádné NaN po dohrání');
    g.step(800);
    ok(GM.st === 'title', 'po výhře návrat na titulní obrazovku');
}

// ---------- 3) hra se strážci: bot hraje, ověř přechody a uvěznění strážců
{
    const g = fresh(), GM = g.sandbox.GAME, bot = makeBot(g);
    GM.startGame();
    const seen = new Set(); let trapped = 0, killed = 0, maxLvl = 0, died = 0, nan = false;
    let wasDead = false;
    for (let t = 0; t < 150000 && GM.st !== 'title'; t++) {
        bot.act(); g.step(1);
        seen.add(GM.st);
        maxLvl = Math.max(maxLvl, GM.lvl);
        GM.guards.forEach(x => { if (x.trap === 1) trapped++; });
        if (GM.st === 'dying' && !wasDead) died++;
        wasDead = GM.st === 'dying';
        if (t % 500 === 0 && g.hasNaN({ P: GM.P, g: GM.guards })) { nan = true; }
        if (t === 4000) g.png(path.join(out, 'play_guards.png'), 3);
        if (GM.st === 'over' || GM.st === 'win') { g.png(path.join(out, 'over.png'), 3); }
    }
    ok(!nan, 'se strážci žádné NaN');
    ok(seen.has('dying'), 'prohra: stav dying nastal (smrtí: ' + died + ')');
    ok(seen.has('over') || seen.has('win'), 'konec hry (over/win) nastal, nejdále úroveň ' + (maxLvl + 1));
    ok(GM.st === 'title', 'po konci hry návrat na titulní obrazovku');
}

// ---------- 4) scénář: strážce uvízne v díře a po čase vyleze
{
    const g = fresh(), GM = g.sandbox.GAME, R = g.sandbox.ZK.rules;
    GM.setLevel(0); GM.startGame(); g.step(100);
    // hráč a strážce na stejném patře E (řádek 14): hráč vlevo, strážce vpravo, hráč kope doprava
    GM.P.x = 6; GM.P.y = 14; GM.P.px = 6; GM.P.py = 14;
    const gd = GM.guards[0]; gd.x = 14; gd.y = 14; gd.px = 14; gd.py = 14; gd.mv = null;
    // díra v betonu nejde, proto test na patře D (řádek 11)
    GM.P.x = 8; GM.P.y = 11; GM.P.px = 8; GM.P.py = 11; GM.P.mv = null;
    gd.x = 16; gd.y = 11; gd.px = 16; gd.py = 11; gd.mv = null;
    g.press('alt'); g.step(3); g.release('alt');
    g.step(30); g.press('left');
    ok(GM.holes.length === 1, 'kopání vytvoří díru');
    let trap = false, out2 = false;
    for (let i = 0; i < 700; i++) {
        g.step(1);
        if (gd.trap > 0 && !trap) { trap = true; g.step(2); g.png(path.join(out, 'trap.png'), 3); }
        if (trap && gd.trap === 0 && !gd.mv && gd.y === 11) out2 = true;
        if (GM.st !== 'play') break;
    }
    ok(trap, 'strážce spadl do díry a uvízl');
    ok(out2 || GM.guards[0].rs > 0 || GM.st === 'dying', 'uvízlý strážce po čase vylezl, nebo byl zazděn');
}

// ---------- 5) bot poslední úrovně screenshoty
{
    const g = fresh(), GM = g.sandbox.GAME, bot = makeBot(g);
    GM.opts.noGuards = false;
    GM.setLevel(10); GM.beginLevel(); g.step(120);
    for (let i = 0; i < 700; i++) { bot.act(); g.step(1); if (GM.st !== 'play') break; }
    g.png(path.join(out, 'level11.png'), 3);
}

console.log(fails ? 'SELHÁNÍ: ' + fails : 'VŠE V POŘÁDKU');
process.exit(fails ? 1 : 0);
