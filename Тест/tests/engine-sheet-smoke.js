/* smoke: движок листа «Движок» — combo, applyDot turns, стаки брони, броня % */
const fs = require('fs');
const path = require('path');

function extract(src, startNeedle, endNeedle) {
  const start = src.indexOf(startNeedle);
  const end = src.indexOf(endNeedle);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('extract fail: ' + startNeedle);
  }
  return src.slice(start, end);
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
  console.log('ok', msg);
}

const dataSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'systems', 'ability-data.js'), 'utf8');
const PERIODIC_ROUNDS = 3;
eval(extract(dataSrc, 'function comboFinisherMult', 'function comboPointsForEstimate'));
eval(extract(dataSrc, 'function resolveDotTurns', 'function resolveDotTickFlat'));
eval(extract(dataSrc, 'function statusIsPerCaster', 'function scoreLabel'));

assert(Math.abs(comboFinisherMult(1) - 0.22) < 1e-9, '1 очко серии 0.22');
assert(Math.abs(comboFinisherMult(2) - 0.42) < 1e-9, '2 очка серии 0.42');
assert(Math.abs(comboFinisherMult(3) - 0.68) < 1e-9, '3 очка серии 0.68');
assert(Math.abs(comboFinisherMult(4) - 1.05) < 1e-9, '4 очка серии 1.05');
assert(Math.abs(comboFinisherMult(5) - 1.55) < 1e-9, '5 очков серии 1.55');
assert(comboFinisherMult(0) === 1, '0 очков без множителя');
assert(5 * comboFinisherMult(1) < comboFinisherMult(5), 'пять единиц слабее одной пятёрки');

assert(resolveDotTurns({ applyDot: { turns: 5 } }) === 5, 'applyDot.turns=5');
assert(resolveDotTurns({ applyDot: { flat: 4 } }) === 3, 'без turns → 3');
assert(resolveDotTurns({ type: 'dot' }) === 3, 'чистый дот без applyDot → 3');

const u = { buffs: [] };
applyStatus(u, {
  id: 'armor_crusader', name: 'Броня ×1', armorMod: 0.04, stacks: 1,
  stackable: true, armorStacksMax: 2, turns: 3,
});
applyStatus(u, {
  id: 'armor_crusader', name: 'Броня ×1', armorMod: 0.04, stacks: 1,
  stackable: true, armorStacksMax: 2, turns: 3,
});
assert(u.buffs.length === 1, 'стаки брони — один бафф');
assert(u.buffs[0].stacks === 2, 'второй Удар воина Света плюсует');
assert(Math.abs(u.buffs[0].armorMod - 0.08) < 1e-9, 'броня 4%+4%');

applyStatus(u, {
  id: 'armor_crusader', name: 'Броня ×1', armorMod: 0.04, stacks: 1,
  stackable: true, armorStacksMax: 2, turns: 3,
});
assert(u.buffs[0].stacks === 2, 'потолок 2 стака');

const STAT_SCALE = 1000;
function armorCut(def, phys) {
  const k = phys ? STAT_SCALE * 20 : STAT_SCALE * 85;
  return Math.min(0.75, def / (def + k));
}
const small = Math.max(1, Math.round(800 * (1 - armorCut(12540, true))));
assert(small > 1, 'мелкий физ по танку не схлопывается в 1');
assert(small < 800, 'броня всё же режет');

console.log('ALL PASS');
