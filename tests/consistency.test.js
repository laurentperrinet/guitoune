/* Consistency between the code and what describes it: README tables, translations,
 * the list of files of the offline cache, the content security policy.
 * A change of a default value or of a name that is not reported everywhere fails here. */

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {PITCH_CONFIG} from '../pitch.js';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const html = read('index.html');
const readme = read('README.md');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));

// The module script of the page (the other script only applies the saved theme before the first paint)
const page = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)][0][1];

const DSP_CONFIG = Object.fromEntries(
  [...page.match(/const DSP_CONFIG = \{([\s\S]*?)\};/)[1].matchAll(/^\s+([A-Z0-9_]+)\s*:\s*(-?[\d.]+)/gm)]
    .map(m => [m[1], Number(m[2])]));
const CONFIG = {...PITCH_CONFIG, ...DSP_CONFIG};

const TUNINGS = [...page.matchAll(/\{id:'(\w+)',\s*group:'(\w+)',\s*midi:\[([\d,]+)\]\}/g)]
  .map(m => ({id: m[1], group: m[2], midi: m[3].split(',').map(Number)}));
const THEMES = [...page.match(/const THEMES = \[([\s\S]*?)\];/)[1].matchAll(/\{id:'(\w+)'/g)].map(m => m[1]);
const I18N = new Function('return ' + page.match(/const I18N = (\{[\s\S]*?\n\});/)[1])();

// The variables table of each language: rows {names: [`NAME`, ...], value: text of the third column}
const [english, french] = readme.split('<a name="version-française">');
function variables(text){
  return text.split('\n').filter(line => /^\|.*`/.test(line)).map(line => {
    const cells = line.split('|').map(c => c.trim());
    return {names: [...cells[2].matchAll(/`([^`]+)`/g)].map(m => m[1]), value: cells[3]};
  });
}
const firstNumber = text => Number(text.replace(/[   ]/g, '').match(/-?\d+(?:[.,]\d+)?/)[0].replace(',', '.'));

test('the code has what the tests read', () => {
  assert.ok(Object.keys(DSP_CONFIG).length >= 10, 'DSP_CONFIG not found in index.html');
  assert.ok(TUNINGS.length >= 7, 'TUNINGS not found in index.html');
  assert.ok(THEMES.length >= 2 && Object.keys(I18N.en).length > 20);
});

for (const [language, text] of [['English', english], ['French', french]]){
  test(`README (${language}): every default value of the code is in the variables table, with its value`, () => {
    const rows = variables(text);
    for (const [name, value] of Object.entries(CONFIG)){
      const row = rows.find(r => r.names.includes(name));
      assert.ok(row, `${name} is missing from the table`);
      if (name === 'A4_MIN' || name === 'A4_MAX') assert.ok(row.value.includes(String(value)), `${name}: ${row.value}`);
      else assert.equal(firstNumber(row.value), value, `${name}: the table says "${row.value}", the code ${value}`);
    }
  });

  test(`README (${language}): every constant named in the variables table exists in the code`, () => {
    for (const row of variables(text)){
      for (const name of row.names.filter(n => /^[A-Z][A-Z0-9_]+$/.test(n))){
        assert.ok(name in CONFIG, `${name} is in the table but not in the code`);
      }
    }
  });

  test(`README (${language}): the number of tunings and the standard guitar are those of the code`, () => {
    const count = text.match(/\*\*(\d+) (?:tunings|accordages)/);
    assert.ok(count, 'the number of tunings is not announced');
    assert.equal(Number(count[1]), TUNINGS.length);
    const midi = variables(text).find(r => r.names.includes('TUNINGS[].midi')).value;
    assert.deepEqual(midi.match(/\d+/g).slice(0, 6).map(Number), TUNINGS.find(t => t.id === 'standard').midi);
  });
}

test('both languages have the same texts, with the same {placeholders}', () => {
  assert.deepEqual(Object.keys(I18N.fr).sort(), Object.keys(I18N.en).sort());
  for (const key of Object.keys(I18N.en)){
    assert.ok(I18N.en[key].trim() && I18N.fr[key].trim(), `${key} is empty`);
    const names = text => (text.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(names(I18N.fr[key]), names(I18N.en[key]), `${key}: placeholders differ`);
  }
});

test('every text used by the page exists in the dictionary', () => {
  const keys = new Set(Object.keys(I18N.en));
  const used = new Set();
  for (const m of html.matchAll(/data-i18n(?:-[a-z-]+)?="([\w.]+)"/g)) used.add(m[1]);
  for (const call of page.matchAll(/\btr\(([^)]*)\)/g)){
    for (const literal of call[1].matchAll(/'([\w.]+)'/g)) if (!literal[1].endsWith('.')) used.add(literal[1]);
  }
  for (const mode of ['start', 'tryAgain', 'restart']) used.add(mode);   // modes of the start button
  for (const key of used) assert.ok(keys.has(key), `"${key}" is used but not in the dictionary`);
  for (const t of TUNINGS) assert.ok(keys.has('tuning.' + t.id), `no name for the tuning ${t.id}`);
  for (const group of new Set(TUNINGS.map(t => t.group))) assert.ok(keys.has('group.' + group), `no name for the group ${group}`);
  for (const theme of THEMES) assert.ok(keys.has('theme.' + theme), `no name for the theme ${theme}`);
});

test('every dictionary text is used (none is left over after a change)', () => {
  // Everything but the dictionary itself: a key must be written there as 'key' or "key"
  const outside = (html + page).replace(page.match(/const I18N = \{[\s\S]*?\n\};/)[0], '');
  const prefixes = ['tuning.', 'group.', 'theme.'];   // built from an identifier, checked above
  for (const key of Object.keys(I18N.en)){
    if (prefixes.some(p => key.startsWith(p))) continue;
    assert.ok(outside.includes(`'${key}'`) || outside.includes(`"${key}"`), `"${key}" is in the dictionary but never used`);
  }
});

test('offline cache: every file that the page needs is listed, and exists', () => {
  const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(f => f !== './');
  for (const file of shell) assert.ok(existsSync(new URL('../' + file, import.meta.url)), `${file} is in SHELL but missing`);
  const needed = new Set(['index.html', 'manifest.webmanifest', 'sw.js'].filter(f => f !== 'sw.js'));
  for (const m of html.matchAll(/<link [^>]*href="([^"]+)"/g)) needed.add(m[1]);
  for (const m of html.matchAll(/(?:src|href)="(guitoune_howto\.svg)"/g)) needed.add(m[1]);
  for (const m of page.matchAll(/from '\.\/([\w.-]+)'/g)) needed.add(m[1]);
  for (const icon of manifest.icons) needed.add(icon.src);
  for (const file of needed) assert.ok(shell.includes(file), `${file} is needed by the page but not in SHELL`);
  assert.match(sw.match(/const CACHE_NAME = '([^']+)'/)[1], /^guitoune-\d{4}-\d{2}-\d{2}(-\d+)?$/, 'CACHE_NAME is not an ISO date');
});

test('content security policy: present, restrictive, and the page loads nothing from elsewhere', () => {
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(policy, 'no Content-Security-Policy');
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]){
    assert.ok(policy[1].includes(directive), `missing: ${directive}`);
  }
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), 'the policy must come before the first script');
  for (const m of html.matchAll(/<(?:link|script|img)\b[^>]*\b(?:src|href)="([^"]+)"/g)){
    if (/^<link/.test(m[0]) && /rel="(?:canonical|alternate)"/.test(m[0])) continue;
    assert.ok(!/^(?:https?:)?\/\//.test(m[1]), `${m[1]} is loaded from another origin: the policy would block it`);
  }
});

test('the project can be tested and built by CI', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.scripts.test);
  assert.match(read('.github/workflows/test.yml'), /npm test/);
});
