#!/usr/bin/env python3
"""
Build the encrypted TerraVerse database.

  content/*.js  ──►  SQLite  ──►  gzip  ──►  AES-256-GCM  ──►  data/terraverse.db.enc

The secret key is read from (in order):
  1. the TV_DB_KEY environment variable
  2. .secrets/db.key           (git-ignored)
Run with --new-key to generate a fresh random 256-bit key into .secrets/db.key.

Requires: Python 3.8+, Node.js (to read content/*.js), `pip install cryptography`.
"""
import base64, gzip, json, os, secrets, sqlite3, subprocess, sys, tempfile
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

ROOT = Path(__file__).resolve().parent.parent
KEY_FILE = ROOT / '.secrets' / 'db.key'
OUT = ROOT / 'data' / 'terraverse.db.enc'
MAGIC = b'TVDB1'
SALT = b'terraverse/db/salt/v1'
INFO = b'aes-256-gcm'

SCHEMA = """
CREATE TABLE meta(k TEXT, v TEXT);
CREATE TABLE realms(id TEXT, ord INTEGER, name TEXT, theme TEXT, emoji TEXT, tagline TEXT, descr TEXT, g1 TEXT, g2 TEXT, more_json TEXT);
CREATE TABLE entries(id TEXT, realm_id TEXT, ord INTEGER, name TEXT, sci TEXT, emoji TEXT, status TEXT, badge TEXT, wiki TEXT, tagline TEXT, overview TEXT, height INTEGER);
CREATE TABLE facts(entry_id TEXT, ord INTEGER, label TEXT, value TEXT);
CREATE TABLE sections(entry_id TEXT, ord INTEGER, title TEXT, body TEXT);
CREATE TABLE timeline(entry_id TEXT, ord INTEGER, at TEXT, event TEXT);
CREATE TABLE types(entry_id TEXT, ord INTEGER, name TEXT, sci TEXT, status TEXT, note TEXT);
CREATE TABLE life(entry_id TEXT, ord INTEGER, label TEXT, value TEXT);
CREATE TABLE dna(entry_id TEXT, diploid INTEGER, genome TEXT, notes_json TEXT);
CREATE TABLE extinction(entry_id TEXT, when_text TEXT, causes_json TEXT, story TEXT);
CREATE TABLE glyphs(entry_id TEXT, ord INTEGER, glyph TEXT, label TEXT);
CREATE TABLE earth_timeline(ord INTEGER, at TEXT, emoji TEXT, event TEXT);
CREATE TABLE stats(ord INTEGER, num TEXT, suffix TEXT, label TEXT);
CREATE TABLE mass_extinctions(ord INTEGER, name TEXT, at TEXT, percent INTEGER, cause TEXT);
"""


def load_key(new=False):
    if new:
        KEY_FILE.parent.mkdir(exist_ok=True)
        k = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')
        KEY_FILE.write_text(k + '\n')
        print(f'🔑 New key written to {KEY_FILE.relative_to(ROOT)} — add it to GitHub → Settings → Secrets → Actions as TV_DB_KEY')
    k = os.environ.get('TV_DB_KEY') or (KEY_FILE.read_text().strip() if KEY_FILE.exists() else None)
    if not k:
        sys.exit('No key. Run:  python3 tools/build_db.py --new-key')
    raw = base64.urlsafe_b64decode(k + '=' * (-len(k) % 4))
    if len(raw) != 32:
        sys.exit('TV_DB_KEY must decode to 32 bytes')
    return k, raw


def derive(raw):
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=SALT, info=INFO).derive(raw)


def build_sqlite(data):
    tmp = Path(tempfile.mkdtemp()) / 'tv.db'
    db = sqlite3.connect(tmp)
    db.execute('PRAGMA page_size=4096')
    db.execute('PRAGMA journal_mode=DELETE')
    db.executescript(SCHEMA)
    ins = lambda t, rows: db.executemany(f'INSERT INTO {t} VALUES ({",".join("?"*len(rows[0]))})', rows) if rows else None
    ins('meta', [('version', '1'), ('entries', str(len(data['entries'])))])
    ins('realms', [(r['id'], i, r['name'], r['theme'], r['emoji'], r['tagline'], r['desc'], r['g'][0], r['g'][1],
                    json.dumps(r.get('more', []), ensure_ascii=False)) for i, r in enumerate(data['realms'])])
    E, F, S, T, Y, L, D, X, G = [], [], [], [], [], [], [], [], []
    counters = {}
    for e in data['entries']:
        o = counters[e['realm']] = counters.get(e['realm'], -1) + 1
        E.append((e['id'], e['realm'], o, e['name'], e.get('sci'), e.get('emoji'), e.get('status'), e.get('badge'),
                  e.get('wiki'), e.get('tagline'), e.get('overview'), e.get('h')))
        F += [(e['id'], i, k, v) for i, (k, v) in enumerate((e.get('facts') or {}).items())]
        S += [(e['id'], i, a, b) for i, (a, b) in enumerate(e.get('sections') or [])]
        T += [(e['id'], i, a, b) for i, (a, b) in enumerate(e.get('timeline') or [])]
        Y += [(e['id'], i, *t) for i, t in enumerate(e.get('types') or [])]
        L += [(e['id'], i, k, v) for i, (k, v) in enumerate((e.get('life') or {}).items())]
        if e.get('dna'):
            d = e['dna']; D.append((e['id'], d.get('diploid'), d.get('genome'), json.dumps(d.get('notes', []), ensure_ascii=False)))
        if e.get('extinct'):
            x = e['extinct']; X.append((e['id'], x.get('when'), json.dumps(x.get('causes', []), ensure_ascii=False), x.get('story')))
        for i, g in enumerate(e.get('glyphs') or []):
            G.append((e['id'], i, *(g if isinstance(g, list) else [g, None])))
    for t, rows in [('entries', E), ('facts', F), ('sections', S), ('timeline', T), ('types', Y), ('life', L),
                    ('dna', D), ('extinction', X), ('glyphs', G)]:
        ins(t, rows)
    ins('earth_timeline', [(i, a, b, c) for i, (a, b, c) in enumerate(data['earth'])])
    ins('stats', [(i, *s) for i, s in enumerate(data['stats'])])
    ins('mass_extinctions', [(i, *m) for i, m in enumerate(data['mass'])])
    db.commit(); db.execute('VACUUM'); db.close()
    blob = tmp.read_bytes(); tmp.unlink()
    return blob, len(E)


def main():
    _, raw = load_key('--new-key' in sys.argv)
    if not (ROOT / 'content').exists() and (ROOT / 'vault' / 'content.tar.gz.enc').exists():
        subprocess.check_call([sys.executable, str(ROOT / 'tools' / 'vault.py'), 'unpack'])
    data = json.loads(subprocess.check_output(['node', str(ROOT / 'tools' / 'export_content.js')]))
    sqlite_bytes, n = build_sqlite(data)
    packed = gzip.compress(sqlite_bytes, 9)
    nonce = secrets.token_bytes(12)
    ct = AESGCM(derive(raw)).encrypt(nonce, packed, MAGIC)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_bytes(MAGIC + nonce + ct)
    print(f'✅ {n} entries · SQLite {len(sqlite_bytes)/1024:.0f} KB → gzip {len(packed)/1024:.0f} KB → encrypted {OUT.relative_to(ROOT)}')
    # keep the encrypted source backup in sync, then refresh the local keyring (git-ignored)
    subprocess.check_call([sys.executable, str(ROOT / 'tools' / 'vault.py'), 'pack'])
    if '--ci' not in sys.argv:
        subprocess.check_call([sys.executable, str(ROOT / 'tools' / 'make_keyring.py'), '--local'])


if __name__ == '__main__':
    main()
