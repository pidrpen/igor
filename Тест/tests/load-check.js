/**
 * Structural load check for modular split (no browser).
 * Verifies required files exist and key globals appear in the right modules.
 *
 *   node tests/load-check.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const fail = [];
const ok = (m) => console.log('  ✓', m);
const bad = (m) => { fail.push(m); console.log('  ✗', m); };

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

console.log('[load-check] structure');

const required = [
  'index.html',
  'css/main.css',
  'js/core.js',
  'js/enemies.js',
  'js/route.js',
  'js/gear.js',
  'js/combat.js',
  'js/save.js',
  'js/ui.js',
  'wow-mop-data.js',
  'class-balance/apply-all.js',
];
for (const r of required) {
  if (exists(r)) ok(r);
  else bad(`missing ${r}`);
}

console.log('[load-check] index wiring');
const index = read('index.html');
if (index.includes('css/main.css')) ok('css link');
else bad('index missing css/main.css');
for (const s of ['core', 'enemies', 'route', 'gear', 'combat', 'save', 'ui']) {
  if (index.includes(`js/${s}.js`)) ok(`script ${s}.js`);
  else bad(`index missing js/${s}.js`);
}
if (index.includes('<style>')) bad('index still has inline <style>');
else ok('no inline style');
// Should not embed the whole game script
if (index.length > 80000) bad(`index.html still huge (${index.length} chars)`);
else ok(`index.html size ok (${index.length} chars)`);

console.log('[load-check] module symbols');
const checks = [
  ['js/core.js', 'PATCHED_SPECS'],
  ['js/enemies.js', 'const ENEMIES'],
  ['js/enemies.js', 'const AFFIXES'],
  ['js/route.js', 'const DUNGEONS'],
  ['js/route.js', 'function generateRoute'],
  ['js/gear.js', 'function emptyGear'],
  ['js/gear.js', 'function generateGearItem'],
  ['js/combat.js', 'function startCombat'],
  ['js/combat.js', 'function castAbility'],
  ['js/save.js', 'function serializeRun'],
  ['js/save.js', 'function exportSaveFile'],
  ['js/ui.js', 'function initLobby'],
  ['js/ui.js', 'initLobby()'],
  ['class-balance/apply-all.js', 'CLASS_BALANCE_API'],
  ['class-balance/apply-all.js', 'discoverLegacyPacks'],
];
for (const [file, needle] of checks) {
  if (read(file).includes(needle)) ok(`${file} → ${needle}`);
  else bad(`${file} missing ${needle}`);
}

console.log('');
if (fail.length) {
  console.log(`[load-check] FAIL (${fail.length})`);
  process.exitCode = 1;
} else {
  console.log('[load-check] OK');
}
