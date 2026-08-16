/**
 * Smoke tests for class balance (Node, no browser).
 *
 * Run from project root:
 *   node tests/balance-smoke.js
 *
 * Checks:
 *  - all class-balance packs apply
 *  - every class has specs with abilities
 *  - tanks have taunt (or interrupt/utility)
 *  - ability cost/power sanity
 *  - secondary resource cycle where expected
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function fail(msg) { failures.push(msg); }
function warn(msg) { warnings.push(msg); }

function loadScript(rel, sandbox) {
  const full = path.join(ROOT, rel);
  const code = fs.readFileSync(full, 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

function main() {
  const sandbox = {
    console,
    module: { exports: {} },
    exports: {},
    global: null,
    globalThis: null,
    window: null,
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  // Load data + all balance packs
  loadScript('wow-mop-data.js', sandbox);
  const packs = [
    'class-balance/warrior-abilities.js',
    'class-balance/paladin-abilities.js',
    'class-balance/hunter-abilities.js',
    'class-balance/rogue-abilities.js',
    'class-balance/priest-abilities.js',
    'class-balance/deathknight-abilities.js',
    'class-balance/shaman-abilities.js',
    'class-balance/mage-abilities.js',
    'class-balance/warlock-abilities.js',
    'class-balance/monk-abilities.js',
    'class-balance/druid-abilities.js',
    'class-balance/engineer-abilities.js',
    'class-balance/apply-all.js',
  ];
  for (const p of packs) loadScript(p, sandbox);

  if (!sandbox.WOW_MOP || !Array.isArray(sandbox.WOW_MOP.classes)) {
    fail('WOW_MOP.classes missing after load');
    return report();
  }

  const applied = sandbox.CLASS_BALANCE_APPLIED || [];
  console.log('[smoke] CLASS_BALANCE_APPLIED:', applied.join(', ') || '(none)');

  const expected = [
    'warrior', 'paladin', 'hunter', 'rogue', 'priest',
    'deathknight', 'shaman', 'mage', 'warlock', 'monk', 'druid', 'engineer',
  ];
  for (const id of expected) {
    if (!applied.includes(id)) fail(`pack not applied: ${id}`);
  }

  const classes = sandbox.WOW_MOP.classes;
  const byId = Object.fromEntries(classes.map((c) => [c.id, c]));

  for (const id of expected) {
    const cls = byId[id];
    if (!cls) {
      fail(`class missing: ${id}`);
      continue;
    }
    if (!Array.isArray(cls.specs) || !cls.specs.length) {
      fail(`${id}: no specs`);
      continue;
    }
    for (const spec of cls.specs) {
      const key = `${id}:${spec.id}`;
      if (!spec.role) fail(`${key}: missing role`);
      if (!spec.stats) fail(`${key}: missing stats`);
      if (!Array.isArray(spec.abilities) || spec.abilities.length < 3) {
        fail(`${key}: expected ≥3 abilities, got ${spec.abilities ? spec.abilities.length : 0}`);
        continue;
      }

      // Ability sanity
      let sumPower = 0;
      let dmgCount = 0;
      for (const ab of spec.abilities) {
        if (!ab.id) fail(`${key}: ability without id`);
        if (!ab.type) fail(`${key}/${ab.id}: missing type`);
        if (ab.power != null && (typeof ab.power !== 'number' || Number.isNaN(ab.power))) {
          fail(`${key}/${ab.id}: invalid power`);
        }
        if (ab.cost != null && ab.cost < 0) fail(`${key}/${ab.id}: negative cost`);
        if (ab.cd != null && ab.cd < 0) fail(`${key}/${ab.id}: negative cd`);
        // Extreme power warning (flat-only skills may have power default 1)
        if (typeof ab.power === 'number' && ab.power > 3.5) {
          warn(`${key}/${ab.id}: very high power ${ab.power}`);
        }
        if (['damage', 'aoe', 'dot', 'cast_aoe'].includes(ab.type)) {
          sumPower += ab.power || 0;
          dmgCount++;
        }
      }
      if (dmgCount > 0 && sumPower / dmgCount > 2.5) {
        warn(`${key}: high avg damage power ${(sumPower / dmgCount).toFixed(2)}`);
      }

      // Tank: taunt or major defensive identity
      if (spec.role === 'tank') {
        const types = new Set(spec.abilities.map((a) => a.type));
        const ids = new Set(spec.abilities.map((a) => a.id));
        const hasTaunt = types.has('taunt') || [...ids].some((x) => /taunt|reckoning|growl|provoke|dark_command|hand_of_reckoning/.test(x));
        const hasDef = [...spec.abilities].some(
          (a) => a.dmgReduce || a.type === 'shield' || a.blockChanceAdd || a.staggerBonus || a.id === 'shield_wall' || a.id === 'ironbark'
        );
        if (!hasTaunt) warn(`${key}: tank without taunt-type ability`);
        if (!hasDef) warn(`${key}: tank without obvious defensive`);
      }

      // Healer: at least one heal
      if (spec.role === 'healer') {
        const hasHeal = spec.abilities.some((a) => a.type === 'heal' || a.type === 'heal_aoe');
        if (!hasHeal) fail(`${key}: healer without heal/heal_aoe`);
      }

      // Secondary resource cycle (combo/chi/holy_power/soul_shards)
      const secType =
        (spec.secondaryOverride && spec.secondaryOverride.type) ||
        (cls.secondary && cls.secondary.type) ||
        null;
      if (secType && ['combo', 'chi', 'holy_power', 'soul_shards'].includes(secType)) {
        const gens = spec.abilities.filter((a) => (a.genSec || 0) > 0);
        const spends = spec.abilities.filter((a) => (a.costSec || 0) > 0);
        if (!gens.length) warn(`${key}: secondary=${secType} but no genSec builders`);
        if (!spends.length) warn(`${key}: secondary=${secType} but no costSec spenders`);
      }
    }
  }

  // Engineer pack (mechanist/sapper testBuild, tinkerer production)
  if (!byId.engineer) fail('engineer class missing from WOW_MOP');
  else if (!byId.engineer.specs || !byId.engineer.specs.length) fail('engineer has no specs');
  else {
    const eng = byId.engineer;
    for (const sid of ['mechanist', 'sapper', 'tinkerer']) {
      const sp = eng.specs.find((s) => s.id === sid);
      if (!sp) fail(`engineer:${sid} missing`);
      else if (sid !== 'tinkerer' && !sp.testBuild) warn(`engineer:${sid}: expected testBuild:true`);
    }
  }

  return report();
}

function report() {
  console.log('');
  if (warnings.length) {
    console.log(`Warnings (${warnings.length}):`);
    for (const w of warnings) console.log('  ⚠', w);
  }
  if (failures.length) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures) console.log('  ✗', f);
    console.log('\n[smoke] FAIL');
    process.exitCode = 1;
    return false;
  }
  console.log(`\n[smoke] OK — ${warnings.length} warning(s)`);
  return true;
}

main();
