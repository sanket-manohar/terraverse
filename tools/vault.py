#!/usr/bin/env python3
"""
Encrypted backup of the private source (content/) so it can live safely in the public repo.

  python3 tools/vault.py pack     content/  ──► vault/content.tar.gz.enc
  python3 tools/vault.py unpack   vault/content.tar.gz.enc ──► content/

Uses the same secret key as the database (TV_DB_KEY env var or .secrets/db.key),
with a separate HKDF label so the database key and the vault key are different.
"""
import base64, io, os, secrets, sys, tarfile
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

ROOT = Path(__file__).resolve().parent.parent
VAULT = ROOT / 'vault' / 'content.tar.gz.enc'
MAGIC = b'TVVAULT1'


def key():
    k = os.environ.get('TV_DB_KEY') or ((ROOT / '.secrets' / 'db.key').read_text().strip() if (ROOT / '.secrets' / 'db.key').exists() else '')
    if not k:
        sys.exit('No key: set TV_DB_KEY or create .secrets/db.key')
    raw = base64.urlsafe_b64decode(k + '=' * (-len(k) % 4))
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=b'terraverse/vault/salt/v1', info=b'content-backup').derive(raw)


def pack():
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        for f in sorted((ROOT / 'content').glob('*.js')):
            info = tar.gettarinfo(str(f), arcname=f'content/{f.name}')
            info.mtime = 0; info.uid = info.gid = 0; info.uname = info.gname = ''
            with open(f, 'rb') as fh:
                tar.addfile(info, fh)
    nonce = secrets.token_bytes(12)
    VAULT.parent.mkdir(exist_ok=True)
    VAULT.write_bytes(MAGIC + nonce + AESGCM(key()).encrypt(nonce, buf.getvalue(), MAGIC))
    print(f'🗄️  content/ sealed → {VAULT.relative_to(ROOT)} ({VAULT.stat().st_size // 1024} KB)')


def unpack():
    blob = VAULT.read_bytes()
    assert blob[:8] == MAGIC, 'not a TerraVerse vault'
    data = AESGCM(key()).decrypt(blob[8:20], blob[20:], MAGIC)
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
        for m in tar.getmembers():
            if not (m.isfile() and m.name.startswith('content/') and '..' not in m.name and m.name.count('/') == 1):
                sys.exit(f'refusing unsafe path in vault: {m.name}')
        tar.extractall(ROOT, filter="data") if sys.version_info >= (3, 12) else tar.extractall(ROOT)
    print('📂 vault unpacked → content/')


if __name__ == '__main__':
    {'pack': pack, 'unpack': unpack}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: sys.exit(__doc__))()
