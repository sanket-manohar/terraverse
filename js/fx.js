/* Ambient particle engine — one full-screen canvas, a different living world per theme. */
window.FX = (() => {
  const c = document.getElementById('fx'), x = c.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, parts = [], theme = '', raf = 0, t = 0, mouse = { x: -9999, y: -9999 }, scrollV = 0, lastY = scrollY;
  const R = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
  const TAU = Math.PI * 2;

  const CFG = {
    earth:    [['firefly', 45], ['leaf', 12]],
    jungle:   [['firefly', 60], ['leaf', 20]],
    flora:    [['pollen', 70], ['petal', 18], ['firefly', 15]],
    ocean:    [['ray', 6], ['bubble', 70], ['fish', 8], ['plankton', 60]],
    sky:      [['cloud', 9], ['bird', 12], ['sparkle', 30]],
    space:    [['star', 260], ['nebula', 4], ['shoot', 2]],
    micro:    [['cell', 22], ['dot', 70], ['helix', 3]],
    mountain: [['snow', 170], ['mist', 5]],
    meadow:   [['firefly', 30], ['butterfly', 12], ['pollen', 40]],
    ancient:  [['glyph', 38], ['dust', 60]],
    fossil:   [['ember', 80], ['ash', 40]],
  };
  const GLYPHS = '𓀀𓂀𓃭𓅓𓆣𓇳𓋹𒀭𒀀𒆠𒈗𐤀𐤁𐤂ᚠᚢᚦᛋᛏΑΒΓΔΩΨअकमஅதழ한글文山水火ᚱᛒ𓊹'.match(/./gu);
  const PALETTE = {
    leaf: ['#5f9e3a', '#87b74a', '#3f7d2c', '#c3a53a', '#a1c850'], petal: ['#ffb7c9', '#ffd1dc', '#fff0f5', '#ffc3a0'],
    wing: ['#ff9f1c', '#ffbf69', '#9b5de5', '#00bbf9', '#f15bb5', '#fee440'], fish: ['#ffb38a', '#7ce0f0', '#ffe08a'],
  };

  const make = {
    firefly: () => ({ x: R(0, W), y: R(0, H), r: R(1, 2.6), vx: R(-.3, .3), vy: R(-.3, .3), ph: R(0, TAU), sp: R(.02, .05) }),
    leaf: (init) => ({ x: R(0, W), y: init ? R(0, H) : -20, s: R(6, 13), vy: R(.4, 1.1), sw: R(.5, 1.5), ph: R(0, TAU), rot: R(0, TAU), vr: R(-.03, .03), col: pick(PALETTE.leaf) }),
    pollen: () => ({ x: R(0, W), y: R(0, H), r: R(.6, 1.8), vx: R(-.15, .15), vy: R(-.4, -.08), ph: R(0, TAU) }),
    petal: (init) => ({ x: R(0, W), y: init ? R(0, H) : -20, s: R(4, 8), vy: R(.5, 1.2), sw: R(.6, 1.8), ph: R(0, TAU), rot: R(0, TAU), vr: R(-.04, .04), col: pick(PALETTE.petal) }),
    bubble: (init) => ({ x: R(0, W), y: init ? R(0, H) : H + 20, r: R(1.5, 7), vy: R(.3, 1.4), ph: R(0, TAU) }),
    plankton: () => ({ x: R(0, W), y: R(0, H), r: R(.5, 1.4), vx: R(-.1, .1), vy: R(-.1, .1), ph: R(0, TAU) }),
    ray: () => ({ x: R(0, W), w: R(60, 180), ph: R(0, TAU), a: R(.03, .08) }),
    fish: () => { const d = Math.random() < .5 ? 1 : -1; return { x: d > 0 ? -60 : W + 60, y: R(H * .15, H * .95), d, s: R(6, 14), v: R(.4, 1.2), ph: R(0, TAU), col: pick(PALETTE.fish) }; },
    cloud: (init) => ({ x: init ? R(0, W) : -300, y: R(0, H * .7), s: R(.6, 1.6), v: R(.08, .3), a: R(.05, .12) }),
    bird: () => ({ x: -40, y: R(H * .05, H * .6), s: R(4, 9), v: R(.7, 1.6), ph: R(0, TAU), bob: R(0, TAU) }),
    sparkle: () => ({ x: R(0, W), y: R(0, H), r: R(.5, 1.5), ph: R(0, TAU) }),
    star: () => ({ x: R(0, W), y: R(0, H), r: Math.random() < .93 ? R(.3, 1.1) : R(1.2, 2.2), ph: R(0, TAU), sp: R(.01, .05), z: R(.2, 1), hue: pick([0, 0, 0, 210, 40, 280]) }),
    nebula: () => ({ x: R(0, W), y: R(0, H), r: R(200, 420), hue: pick([260, 300, 200, 330]), ph: R(0, TAU) }),
    shoot: () => ({ x: R(0, W), y: R(-H * .2, H * .4), vx: R(6, 11), vy: R(2, 4), life: 0, wait: R(60, 500) }),
    cell: () => ({ x: R(0, W), y: R(0, H), r: R(14, 46), vx: R(-.25, .25), vy: R(-.25, .25), ph: R(0, TAU), k: R(3, 6) | 0, hue: pick([160, 175, 140, 60]) }),
    dot: () => ({ x: R(0, W), y: R(0, H), r: R(.6, 2), vx: R(-.4, .4), vy: R(-.4, .4) }),
    helix: () => ({ x: R(0, W), y: R(0, H), len: R(120, 220), ang: R(0, TAU), v: R(.1, .3), ph: R(0, TAU) }),
    snow: (init) => ({ x: R(0, W), y: init ? R(0, H) : -10, r: R(.8, 3), vy: R(.4, 1.5), ph: R(0, TAU) }),
    mist: () => ({ x: R(0, W), y: R(H * .4, H), w: R(300, 700), v: R(.1, .3), a: R(.03, .07) }),
    butterfly: () => ({ x: R(0, W), y: R(0, H), s: R(5, 10), vx: R(-.8, .8), vy: R(-.5, .5), ph: R(0, TAU), col: pick(PALETTE.wing), turn: 0 }),
    glyph: (init) => ({ x: R(0, W), y: init ? R(0, H) : H + 30, g: pick(GLYPHS), s: R(14, 34), vy: R(.15, .45), rot: R(-.4, .4), ph: R(0, TAU), a: R(.06, .2) }),
    dust: () => ({ x: R(0, W), y: R(0, H), r: R(.4, 1.4), vx: R(-.2, .2), vy: R(-.15, .05), ph: R(0, TAU) }),
    ember: (init) => ({ x: R(0, W), y: init ? R(0, H) : H + 10, r: R(.7, 2.4), vy: R(.4, 1.3), vx: R(-.3, .3), ph: R(0, TAU), life: R(.4, 1) }),
    ash: (init) => ({ x: R(0, W), y: init ? R(0, H) : -10, r: R(1, 2.6), vy: R(.2, .7), ph: R(0, TAU) }),
  };

  const draw = {
    firefly(p) {
      p.ph += p.sp; const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
      if (d < 220) { p.vx += dx / d * .02; p.vy += dy / d * .02; }
      p.vx = (p.vx + R(-.03, .03)) * .985; p.vy = (p.vy + R(-.03, .03)) * .985; p.x += p.vx; p.y += p.vy - scrollV * .05; wrap(p);
      const a = .35 + .65 * Math.abs(Math.sin(p.ph)), g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 9);
      g.addColorStop(0, `rgba(230,255,140,${a})`); g.addColorStop(.25, `rgba(190,255,90,${a * .35})`); g.addColorStop(1, 'rgba(190,255,90,0)');
      x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r * 9, 0, TAU); x.fill();
    },
    leaf(p) {
      p.ph += .02; p.y += p.vy; p.x += Math.sin(p.ph) * p.sw; p.rot += p.vr; if (p.y > H + 30) Object.assign(p, make.leaf(false));
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.scale(1, Math.cos(p.ph * 1.3)); x.fillStyle = p.col; x.globalAlpha = .75;
      x.beginPath(); x.moveTo(-p.s, 0); x.quadraticCurveTo(0, -p.s * .7, p.s, 0); x.quadraticCurveTo(0, p.s * .7, -p.s, 0); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = .7; x.beginPath(); x.moveTo(-p.s, 0); x.lineTo(p.s, 0); x.stroke(); x.restore();
    },
    pollen(p) { p.ph += .03; p.x += p.vx + Math.sin(p.ph) * .2; p.y += p.vy; wrap(p); dotc(p.x, p.y, p.r, `rgba(255,230,140,${.4 + .4 * Math.sin(p.ph)})`); },
    petal(p) {
      p.ph += .025; p.y += p.vy; p.x += Math.sin(p.ph) * p.sw; p.rot += p.vr; if (p.y > H + 20) Object.assign(p, make.petal(false));
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.scale(1, .55 + .45 * Math.sin(p.ph * 2)); x.fillStyle = p.col; x.globalAlpha = .8;
      x.beginPath(); x.ellipse(0, 0, p.s, p.s * .6, 0, 0, TAU); x.fill(); x.restore();
    },
    bubble(p) {
      p.ph += .04; p.y -= p.vy; p.x += Math.sin(p.ph) * .5; if (p.y < -20) Object.assign(p, make.bubble(false));
      x.strokeStyle = 'rgba(200,245,255,.45)'; x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.stroke();
      dotc(p.x - p.r * .35, p.y - p.r * .35, p.r * .25, 'rgba(255,255,255,.6)');
    },
    plankton(p) { p.ph += .05; p.x += p.vx; p.y += p.vy; wrap(p); dotc(p.x, p.y, p.r, `rgba(140,255,230,${.2 + .3 * Math.abs(Math.sin(p.ph))})`); },
    ray(p) {
      p.ph += .004; const sx = p.x + Math.sin(p.ph) * 60, g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(180,240,255,${p.a})`); g.addColorStop(1, 'rgba(180,240,255,0)'); x.fillStyle = g;
      x.beginPath(); x.moveTo(sx - p.w * .3, 0); x.lineTo(sx + p.w * .3, 0); x.lineTo(sx + p.w * 1.2 + 120, H); x.lineTo(sx - p.w * .2 + 120, H); x.fill();
    },
    fish(p) {
      p.ph += .15; p.x += p.v * p.d; p.y += Math.sin(p.ph * .2) * .3; if (p.x < -80 || p.x > W + 80) Object.assign(p, make.fish());
      x.save(); x.translate(p.x, p.y); x.scale(p.d, 1); x.fillStyle = p.col; x.globalAlpha = .55;
      x.beginPath(); x.ellipse(0, 0, p.s, p.s * .45, 0, 0, TAU); x.fill();
      const tw = Math.sin(p.ph) * p.s * .25; x.beginPath(); x.moveTo(-p.s * .8, 0); x.lineTo(-p.s * 1.5, -p.s * .45 + tw); x.lineTo(-p.s * 1.5, p.s * .45 + tw); x.fill(); x.restore();
    },
    cloud(p) {
      p.x += p.v; if (p.x > W + 300) Object.assign(p, make.cloud(false));
      x.fillStyle = `rgba(255,255,255,${p.a})`; x.beginPath(); for (const [ox, oy, r] of [[0, 0, 50], [45, -18, 42], [90, 0, 48], [40, 14, 40], [-40, 8, 34]]) { const cx = p.x + ox * p.s, cy = p.y + oy * p.s; x.moveTo(cx + r * p.s, cy); x.arc(cx, cy, r * p.s, 0, TAU); } x.fill('nonzero');
    },
    bird(p) {
      p.ph += .18; p.bob += .02; p.x += p.v; const y = p.y + Math.sin(p.bob) * 10; if (p.x > W + 40) Object.assign(p, make.bird());
      const f = Math.sin(p.ph) * p.s * .8; x.strokeStyle = 'rgba(20,30,50,.55)'; x.lineWidth = 1.6; x.lineCap = 'round';
      x.beginPath(); x.moveTo(p.x - p.s * 1.4, y - f); x.quadraticCurveTo(p.x - p.s * .6, y - p.s * .3, p.x, y); x.quadraticCurveTo(p.x + p.s * .6, y - p.s * .3, p.x + p.s * 1.4, y - f); x.stroke();
    },
    sparkle(p) { p.ph += .03; dotc(p.x, p.y, p.r, `rgba(255,240,200,${Math.max(0, Math.sin(p.ph)) * .7})`); },
    star(p) {
      p.ph += p.sp; const a = .3 + .7 * Math.abs(Math.sin(p.ph)), px = p.x + (mouse.x - W / 2) * .02 * p.z, py = p.y - scrollY * .05 * p.z % H;
      const yy = ((py % H) + H) % H; x.fillStyle = p.hue ? `hsla(${p.hue},90%,85%,${a})` : `rgba(255,255,255,${a})`;
      x.beginPath(); x.arc(px, yy, p.r, 0, TAU); x.fill();
      if (p.r > 1.5) { x.strokeStyle = `rgba(255,255,255,${a * .4})`; x.lineWidth = .6; x.beginPath(); x.moveTo(px - p.r * 4, yy); x.lineTo(px + p.r * 4, yy); x.moveTo(px, yy - p.r * 4); x.lineTo(px, yy + p.r * 4); x.stroke(); }
    },
    nebula(p) { p.ph += .003; const r = p.r * (1 + Math.sin(p.ph) * .08), g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, `hsla(${p.hue},80%,60%,.10)`); g.addColorStop(1, `hsla(${p.hue},80%,40%,0)`); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill(); },
    shoot(p) {
      if (p.wait > 0) { p.wait--; return; } p.life++; p.x += p.vx; p.y += p.vy;
      const g = x.createLinearGradient(p.x, p.y, p.x - p.vx * 14, p.y - p.vy * 14); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * 14, p.y - p.vy * 14); x.stroke();
      if (p.x > W + 100 || p.y > H + 100) Object.assign(p, make.shoot());
    },
    cell(p) {
      p.ph += .02; p.x += p.vx; p.y += p.vy; wrap(p, 60);
      x.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = p.r * (1 + .08 * Math.sin(a * p.k + p.ph * 2)); const px = p.x + Math.cos(a) * rr, py = p.y + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.fillStyle = `hsla(${p.hue},70%,60%,.07)`; x.fill(); x.strokeStyle = `hsla(${p.hue},80%,70%,.35)`; x.lineWidth = 1.2; x.stroke();
      dotc(p.x + Math.sin(p.ph) * p.r * .2, p.y + Math.cos(p.ph) * p.r * .2, p.r * .28, `hsla(${p.hue + 40},70%,65%,.28)`);
    },
    dot(p) { p.vx += R(-.05, .05); p.vy += R(-.05, .05); p.vx *= .97; p.vy *= .97; p.x += p.vx; p.y += p.vy; wrap(p); dotc(p.x, p.y, p.r, 'rgba(160,255,220,.35)'); },
    helix(p) {
      p.ph += .03; p.y -= p.v; if (p.y < -p.len) { p.y = H + p.len; p.x = R(0, W); }
      for (let i = 0; i < 18; i++) { const yy = p.y + i * p.len / 18, s = Math.sin(p.ph + i * .6) * 16, a = .12 + .12 * Math.cos(p.ph + i * .6);
        x.strokeStyle = `rgba(122,240,197,${a})`; x.lineWidth = 1; x.beginPath(); x.moveTo(p.x - s, yy); x.lineTo(p.x + s, yy); x.stroke();
        dotc(p.x - s, yy, 2, `rgba(122,240,197,${a * 2})`); dotc(p.x + s, yy, 2, `rgba(240,225,74,${a * 2})`); }
    },
    snow(p) { p.ph += .02; p.y += p.vy; p.x += Math.sin(p.ph) * .6 + .3; if (p.y > H + 10) Object.assign(p, make.snow(false)); if (p.x > W) p.x = 0; dotc(p.x, p.y, p.r, `rgba(255,255,255,${.4 + p.r * .15})`); },
    mist(p) { p.x += p.v; if (p.x - p.w > W) p.x = -p.w; const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.w); g.addColorStop(0, `rgba(230,240,255,${p.a})`); g.addColorStop(1, 'rgba(230,240,255,0)'); x.fillStyle = g; x.fillRect(p.x - p.w, p.y - p.w, p.w * 2, p.w * 2); },
    butterfly(p) {
      p.ph += .3; if (Math.random() < .01) p.turn = R(-.05, .05); const a = Math.atan2(p.vy, p.vx) + p.turn, v = Math.hypot(p.vx, p.vy);
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.x += p.vx; p.y += p.vy + Math.sin(p.ph * .3) * .4; wrap(p, 20);
      const f = Math.abs(Math.sin(p.ph)); x.save(); x.translate(p.x, p.y); x.rotate(a + Math.PI / 2); x.fillStyle = p.col; x.globalAlpha = .8;
      for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * p.s * .6 * f, -p.s * .2, p.s * .6 * f + .5, p.s * .7, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(s * p.s * .45 * f, p.s * .45, p.s * .4 * f + .4, p.s * .45, 0, 0, TAU); x.fill(); }
      x.fillStyle = '#2b1d0e'; x.fillRect(-.7, -p.s * .7, 1.4, p.s * 1.4); x.restore();
    },
    glyph(p) {
      p.ph += .01; p.y -= p.vy; p.x += Math.sin(p.ph) * .2; if (p.y < -40) Object.assign(p, make.glyph(false));
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot + Math.sin(p.ph) * .1); x.font = `${p.s}px "Noto Sans Egyptian Hieroglyphs","Noto Sans Cuneiform","Noto Sans Phoenician","Noto Sans Runic",serif`;
      x.fillStyle = `rgba(242,196,109,${p.a * (.6 + .4 * Math.sin(p.ph * 3))})`; x.textAlign = 'center'; x.fillText(p.g, 0, 0); x.restore();
    },
    dust(p) { p.ph += .02; p.x += p.vx; p.y += p.vy; wrap(p); dotc(p.x, p.y, p.r, `rgba(255,220,150,${.15 + .25 * Math.abs(Math.sin(p.ph))})`); },
    ember(p) {
      p.ph += .1; p.y -= p.vy; p.x += p.vx + Math.sin(p.ph * .3) * .3; p.life -= .0015; if (p.y < -10 || p.life <= 0) Object.assign(p, make.ember(false));
      const a = p.life * (.5 + .5 * Math.sin(p.ph)), g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(255,190,90,${a})`); g.addColorStop(1, 'rgba(255,90,30,0)'); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r * 4, 0, TAU); x.fill();
    },
    ash(p) { p.ph += .02; p.y += p.vy; p.x += Math.sin(p.ph) * .5; if (p.y > H + 10) Object.assign(p, make.ash(false)); dotc(p.x, p.y, p.r, 'rgba(180,170,160,.25)'); },
  };

  function dotc(px, py, r, col) { x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
  function wrap(p, m = 10) { if (p.x < -m) p.x = W + m; else if (p.x > W + m) p.x = -m; if (p.y < -m) p.y = H + m; else if (p.y > H + m) p.y = -m; }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function populate() {
    parts = []; const scale = Math.max(.35, Math.min(1.2, (W * H) / (1440 * 900)));
    for (const [type, n] of (CFG[theme] || CFG.earth)) for (let i = 0; i < Math.round(n * scale) || 0; i++) parts.push([type, make[type](true)]);
  }
  function loop() {
    raf = requestAnimationFrame(loop); if (document.hidden) return; t++;
    const y = scrollY; scrollV = scrollV * .9 + (y - lastY) * .1; lastY = y;
    x.clearRect(0, 0, W, H);
    for (const [type, p] of parts) draw[type](p);
  }
  addEventListener('resize', () => { resize(); populate(); });
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  resize();

  return {
    set(th) {
      if (th === theme) return; theme = th; populate();
      if (reduce) { cancelAnimationFrame(raf); x.clearRect(0, 0, W, H); for (const [type, p] of parts) draw[type](p); return; }
      if (!raf) loop();
    },
  };
})();
