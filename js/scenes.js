/* Procedural SVG landscapes — a parallax scene for the home hero and each realm. */
window.SCENES = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const R = (a, b) => a + rnd() * (b - a);
  const W = 1600, H = 900;

  function canopy(baseY, color, rMin, rMax, step, extra = '') {
    let s = `<g fill="${color}" ${extra}>`;
    for (let xx = -80; xx < W + 80; xx += R(step * .6, step)) {
      const r = R(rMin, rMax), cy = baseY - r * .5 + R(-20, 20);
      s += `<circle cx="${xx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}"/>`;
      if (rnd() < .5) s += `<circle cx="${(xx + r * .6).toFixed(0)}" cy="${(cy - r * .4).toFixed(0)}" r="${(r * .7).toFixed(0)}"/>`;
    }
    return s + `<rect x="0" y="${baseY - 10}" width="${W}" height="${H - baseY + 10}"/></g>`;
  }
  function trunks(baseY, color, n) {
    let s = `<g fill="${color}">`;
    for (let i = 0; i < n; i++) { const xx = R(0, W), w = R(8, 22); s += `<path d="M${xx} ${H} L${xx + w * .3} ${baseY - R(40, 140)} L${xx + w * .7} ${baseY - R(40, 140)} L${xx + w} ${H}Z"/>`; }
    return s + '</g>';
  }
  function ridge(baseY, amp, color, pts = 14, extra = '') {
    let d = `M0 ${H} L0 ${baseY}`;
    for (let i = 0; i <= pts; i++) { const xx = i / pts * W, yy = baseY - R(0, amp) * (i % 2 ? 1 : .45); d += ` L${xx.toFixed(0)} ${yy.toFixed(0)}`; }
    return `<path d="${d} L${W} ${H}Z" fill="${color}" ${extra}/>`;
  }
  function peaks(color, snow) {
    let s = '';
    const list = [[260, 330, 420], [620, 180, 520], [980, 260, 460], [1320, 340, 380], [800, 420, 640], [80, 470, 300], [1520, 450, 300]];
    for (const [cx, top, w] of list) {
      s += `<path d="M${cx - w / 2} ${H} L${cx} ${top} L${cx + w / 2} ${H}Z" fill="${color}"/>`;
      s += `<path d="M${cx - w * .12} ${top + w * .24} L${cx} ${top} L${cx + w * .12} ${top + w * .24} L${cx + w * .05} ${top + w * .2} L${cx - .02 * w} ${top + w * .27} L${cx - w * .06} ${top + w * .21}Z" fill="${snow}"/>`;
    }
    return s;
  }
  function leaf(x0, y0, rot, scale, col, delay) {
    return `<g class="sway" style="transform-origin:${x0}px ${y0}px;animation-delay:${delay}s"><g transform="translate(${x0} ${y0}) rotate(${rot}) scale(${scale})">
      <path d="M0 0 C 80 -150 260 -190 380 -140 C 260 -100 110 -50 0 0Z" fill="${col}"/>
      <path d="M0 0 C 120 -100 250 -130 380 -140" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/></g></g>`;
  }
  function waves(y, col, op, dur, amp) {
    let d = `M0 ${y}`; for (let i = 0; i <= 16; i++) d += ` Q ${i * 200 + 100} ${y + (i % 2 ? amp : -amp)} ${(i + 1) * 200} ${y}`;
    return `<path class="wave" style="animation-duration:${dur}s" d="${d} L3400 ${H} L0 ${H}Z" fill="${col}" opacity="${op}"/>`;
  }
  const svg = (inner, defs = '') => `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>${defs}</defs>${inner}</svg>`;

  function home() {
    seed = 11;
    const defs = `<linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d3b3a"/><stop offset=".45" stop-color="#3f7f5c"/><stop offset=".72" stop-color="#e9b45a"/><stop offset="1" stop-color="#f6d58e"/></linearGradient>
      <radialGradient id="hsun"><stop offset="0" stop-color="#fff6d5"/><stop offset=".35" stop-color="#ffd977" stop-opacity=".9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      <linearGradient id="hmist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e2b0" stop-opacity="0"/><stop offset="1" stop-color="#f6e2b0" stop-opacity=".55"/></linearGradient>
      <linearGradient id="hfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07170f" stop-opacity="0"/><stop offset="1" stop-color="#07170f"/></linearGradient>`;
    return svg(`
      <rect width="${W}" height="${H}" fill="url(#hsky)"/>
      <g class="layer" data-depth="0.01"><circle class="sun" cx="1050" cy="430" r="260" fill="url(#hsun)"/><circle cx="1050" cy="430" r="62" fill="#fff3c4"/></g>
      <g class="layer" data-depth="0.02">${ridge(520, 160, '#5d8f6e', 10, 'opacity=".55"')}</g>
      <rect y="380" width="${W}" height="220" fill="url(#hmist)"/>
      <g class="layer" data-depth="0.035">${ridge(590, 120, '#3e7151', 16)}</g>
      <g class="birds"><path d="M0 0 q8 -8 16 0 q8 -8 16 0" /><path d="M40 20 q6 -6 12 0 q6 -6 12 0"/><path d="M-30 30 q7 -7 14 0 q7 -7 14 0"/></g>
      <g class="layer" data-depth="0.05">${canopy(660, '#2c6a3f', 40, 80, 70)}</g>
      <g class="layer" data-depth="0.07">${trunks(700, '#1a3d24', 12)}${canopy(730, '#1f5532', 50, 95, 80)}</g>
      <g class="layer" data-depth="0.1">${canopy(810, '#143f24', 60, 110, 95)}</g>
      <g class="layer mist-band" data-depth="0.12"><rect y="700" width="${W * 2}" height="120" fill="url(#hmist)" opacity=".5"/></g>
      <g class="layer" data-depth="0.16">
        ${leaf(-40, 900, -38, 1.5, '#0f3b1f', 0)}${leaf(-60, 760, -12, 1.1, '#164a28', .7)}${leaf(20, 980, -62, 1.2, '#1d5a30', 1.4)}
        ${leaf(1640, 900, -142, 1.5, '#0f3b1f', .3)}${leaf(1660, 760, -168, 1.1, '#164a28', 1)}${leaf(1580, 980, -118, 1.2, '#1d5a30', 1.8)}
      </g>
      <rect y="640" width="${W}" height="260" fill="url(#hfade)"/>`, defs);
  }

  function realm(theme, g1, g2) {
    seed = theme.length * 97 + 3;
    const fade = `<linearGradient id="rf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g2}" stop-opacity="0"/><stop offset="1" style="stop-color:var(--bg1)"/></linearGradient>`;
    const end = '';
    switch (theme) {
      case 'jungle': case 'earth':
        return svg(`<g class="layer" data-depth="0.03">${canopy(620, '#2a6a3e', 50, 90, 80, 'opacity=".55"')}</g><g class="layer" data-depth="0.06">${trunks(700, '#163a21', 10)}${canopy(720, '#1c5230', 60, 100, 90)}</g><g class="layer" data-depth="0.1">${canopy(820, '#0f361d', 70, 120, 100)}</g>
          <g class="layer" data-depth="0.15">${leaf(-40, 900, -35, 1.4, '#0c3019', 0)}${leaf(1640, 900, -145, 1.4, '#0c3019', .6)}${leaf(1600, 980, -115, 1.1, '#164a28', 1.2)}</g>${end}`, fade);
      case 'flora':
        return svg(`<g class="layer" data-depth="0.03">${ridge(640, 80, '#3d7a3a', 12, 'opacity=".5"')}</g><g class="layer" data-depth="0.06">${canopy(740, '#2a5e2a', 40, 70, 60)}</g>
          <g class="layer" data-depth="0.1">${flowers()}</g><g class="layer" data-depth="0.15">${leaf(-40, 900, -40, 1.3, '#1b4a1e', 0)}${leaf(1640, 900, -140, 1.3, '#1b4a1e', .8)}</g>${end}`, fade);
      case 'meadow':
        return svg(`<g class="layer" data-depth="0.03">${ridge(660, 90, '#6b8a2a', 10, 'opacity=".55"')}</g><g class="layer" data-depth="0.07">${grass(780, '#4a6b1a')}</g><g class="layer" data-depth="0.11">${flowers()}${grass(860, '#2f4a10')}</g>${end}`, fade);
      case 'ocean':
        return svg(`<g class="layer" data-depth="0.02">${waves(380, '#0b5d84', .35, 22, 18)}</g><g class="layer" data-depth="0.04">${waves(520, '#07476a', .5, 16, 22)}</g>
          <g class="layer" data-depth="0.08">${corals()}</g><g class="layer" data-depth="0.12">${waves(760, '#03304d', .8, 12, 16)}</g>${end}`, fade);
      case 'sky':
        return svg(`<g class="layer" data-depth="0.02"><circle cx="1200" cy="300" r="110" fill="#ffd99a" opacity=".8"/><circle cx="1200" cy="300" r="220" fill="#ffd99a" opacity=".15"/></g>
          <g class="layer" data-depth="0.05">${ridge(700, 140, '#2c5d86', 12, 'opacity=".6"')}</g><g class="layer" data-depth="0.09">${ridge(800, 100, '#1b3f60', 16)}</g>${end}`, fade);
      case 'space':
        return svg(`<g class="layer" data-depth="0.03"><g class="orbit" style="transform-origin:1180px 360px"><ellipse cx="1180" cy="360" rx="330" ry="70" fill="none" stroke="${g1}" stroke-opacity=".5" stroke-width="2"/><circle cx="850" cy="360" r="9" fill="#fff"/></g>
          <circle cx="1180" cy="360" r="150" fill="url(#pl)"/><path d="M850 380 Q1180 470 1510 340" fill="none" stroke="#f0d7ff" stroke-opacity=".55" stroke-width="10"/></g>
          <g class="layer" data-depth="0.08"><circle cx="260" cy="720" r="320" fill="#120b2c"/><circle cx="260" cy="720" r="320" fill="none" stroke="${g1}" stroke-opacity=".35" stroke-width="3"/></g>${end}`,
          fade + `<radialGradient id="pl" cx=".35" cy=".35"><stop offset="0" stop-color="#f7c8ff"/><stop offset=".5" stop-color="${g1}"/><stop offset="1" stop-color="#140a33"/></radialGradient>`);
      case 'mountain':
        return svg(`<g class="layer" data-depth="0.03">${peaks('#5c6f88', '#f4f8ff')}</g><g class="layer" data-depth="0.07">${ridge(760, 160, '#34465c', 18)}</g><g class="layer" data-depth="0.11">${ridge(850, 70, '#1f2b3a', 22)}</g>${end}`, fade);
      case 'micro':
        return svg(`<g class="layer" data-depth="0.04"><circle cx="1250" cy="380" r="240" fill="none" stroke="#7af0c5" stroke-opacity=".25" stroke-width="4"/><circle cx="1250" cy="380" r="240" fill="#7af0c5" opacity=".05"/><circle cx="1300" cy="350" r="70" fill="#f0e14a" opacity=".12"/>
          <ellipse cx="320" cy="640" rx="200" ry="90" fill="#7af0c5" opacity=".07" stroke="#7af0c5" stroke-opacity=".3"/></g>${end}`, fade);
      case 'ancient':
        return svg(`<g class="layer" data-depth="0.03">${ridge(700, 50, '#6b4a26', 8, 'opacity=".55"')}</g>
          <g class="layer" data-depth="0.06" fill="#4a3018"><path d="M980 780 L1180 460 L1380 780Z"/><path d="M1300 780 L1430 560 L1560 780Z"/><path d="M180 780 h420 v-50 h-50 v-50 h-60 v-50 h-60 v-50 h-80 v50 h-60 v50 h-60 v50 h-50z"/></g>
          <g class="layer" data-depth="0.1">${ridge(820, 40, '#2a1c0f', 10)}</g>${end}`, fade);
      case 'fossil':
        return svg(`<g class="layer" data-depth="0.04">${['#6b3d22', '#5a321b', '#4a2915', '#3a2010'].map((c, i) => ridge(560 + i * 80, 40, c, 9 + i)).join('')}</g>
          <g class="layer" data-depth="0.08" fill="none" stroke="#e6a96a" stroke-opacity=".35" stroke-width="3">${ammonite(1220, 640, 60)}${ammonite(380, 760, 40)}</g>${end}`, fade);
    }
    return '';
  }
  function grass(y, col) { let s = `<g fill="${col}">`; for (let xx = 0; xx < W; xx += R(6, 14)) { const h = R(40, 110); s += `<path class="blade" style="transform-origin:${xx}px ${y + 60}px;animation-delay:${R(0, 3).toFixed(2)}s" d="M${xx} ${y + 60} Q${xx + R(-10, 10)} ${y + 60 - h * .6} ${xx + R(-18, 18)} ${y + 60 - h} Q${xx + 4} ${y + 60 - h * .5} ${xx + 6} ${y + 60}Z"/>`; } return s + `<rect y="${y + 55}" width="${W}" height="${H}"/></g>`; }
  function flowers() { let s = ''; const cols = ['#ff7eb6', '#ffd34d', '#ff9f68', '#c792ea', '#fff']; for (let i = 0; i < 26; i++) { const xx = R(0, W), yy = R(760, 880), r = R(6, 13), c = cols[i % cols.length]; s += `<g class="bloom" style="transform-origin:${xx}px ${yy}px;animation-delay:${R(0, 4).toFixed(2)}s"><path d="M${xx} ${yy} v60" stroke="#2c5a1e" stroke-width="3"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${xx}" cy="${yy - r}" rx="${r * .55}" ry="${r}" fill="${c}" transform="rotate(${a} ${xx} ${yy})"/>`).join('')}<circle cx="${xx}" cy="${yy}" r="${r * .45}" fill="#ffb300"/></g>`; } return s; }
  function corals() { let s = ''; const cols = ['#ff7f6b', '#ffb38a', '#f9d56e', '#e86a92']; for (let i = 0; i < 16; i++) { const xx = R(0, W), h = R(60, 160), c = cols[i % 4]; s += `<path class="sway" style="transform-origin:${xx}px 860px;animation-delay:${R(0, 3).toFixed(1)}s" d="M${xx} 860 q${R(-30, 30)} ${-h / 2} ${R(-20, 20)} ${-h} M${xx} ${860 - h * .4} q${R(10, 40)} ${-h * .2} ${R(20, 50)} ${-h * .55} M${xx} ${860 - h * .55} q${R(-40, -10)} ${-h * .15} ${R(-50, -20)} ${-h * .45}" stroke="${c}" stroke-width="${R(6, 12)}" stroke-linecap="round" fill="none" opacity=".75"/>`; } return s; }
  function ammonite(cx, cy, r) { let d = `M${cx} ${cy}`; for (let a = 0; a < 18; a += .2) { const rr = r * a / 18; d += ` L${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; } return `<path d="${d}"/>`; }

  return { home, realm };
})();
