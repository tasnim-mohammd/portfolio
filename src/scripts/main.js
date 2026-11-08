import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import PHX from './phoenix.js';

gsap.registerPlugin(ScrollTrigger);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function init() {
  // ---------- smooth scroll
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    const end = a.dataset.end && $(a.dataset.end);
    if (end) {
      // scroll so the whole section top is visible, but never hide its main call to action
      const top = el.getBoundingClientRect().top + scrollY - 70;
      const ctaBottom = end.getBoundingClientRect().bottom + scrollY + 40;
      const y = Math.max(top, ctaBottom - innerHeight);
      lenis ? lenis.scrollTo(y) : scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    lenis ? lenis.scrollTo(el, { offset: id === '#top' ? 0 : -70 }) : el.scrollIntoView({ behavior: 'smooth' });
  }));

  // ---------- nav
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- intro first, so later triggers measure positions after its pin
  intro();

  // ---------- entrances
  if (reduced) { $$('.up').forEach((e) => (e.style.opacity = 1)); }
  else {
    const heroUps = $$('.hero .up');
    gsap.to(heroUps, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08, delay: .15 });
    ScrollTrigger.batch($$('.up').filter((e) => !heroUps.includes(e)), {
      start: 'top 88%',
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08 }),
    });
    const curve = $('.pen .curve');
    if (curve) { const L = curve.getTotalLength(); gsap.fromTo(curve, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', delay: .6 }); }
  }

  // ---------- hello word reveal
  const r = $('#reveal');
  const words = r.textContent.trim().split(/\s+/);
  r.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  const ws = $$('.w', r);
  if (reduced) ws.forEach((w) => w.classList.add('on'));
  else ScrollTrigger.create({ trigger: r, start: 'top 85%', end: 'center 50%', scrub: true,
    onUpdate: (s) => { const n = Math.round(s.progress * ws.length); ws.forEach((w, i) => w.classList.toggle('on', i < n)); } });
  // ---------- hero glow follows the mouse, edge blobs drift softly
  if (!reduced && matchMedia('(hover:hover)').matches) {
    const hero = $('.hero'), glow = $('.glow', hero), b1 = $('.blob.b1'), b2 = $('.blob.b2');
    if (hero && glow) {
      const gx = gsap.quickTo(glow, 'x', { duration: 1.6, ease: 'power3.out' }), gy = gsap.quickTo(glow, 'y', { duration: 1.6, ease: 'power3.out' });
      const drift = [[b1, .3, .22], [b2, -.22, -.18]].filter(([el]) => el).map(([el, sx, sy]) => ({ x: gsap.quickTo(el, 'x', { duration: 2.6, ease: 'power2.out' }), y: gsap.quickTo(el, 'y', { duration: 2.6, ease: 'power2.out' }), sx, sy }));
      let first = true, lastT = 0, lx = 0, ly = 0;
      const tones = ['#FFE3C4', '#F6B98F', '#F0C1AE', '#E39478', '#C3999E'];
      const spark = (x, y) => {
        const n = Math.random() < .5 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const s = document.createElement('span'), size = gsap.utils.random(3, 7), c = tones[(Math.random() * tones.length) | 0];
          s.className = 'spark';
          Object.assign(s.style, { width: `${size}px`, height: `${size}px`, background: c, boxShadow: `0 0 ${size * 2}px ${size * .6}px ${c}` });
          hero.appendChild(s);
          const sx = x + gsap.utils.random(-14, 14) - size / 2, sy = y + gsap.utils.random(-8, 10) - size / 2;
          gsap.timeline({ onComplete: () => s.remove() })
            .fromTo(s, { x: sx, y: sy, scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .2, ease: 'power2.out' })
            .to(s, { y: sy - gsap.utils.random(40, 90), x: sx + gsap.utils.random(-22, 22), scale: .2, opacity: 0, duration: gsap.utils.random(1.1, 1.8), ease: 'sine.out' }, .15);
        }
      };
      gsap.to(glow, { scale: 1.18, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        if (first) { gsap.set(glow, { x, y }); first = false; }
        gx(x); gy(y); hero.classList.add('lit');
        const now = performance.now();
        if (now - lastT > 70 && Math.hypot(x - lx, y - ly) > 46) { lastT = now; lx = x; ly = y; spark(x, y); }
        const dx = e.clientX - innerWidth / 2, dy = e.clientY - innerHeight / 2;
        drift.forEach((o) => { o.x(dx * o.sx); o.y(dy * o.sy); });
      }, { passive: true });
      hero.addEventListener('mouseleave', () => { hero.classList.remove('lit'); drift.forEach((o) => { o.x(0); o.y(0); }); });
      gsap.to([b1, b2].filter(Boolean), { scale: 1.12, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 3 });
    }
  }

  // ---------- the booking card actually works (a tiny taste of the craft)
  const book = $('#bookBtn'), note = $('#bookNote'), slots = $$('.slots button');
  if (book) {
    const sub = $('.design-card .sub');
    slots.forEach((b) => b.addEventListener('click', () => { slots.forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); if (sub) sub.textContent = sub.textContent.replace(/\d{1,2}:\d{2}/, b.textContent); if (book.classList.contains('done')) reset(); }));
    const label = $('.bl', book);
    const reset = () => { book.classList.remove('done'); label.textContent = 'Book now'; note.classList.remove('show'); };
    book.addEventListener('click', () => {
      if (book.classList.contains('done')) { reset(); return; }
      if (book.classList.contains('loading')) return;
      book.classList.add('loading');
      setTimeout(() => {
        book.classList.remove('loading'); book.classList.add('done');
        label.textContent = `Booked ✓  Sat · ${($('.slots .on') || {}).textContent || '10:00'}`;
        note.classList.add('show');
        if (!reduced) {
          const card = book.closest('.design-card'), cr = card.getBoundingClientRect(), br = book.getBoundingClientRect();
          const cx = br.left - cr.left + br.width / 2, cy = br.top - cr.top + br.height / 2;
          const cols = ['#C3999E', '#F0C1AE', '#8E5464', '#3FAE6A', '#F7EAE6'];
          for (let i = 0; i < 26; i++) {
            const c = document.createElement('i'); c.className = 'confetti'; c.style.background = cols[i % cols.length];
            card.appendChild(c);
            const a = Math.random() * Math.PI - Math.PI, d = gsap.utils.random(60, 160);
            gsap.fromTo(c, { x: cx, y: cy, rotation: 0, opacity: 1 }, { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d + 40, rotation: gsap.utils.random(-260, 260), opacity: 0, duration: gsap.utils.random(.8, 1.3), ease: 'power3.out', onComplete: () => c.remove() });
          }
        }
      }, 650);
    });
  }

  // ---------- work-in-progress note (dismiss for this visit)
  const wip = $('#wip');
  if (wip) {
    try { if (sessionStorage.getItem('wip-off')) wip.remove(); } catch {}
    const x = $('#wipClose');
    if (x) x.addEventListener('click', () => { wip.classList.add('out'); try { sessionStorage.setItem('wip-off', '1'); } catch {} setTimeout(() => wip.remove(), 400); });
  }

  // ---------- skills as Figma layers, a cursor hops between them
  const layers = $$('.floaters .layer'), fcur = $('.fcursor');
  if (layers.length) {
    let cur = -1, timer = null, paused = false;
    const select = (i) => {
      if (i === cur) return; cur = i;
      layers.forEach((l, k) => l.classList.toggle('sel', k === i));
      const l = layers[i];
      $('.dim', l).textContent = `${l.offsetWidth} × ${l.offsetHeight}`;
      if (fcur && getComputedStyle(fcur).display !== 'none') {
        const x = l.offsetLeft + l.offsetWidth - 10, y = l.offsetTop + l.offsetHeight - 8;
        if (reduced || !fcur.classList.contains('on')) { gsap.set(fcur, { x, y }); fcur.classList.add('on'); }
        else gsap.to(fcur, { x, y, duration: .9, ease: 'power3.inOut' });
      }
    };
    const next = () => { if (!paused) select((cur + 1 + Math.floor(Math.random() * (layers.length - 1))) % layers.length); };
    layers.forEach((l, k) => {
      l.addEventListener('mouseenter', () => { paused = true; select(k); });
      l.addEventListener('mouseleave', () => { paused = false; });
    });
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) { if (cur < 0) select(0); if (!reduced) timer = setInterval(next, 1900); }
    }).observe($('.hello'));
  }

  // ---------- buttons: bloom from the cursor + gentle magnet
  if (matchMedia('(hover:hover)').matches) {
    $$('.btn').forEach((b) => {
      const qx = reduced ? null : gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' });
      const qy = reduced ? null : gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      const at = (e) => { const r = b.getBoundingClientRect(); b.style.setProperty('--x', `${e.clientX - r.left}px`); b.style.setProperty('--y', `${e.clientY - r.top}px`); return r; };
      b.addEventListener('mouseenter', at);
      b.addEventListener('mousemove', (e) => { const r = at(e); if (qx) { qx((e.clientX - r.left - r.width / 2) * .22); qy((e.clientY - r.top - r.height / 2) * .3); } });
      b.addEventListener('mouseleave', (e) => { at(e); if (qx) { qx(0); qy(0); } });
    });
  }

  // ---------- work card tilt
  if (!reduced && matchMedia('(hover:hover)').matches) {
    $$('.proj .art').forEach((art) => {
      const qx = gsap.quickTo(art, 'rotationY', { duration: .6, ease: 'power3' });
      const qy = gsap.quickTo(art, 'rotationX', { duration: .6, ease: 'power3' });
      gsap.set(art, { transformPerspective: 900 });
      art.addEventListener('pointermove', (e) => { const b = art.getBoundingClientRect(); qx(((e.clientX - b.left) / b.width - .5) * 8); qy(-((e.clientY - b.top) / b.height - .5) * 8); });
      art.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  // ---------- rebirth
  rebirth();

  // ---------- experience preview
  const pv = $('#preview');
  if (matchMedia('(hover:hover)').matches) {
    const px = gsap.quickTo(pv, 'left', { duration: .45, ease: 'power3' });
    const py = gsap.quickTo(pv, 'top', { duration: .45, ease: 'power3' });
    $$('#before li').forEach((li) => {
      li.addEventListener('pointerenter', () => { $('b', pv).textContent = li.dataset.t; $('p', pv).textContent = li.dataset.p; pv.classList.add('show'); });
      li.addEventListener('pointerleave', () => pv.classList.remove('show'));
      li.addEventListener('pointermove', (e) => { px(e.clientX + 24); py(e.clientY - 60); });
    });
  }

  // ---------- counters (IntersectionObserver: immune to stale scroll positions)
  const counters = $$('[data-count]');
  const fmt = (n) => Math.round(n).toLocaleString('en-US') + '+';
  if (reduced || !('IntersectionObserver' in window)) counters.forEach((el) => (el.textContent = fmt(+el.dataset.count)));
  else {
    counters.forEach((el) => (el.textContent = fmt(0)));
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(o.v)), onComplete: () => (el.textContent = fmt(to)) });
    }), { threshold: .4 });
    counters.forEach((el) => io.observe(el));
  }

  // ---------- ways toggle
  const t = $('#tog'), pr = $('#paneRole'), pf = $('#paneFree'), lr = $('#lblRole'), lf = $('#lblFree');
  const setWay = (free) => {
    t.setAttribute('aria-checked', String(free)); t.setAttribute('aria-label', free ? 'Show full-time details' : 'Show freelance details');
    pr.hidden = free; pf.hidden = !free; lr.classList.toggle('act', !free); lf.classList.toggle('act', free);
    if (!reduced) gsap.from(free ? pf : pr, { opacity: 0, y: 14, duration: .45, ease: 'power2.out' });
  };
  t.addEventListener('click', () => setWay(t.getAttribute('aria-checked') !== 'true'));
  lr.addEventListener('click', () => setWay(false)); lf.addEventListener('click', () => setWay(true));

  // ---------- copy email (click the address)
  const mailBtn = $('#mail');
  if (mailBtn) mailBtn.addEventListener('click', async () => {
    const addr = $('code', mailBtn).textContent.trim();
    try { await navigator.clipboard.writeText(addr); $('#copyTip').textContent = 'Copied ✓'; }
    catch { const rg = document.createRange(); rg.selectNodeContents($('code', mailBtn)); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); $('#copyTip').textContent = 'Selected, press ⌘C'; }
    mailBtn.classList.add('copied'); clearTimeout(mailBtn._t); mailBtn._t = setTimeout(() => mailBtn.classList.remove('copied'), 1800);
  });

  // ---------- FAQ: one open at a time (fallback for browsers without <details name>)
  const faqItems = $$('.faq-list details');
  faqItems.forEach((d) => d.addEventListener('toggle', () => { if (d.open) faqItems.forEach((o) => { if (o !== d) o.open = false; }); }));

  // ---------- designer / developer mode
  const d = $('#mDesign'), c = $('#mCode');
  const setMode = (code) => {
    document.body.classList.toggle('code', code); d.setAttribute('aria-pressed', String(!code)); c.setAttribute('aria-pressed', String(code));
    try { localStorage.setItem('tm-mode', code ? 'code' : 'design'); } catch {}
    ScrollTrigger.refresh();
  };
  d.addEventListener('click', () => setMode(false)); c.addEventListener('click', () => setMode(true));
  try { if (localStorage.getItem('tm-mode') === 'code') setMode(true); } catch {}

  addEventListener('load', () => ScrollTrigger.refresh());
  let rt; const later = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); };
  $$('img').forEach((im) => { if (!im.complete) im.addEventListener('load', later, { once: true }); });
  if (document.fonts) document.fonts.ready.then(later);
}

function rebirth() {
  const section = $('.rebirth');
  if (reduced) { section.classList.add('rm'); return; }
  const stage = $('#rbStage'), editor = $('#editor'), phoenix = $('#phoenix'), design = $('#sceneDesign');
  const lines = $$('.editor .ln'), devTl = $$('#devTl li'), chat = $('#chat');
  const desTl = $$('#desTl li'), card = $('#dcard'), winds = $$('#winds path');
  winds.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L * .25} ${L}`; p.style.strokeDashoffset = L * 1.25; p.dataset.l = L; });

  // flight path in stage-relative 0..1 coords (cubic bezier)
  const P = [[-0.18, 1.12], [0.25, 0.55], [0.55, 0.85], [1.15, -0.28]];
  const bez = (t) => { const u = 1 - t; const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]; return [0, 1].map((i) => k.reduce((s, kk, j) => s + kk * P[j][i], 0)); };

  const state = { flight: 0 };
  let fx = null; // particles renderer

  const tl = gsap.timeline({
    scrollTrigger: { trigger: stage, start: 'top top', end: '+=320%', pin: true, scrub: 1, anticipatePin: 1,
      onEnter: () => { if (!fx) loadFx(); } },
    defaults: { ease: 'none' },
  });
  tl.to(lines, { opacity: 1, stagger: .12, duration: .3 }, 0)
    .to(devTl, { opacity: 1, stagger: .35, duration: .4 }, .4)
    .to(chat, { opacity: 1, duration: .5 }, 1.8)
    .from('.bubble', { y: 20, scale: .96, duration: .5 }, 1.8)
    .to('#rbHint', { opacity: 0, duration: .3 }, 2.6)
    .to(state, { flight: 1, duration: 3.6, ease: 'power1.inOut', onUpdate: () => render(state.flight) }, 3)
    .to(editor, { opacity: 0, filter: 'blur(6px)', duration: 1.2 }, 3.1)
    .to('.scene-dev .side, .scene-dev .rb-title, .scene-dev .rb-kicker', { opacity: 0, duration: 1 }, 3.6)
    .fromTo(card, { opacity: 0, scale: .85, rotate: -4 }, { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: 'back.out(1.6)' }, 6.3)
    .from('#sceneDesign .rb-title, #sceneDesign .rb-kicker, #sceneDesign .rb-echo', { y: 30, opacity: 0, duration: .8 }, 6.1)
    .to(desTl, { opacity: 1, stagger: .3, duration: .4 }, 6.6)
    .to({}, { duration: 1.2 });

  function render(t) {
    const w = stage.clientWidth, h = stage.clientHeight;
    const [x, y] = bez(Math.min(1, Math.max(0, t)));
    const [x2, y2] = bez(Math.min(1, t + .01));
    const ang = Math.atan2((y2 - y) * h, (x2 - x) * w) * 180 / Math.PI + 55;
    const s = .7 + Math.sin(t * Math.PI) * .55;
    const pw = phoenix.offsetWidth, ph = phoenix.offsetHeight;
    gsap.set(phoenix, { x: x * w - pw / 2, y: y * h - ph / 2, rotation: ang * .35, scale: s, opacity: t > 0 && t < 1 ? Math.min(1, t * 8, (1 - t) * 6) : 0 });
    winds.forEach((p, i) => { const L = +p.dataset.l; const k = Math.min(1, Math.max(0, (t - i * .06) * 1.4)); p.style.strokeDashoffset = L * 1.25 - k * L * 1.5; p.style.opacity = Math.sin(k * Math.PI) * .8; });
    if (fx) fx.update(t, x * w, y * h);
  }
  render(0);
  burn();

  // ---------- the dark page burns away like paper, revealing the design world
  function burn() {
    const cv = $('#burnCanvas'), ctx = cv.getContext('2d');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const IGN = [.08, .24, .4, .55, .7].map((ti, i) => ({
      ti, ox: rnd(-.06, .06), oy: rnd(-.06, .06),
      h: [3, 5, 8, 13, 21, 34, 55, 89].map((k, n) => ({ k, a: [.09, .06, .04, .025, .014, .008, .004, .0025][n] * rnd(.7, 1.3), ph: rnd(0, 6.28), w: rnd(.4, 1.2) * (n > 2 ? 2.2 : .5) * (Math.random() < .5 ? -1 : 1) })),
    }));
    const END = .93, SEG = 140;
    let W = 0, H = 0, pr = 1, raf = 0, last = 0;
    const embers = [], flames = [], smoke = [];
    const sprite = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); stops.forEach(([o, col]) => r.addColorStop(o, col)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c; };
    const SPR = {
      core: sprite([[0, 'rgba(255,250,225,1)'], [.35, 'rgba(255,214,120,.85)'], [1, 'rgba(255,140,40,0)']]),
      mid: sprite([[0, 'rgba(255,190,80,.95)'], [.4, 'rgba(255,120,30,.6)'], [1, 'rgba(230,60,10,0)']]),
      tip: sprite([[0, 'rgba(240,90,25,.75)'], [.5, 'rgba(180,40,10,.35)'], [1, 'rgba(120,20,5,0)']]),
      smoke: sprite([[0, 'rgba(70,58,58,.32)'], [1, 'rgba(40,30,32,0)']]),
    };
    const small = innerWidth < 700, FLAME_RATE = small ? 18 : 44;
    const fit = () => { pr = Math.min(devicePixelRatio, 2); W = stage.clientWidth; H = stage.clientHeight; cv.width = W * pr; cv.height = H * pr; };
    fit(); addEventListener('resize', fit);
    const blobs = (t, tau) => {
      const diag = Math.hypot(W, H);
      return IGN.filter((b) => t > b.ti).map((b) => {
        const [bx, by] = bez(b.ti);
        const k = Math.min(1, (t - b.ti) / (END - b.ti));
        return { cx: (bx + b.ox) * W, cy: (by + b.oy) * H, R: Math.pow(k, 1.25) * diag * 1.15 + 6, b, tau };
      });
    };
    const rAt = (o, th) => o.R * (1 + o.b.h.reduce((s, q) => s + q.a * Math.sin(q.k * th + q.ph + q.w * o.tau), 0));
    const pts = (o, inset = 0) => { const a = [], seg = Math.round(Math.min(420, Math.max(SEG, o.R / 4))); for (let i = 0; i < seg; i++) { const th = i / seg * 6.2832, r = Math.max(0, rAt(o, th) - inset); a.push([o.cx + Math.cos(th) * r, o.cy + Math.sin(th) * r]); } return a; };
    const pathOf = (list, inset) => { const p = new Path2D(); list.forEach((o) => { pts(o, inset).forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); }); return p; };
    const inside = (list, x, y, skip) => list.some((o) => o !== skip && Math.hypot(x - o.cx, y - o.cy) < rAt(o, Math.atan2(y - o.cy, x - o.cx)) - 2);
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      const t = state.flight, tau = now / 1000, list = blobs(t, tau);
      // clip the design scene to the burnt holes
      if (t >= .97) design.style.clipPath = 'none';
      else if (!list.length) design.style.clipPath = 'circle(0% at 0 0)';
      else design.style.clipPath = `path('${list.map((o) => 'M' + pts(o).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z').join('')}')`;
      ctx.setTransform(pr, 0, 0, pr, 0, 0); ctx.clearRect(0, 0, W, H);
      const fade = t < .9 ? 1 : Math.max(0, 1 - (t - .9) / .07);
      if (list.length && fade > 0) {
        const edge = pathOf(list, 0), flick = .82 + Math.sin(tau * 13) * .08 + Math.sin(tau * 31) * .06;
        ctx.save(); ctx.globalAlpha = fade;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(40,14,6,.85)'; ctx.lineWidth = 46; ctx.stroke(edge);           // char
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = 'rgba(255,90,20,.95)'; ctx.shadowBlur = 34;
        ctx.strokeStyle = `rgba(255,70,20,${.35 * flick})`; ctx.lineWidth = 22; ctx.stroke(edge);  // heat
        ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(255,140,50,${.8 * flick})`; ctx.lineWidth = 7; ctx.stroke(edge);   // flame
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,236,190,${.95 * flick})`; ctx.lineWidth = 2.2; ctx.stroke(edge); // core
        ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1;
        ctx.fill(pathOf(list, 1.5));                                                              // keep only the outer rim
        ctx.restore();
        // spawn embers along the living edge
        if (t < .9) for (let n = 0; n < FLAME_RATE; n++) {
          const o = list[(Math.random() * list.length) | 0], th = Math.random() * 6.2832, r = rAt(o, th) + 4;
          const x = o.cx + Math.cos(th) * r, y = o.cy + Math.sin(th) * r;
          if (x < -30 || y < -30 || x > W + 30 || y > H + 60 || inside(list, x, y, o)) continue;
          const big = Math.random() < .18;
          flames.push({ x, y, vx: rnd(-14, 14), vy: rnd(-190, -90) * (big ? 1.35 : 1), life: 0, max: rnd(.45, 1) * (big ? 1.4 : 1), s: rnd(20, 42) * (big ? 1.7 : 1), ph: rnd(0, 6.28) });
          if (Math.random() < .12) smoke.push({ x, y: y - 20, vx: rnd(-10, 10), vy: rnd(-60, -30), life: 0, max: rnd(1.4, 2.6), s: rnd(30, 60) });
        }
        if (t < .9) for (let n = 0; n < 10; n++) {
          const o = list[(Math.random() * list.length) | 0], th = Math.random() * 6.2832, r = rAt(o, th);
          const x = o.cx + Math.cos(th) * r, y = o.cy + Math.sin(th) * r;
          if (x < -10 || y < -10 || x > W + 10 || y > H + 10 || inside(list, x, y, o)) continue;
          embers.push({ x, y, vx: rnd(-20, 20), vy: rnd(-110, -35), life: 0, max: rnd(.7, 1.9), s: rnd(1, 3), wob: rnd(0, 6) });
        }
      }
      // smoke (behind the flames)
      ctx.save();
      for (let i = smoke.length - 1; i >= 0; i--) {
        const m = smoke[i]; m.life += dt; if (m.life > m.max) { smoke.splice(i, 1); continue; }
        const k = m.life / m.max; m.x += (m.vx + Math.sin(tau * 1.3 + m.s) * 12) * dt; m.y += m.vy * dt;
        const sz = m.s * (1 + k * 2.2); ctx.globalAlpha = Math.sin(k * Math.PI) * .28 * fade;
        ctx.drawImage(SPR.smoke, m.x - sz / 2, m.y - sz / 2, sz, sz);
      }
      ctx.restore();
      // flames: additive tongues that lick upward and flicker
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i]; f.life += dt; if (f.life > f.max) { flames.splice(i, 1); continue; }
        const k = f.life / f.max;
        f.x += (f.vx + Math.sin(tau * 9 + f.ph + k * 6) * 26 * k) * dt; f.y += f.vy * dt; f.vy *= .985;
        const sz = f.s * (k < .2 ? .6 + k * 2 : 1 - (k - .2) * .9);
        const spr = k < .28 ? SPR.core : k < .62 ? SPR.mid : SPR.tip;
        ctx.globalAlpha = (k < .1 ? k * 10 : 1 - k * .85) * .85 * fade;
        ctx.drawImage(spr, f.x - sz / 2, f.y - sz * 1.1, sz, sz * 2.2);
      }
      ctx.restore();
      if (flames.length > 2200) flames.splice(0, flames.length - 2200);
      if (smoke.length > 260) smoke.splice(0, smoke.length - 260);
      // embers
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.life += dt;
        if (e.life > e.max) { embers.splice(i, 1); continue; }
        const k = e.life / e.max;
        e.x += (e.vx + Math.sin(tau * 3 + e.wob) * 18) * dt; e.y += e.vy * dt; e.vy *= .995;
        const g = k < .3 ? [255, 241, 201] : k < .65 ? [255, 176, 103] : [226, 85, 58];
        ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${(1 - k) * .95})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.s * (1 - k * .5), 0, 6.2832); ctx.fill();
      }
      ctx.restore();
      if (embers.length > 600) embers.splice(0, embers.length - 600);
    }
    new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); last = 0; if (e.isIntersecting) raf = requestAnimationFrame(frame); }).observe(section);
  }

  async function loadFx() {
    fx = { update() {} };
    const THREE = await import('three');
    const canvas = $('#rbCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    const pr = Math.min(devicePixelRatio, 2); renderer.setPixelRatio(pr);
    const scene = new THREE.Scene();
    let W = 1, H = 1; const cam = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
    const small = innerWidth < 700;
    const ND = small ? 500 : 1100, NE = small ? 260 : 520, N = ND + NE;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N);
    const seed = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const palette = ['#F7EAE6', '#F0C1AE', '#C3999E', '#A8D5BA', '#8E5464'].map((c) => new THREE.Color(c));
    for (let i = 0; i < N; i++) {
      const c = i < ND ? palette[Math.floor(seed[i][3] * 4)] : palette[[1, 1, 2, 4][Math.floor(seed[i][3] * 4)]];
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = (i < ND ? 1.6 + seed[i][2] * 2.4 : 2 + seed[i][2] * 5) * pr;
    }
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float alpha;attribute float size;varying float vA;varying vec3 vC;void main(){vA=alpha;vC=color;gl_PointSize=size;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vC,vA*smoothstep(.5,.1,d));}',
      vertexColors: true,
    });
    scene.add(new THREE.Points(geo, mat));
    let er = { x: 0, y: 0, w: 1, h: 1 };
    const size2 = () => {
      W = stage.clientWidth; H = stage.clientHeight; renderer.setSize(W, H, false);
      cam.right = W; cam.bottom = H; cam.updateProjectionMatrix();
      const sb = stage.getBoundingClientRect(), eb = editor.getBoundingClientRect();
      er = { x: eb.left - sb.left, y: eb.top - sb.top, w: eb.width, h: eb.height };
    };
    size2(); addEventListener('resize', size2);
    ScrollTrigger.addEventListener('refresh', size2);
    fx = {
      update(t, px, py) {
        for (let i = 0; i < N; i++) {
          const s = seed[i]; let x, y, a;
          if (i < ND) {
            const k = Math.min(1, Math.max(0, (t - s[0] * .25) / .55));
            const e = k * k;
            x = er.x + s[0] * er.w + e * (W * (.35 + s[1] * .6)) + Math.sin(k * 6 + s[2] * 9) * 30 * k;
            y = er.y + s[1] * er.h - e * (H * (.35 + s[2] * .7)) + Math.cos(k * 5 + s[0] * 7) * 24 * k;
            a = k <= 0 ? 0 : Math.min(1, k * 8) * (1 - k) * .9;
          } else {
            const d = s[0] * .3, k = t - d;
            const [bx, by] = bez(Math.min(1, Math.max(0, k)));
            const spread = 20 + d * 520;
            x = bx * W + (s[1] - .5) * spread; y = by * H + (s[2] - .5) * spread + d * 120;
            a = k > 0 && k < 1 ? (1 - d / .3) * Math.min(1, k * 10) * .95 : 0;
          }
          pos[i * 3] = x; pos[i * 3 + 1] = y; alpha[i] = a;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true;
        renderer.render(scene, cam);
      },
    };
    render(state.flight);
  }
}


function intro() {
  const stage = $('#introStage'); if (!stage) return;
  const fig = $('#ifig'), hv = $('#helloVid'), halo = $('#ihalo'), slotEl = $('#islot'), ring = $('#iring');
  const nameEl = $('#iname'), hint = $('#ihint'), avbg = $('#iavbg'), navEl = $('#nav'), photo = $('#iphoto');
  const lines = $$('.ihero h1 .l'), hiEl = $('#ihi'), cta = $('#icta');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eo = (x) => 1 - Math.pow(1 - x, 3);
  const lerp = (a, b, k) => a + (b - a) * k;

  // video source: transparent VP9 where supported, flat version for Safari/iOS
  const ua = navigator.userAgent, safari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  hv.src = !safari && hv.canPlayType('video/webm; codecs="vp9"') ? hv.dataset.alpha : hv.dataset.flat;

  let L = {};
  const layout = () => {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    const FH = Math.min(640, vh * .8, (vw * .86) * 640 / 520), FW = FH * 520 / 640;
    L = { vw, vh, FW, FH, FX: (vw - FW) / 2, FY: (vh - FH) / 2 + 6, k: FW / 520 };
    L.HEAD = { x: FW * .529, y: FH * .29, r: FW * .246 };
    L.C = { x: vw / 2, y: L.FY + FH * .42 };
    Object.assign(fig.style, { width: FW + 'px', height: FH + 'px' });
    nameEl.style.top = (L.FY + FH - 74 * L.k) + 'px';
    const hs = FW * 1.58; Object.assign(halo.style, { width: hs + 'px', height: hs + 'px', left: (vw - hs) / 2 + 'px', top: (L.FY + FH * .36 - hs / 2) + 'px' });
  };

  const bird = PHX.create();
  bird.density = innerWidth < 700 ? .5 : 1;
  const fx = reduced ? null : PHX.mount($('#phxBack'), $('#phxFront'), bird);
  const path = (k) => {
    const a = Math.PI * .78 + k * Math.PI * 2.5, base = 330 * L.k;
    const R = lerp(Math.max(L.vw, 980 * L.k), base, eo(clamp(k / .22))) + Math.pow(clamp((k - .8) / .2), 2) * 700 * L.k;
    const lift = (k * 150 + Math.pow(clamp((k - .78) / .22), 2) * 420) * L.k;
    return { x: L.C.x + Math.cos(a) * R, y: L.C.y + Math.sin(a) * 105 * L.k * (R / base) - lift + 40 * L.k, z: Math.sin(a) };
  };

  let T = -1;
  const setT = (t) => {
    T = t;
    hint.style.opacity = 1 - seg(t, 0, .05);
    nameEl.style.opacity = 1 - seg(t, .52, .6);
    // phoenix
    const k = seg(t, .04, .62);
    bird.active = !reduced && t > .04 && t < .62;
    if (bird.active) {
      const p = path(k), p2 = path(Math.min(1, k + .004));
      Object.assign(bird, { x: p.x, y: p.y, z: p.z, heading: Math.atan2(p2.y - p.y, p2.x - p.x), scale: (.62 + .34 * (p.z + 1) / 2) * L.k, front: p.z > -.05, alpha: Math.min(1, k * 12) * (1 - seg(k, .93, 1)), rise: seg(k, .8, .9) });
    }
    const kh = seg(t, .14, .48), kh2 = seg(t, .58, .7);
    halo.style.opacity = (eo(kh) * (1 - kh2) * .95).toFixed(3);
    halo.style.transform = `scale(${.75 + kh * .3})`;
    // hero copy (before measuring the avatar slot)
    const reveal = (el, a, b) => { const q = eo(seg(t, a, b)); el.style.opacity = q; el.style.transform = `translateY(${(1 - q) * 26}px)`; };
    reveal(hiEl, .72, .84);
    lines.forEach((l, i) => reveal(l, .76 + i * .05, .88 + i * .05));
    reveal(cta, .9, 1);
    // figure → avatar
    const sr = stage.getBoundingClientRect(), r0 = slotEl.getBoundingClientRect();
    const slot = { x: r0.left - sr.left, y: r0.top - sr.top, w: r0.width };
    const km = ease(seg(t, .6, .84)), H = L.HEAD;
    const s = lerp(1, (slot.w / 2) / H.r, km);
    const tx = lerp(L.FX, slot.x + slot.w / 2 - H.x * s, km), ty = lerp(L.FY, slot.y + slot.w / 2 - H.y * s, km);
    const r = lerp(Math.hypot(L.FW, L.FH), H.r, ease(seg(t, .6, .76)));
    fig.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
    fig.style.clipPath = `circle(${r}px at ${H.x}px ${H.y}px)`;
    avbg.style.opacity = seg(t, .66, .8);
    Object.assign(ring.style, { left: slot.x + 'px', top: slot.y + 'px', width: slot.w + 'px', height: slot.w + 'px', opacity: seg(t, .82, .9) });
    // once she's small, the avatar becomes the ✌️ photo
    const kp = seg(t, .8, .9);
    Object.assign(photo.style, { left: slot.x + 'px', top: slot.y + 'px', width: slot.w + 'px', height: slot.w + 'px', opacity: kp });
    fig.style.opacity = 1 - kp;
    // nav waits for the hero
    navEl.classList.toggle('intro-hide', t < .88);
  };
  layout();

  if (reduced) { hv.poster = '/img/hello-end-a.webp'; setT(1); addEventListener('resize', () => { layout(); setT(1); }); return; }

  const st = { t: 0 };
  gsap.to(st, { t: 1, ease: 'none', onUpdate: () => setT(st.t),
    scrollTrigger: { trigger: stage, start: 'top top', end: '+=170%', pin: true, scrub: .7, anticipatePin: 1,
      onRefresh: () => { layout(); setT(st.t); } } });
  setT(0);
  new IntersectionObserver(([e]) => (e.isIntersecting ? fx.start() : fx.stop())).observe(stage);
  // she waves on arrival, and again when tapped/hovered while she is big
  const wave = () => { try { hv.currentTime = 0; const pr = hv.play(); if (pr) pr.catch(() => {}); } catch {} };
  setTimeout(wave, 500);
  fig.addEventListener('mouseenter', () => { if (T < .3 && (hv.paused || hv.ended)) wave(); });
  fig.addEventListener('click', () => { if (T < .3 && (hv.paused || hv.ended)) wave(); });
  // the nav "Let's talk" button appears once the hero is behind us
  ScrollTrigger.create({ trigger: '.hero-after', start: 'top 80%', onEnter: () => navEl.classList.add('cta-on'), onLeaveBack: () => navEl.classList.remove('cta-on') });
}
