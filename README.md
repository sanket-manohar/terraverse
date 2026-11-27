# 🌍 TerraVerse — The Living Encyclopedia of Everything

**Created by Sanket Santosh Vidya Manohar** · Version 1.0.0 · [Changelog](CHANGELOG.md)

An animated, colourful encyclopedia of animals, birds, fishes, insects, plants, trees, medicinal plants, microbes, mountains, stars, galaxies, moons & satellites, languages & scripts, and extinct life.

- **135 deep-dive entries** written by hand: history, evolution timelines, species and types, life and behaviour, DNA and genome (with an animated helix and karyotype), extinction causes, and alphabets with flip cards. They are stored in an **encrypted SQLite database**.
- **416+ featured topics**, plus **live search across all of Wikipedia**. Every page also pulls the complete article and a photo gallery live, so anything humanity has documented is reachable.
- Each realm has its own animated world: a jungle with fireflies and falling leaves, an ocean with light rays and bubbles, a sky with flocks of birds, a space scene with twinkling stars and shooting stars, a microscope view with drifting cells, snowy peaks, a meadow with butterflies, floating ancient glyphs, and fossil embers.
- No frameworks and no build step. It is pure HTML, CSS and JavaScript, so it runs directly on GitHub Pages.

---

## 🚀 Deploy to GitHub Pages (works from a phone)

1. Create a **public** repository named `terraverse` (tick "Add a README").
2. **Settings → Secrets and variables → Actions → New repository secret**: name `TV_DB_KEY`, value = your private key.
3. **Settings → Pages → Source: GitHub Actions**.
4. **Add file → Create new file**, name it `.github/workflows/site.yml`, paste the contents of `setup/site.yml`, and commit.
5. **Add file → Upload files**: upload `terraverse-upload.zip` and commit.

The workflow unpacks the zip, commits the project, tags the version, publishes a GitHub Release and deploys the site to `https://<username>.github.io/terraverse/`.

## 🔐 How the encryption works

```
content/*.js  (private, never committed)
      │  python3 tools/build_db.py
      ▼
SQLite database ─► gzip ─► AES-256-GCM ─► data/terraverse.db.enc   (public, unreadable)
```

| What someone has | What they can read |
|---|---|
| The public repo or the `.db.enc` file | **Nothing.** It's AES-256-GCM with a random 256-bit key, which can't be guessed or brute-forced, and the key is not in the repo. |
| Your `TV_DB_KEY` secret | Everything. Keep `.secrets/db.key` private and never commit it. |
| The live website open in a browser | What the site shows. The browser has to decrypt the data to display it, so a determined developer could pull the key out of browser memory at runtime. |

**The key never lives in the repository.** GitHub Actions reads the `TV_DB_KEY` secret at deploy time and generates `js/keyring.js`. That file splits the key into masked shards hidden among random decoys, and the mask is derived with SHA-256 at runtime. The key is reassembled only in the visitor's browser, used once through HKDF to derive the AES key, and then deleted.

> **Honest limitation:** a static site that the public can read cannot also be impossible to read. If you ever need data that only some people can see, it must be protected by a password the visitor types, or served from a real backend.

---

## ✍️ Adding or editing content

1. Edit or add files in `content/`. Each entry looks like this:

```js
TV.entry('animals', { id:'snow-leopard', name:'Snow Leopard', sci:'Panthera uncia', emoji:'🐆', status:'VU',
  wiki:'Snow leopard',                       // Wikipedia title, for the live article, photo and gallery
  tagline:'Ghost of the mountains',
  facts:{ Range:'Central & South Asian mountains', Weight:'22–55 kg' },
  overview:'…',
  sections:[['History & Evolution','…'], ['Behaviour','…']],
  timeline:[['2017','IUCN downlists from EN to VU']],
  types:[['Name','Scientific name','EN','Note']],
  life:{ Diet:'…', Habitat:'…' },
  dna:{ diploid:38, genome:'~2.4 billion base pairs', notes:['…'] },
  extinct:{ when:'…', causes:['…'], story:'…' },  // for extinct species
  glyphs:[['𓀀','meaning']],                       // for languages
});
```

   `status` uses IUCN codes: `LC NT VU EN CR EW EX`. Use `badge:'Text'` for non-living things.
   For mountains, `h:8849` adds the peak to the height chart. Add more featured topics to a realm's `more:[…]` list in `content/00-realms.js`.

2. Rebuild the encrypted database (needs Python 3, Node.js, and `pip install cryptography`):

```bash
python3 tools/build_db.py
```

3. Release it as described under **Releasing a new version**.

To rotate the key: run `python3 tools/build_db.py --new-key`, update the `TV_DB_KEY` secret with the new value, then commit and push.

---

## 📦 Releasing a new version

1. Update the content, bump `VERSION` and the footer version in `index.html`, add a section to `CHANGELOG.md`, and run `python3 tools/build_db.py`.
2. Zip the public files as `terraverse-upload.zip` (everything except `content/`, `.secrets/` and `js/keyring*.js`).
3. Upload it to the repository. The workflow commits it, tags `v<VERSION>`, publishes the Release and redeploys.

## 🗄️ Source backup

The plain-text source in `content/` is never committed. Instead, `tools/build_db.py` seals it into `vault/content.tar.gz.enc` with the same secret key, so the repository holds a safe, encrypted backup. To restore it on any machine that has the key, run `python3 tools/vault.py unpack`.

## 💻 Preview locally

```bash
python3 tools/build_db.py        # also writes js/keyring.local.js (git-ignored)
python3 -m http.server 8000      # then open http://localhost:8000
```

(Opening `index.html` by double-clicking won't work. Browsers only allow decryption on `https://` or `localhost`.)

---

## 📁 Structure

```
index.html                 app shell
css/style.css              design system, 11 themes, all animations
js/db.js                   decrypts the DB + a tiny dependency-free SQLite reader
js/app.js                  router, pages, search, interactions
js/fx.js                   ambient particle engine (one living world per theme)
js/scenes.js               procedural parallax SVG landscapes
js/wiki.js                 live Wikipedia layer (article, images, search)
data/terraverse.db.enc     🔒 the encrypted database (public, safe to commit)
vault/content.tar.gz.enc   🔒 encrypted backup of the source content
tools/                     build_db.py, vault.py, make_keyring.py, export_content.js
content/                   ✋ PRIVATE plain-text source (git-ignored)
.secrets/db.key            ✋ PRIVATE key (git-ignored)
setup/site.yml             the GitHub Actions workflow (paste into .github/workflows/)
```

## 👤 Author

**Sanket Santosh Vidya Manohar**. Code is MIT-licensed; the encyclopedia content is all rights reserved (see [LICENSE](LICENSE)).

Live article text and images: Wikipedia and Wikimedia Commons (CC BY-SA), attributed on every page. Medicinal content is educational, not medical advice.
