/* Live knowledge layer — Wikipedia REST + Action APIs (CORS-enabled, no key needed).
 * Content from Wikipedia is CC BY-SA and is attributed on every page that uses it. */
window.WIKI = (() => {
  const API = 'https://en.wikipedia.org/w/api.php';
  const REST = 'https://en.wikipedia.org/api/rest_v1';
  const mem = new Map();
  const slug = t => encodeURIComponent(String(t).replace(/ /g, '_'));
  function get(url) {
    if (mem.has(url)) return mem.get(url);
    const p = fetch(url, { headers: { 'Api-User-Agent': 'TerraVerse-Encyclopedia/1.0 (GitHub Pages)' } })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    mem.set(url, p); p.catch(() => mem.delete(url));
    return p;
  }
  function cached(key, fn) {
    try { const v = sessionStorage.getItem(key); if (v) return Promise.resolve(JSON.parse(v)); } catch (e) {}
    return fn().then(v => { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) {} return v; });
  }
  const fixSrc = s => s && s.startsWith('//') ? 'https:' + s : s;

  return {
    summary: title => cached('tvw:s:' + title, () => get(`${REST}/page/summary/${slug(title)}`).then(d => ({
      title: d.title, desc: d.description || '', extract: d.extract || '',
      thumb: d.thumbnail && d.thumbnail.source, image: d.originalimage && d.originalimage.source,
      url: d.content_urls && d.content_urls.desktop.page, type: d.type,
    }))),
    article: title => get(`${API}?action=query&format=json&origin=*&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(title)}`)
      .then(d => { const p = Object.values(d.query.pages)[0]; return p.missing !== undefined ? '' : (p.extract || ''); }),
    media: title => get(`${REST}/page/media-list/${slug(title)}`).then(d => (d.items || [])
      .filter(i => i.type === 'image' && i.showInGallery && i.srcset && i.srcset.length && !/\.svg/i.test(i.srcset[0].src))
      .slice(0, 14).map(i => ({ src: fixSrc(i.srcset[0].src), big: fixSrc(i.srcset[i.srcset.length - 1].src), caption: (i.caption && i.caption.text) || '' }))),
    search: (q, n = 12) => get(`${API}?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=${n}&prop=pageimages|description&piprop=thumbnail&pithumbsize=200`)
      .then(d => Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index)
        .map(p => ({ title: p.title, desc: p.description || '', thumb: p.thumbnail && p.thumbnail.source }))),
    parse(txt) {
      const out = []; let cur = { title: 'Overview', level: 2, body: [] };
      for (const line of txt.split('\n')) {
        const m = line.match(/^(={2,6})\s*(.+?)\s*\1\s*$/);
        if (m) { if (cur.body.join('').trim()) out.push(cur); cur = { title: m[2], level: m[1].length, body: [] }; }
        else if (line.trim()) cur.body.push(line.trim());
      }
      if (cur.body.join('').trim()) out.push(cur);
      return out.filter(s => !/^(See also|References|External links|Further reading|Notes|Citations|Sources|Bibliography|Footnotes|Gallery)$/i.test(s.title));
    },
  };
})();
