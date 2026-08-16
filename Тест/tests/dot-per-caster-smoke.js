/* smoke: per-caster DoT/debuff identity (no browser) */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'systems', 'ability-data.js'), 'utf8');
const start = src.indexOf('function statusIsPerCaster');
const end = src.indexOf('function scoreLabel');
if (start < 0 || end < 0) {
  console.error('extract fail', start, end);
  process.exit(1);
}
eval(src.slice(start, end));

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
  console.log('ok', msg);
}

const t = { buffs: [] };
applyStatus(t, { id: 'dot_rake', name: 'Глубокая рана', dot: 9, turns: 3, fromUid: 'catA', periodic: true });
applyStatus(t, { id: 'dot_rake', name: 'Глубокая рана', dot: 11, turns: 3, fromUid: 'catB', periodic: true });
assert(t.buffs.length === 2, 'two rakes coexist');
assert(t.buffs.find(b => b.fromUid === 'catA').dot === 9, 'A tick kept');
assert(t.buffs.find(b => b.fromUid === 'catB').dot === 11, 'B tick kept');

applyStatus(t, { id: 'dot_rake', name: 'Глубокая рана', dot: 15, turns: 3, fromUid: 'catA', periodic: true });
assert(t.buffs.length === 2, 'recast still 2');
assert(t.buffs.find(b => b.fromUid === 'catA').dot === 15, 'A refreshed');
assert(t.buffs.find(b => b.fromUid === 'catB').dot === 11, 'B untouched');

applyStatus(t, { id: 'stun', name: 'Оглушение', turns: 2, ccMode: 'stun' });
applyStatus(t, { id: 'stun', name: 'Оглушение', turns: 1, ccMode: 'stun' });
assert(t.buffs.filter(b => b.id === 'stun').length === 1, 'stun unique');
assert(t.buffs.find(b => b.id === 'stun').turns === 1, 'stun refreshed');

applyStatus(t, { id: 'atk_berserk', atkMod: 0.28, turns: 3 });
applyStatus(t, { id: 'atk_berserk', atkMod: 0.28, turns: 2 });
assert(t.buffs.filter(b => b.id === 'atk_berserk').length === 1, 'self buff unique');

const v = { id: 'vuln_vendetta', dmgTakenMod: 0.3, fromUid: 'rogueA' };
assert(statusAffectsViewer(v, { uid: 'rogueA' }), 'vendetta self');
assert(!statusAffectsViewer(v, { uid: 'mage' }), 'vendetta not for other');
assert(statusAffectsViewer(v, { uid: 'pet1', ownerUid: 'rogueA' }), 'vendetta pet');
assert(statusAffectsViewer({ id: 'enrage', atkMod: 0.35 }, { uid: 'x' }), 'unowned affects all');

assert(statusIsPerCaster({ id: 'hmark', defMod: -0.25, fromUid: 'h1' }), 'mark per caster');
assert(!statusIsPerCaster({ id: 'deb_demo_shout', atkMod: -0.15 }), 'demo shout shared');

console.log('ALL PASS');
