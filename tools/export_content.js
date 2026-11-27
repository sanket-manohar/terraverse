// Loads the private content/*.js source files and prints them as one JSON document.
// Used by tools/build_db.py — you never need to run this directly.
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.resolve(__dirname, '..', 'content');
const out = { realms: [], entries: [], earth: [], stats: [], mass: [] };
const TV = {
  realm: r => out.realms.push(r),
  entry: (realm, e) => out.entries.push({ ...e, realm }),
  earth: a => out.earth.push(...a),
  stats: a => out.stats.push(...a),
  mass: a => out.mass.push(...a),
};
const ctx = vm.createContext({ TV });
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
}
const ids = new Set();
for (const e of out.entries) {
  if (ids.has(e.id)) throw new Error('Duplicate entry id: ' + e.id);
  ids.add(e.id);
  if (!out.realms.find(r => r.id === e.realm)) throw new Error('Unknown realm for ' + e.id);
}
process.stdout.write(JSON.stringify(out));
