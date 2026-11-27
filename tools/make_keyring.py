#!/usr/bin/env python3
"""
Generate the browser keyring script from the secret key.

  GitHub Actions (deploy):  TV_DB_KEY=<secret> python3 tools/make_keyring.py          → js/keyring.js
  Local development:        python3 tools/make_keyring.py --local                    → js/keyring.local.js

The key never appears in the repository. At deploy time it is split into masked
shards hidden among random decoys; the mask itself is derived at runtime with SHA-256.
Optional: TV_ALLOWED_HOSTS="you.github.io,www.example.com" refuses to unlock elsewhere.
Standard library only (no pip installs needed in CI).
"""
import base64, hashlib, json, os, random, secrets, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    local = '--local' in sys.argv
    k = os.environ.get('TV_DB_KEY')
    if not k and (ROOT / '.secrets' / 'db.key').exists():
        k = (ROOT / '.secrets' / 'db.key').read_text().strip()
    if not k:
        sys.exit('TV_DB_KEY is not set (add it under GitHub → Settings → Secrets and variables → Actions)')
    raw = base64.urlsafe_b64decode(k + '=' * (-len(k) % 4))
    assert len(raw) == 32, 'key must be 32 bytes'

    seed = secrets.token_hex(16)
    mask = hashlib.sha256(('tv|' + seed).encode()).digest()
    masked = bytes(a ^ b for a, b in zip(raw, mask))
    real = [masked[i:i + 8] for i in range(0, 32, 8)]             # 4 real shards
    decoys = [secrets.token_bytes(8) for _ in range(8)]           # 8 decoys
    pool = real + decoys
    order = list(range(len(pool))); random.SystemRandom().shuffle(order)
    shuffled = [pool[i] for i in order]
    pos = [order.index(i) ^ 0x5A for i in range(4)]               # where the real shards ended up
    b64 = lambda b: base64.b64encode(b).decode()
    hosts = [h.strip() for h in os.environ.get('TV_ALLOWED_HOSTS', '').split(',') if h.strip()]
    if hosts and local:
        hosts += ['localhost', '127.0.0.1']

    js = ('/* generated at deploy — do not edit or commit */\n'
          f'window.__TVK={{s:{json.dumps(seed)},c:{json.dumps([b64(x) for x in shuffled])},'
          f'p:{json.dumps(pos)},h:{json.dumps(hosts)}}};\n')
    out = ROOT / 'js' / ('keyring.local.js' if local else 'keyring.js')
    out.write_text(js)
    print(f'🔐 keyring written → {out.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
