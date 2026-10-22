global.window = global; const p = require('path').join(__dirname, '..');
require(p + '/js/rules.js'); require(p + '/js/levels.js');
const n = +process.argv[2] - 1, L = ZK.LEVELS[n];
const g = L.g.map(r => r.split(''));
L.gold.forEach(([x, y]) => g[y][x] = '$'); L.guards.forEach(([x, y]) => g[y][x] = 'G'); g[L.start[1]][L.start[0]] = 'P';
console.log('   ' + '0123456789'.repeat(3).slice(0, 28));
g.forEach((r, i) => console.log(String(i).padStart(2) + ' ' + r.join('')));
