/* TerraVerse DB loader
 * fetch data/terraverse.db.enc → unlock key from keyring → AES-256-GCM decrypt → gunzip
 * → parse SQLite file (tiny read-only reader, no dependencies) → build window.TV
 */
(function (global) {
  'use strict';
  const MAGIC = 'TVDB1';
  const enc = new TextEncoder();

  /* ───────────── key unlock ───────────── */
  function loadScript(src) {
    return new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = res; document.head.appendChild(s); });
  }
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function unlockKey(subtle, K) {
    if (K.h && K.h.length && typeof location !== 'undefined' && !K.h.includes(location.hostname)) throw new Error('This copy of TerraVerse is not authorised for ' + location.hostname);
    const mask = new Uint8Array(await subtle.digest('SHA-256', enc.encode('tv|' + K.s)));
    const raw = new Uint8Array(32);
    K.p.forEach((pos, i) => { const shard = b64(K.c[pos ^ 0x5a]); for (let j = 0; j < 8; j++) raw[i * 8 + j] = shard[j] ^ mask[i * 8 + j]; });
    const ikm = await subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
    raw.fill(0);
    return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('terraverse/db/salt/v1'), info: enc.encode('aes-256-gcm') },
      ikm, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  async function decrypt(buf, K, subtle) {
    const u = new Uint8Array(buf);
    if (new TextDecoder().decode(u.subarray(0, 5)) !== MAGIC) throw new Error('Not a TerraVerse database');
    const key = await unlockKey(subtle, K);
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(5, 17), additionalData: enc.encode(MAGIC) }, key, u.subarray(17));
    const ds = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }

  /* ───────────── minimal read-only SQLite reader ───────────── */
  function readSQLite(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const td = new TextDecoder();
    if (td.decode(buf.subarray(0, 15)) !== 'SQLite format 3') throw new Error('Bad SQLite header');
    let ps = dv.getUint16(16); if (ps === 1) ps = 65536;
    const U = ps - buf[20];
    const pageOff = n => (n - 1) * ps;
    const varint = (a, o) => { let v = 0; for (let i = 0; i < 8; i++) { const b = a[o + i]; v = v * 128 + (b & 127); if (!(b & 128)) return [v, i + 1]; } return [v * 256 + a[o + 8], 9]; };

    function payload(c) {
      const [P, n1] = varint(buf, c); let o = c + n1; o += varint(buf, o)[1];
      const X = U - 35;
      if (P <= X) return buf.subarray(o, o + P);
      const M = Math.floor((U - 12) * 32 / 255) - 23, K = M + ((P - M) % (U - 4)), local = K <= X ? K : M;
      const out = new Uint8Array(P); out.set(buf.subarray(o, o + local));
      let got = local, next = dv.getUint32(o + local);
      while (got < P && next) { const po = pageOff(next); next = dv.getUint32(po); const take = Math.min(U - 4, P - got); out.set(buf.subarray(po + 4, po + 4 + take), got); got += take; }
      return out;
    }
    function record(p) {
      const v = new DataView(p.buffer, p.byteOffset, p.byteLength);
      const [hl, n] = varint(p, 0); let h = n, o = hl; const vals = [];
      while (h < hl) {
        const [t, k] = varint(p, h); h += k; let val = null;
        switch (t) {
          case 0: break;
          case 1: val = v.getInt8(o); o += 1; break;
          case 2: val = v.getInt16(o); o += 2; break;
          case 3: val = (p[o] << 16 | p[o + 1] << 8 | p[o + 2]); if (val & 0x800000) val -= 0x1000000; o += 3; break;
          case 4: val = v.getInt32(o); o += 4; break;
          case 5: val = v.getInt16(o) * 4294967296 + v.getUint32(o + 2); o += 6; break;
          case 6: val = Number(v.getBigInt64(o)); o += 8; break;
          case 7: val = v.getFloat64(o); o += 8; break;
          case 8: val = 0; break; case 9: val = 1; break;
          default: { const len = (t - (t % 2 ? 13 : 12)) / 2; const s = p.subarray(o, o + len); val = t % 2 ? td.decode(s) : s.slice(); o += len; }
        }
        vals.push(val);
      }
      return vals;
    }
    function walk(pn, cb) {
      const base = pageOff(pn), ho = base + (pn === 1 ? 100 : 0), type = buf[ho], n = dv.getUint16(ho + 3);
      if (type === 0x0d) { for (let i = 0; i < n; i++) cb(record(payload(base + dv.getUint16(ho + 8 + 2 * i)))); }
      else if (type === 0x05) { for (let i = 0; i < n; i++) walk(dv.getUint32(base + dv.getUint16(ho + 12 + 2 * i)), cb); walk(dv.getUint32(ho + 8), cb); }
    }
    const tables = {};
    walk(1, ([type, name, , root, sql]) => {
      if (type !== 'table') return;
      const cols = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')')).split(',').map(s => s.trim().split(/\s+/)[0]);
      const rows = [];
      walk(root, r => { const o = {}; cols.forEach((c, i) => o[c] = r[i] ?? null); rows.push(o); });
      tables[name] = rows;
    });
    return tables;
  }

  /* ───────────── assemble the encyclopedia ───────────── */
  function assemble(t) {
    const group = (rows, key = 'entry_id') => rows.reduce((m, r) => ((m[r[key]] ||= []).push(r), m), {});
    const by = ['facts', 'sections', 'timeline', 'types', 'life', 'glyphs'].reduce((m, k) => (m[k] = group(t[k] || []), m), {});
    const dna = Object.fromEntries((t.dna || []).map(r => [r.entry_id, r]));
    const ext = Object.fromEntries((t.extinction || []).map(r => [r.entry_id, r]));
    const realms = t.realms.sort((a, b) => a.ord - b.ord).map(r => ({ id: r.id, name: r.name, theme: r.theme, emoji: r.emoji, tagline: r.tagline, desc: r.descr, g: [r.g1, r.g2], more: JSON.parse(r.more_json || '[]') }));
    const entries = t.entries.sort((a, b) => a.realm_id === b.realm_id ? a.ord - b.ord : 0).map(r => {
      const id = r.id, d = dna[id], x = ext[id];
      return {
        id, cat: r.realm_id, name: r.name, sci: r.sci, emoji: r.emoji, status: r.status, badge: r.badge, wiki: r.wiki,
        tagline: r.tagline, overview: r.overview, h: r.height,
        facts: (by.facts[id] || []).map(f => [f.label, f.value]),
        sections: (by.sections[id] || []).map(s => [s.title, s.body]),
        timeline: (by.timeline[id] || []).map(s => [s.at, s.event]),
        types: (by.types[id] || []).map(s => [s.name, s.sci, s.status, s.note]),
        life: (by.life[id] || []).map(s => [s.label, s.value]),
        glyphs: (by.glyphs[id] || []).map(g => [g.glyph, g.label]),
        dna: d ? { diploid: d.diploid, genome: d.genome, notes: JSON.parse(d.notes_json || '[]') } : null,
        extinct: x ? { when: x.when_text, causes: JSON.parse(x.causes_json || '[]'), story: x.story } : null,
      };
    });
    return {
      realms, entries,
      earth: (t.earth_timeline || []).map(r => [r.at, r.emoji, r.event]),
      stats: (t.stats || []).map(r => [r.num, r.suffix, r.label]),
      mass: (t.mass_extinctions || []).map(r => [r.name, r.at, r.percent, r.cause]),
    };
  }

  async function open(url = 'data/terraverse.db.enc') {
    if (!global.__TVK) await loadScript('js/keyring.local.js');
    const K = global.__TVK;
    if (!K) throw new Error('Missing keyring — the site must be deployed through the GitHub Actions workflow (or run tools/build_db.py locally).');
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Could not load database (' + res.status + ')');
    const sqlite = await decrypt(await res.arrayBuffer(), K, crypto.subtle);
    try { delete global.__TVK; } catch (e) { global.__TVK = undefined; }
    return assemble(readSQLite(sqlite));
  }

  global.TVDB = { open, _decrypt: decrypt, _readSQLite: readSQLite, _assemble: assemble };
})(typeof window !== 'undefined' ? window : globalThis);
