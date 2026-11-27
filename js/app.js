/* TerraVerse — application (router, pages, interactions) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS = { LC: ['Least Concern', '#4caf50'], NT: ['Near Threatened', '#9ccc3c'], VU: ['Vulnerable', '#f5c518'], EN: ['Endangered', '#ff8f1f'], CR: ['Critically Endangered', '#ef4b2f'], EW: ['Extinct in the Wild', '#9c4fd6'], EX: ['Extinct', '#8a8a8a'] };
  const SCALE = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];
  let TV, io, cleanup = [];

  /* ───────── helpers ───────── */
  const realmOf = id => TV.realms.find(r => r.id === id);
  const entry = id => TV.entries.find(e => e.id === id);
  const inRealm = id => TV.entries.filter(e => e.cat === id);
  const setTheme = th => { document.body.dataset.theme = th; FX.set(th); };
  const badge = e => e.status && STATUS[e.status] ? `<span class="pill" style="--c:${STATUS[e.status][1]}">${e.badge || STATUS[e.status][0]}</span>` : e.badge ? `<span class="pill">${esc(e.badge)}</span>` : '';
  const splitTitle = s => [...s].map((ch, i) => `<span class="ch" style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  const para = s => esc(s).split(/\n+/).map(p => `<p>${p}</p>`).join('');

  function card(e, i = 0) {
    return `<a class="card reveal tilt" style="--d:${(i % 12) * 55}ms" href="#/e/${e.id}" data-wiki="${esc(e.wiki || e.name)}">
      <div class="card-img"><span class="card-emoji">${e.emoji || '✦'}</span></div>
      <div class="card-body"><div class="card-top">${badge(e)}</div><h3>${esc(e.name)}</h3>${e.sci ? `<i class="sci">${esc(e.sci)}</i>` : ''}<p>${esc(e.tagline)}</p></div>
      <span class="card-go">Explore →</span></a>`;
  }
  function chip(title) { return `<a class="chip reveal" href="#/wiki/${encodeURIComponent(title)}">${esc(title.replace(/ \(.*\)$/, ''))}</a>`; }

  /* ───────── page transitions + router ───────── */
  function go() {
    const run = () => { cleanup.forEach(f => f()); cleanup = []; route(); scrollTo({ top: 0, behavior: 'instant' }); enhance(); };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(run);
    else { app.classList.add('leaving'); setTimeout(() => { run(); app.classList.remove('leaving'); }, 180); }
  }
  function route() {
    const [, a, ...rest] = (location.hash.slice(1) || '/').split('/'), b = decodeURIComponent(rest.join('/'));
    $('#search').classList.add('hidden');
    if (a === 'realm' && realmOf(b)) return pageRealm(realmOf(b));
    if (a === 'e' && entry(b)) return pageEntry(entry(b));
    if (a === 'wiki' && b) return pageWiki(b);
    if (a === 'about') return pageAbout();
    return pageHome();
  }

  /* ───────── HOME ───────── */
  function pageHome() {
    setTheme('earth'); document.title = 'TerraVerse — The Living Encyclopedia of Everything';
    const total = TV.entries.length, more = TV.realms.reduce((n, r) => n + r.more.length, 0);
    const lost = TV.entries.filter(e => e.cat === 'extinct');
    app.innerHTML = `
    <section class="hero home-hero">${SCENES.home()}
      <div class="hero-inner">
        <p class="eyebrow reveal">Everything we know · from the first cell to the farthest galaxy</p>
        <h1 class="title-xl">${splitTitle('TerraVerse')}</h1>
        <p class="hero-sub reveal">The living encyclopedia of <span class="typer" data-words="every elephant & ancient beast|every bird in the sky|every fish in the deep|every healing plant|every mountain & volcano|every star & galaxy|every forgotten alphabet|everything that vanished"></span></p>
        <div class="hero-cta reveal"><a href="#realms" class="btn btn-glow" data-scroll="#realms">Begin the journey</a><button class="btn btn-ghost" data-open-search>🔍 Search anything</button></div>
      </div>
      <div class="scroll-cue"><span></span></div>
    </section>

    <section class="band stats">${TV.stats.map(([n, s, l]) => `<div class="stat reveal"><b data-count="${esc(n)}">0</b><em>${esc(s)}</em><span>${esc(l)}</span></div>`).join('')}</section>

    <section class="wrap" id="realms">
      <header class="sec-head reveal"><span class="eyebrow">Choose your world</span><h2>Fourteen realms of knowledge</h2><p>${total} hand-written deep-dive entries, ${more}+ more featured topics, and live access to millions of articles from the world's knowledge.</p></header>
      <div class="realm-grid">${TV.realms.map((r, i) => `
        <a class="realm reveal tilt" href="#/realm/${r.id}" style="--g1:${r.g[0]};--g2:${r.g[1]};--d:${i * 60}ms">
          <span class="realm-emoji">${r.emoji}</span><span class="realm-orbs"><i></i><i></i><i></i></span>
          <div><h3>${esc(r.name)}</h3><p>${esc(r.tagline)}</p><small>${inRealm(r.id).length} deep entries · ${r.more.length}+ to discover</small></div>
        </a>`).join('')}</div>
    </section>

    <section class="wrap timeline-sec">
      <header class="sec-head reveal"><span class="eyebrow">4.54 billion years in one scroll</span><h2>The story of Earth</h2><p>Swipe or scroll sideways through deep time.</p></header>
      <div class="htl" tabindex="0"><div class="htl-line"></div>${TV.earth.map(([at, em, ev], i) => `
        <div class="htl-item reveal" style="--d:${i * 40}ms"><div class="htl-dot">${em}</div><b>${esc(at)}</b><p>${esc(ev)}</p></div>`).join('')}</div>
    </section>

    <section class="wrap">
      <header class="sec-head reveal"><span class="eyebrow">In memoriam</span><h2>Lost forever</h2><p>Species that vanished, and the reasons why.</p></header>
      <div class="marquee"><div class="marquee-track">${[...lost, ...lost].map(e => `<a class="mem" href="#/e/${e.id}" data-wiki="${esc(e.wiki)}"><div class="card-img"><span class="card-emoji">${e.emoji}</span></div><b>${esc(e.name)}</b><small>${esc(e.extinct?.when || '')}</small></a>`).join('')}</div></div>
    </section>

    <section class="wrap">
      <header class="sec-head reveal"><span class="eyebrow">Featured</span><h2>Start with a legend</h2></header>
      <div class="grid">${['elephant', 'blue-whale', 'sanskrit', 'everest', 'milky-way', 'woolly-mammoth', 'tardigrade', 'tulsi'].map(entry).filter(Boolean).map(card).join('')}</div>
    </section>`;
    typer($('.typer'));
    homeParallax();
  }

  function homeParallax() {
    const layers = $$('.home-hero .layer'); let mx = 0, my = 0, raf;
    const apply = () => { raf = 0; const y = scrollY; layers.forEach(l => { const d = +l.dataset.depth; l.style.transform = `translate(${mx * d * 400}px, ${y * d * 3 + my * d * 200}px)`; }); };
    const onMove = e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; raf ||= requestAnimationFrame(apply); };
    const onScroll = () => { raf ||= requestAnimationFrame(apply); };
    addEventListener('pointermove', onMove, { passive: true }); addEventListener('scroll', onScroll, { passive: true });
    cleanup.push(() => { removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); });
  }
  function sceneParallax() {
    const layers = $$('.realm-hero .layer, .d-hero .layer');
    const onScroll = () => layers.forEach(l => l.style.transform = `translateY(${scrollY * +l.dataset.depth * 4}px)`);
    addEventListener('scroll', onScroll, { passive: true }); cleanup.push(() => removeEventListener('scroll', onScroll));
  }
  function typer(el) {
    if (!el) return; const words = el.dataset.words.split('|'); let w = 0, i = 0, del = false, alive = true;
    const tick = () => { if (!alive) return; const word = words[w]; el.textContent = word.slice(0, i); if (!del && i++ > word.length + 12) del = true; else if (del && --i <= 0) { del = false; w = (w + 1) % words.length; } setTimeout(tick, del ? 30 : 70); };
    tick(); cleanup.push(() => alive = false);
  }

  /* ───────── REALM ───────── */
  function pageRealm(r) {
    setTheme(r.theme); document.title = `${r.name} — TerraVerse`;
    const list = inRealm(r.id);
    const hasStatus = list.some(e => e.status && STATUS[e.status]);
    app.innerHTML = `
    <section class="hero realm-hero" style="--g1:${r.g[0]};--g2:${r.g[1]}">${SCENES.realm(r.theme, r.g[0], r.g[1])}
      <div class="hero-inner">
        <a class="crumb reveal" href="#/">TerraVerse</a>
        <div class="big-emoji">${r.emoji}</div>
        <h1 class="title-l">${splitTitle(r.name)}</h1>
        <p class="hero-sub reveal">${esc(r.desc)}</p>
        <div class="hero-meta reveal"><span>${list.length} deep entries</span><span>${r.more.length}+ featured topics</span><span>∞ live search</span></div>
      </div>
    </section>
    <section class="wrap">
      <div class="toolbar reveal">
        <label class="field"><span>🔎</span><input id="rf" placeholder="Filter ${esc(r.name.toLowerCase())}…" autocomplete="off"></label>
        ${hasStatus ? `<div class="seg" id="seg"><button class="on" data-f="all">All</button><button data-f="safe">Thriving</button><button data-f="threat">Threatened</button><button data-f="gone">Extinct</button></div>` : ''}
      </div>
      <div class="grid" id="rg">${list.map(card).join('')}</div>
      <p class="empty hidden" id="re">Nothing here matches. Try the live search below.</p>
      ${realmExtras(r, list)}
      <header class="sec-head reveal"><span class="eyebrow">Keep exploring</span><h2>More from this realm</h2><p>Each topic opens a full live article with photos from the world's open encyclopedia.</p></header>
      <div class="chips">${r.more.map(chip).join('')}</div>
      <div class="live reveal">
        <h3>Search all of ${esc(r.name)}</h3>
        <label class="field big"><span>🌐</span><input id="rl" placeholder="e.g. ${esc(r.more[3] || 'anything')}…" autocomplete="off"></label>
        <div class="live-results" id="rlr"></div>
      </div>
    </section>`;
    sceneParallax();
    const grid = $('#rg'), cards = $$('.card', grid);
    let f = 'all';
    const apply = () => {
      const q = $('#rf').value.trim().toLowerCase(); let n = 0;
      cards.forEach((c, i) => {
        const e = list[i], s = e.status;
        const okF = f === 'all' || (f === 'safe' && ['LC', 'NT'].includes(s)) || (f === 'threat' && ['VU', 'EN', 'CR'].includes(s)) || (f === 'gone' && ['EX', 'EW'].includes(s));
        const okQ = !q || (e.name + ' ' + (e.sci || '') + ' ' + e.tagline).toLowerCase().includes(q);
        c.classList.toggle('hidden', !(okF && okQ)); if (okF && okQ) n++;
      });
      $('#re').classList.toggle('hidden', n > 0);
    };
    $('#rf').addEventListener('input', apply);
    $('#seg')?.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#seg button').forEach(x => x.classList.toggle('on', x === b)); f = b.dataset.f; apply(); });
    liveSearch($('#rl'), $('#rlr'), q => q);
  }

  function realmExtras(r, list) {
    if (r.id === 'extinct') return `
      <section class="extra reveal"><h2>The five great mass extinctions, and a sixth</h2><p class="muted">Percentage of species estimated lost in each event.</p>
      <div class="bars">${TV.mass.map(([n, at, p, cause], i) => `<div class="bar-row" style="--d:${i * 120}ms"><div class="bar-label"><b>${esc(n)}</b><small>${esc(at)}</small></div>
        <div class="bar"><span style="--w:${p ?? 100}%" class="${p == null ? 'now' : ''}">${p == null ? 'Ongoing' : '~' + p + '%'}</span></div><p>${esc(cause)}</p></div>`).join('')}</div></section>`;
    if (r.id === 'mountains') {
      const ms = list.filter(e => e.h).sort((a, b) => b.h - a.h), max = ms[0]?.h || 1;
      return `<section class="extra reveal"><h2>Height comparison</h2><p class="muted">Metres above sea level (Olympus Mons is measured from the Martian datum).</p>
        <div class="peaks">${ms.map((m, i) => `<a href="#/e/${m.id}" class="peak" style="--h:${(m.h / max * 100).toFixed(1)}%;--d:${i * 90}ms"><span class="tri"></span><b>${m.h.toLocaleString()} m</b><small>${esc(m.name)}</small></a>`).join('')}</div></section>`;
    }
    if (['stars', 'galaxies', 'satellites'].includes(r.id)) {
      const ladder = [['🌕', 'The Moon', '1.3 light-seconds'], ['☀️', 'The Sun', '8.3 light-minutes'], ['🪐', 'Neptune', '4.2 light-hours'], ['🚀', 'Voyager 1', '~1 light-day'], ['⭐', 'Proxima Centauri', '4.24 light-years'], ['🌌', 'Galactic centre', '26,000 light-years'], ['🌀', 'Andromeda', '2.5 million light-years'], ['🔭', 'Edge of the observable universe', '46.5 billion light-years']];
      return `<section class="extra reveal"><h2>The cosmic distance ladder</h2><p class="muted">How long light takes to reach us. Each step is vastly larger than the one before.</p>
        <div class="ladder">${ladder.map(([em, n, d], i) => `<div class="rung" style="--d:${i * 90}ms;--s:${0.6 + i * 0.12}"><span>${em}</span><b>${n}</b><small>${d}</small></div>`).join('')}</div></section>`;
    }
    if (r.id === 'languages') return `
      <section class="extra reveal"><h2>How the alphabet travelled</h2><p class="muted">Many of the world's scripts descend from a single Bronze Age invention.</p>
      <div class="tree">
        <div class="node root">𓂀 Egyptian hieroglyphs <small>c. 3200 BCE</small></div><div class="stem"></div>
        <div class="node">Proto-Sinaitic <small>c. 1850 BCE</small></div><div class="stem"></div>
        <div class="node gold">𐤀 Phoenician <small>c. 1050 BCE</small></div>
        <div class="branches">
          <div><div class="stem"></div><div class="node">Greek Α <small>8th c. BCE</small></div><div class="leafs"><span>Latin A</span><span>Cyrillic А</span><span>Coptic</span><span>Gothic</span></div></div>
          <div><div class="stem"></div><div class="node">Aramaic <small>c. 800 BCE</small></div><div class="leafs"><span>Hebrew א</span><span>Arabic ا</span><span>Syriac</span><span>Brahmi? → अ அ</span></div></div>
        </div>
        <p class="muted small">Separate inventions: Sumerian cuneiform, Chinese characters and Maya glyphs arose independently. Hangul was designed from scratch in 1443.</p>
      </div></section>`;
    if (r.id === 'medicinal') return `<div class="notice reveal">⚕️ Educational content only. Many medicinal plants are toxic or interact with medicines. Always consult a qualified doctor.</div>`;
    return '';
  }

  /* ───────── ENTRY ───────── */
  function pageEntry(e) {
    const r = realmOf(e.cat); setTheme(r.theme); document.title = `${e.name} — TerraVerse`;
    renderDetail(e, r);
  }

  function renderDetail(e, r, wikiOnly = false) {
    const nav = [['Overview', 'ov'], e.timeline?.length && ['Timeline', 'tl'], e.sections?.length && ['Deep dive', 'dd'], e.types?.length && ['Types & species', 'ty'], e.life?.length && ['Life', 'lf'], e.dna && ['DNA & genome', 'dna'], e.extinct && ['Extinction', 'ex'], e.glyphs?.length && ['Alphabet', 'ab'], ['Gallery', 'ga'], ['Full article', 'wk']].filter(Boolean);
    app.innerHTML = `
    <section class="hero d-hero" style="--g1:${r.g[0]};--g2:${r.g[1]}">
      <div class="d-bg" id="dbg"></div>${SCENES.realm(r.theme, r.g[0], r.g[1])}
      <div class="hero-inner">
        <nav class="crumb reveal"><a href="#/">TerraVerse</a> › <a href="#/realm/${r.id}">${esc(r.name)}</a></nav>
        <div class="big-emoji">${e.emoji || r.emoji}</div>
        <h1 class="title-l">${splitTitle(e.name)}</h1>
        ${e.sci ? `<p class="sci-l reveal">${esc(e.sci)}</p>` : ''}
        <p class="hero-sub reveal" id="dtag">${esc(e.tagline || '')}</p>
        <div class="hero-meta reveal">${badge(e)}<span>${r.emoji} ${esc(r.name)}</span></div>
      </div>
    </section>
    <nav class="jump">${nav.map(([n, id]) => `<button data-jump="${id}">${n}</button>`).join('')}</nav>
    <div class="d-wrap">
      <aside class="d-side">
        <div class="glass facts reveal"><h4>Quick facts</h4><dl id="facts">${(e.facts || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') || '<dd class="muted">Loading…</dd>'}</dl></div>
        ${e.status && STATUS[e.status] ? `<div class="glass reveal"><h4>Conservation status</h4><div class="iucn">${SCALE.map(s => `<span class="${s === e.status ? 'on' : ''}" style="--c:${STATUS[s][1]}" title="${STATUS[s][0]}">${s}</span>`).join('')}</div><p class="muted small">${STATUS[e.status][0]} (IUCN Red List)</p></div>` : ''}
      </aside>
      <article class="d-main">
        <section id="ov" class="block reveal"><h2>Overview</h2><div class="lead" id="ovtext">${e.overview ? para(e.overview) : '<p class="muted shimmer">Gathering knowledge…</p>'}</div></section>
        ${e.timeline?.length ? `<section id="tl" class="block"><h2 class="reveal">Timeline</h2><ol class="vtl">${e.timeline.map(([at, ev], i) => `<li class="reveal" style="--d:${i * 50}ms"><b>${esc(at)}</b><p>${esc(ev)}</p></li>`).join('')}</ol></section>` : ''}
        ${e.sections?.length ? `<section id="dd" class="block">${e.sections.map(([t, b]) => `<div class="reveal sub"><h2>${esc(t)}</h2>${para(b)}</div>`).join('')}</section>` : ''}
        ${e.types?.length ? `<section id="ty" class="block"><h2 class="reveal">Types, species & relatives</h2><div class="types">${e.types.map(([n, s, st, note], i) => `
          <div class="type glass reveal tilt" style="--d:${i * 70}ms"><div class="type-top"><h3>${esc(n)}</h3>${st && STATUS[st] ? `<span class="pill" style="--c:${STATUS[st][1]}">${st}</span>` : ''}</div><i class="sci">${esc(s)}</i><p>${esc(note)}</p></div>`).join('')}</div></section>` : ''}
        ${e.life?.length ? `<section id="lf" class="block"><h2 class="reveal">Life & behaviour</h2><div class="life">${e.life.map(([k, v], i) => `<div class="glass reveal" style="--d:${i * 60}ms"><small>${esc(k)}</small><p>${esc(v)}</p></div>`).join('')}</div></section>` : ''}
        ${e.dna ? dnaBlock(e.dna) : ''}
        ${e.extinct ? `<section id="ex" class="block extinct reveal"><div class="ex-head"><span>🕯️</span><div><small>Vanished</small><h2>${esc(e.extinct.when)}</h2></div></div>
          <h3>What happened</h3><div class="causes">${e.extinct.causes.map((c, i) => `<div class="cause reveal" style="--d:${i * 90}ms"><b>${i + 1}</b><p>${esc(c)}</p></div>`).join('')}</div>${e.extinct.story ? `<blockquote>${esc(e.extinct.story)}</blockquote>` : ''}</section>` : ''}
        ${e.glyphs?.length ? `<section id="ab" class="block"><h2 class="reveal">Alphabet & signs</h2><p class="muted reveal">Tap any sign to flip it.</p><div class="glyphs">${e.glyphs.map(([g, l], i) => `
          <button class="glyph reveal" style="--d:${(i % 24) * 30}ms"><span class="gf">${esc(g)}</span><span class="gb">${esc(l || 'U+' + g.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))}</span></button>`).join('')}</div></section>` : ''}
        <section id="ga" class="block"><h2 class="reveal">Gallery</h2><div class="gallery" id="gal"><div class="shimmer gbox"></div><div class="shimmer gbox"></div><div class="shimmer gbox"></div></div></section>
        <section id="wk" class="block"><h2 class="reveal">The complete article</h2><p class="muted small reveal">Everything documented about ${esc(e.name)}, loaded live from Wikipedia (CC BY-SA).</p><div id="wkb" class="acc"><p class="muted shimmer">Loading full article…</p></div></section>
        ${!wikiOnly ? `<section class="block"><h2 class="reveal">More in ${esc(r.name)}</h2><div class="grid small">${inRealm(r.id).filter(x => x.id !== e.id).slice(0, 4).map(card).join('')}</div></section>` : ''}
      </article>
    </div>`;
    sceneParallax();
    $$('[data-jump]').forEach(b => b.onclick = () => document.getElementById(b.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    $$('.glyph').forEach(g => g.onclick = () => g.classList.toggle('flip'));
    if (e.dna) startHelix($('#helix'));
    loadWiki(e.wiki || e.name, e, wikiOnly);
  }

  function dnaBlock(d) {
    const pairs = d.diploid ? Math.round(d.diploid / 2) : 0, shown = Math.min(pairs, 40);
    let kary = '';
    for (let i = 0; i < shown; i++) { const h = 100 - i * (70 / Math.max(shown, 1)) + ((i * 37) % 11) - 5, c = 30 + ((i * 53) % 40); kary += `<div class="chromo" style="--h:${h.toFixed(0)}%;--c:${c}%;--d:${i * 25}ms"><i></i><i></i></div>`; }
    return `<section id="dna" class="block dna"><h2 class="reveal">DNA & genome</h2>
      <div class="dna-grid"><canvas id="helix" class="reveal" width="260" height="420"></canvas>
      <div><div class="dna-stats reveal">${d.diploid ? `<div><b>${d.diploid}</b><small>chromosomes (2n)</small></div><div><b>${pairs}</b><small>pairs</small></div>` : ''}${d.genome ? `<div class="wide"><b class="g">${esc(d.genome)}</b><small>genome size</small></div>` : ''}</div>
        ${shown ? `<div class="kary reveal" title="Stylised karyotype">${kary}</div><p class="muted small">Stylised karyotype: one bar per chromosome pair${pairs > shown ? ` (first ${shown} of ${pairs})` : ''}.</p>` : ''}
        <ul class="dna-notes">${(d.notes || []).map((n, i) => `<li class="reveal" style="--d:${i * 80}ms">${esc(n)}</li>`).join('')}</ul></div></div></section>`;
  }

  function startHelix(cv) {
    if (!cv) return; const x = cv.getContext('2d'), W = cv.width, H = cv.height; let t = 0, alive = true;
    const cols = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff'];
    const frame = () => { if (!alive) return; t += .025; x.clearRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) { const y = 14 + i * 15.5, a = t + i * .45, s = Math.sin(a), cz = Math.cos(a), x1 = W / 2 + s * 80, x2 = W / 2 - s * 80;
        x.strokeStyle = cols[i % 4]; x.globalAlpha = .35 + .4 * Math.abs(cz); x.lineWidth = 4; x.beginPath(); x.moveTo(x1, y); x.lineTo(W / 2, y); x.stroke();
        x.strokeStyle = cols[(i + 2) % 4]; x.beginPath(); x.moveTo(W / 2, y); x.lineTo(x2, y); x.stroke(); x.globalAlpha = 1;
        for (const [px, z] of [[x1, cz], [x2, -cz]]) { x.fillStyle = z > 0 ? '#e8fff4' : '#7fb8a4'; x.beginPath(); x.arc(px, y, 5 + z * 2, 0, 7); x.fill(); } }
      requestAnimationFrame(frame); };
    frame(); cleanup.push(() => alive = false);
  }

  async function loadWiki(title, e, wikiOnly) {
    const token = location.hash;
    WIKI.summary(title).then(s => {
      if (location.hash !== token) return;
      if (s.image || s.thumb) { const img = new Image(); img.onload = () => { const bg = $('#dbg'); if (bg) { bg.style.backgroundImage = `url("${img.src}")`; bg.classList.add('in'); } }; img.src = s.image || s.thumb; }
      if (wikiOnly) {
        $('#dtag').textContent = s.desc ? s.desc[0].toUpperCase() + s.desc.slice(1) : '';
        $('#ovtext').innerHTML = para(s.extract || 'No summary available.');
        $('#facts').innerHTML = `<dt>Source</dt><dd>Wikipedia</dd>${s.desc ? `<dt>Described as</dt><dd>${esc(s.desc)}</dd>` : ''}<dt>Read online</dt><dd><a href="${esc(s.url)}" target="_blank" rel="noopener">Open original ↗</a></dd>`;
        if (s.type === 'disambiguation') $('#ovtext').insertAdjacentHTML('beforeend', '<p class="muted">This name has several meanings. Try a more specific search.</p>');
      }
    }).catch(() => { if (wikiOnly) $('#ovtext').innerHTML = '<p class="muted">Could not reach the live encyclopedia. Check your connection.</p>'; });

    WIKI.media(title).then(items => {
      if (location.hash !== token) return; const g = $('#gal');
      g.innerHTML = items.length ? items.map((m, i) => `<figure class="reveal in" style="--d:${i * 50}ms"><img loading="lazy" src="${esc(m.src)}" data-big="${esc(m.big)}" alt="${esc(m.caption)}"><figcaption>${esc(m.caption)}</figcaption></figure>`).join('') : '<p class="muted">No images available.</p>';
      $$('img', g).forEach(im => im.onclick = () => lightbox(im.dataset.big, im.alt));
    }).catch(() => { const g = $('#gal'); if (g) g.innerHTML = '<p class="muted">Gallery unavailable offline.</p>'; });

    WIKI.article(title).then(txt => {
      if (location.hash !== token) return; const box = $('#wkb'); const secs = WIKI.parse(txt);
      if (!secs.length) { box.innerHTML = '<p class="muted">No article text found.</p>'; return; }
      box.innerHTML = secs.map((s, i) => `<details class="acc-item lvl${s.level}" ${i === 0 ? 'open' : ''}><summary>${esc(s.title)}</summary><div>${s.body.map(p => `<p>${esc(p)}</p>`).join('')}</div></details>`).join('') +
        `<p class="attr">Text from <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}" target="_blank" rel="noopener">Wikipedia: ${esc(title)}</a>, licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.</p>`;
    }).catch(() => { const b = $('#wkb'); if (b) b.innerHTML = '<p class="muted">The full article could not be loaded right now.</p>'; });
  }

  /* ───────── WIKI-ONLY PAGE (anything in the world) ───────── */
  function guessTheme(s) {
    const t = s.toLowerCase();
    const rules = [['satellites', /moon of|spacecraft|satellite|space station|space telescope|probe/], ['galaxies', /galaxy|cluster|quasar|supercluster|universe/], ['stars', /star|nebula|pulsar|supernova|black hole/],
      ['languages', /language|script|alphabet|writing system|syllabary|dialect/], ['extinct', /extinct|fossil|dinosaur|prehistoric|†/], ['birds', /bird|parrot|eagle|owl|duck|pigeon|falcon|crane|penguin/],
      ['fishes', /fish|shark|whale|dolphin|ray|eel|jellyfish|squid|coral|marine|turtle/], ['insects', /insect|beetle|butterfly|moth|ant\b|bee\b|wasp|fly\b|cicada|mantis|termite/],
      ['microbes', /bacteri|virus|microb|protist|amoeba|archae|fung|yeast|parasite/], ['mountains', /mountain|volcano|peak|massif|summit|monolith|range/], ['medicinal', /medicinal|herb|ayurved/],
      ['trees', /tree|palm|conifer|pine|oak|forest/], ['plants', /plant|flower|grass|crop|fern|moss|alga|shrub|cultivar/], ['animals', /mammal|animal|reptile|amphibian|frog|snake|lizard|species|primate/]];
    return (rules.find(([, re]) => re.test(t)) || ['animals'])[0];
  }
  function pageWiki(title) {
    const known = TV.entries.find(e => (e.wiki || '').toLowerCase() === title.toLowerCase());
    if (known) { location.replace('#/e/' + known.id); return; }
    const fromChip = TV.realms.find(r => r.more.includes(title));
    const show = rid => { const r = realmOf(rid); setTheme(r.theme); document.title = `${title} — TerraVerse`;
      renderDetail({ id: 'wiki', name: title.replace(/ \(.*\)$/, ''), wiki: title, emoji: r.emoji, tagline: '' }, r, true); enhance(); };
    if (fromChip) return show(fromChip.id);
    show('animals');
    WIKI.summary(title).then(s => { const rid = guessTheme((s.desc || '') + ' ' + (s.extract || '').slice(0, 300)); const r = realmOf(rid); if (r) { setTheme(r.theme); $('.d-hero')?.style.setProperty('--g1', r.g[0]); $('.d-hero')?.style.setProperty('--g2', r.g[1]); const bc = $('.crumb a:last-child'); if (bc) { bc.textContent = r.name; bc.href = '#/realm/' + r.id; } const em = $('.big-emoji'); if (em) em.textContent = r.emoji; } }).catch(() => {});
  }

  /* ───────── ABOUT ───────── */
  function pageAbout() {
    setTheme('earth'); document.title = 'About — TerraVerse';
    app.innerHTML = `<section class="wrap about"><header class="sec-head reveal" style="padding-top:8rem"><span class="eyebrow">About</span><h2>A living encyclopedia</h2></header>
      <div class="glass reveal prose"><p>TerraVerse combines a hand-written core of ${TV.entries.length} entries, stored in an encrypted database, with live access to the open knowledge of Wikipedia. Every animal, plant, star or language humanity has documented is one search away.</p>
      <p>Facts about living species change constantly: populations, conservation status and new discoveries. Where we give a number, it is the best published estimate we know of. Always check primary sources for research.</p>
      <p>Live article text and images come from <a href="https://www.wikipedia.org" target="_blank" rel="noopener">Wikipedia</a> and <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> under their respective open licences (CC BY-SA and others). Conservation categories follow the IUCN Red List.</p>
      <p>Medicinal plant content is for education only and is not medical advice.</p></div></section>`;
  }

  /* ───────── SEARCH ───────── */
  function liveSearch(input, out, mapQ) {
    let tmr, seq = 0;
    input.addEventListener('input', () => {
      clearTimeout(tmr); const q = input.value.trim();
      if (q.length < 2) { out.innerHTML = ''; return; }
      tmr = setTimeout(async () => {
        const my = ++seq; out.innerHTML = '<p class="muted shimmer">Searching the world\'s knowledge…</p>';
        try { const res = await WIKI.search(mapQ(q)); if (my !== seq) return;
          out.innerHTML = res.length ? res.map(r => `<a class="sres" href="#/wiki/${encodeURIComponent(r.title)}">${r.thumb ? `<img src="${esc(r.thumb)}" alt="">` : '<span class="ph">✦</span>'}<div><b>${esc(r.title)}</b><small>${esc(r.desc)}</small></div></a>`).join('') : '<p class="muted">No results.</p>';
        } catch (e) { if (my === seq) out.innerHTML = '<p class="muted">Live search is unavailable right now.</p>'; }
      }, 320);
    });
  }
  function initSearch() {
    const box = $('#search'), inp = $('#sq'), loc = $('#sl');
    const open = () => { box.classList.remove('hidden'); setTimeout(() => inp.focus(), 50); };
    const close = () => box.classList.add('hidden');
    document.addEventListener('click', e => { if (e.target.closest('[data-open-search]')) open(); if (e.target.closest('[data-close-search]') || e.target === box) close(); });
    addEventListener('keydown', e => { if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName))) { e.preventDefault(); open(); } if (e.key === 'Escape') close(); });
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      const hits = q.length < 1 ? [] : TV.entries.filter(e => (e.name + ' ' + (e.sci || '') + ' ' + (e.tagline || '') + ' ' + realmOf(e.cat).name).toLowerCase().includes(q)).slice(0, 8);
      const chips = q.length < 2 ? [] : TV.realms.flatMap(r => r.more.filter(m => m.toLowerCase().includes(q)).map(m => [m, r])).slice(0, 6);
      loc.innerHTML = hits.map(e => `<a class="sres" href="#/e/${e.id}"><span class="ph">${e.emoji}</span><div><b>${esc(e.name)}</b><small>${esc(realmOf(e.cat).name)} · ${esc(e.tagline)}</small></div></a>`).join('') +
        chips.map(([m, r]) => `<a class="sres" href="#/wiki/${encodeURIComponent(m)}"><span class="ph">${r.emoji}</span><div><b>${esc(m)}</b><small>${esc(r.name)}</small></div></a>`).join('') ||
        (q ? '<p class="muted">Not in the core collection. See live results →</p>' : '<p class="muted">Try "elephant", "tamil", "black hole", "neem"…</p>');
    });
    liveSearch(inp, $('#sw'), q => q);
  }

  /* ───────── enhancers: reveal, images, tilt, counters ───────── */
  function enhance() {
    io?.disconnect();
    io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; const el = en.target; io.unobserve(el);
      if (el.dataset.wiki !== undefined && !el.dataset.loaded) { el.dataset.loaded = 1; WIKI.summary(el.dataset.wiki).then(s => { const box = $('.card-img', el); if (s.thumb && box) { const img = new Image(); img.onload = () => { box.style.backgroundImage = `url("${s.thumb}")`; box.classList.add('has'); }; img.src = s.thumb; } }).catch(() => {}); }
      if (el.dataset.count) countUp(el);
      el.classList.add('in');
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal, [data-wiki], [data-count], .title-xl, .title-l, .big-emoji').forEach(el => io.observe(el));
  }
  function countUp(el) {
    const raw = el.dataset.count, n = parseFloat(raw.replace(/,/g, '')), dec = (raw.split('.')[1] || '').length, comma = raw.includes(','), t0 = performance.now();
    const step = now => { const p = Math.min(1, (now - t0) / 1600), v = n * (1 - Math.pow(1 - p, 3)); el.textContent = comma ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function initTilt() {
    if (matchMedia('(hover: none)').matches) return;
    document.addEventListener('pointermove', e => {
      const c = e.target.closest('.tilt'); if (!c) return;
      const b = c.getBoundingClientRect(), px = (e.clientX - b.left) / b.width - .5, py = (e.clientY - b.top) / b.height - .5;
      c.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-6px)`; c.style.setProperty('--mx', (px + .5) * 100 + '%'); c.style.setProperty('--my', (py + .5) * 100 + '%');
    }, { passive: true });
    document.addEventListener('pointerout', e => { const c = e.target.closest('.tilt'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
  }
  function lightbox(src, cap) {
    const lb = document.createElement('div'); lb.className = 'lightbox';
    lb.innerHTML = `<img src="${esc(src)}" alt=""><p>${esc(cap)}</p><button aria-label="Close">✕</button>`;
    lb.onclick = () => { lb.classList.add('out'); setTimeout(() => lb.remove(), 250); }; document.body.appendChild(lb);
  }
  function chrome() {
    const bar = $('#progress'), nav = $('.nav');
    addEventListener('scroll', () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; nav.classList.toggle('solid', scrollY > 40); }, { passive: true });
    document.addEventListener('click', e => { const s = e.target.closest('[data-scroll]'); if (s) { e.preventDefault(); $(s.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }); } });
    $('#menu-realms').innerHTML = TV.realms.map(r => `<a href="#/realm/${r.id}"><span>${r.emoji}</span>${esc(r.name)}</a>`).join('');
    $('#burger').onclick = () => document.body.classList.toggle('menu-open');
    addEventListener('hashchange', () => document.body.classList.remove('menu-open'));
    const glow = $('#cursor');
    if (matchMedia('(hover: hover)').matches) addEventListener('pointermove', e => glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`, { passive: true });
  }

  /* ───────── boot ───────── */
  async function boot() {
    FX.set('earth');
    try { TV = window.TV = await TVDB.open(); }
    catch (err) { console.error(err); $('#loader').innerHTML = `<div class="load-err"><h2>🔒 The archive is locked</h2><p>${esc(err.message)}</p></div>`; return; }
    chrome(); initSearch(); initTilt();
    addEventListener('hashchange', go);
    route(); enhance();
    const l = $('#loader'); l.classList.add('done'); setTimeout(() => l.remove(), 900);
  }
  boot();
})();
